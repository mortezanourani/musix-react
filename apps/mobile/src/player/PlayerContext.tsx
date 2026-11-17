import {
  getAlbumTracks,
  getArtistTracks,
  getTrackAlbumTitle,
  getTrackArtistName,
  getTrackMediaType,
  type Track,
} from '@musix/core';
import { setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useLibrary } from '../library/LibraryContext';
import {
  loadRecentlyPlayedItems,
  recentItemKey,
  saveRecentlyPlayedItems,
  type RecentItem,
} from './recentlyPlayedStorage';
import {
  DEFAULT_PLAYBACK_RATES,
  loadPlaybackRates,
  loadResumePositions,
  savePlaybackRates,
  saveResumePositions,
  type PlaybackRates,
} from './playbackStorage';

/** How many entries the listening history keeps. */
const RECENT_HISTORY_LIMIT = 65;

/** How often a playing audiobook's position is written to storage. */
const RESUME_SAVE_INTERVAL_MS = 5_000;

/** Positions below this are treated as "not started" and are not restored. */
const MIN_RESUME_SECONDS = 5;

/** Positions this close to the end are treated as finished and cleared. */
const RESUME_END_MARGIN_SECONDS = 10;

export type RepeatMode = 'off' | 'all' | 'one';

/** What the player should do when the sleep timer reaches zero. */
export type SleepTimer =
  | { mode: 'off' }
  | { mode: 'duration'; minutes: number; endsAt: number }
  | { mode: 'endOfTrack' };

type PlayerContextValue = {
  currentTrack: Track | null;
  queue: readonly Track[];
  currentIndex: number;
  isPlaying: boolean;
  isVisible: boolean;
  /** Whether the queue is played in a shuffled order. */
  shuffleEnabled: boolean;
  /** What happens when the queue reaches its end. */
  repeatMode: RepeatMode;
  /** Speed applied to the current track (1 is normal). */
  playbackRate: number;
  /** Countdown or end-of-track timer that pauses playback. */
  sleepTimer: SleepTimer;
  /** False when there is no next track and repeat is off. */
  canGoNext: boolean;
  /** Whether the previous control is available; it restarts the first track. */
  canGoPrevious: boolean;
  /** Albums, artists, and tracks in the order they were played, newest first. */
  recentlyPlayed: readonly RecentItem[];
  /** Opens the player modal and starts the track, optionally with a queue. */
  playTrack: (track: Track, queue?: readonly Track[]) => void;
  /** Plays all tracks in an album, starting with the first one. */
  playAlbum: (albumId: string) => void;
  /** Plays all tracks by an artist, album by album. */
  playArtist: (artistName: string) => void;
  /** Jumps to a track already in the queue. */
  playQueueItem: (index: number) => void;
  /** Removes one track from the queue. */
  removeQueueItem: (index: number) => void;
  /** Reorders the queue, keeping the current track selected. */
  moveQueueItem: (from: number, to: number) => void;
  /** Reopens the full player modal without changing playback. */
  openPlayer: () => void;
  /** Hides the modal and leaves playback running in the mini-player. */
  minimizePlayer: () => void;
  togglePlayback: () => void;
  playNext: () => void;
  playPrevious: () => void;
  toggleShuffle: () => void;
  /** Cycles repeat between off, all, and one. */
  cycleRepeatMode: () => void;
  /** Changes the speed saved for the current track's media type. */
  setPlaybackRate: (rate: number) => void;
  /** Starts a countdown sleep timer, or clears it with null or 0. */
  setSleepTimer: (minutes: number | null) => void;
  /** Pauses when the current track ends instead of advancing. */
  setSleepTimerToEndOfTrack: () => void;
  seekForward: () => void;
  seekBackward: () => void;
  seekTo: (seconds: number) => void;
};

type PlayerProgress = {
  /** Playback position in seconds. */
  position: number;
  /** Current track duration in seconds. */
  duration: number;
  /** Playback error reported by the native player, if any. */
  error: string | null;
};

const PlayerContext = createContext<PlayerContextValue | null>(null);
const PlayerProgressContext = createContext<PlayerProgress | null>(null);

export function PlayerProvider({ children }: { children: ReactNode }) {
  const { tracks: libraryTracks } = useLibrary();
  const [queue, setQueue] = useState<Track[]>([]);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [isVisible, setIsVisible] = useState(false);
  const [shuffleEnabled, setShuffleEnabled] = useState(false);
  const [repeatMode, setRepeatMode] = useState<RepeatMode>('off');
  const [playbackRates, setPlaybackRates] = useState<PlaybackRates>(DEFAULT_PLAYBACK_RATES);
  const [sleepTimer, setSleepTimerState] = useState<SleepTimer>({ mode: 'off' });
  const [recentItems, setRecentItems] = useState<RecentItem[]>([]);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const finishHandled = useRef(false);
  // The album or artist that started the current queue, if any. While set,
  // track changes keep recording that source instead of individual tracks.
  const activeRecentSource = useRef<RecentItem | null>(null);
  // Positions saved for audiobooks, keyed by track ID.
  const resumePositions = useRef<Record<string, number>>({});
  const lastResumeSaveAt = useRef(0);
  const currentTrackRef = useRef<Track | null>(null);
  // The order to restore when shuffle is turned off again.
  const unshuffledQueue = useRef<{ queue: Track[]; index: number } | null>(null);
  const currentTrack = currentIndex >= 0 ? queue[currentIndex] ?? null : null;
  const currentTrackId = currentTrack?.id ?? null;
  const currentMediaType = currentTrack ? getTrackMediaType(currentTrack) : null;
  const playbackRate = currentMediaType ? playbackRates[currentMediaType] : 1;

  currentTrackRef.current = currentTrack;

  /** Prepends an item to the history, keeping it de-duplicated and capped. */
  const recordRecentItem = useCallback((item: RecentItem) => {
    setRecentItems((previous) => {
      const key = recentItemKey(item);

      if (previous[0] && recentItemKey(previous[0]) === key) {
        return previous;
      }

      return [item, ...previous.filter((entry) => recentItemKey(entry) !== key)].slice(
        0,
        RECENT_HISTORY_LIMIT,
      );
    });
  }, []);

  const canGoNext =
    currentIndex >= 0 &&
    (currentIndex < queue.length - 1 || (repeatMode === 'all' && queue.length > 1));
  const canGoPrevious = currentIndex >= 0;

  // Keep one native player for the whole queue so lock-screen controls have one owner.
  const player = useAudioPlayer(null, { updateInterval: 250 });
  const status = useAudioPlayerStatus(player);

  /** Writes the current audiobook position to storage. */
  const storeResumePosition = useCallback((track: Track, position: number) => {
    if (getTrackMediaType(track) !== 'audiobook') {
      return;
    }

    if (!Number.isFinite(position) || position < 1) {
      return;
    }

    const durationSeconds = track.durationMs > 0 ? track.durationMs / 1000 : 0;
    const nearEnd =
      durationSeconds > 0 && position >= durationSeconds - RESUME_END_MARGIN_SECONDS;

    if (nearEnd) {
      if (!(track.id in resumePositions.current)) {
        return;
      }

      delete resumePositions.current[track.id];
    } else {
      resumePositions.current[track.id] = Math.floor(position);
    }

    void saveResumePositions(resumePositions.current).catch(() => {
      // Resume positions are best-effort; playback itself is unaffected.
    });
  }, []);

  const clearResumePosition = useCallback((trackId: string) => {
    if (!(trackId in resumePositions.current)) {
      return;
    }

    delete resumePositions.current[trackId];
    void saveResumePositions(resumePositions.current).catch(() => {
      // Resume positions are best-effort; playback itself is unaffected.
    });
  }, []);

  useEffect(() => {
    void setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: true,
      // Lock screen controls only attach reliably with exclusive audio focus.
      interruptionMode: 'doNotMix',
    }).catch(() => {
      // Playback still works with the platform's default audio mode.
    });
  }, []);

  // Restore saved speeds and audiobook positions once. If a book starts before
  // storage has answered, resume it here as soon as the position is available.
  useEffect(() => {
    let cancelled = false;

    Promise.all([loadPlaybackRates(), loadResumePositions()]).then(([rates, positions]) => {
      if (cancelled) {
        return;
      }

      setPlaybackRates(rates);
      resumePositions.current = positions;

      const track = currentTrackRef.current;
      const saved = track ? positions[track.id] : undefined;

      if (
        track &&
        getTrackMediaType(track) === 'audiobook' &&
        saved !== undefined &&
        saved >= MIN_RESUME_SECONDS &&
        player.currentTime < MIN_RESUME_SECONDS
      ) {
        void player.seekTo(saved).catch(() => {
          // Resuming is best-effort; playback already started from the top.
        });
      }
    });

    return () => {
      cancelled = true;
    };
  }, [player]);

  // Register the player with the OS media session. On Android this is what
  // starts the media foreground service that keeps playback alive when the
  // app is backgrounded or the screen locks; on iOS it provides the lock
  // screen / Control Center metadata and transport controls.
  useEffect(() => {
    if (!currentTrack) {
      try {
        player.clearLockScreenControls();
      } catch {
        // The player may not have registered controls yet.
      }
      return;
    }

    const isAudiobook = currentTrack.mediaType === 'audiobook';

    try {
      player.setActiveForLockScreen(
        true,
        {
          title: currentTrack.title,
          artist: getTrackArtistName(currentTrack),
          albumTitle: getTrackAlbumTitle(currentTrack),
          artworkUrl: currentTrack.artworkUri ?? undefined,
        },
        {
          showSeekForward: isAudiobook,
          showSeekBackward: isAudiobook,
        },
      );
    } catch {
      // Lock screen controls are best-effort; playback itself is unaffected.
    }
  }, [currentTrack, player]);

  // Replace the source on the shared player and start each newly selected track.
  useEffect(() => {
    if (!currentTrack) {
      return;
    }

    player.replace(currentTrack.uri);
    player.play();

    const saved = resumePositions.current[currentTrack.id];
    const durationSeconds = currentTrack.durationMs > 0 ? currentTrack.durationMs / 1000 : 0;

    if (
      getTrackMediaType(currentTrack) === 'audiobook' &&
      saved !== undefined &&
      saved >= MIN_RESUME_SECONDS &&
      (durationSeconds <= 0 || saved < durationSeconds - RESUME_END_MARGIN_SECONDS)
    ) {
      void player.seekTo(saved).catch(() => {
        // Resuming is best-effort; playback already started from the top.
      });
    }
  }, [currentTrack?.id, currentTrack?.uri, player]);

  // Apply the speed saved for the current media type whenever the track or the
  // chosen rate changes. Music and audiobooks keep separate speeds.
  useEffect(() => {
    try {
      player.setPlaybackRate(playbackRate, 'high');
    } catch {
      // Playback speed is best-effort; playback itself is unaffected.
    }
  }, [currentTrack?.id, playbackRate, player]);

  // Keep the saved audiobook position fresh while it plays.
  useEffect(() => {
    if (
      !currentTrack ||
      getTrackMediaType(currentTrack) !== 'audiobook' ||
      !status.playing
    ) {
      return;
    }

    const now = Date.now();

    if (now - lastResumeSaveAt.current < RESUME_SAVE_INTERVAL_MS) {
      return;
    }

    lastResumeSaveAt.current = now;
    storeResumePosition(currentTrack, status.currentTime);
  }, [currentTrack, status.currentTime, status.playing, storeResumePosition]);

  // Save the position when playback pauses or the track changes.
  useEffect(() => {
    if (!currentTrack) {
      return;
    }

    return () => {
      storeResumePosition(currentTrack, player.currentTime);
    };
  }, [currentTrack?.id, player, storeResumePosition]);

  // Pausing through the UI, the lock screen, or a finished book all preserve
  // the position the user stopped at.
  const wasPlaying = useRef(status.playing);

  useEffect(() => {
    if (wasPlaying.current && !status.playing && currentTrack) {
      storeResumePosition(currentTrack, status.currentTime);
    }

    wasPlaying.current = status.playing;
  }, [currentTrack, status.currentTime, status.playing, storeResumePosition]);

  useEffect(() => {
    return () => {
      try {
        player.clearLockScreenControls();
      } catch {
        // The player may already be released while the provider unmounts.
      }
    };
  }, [player]);

  // Sleep timers belong to audiobook listening. If the queue moves on to a
  // music track, clear the timer rather than pausing unexpectedly later.
  useEffect(() => {
    if (sleepTimer.mode === 'off') {
      return;
    }

    if (!currentTrack || getTrackMediaType(currentTrack) !== 'audiobook') {
      setSleepTimerState({ mode: 'off' });
    }
  }, [currentTrack, sleepTimer.mode]);

  // Pause playback when a countdown sleep timer reaches zero.
  useEffect(() => {
    if (sleepTimer.mode !== 'duration') {
      return;
    }

    const remaining = sleepTimer.endsAt - Date.now();

    if (remaining <= 0) {
      player.pause();
      setSleepTimerState({ mode: 'off' });
      return;
    }

    const timeout = setTimeout(() => {
      player.pause();
      setSleepTimerState({ mode: 'off' });
    }, remaining);

    return () => clearTimeout(timeout);
  }, [player, sleepTimer]);

  // Advance through the queue when a track reaches its end.
  useEffect(() => {
    if (!status.didJustFinish) {
      finishHandled.current = false;
      return;
    }

    if (!currentTrack || finishHandled.current) {
      return;
    }

    finishHandled.current = true;

    // A finished audiobook starts from the beginning the next time it is
    // opened instead of resuming at the very end.
    clearResumePosition(currentTrack.id);

    // "End of track" is the sleep timer for listeners who want to stop at a
    // chapter boundary rather than mid-sentence.
    if (sleepTimer.mode === 'endOfTrack') {
      player.pause();
      setSleepTimerState({ mode: 'off' });
      void player.seekTo(0);
      return;
    }

    if (repeatMode === 'one' || (repeatMode === 'all' && queue.length <= 1)) {
      void player.seekTo(0).then(() => player.play());
      return;
    }

    if (currentIndex < queue.length - 1) {
      setCurrentIndex((index) => (index < queue.length - 1 ? index + 1 : index));
      return;
    }

    if (repeatMode === 'all') {
      setCurrentIndex(0);
      return;
    }

    player.pause();
    void player.seekTo(0);

    // Nothing else will play, so a countdown timer no longer has a purpose.
    if (sleepTimer.mode !== 'off') {
      setSleepTimerState({ mode: 'off' });
    }
  }, [
    clearResumePosition,
    currentTrack,
    currentIndex,
    player,
    queue.length,
    repeatMode,
    sleepTimer.mode,
    status.didJustFinish,
  ]);

  // Restore the history once; merge with items played while it was loading.
  useEffect(() => {
    let cancelled = false;

    loadRecentlyPlayedItems().then((stored) => {
      if (cancelled) {
        return;
      }

      setRecentItems((current) => mergeRecentItems(current, stored));
      setHistoryLoaded(true);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  // Any track that becomes current has been played: the next/previous controls,
  // auto-advance, or an audiobook chapter reached the same way. Album and
  // artist playback records its source when it starts instead.
  useEffect(() => {
    if (!currentTrackId || activeRecentSource.current) {
      return;
    }

    recordRecentItem({ kind: 'track', id: currentTrackId });
  }, [currentTrackId, recordRecentItem]);

  // Saved only after hydration so the initial empty list cannot erase history.
  useEffect(() => {
    if (!historyLoaded) {
      return;
    }

    void saveRecentlyPlayedItems(recentItems).catch(() => {
      // History is best-effort; playback itself is unaffected.
    });
  }, [historyLoaded, recentItems]);

  /** Resumes or restarts a track that is already current. */
  const resumeIfCurrent = useCallback(
    (track: Track) => {
      if (currentTrack?.id !== track.id) {
        return;
      }

      if (player.duration > 0 && player.currentTime >= player.duration - 0.25) {
        void player.seekTo(0).then(() => player.play());
      } else {
        player.play();
      }
    },
    [currentTrack?.id, player],
  );

  /** Replaces the queue and opens the player with the given track selected. */
  const startQueue = useCallback(
    (items: readonly Track[], track: Track) => {
      const nextQueue = [...items];
      let index = nextQueue.findIndex((item) => item.id === track.id);

      if (index === -1) {
        nextQueue.unshift(track);
        index = 0;
      }

      if (shuffleEnabled && nextQueue.length > 1) {
        unshuffledQueue.current = { queue: nextQueue, index };
        setQueue(shuffleQueue(nextQueue, track));
        setCurrentIndex(0);
      } else {
        unshuffledQueue.current = null;
        setQueue(nextQueue);
        setCurrentIndex(index);
      }

      setIsVisible(true);
    },
    [shuffleEnabled],
  );

  const playTrack = useCallback(
    (track: Track, nextQueue?: readonly Track[]) => {
      const items = nextQueue && nextQueue.length > 0 ? [...nextQueue] : [track];
      activeRecentSource.current = null;
      startQueue(items, track);
      resumeIfCurrent(track);
    },
    [resumeIfCurrent, startQueue],
  );

  const playAlbum = useCallback(
    (albumId: string) => {
      const items = getAlbumTracks(libraryTracks, albumId);
      const first = items[0];

      if (!first) {
        return;
      }

      const source: RecentItem = { kind: 'album', id: albumId };
      activeRecentSource.current = source;
      recordRecentItem(source);
      startQueue(items, first);
      resumeIfCurrent(first);
    },
    [libraryTracks, recordRecentItem, resumeIfCurrent, startQueue],
  );

  const playArtist = useCallback(
    (artistName: string) => {
      const items = getArtistTracks(libraryTracks, artistName);
      const first = items[0];

      if (!first) {
        return;
      }

      const source: RecentItem = { kind: 'artist', name: artistName };
      activeRecentSource.current = source;
      recordRecentItem(source);
      startQueue(items, first);
      resumeIfCurrent(first);
    },
    [libraryTracks, recordRecentItem, resumeIfCurrent, startQueue],
  );

  const playQueueItem = useCallback(
    (index: number) => {
      const track = queue[index];

      if (!track) {
        return;
      }

      if (currentTrack?.id === track.id) {
        if (player.duration > 0 && player.currentTime >= player.duration - 0.25) {
          void player.seekTo(0).then(() => player.play());
        } else {
          player.play();
        }
        return;
      }

      setCurrentIndex(index);
    },
    [currentTrack?.id, player, queue],
  );

  const removeQueueItem = useCallback(
    (index: number) => {
      if (index < 0 || index >= queue.length) {
        return;
      }

      if (queue.length === 1) {
        player.pause();
        try {
          player.clearLockScreenControls();
        } catch {
          // The controls may already be gone.
        }
        unshuffledQueue.current = null;
        setQueue([]);
        setCurrentIndex(-1);
        setIsVisible(false);
        return;
      }

      const nextQueue = queue.filter((_, itemIndex) => itemIndex !== index);

      if (index === currentIndex) {
        setCurrentIndex(Math.min(index, nextQueue.length - 1));
      } else if (index < currentIndex) {
        setCurrentIndex(currentIndex - 1);
      }

      unshuffledQueue.current = null;
      setQueue(nextQueue);
    },
    [currentIndex, player, queue],
  );

  const moveQueueItem = useCallback(
    (from: number, to: number) => {
      if (
        from === to ||
        from < 0 ||
        to < 0 ||
        from >= queue.length ||
        to >= queue.length
      ) {
        return;
      }

      const nextQueue = [...queue];
      const [moved] = nextQueue.splice(from, 1);

      if (!moved) {
        return;
      }

      nextQueue.splice(to, 0, moved);
      unshuffledQueue.current = null;
      setQueue(nextQueue);
      setCurrentIndex((index) => {
        if (index === from) {
          return to;
        }

        if (from < index && to >= index) {
          return index - 1;
        }

        if (from > index && to <= index) {
          return index + 1;
        }

        return index;
      });
    },
    [queue],
  );

  const openPlayer = useCallback(() => {
    setIsVisible(true);
  }, []);

  const minimizePlayer = useCallback(() => {
    setIsVisible(false);
  }, []);

  const togglePlayback = useCallback(() => {
    if (!currentTrack) {
      return;
    }

    if (player.playing) {
      player.pause();
      return;
    }

    if (player.duration > 0 && player.currentTime >= player.duration - 0.25) {
      void player.seekTo(0).then(() => player.play());
      return;
    }

    player.play();
  }, [currentTrack, player]);

  const seekTo = useCallback(
    (seconds: number) => {
      const maxDuration =
        player.duration > 0 ? player.duration : (currentTrack?.durationMs ?? 0) / 1000;
      const target =
        maxDuration > 0 ? Math.min(Math.max(seconds, 0), maxDuration) : Math.max(seconds, 0);

      void player.seekTo(target);
    },
    [currentTrack?.durationMs, player],
  );

  const seekForward = useCallback(() => {
    if (!currentTrack) return;
    const maxDuration =
      player.duration > 0 ? player.duration : (currentTrack?.durationMs ?? 0) / 1000;
    const target = Math.min(player.currentTime + 10, maxDuration);
    void player.seekTo(target);
  }, [currentTrack?.durationMs, player]);

  const seekBackward = useCallback(() => {
    if (!currentTrack) return;
    const target = Math.max(player.currentTime - 10, 0);
    void player.seekTo(target);
  }, [player]);

  const playNext = useCallback(() => {
    setCurrentIndex((index) => {
      if (index < queue.length - 1) {
        return index + 1;
      }

      if (repeatMode === 'all' && queue.length > 1) {
        return 0;
      }

      return index;
    });
  }, [queue.length, repeatMode]);

  const playPrevious = useCallback(() => {
    if (currentIndex < 0) {
      return;
    }

    if (player.currentTime > 3) {
      void player.seekTo(0);
      return;
    }

    // The first track has no previous one; restart it instead of doing nothing.
    if (currentIndex === 0 && !(repeatMode === 'all' && queue.length > 1)) {
      void player.seekTo(0);
      return;
    }

    setCurrentIndex((index) => {
      if (index > 0) {
        return index - 1;
      }

      if (repeatMode === 'all' && queue.length > 1) {
        return queue.length - 1;
      }

      return index;
    });
  }, [currentIndex, player, queue.length, repeatMode]);

  const toggleShuffle = useCallback(() => {
    if (shuffleEnabled) {
      const saved = unshuffledQueue.current;
      const currentId = currentTrack?.id;

      if (saved && currentId) {
        const index = saved.queue.findIndex((track) => track.id === currentId);

        if (index !== -1) {
          setQueue(saved.queue);
          setCurrentIndex(index);
        }
      }

      unshuffledQueue.current = null;
      setShuffleEnabled(false);
      return;
    }

    if (queue.length > 0) {
      unshuffledQueue.current = { queue: [...queue], index: currentIndex };
      setQueue(shuffleQueue(queue, currentTrack ?? undefined));
      setCurrentIndex(0);
    }

    setShuffleEnabled(true);
  }, [currentIndex, currentTrack, queue, shuffleEnabled]);

  const cycleRepeatMode = useCallback(() => {
    setRepeatMode((mode) => (mode === 'off' ? 'all' : mode === 'all' ? 'one' : 'off'));
  }, []);

  const setPlaybackRate = useCallback(
    (rate: number) => {
      if (!currentMediaType) {
        return;
      }

      const nextRate = normalizePlaybackRate(rate);
      const nextRates = { ...playbackRates, [currentMediaType]: nextRate };

      setPlaybackRates(nextRates);
      void savePlaybackRates(nextRates).catch(() => {
        // Keep the chosen speed for this session even if it cannot be saved.
      });
    },
    [currentMediaType, playbackRates],
  );

  const setSleepTimer = useCallback((minutes: number | null) => {
    if (minutes === null || minutes <= 0) {
      setSleepTimerState({ mode: 'off' });
      return;
    }

    setSleepTimerState({
      mode: 'duration',
      minutes,
      endsAt: Date.now() + minutes * 60_000,
    });
  }, []);

  const setSleepTimerToEndOfTrack = useCallback(() => {
    setSleepTimerState({ mode: 'endOfTrack' });
  }, []);

  const value = useMemo(
    () => ({
      currentTrack,
      queue,
      currentIndex,
      isPlaying: status.playing,
      isVisible,
      shuffleEnabled,
      repeatMode,
      playbackRate,
      sleepTimer,
      canGoNext,
      canGoPrevious,
      recentlyPlayed: recentItems,
      playTrack,
      playAlbum,
      playArtist,
      playQueueItem,
      removeQueueItem,
      moveQueueItem,
      openPlayer,
      minimizePlayer,
      togglePlayback,
      playNext,
      playPrevious,
      toggleShuffle,
      cycleRepeatMode,
      setPlaybackRate,
      setSleepTimer,
      setSleepTimerToEndOfTrack,
      seekForward,
      seekBackward,
      seekTo,
    }),
    [
      currentTrack,
      queue,
      currentIndex,
      status.playing,
      isVisible,
      shuffleEnabled,
      repeatMode,
      playbackRate,
      sleepTimer,
      canGoNext,
      canGoPrevious,
      recentItems,
      playTrack,
      playAlbum,
      playArtist,
      playQueueItem,
      removeQueueItem,
      moveQueueItem,
      openPlayer,
      minimizePlayer,
      togglePlayback,
      playNext,
      playPrevious,
      toggleShuffle,
      cycleRepeatMode,
      setPlaybackRate,
      setSleepTimer,
      setSleepTimerToEndOfTrack,
      seekForward,
      seekBackward,
      seekTo,
    ],
  );

  // Kept separate so 250 ms position updates only re-render the player modal.
  const progress = useMemo(
    () => ({
      position: status.currentTime,
      duration:
        status.duration > 0 ? status.duration : (currentTrack?.durationMs ?? 0) / 1000,
      error: status.error,
    }),
    [currentTrack?.durationMs, status.currentTime, status.duration, status.error],
  );

  return (
    <PlayerContext.Provider value={value}>
      <PlayerProgressContext.Provider value={progress}>
        {children}
      </PlayerProgressContext.Provider>
    </PlayerContext.Provider>
  );
}

/** Keeps a requested rate inside the range both Android and iOS support. */
function normalizePlaybackRate(rate: number): number {
  if (!Number.isFinite(rate)) {
    return 1;
  }

  return Math.min(Math.max(rate, 0.5), 2);
}

/** Shuffles tracks with Fisher-Yates, optionally keeping one track first. */
function shuffleQueue(items: readonly Track[], first?: Track): Track[] {
  const rest = items.filter((track) => track.id !== first?.id);

  for (let index = rest.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    const current = rest[index]!;
    rest[index] = rest[swapIndex]!;
    rest[swapIndex] = current;
  }

  return first ? [first, ...rest] : rest;
}

function mergeRecentItems(
  current: readonly RecentItem[],
  stored: readonly RecentItem[],
): RecentItem[] {
  const seen = new Set<string>();
  const merged: RecentItem[] = [];

  for (const item of [...current, ...stored]) {
    const key = recentItemKey(item);

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    merged.push(item);

    if (merged.length >= RECENT_HISTORY_LIMIT) {
      break;
    }
  }

  return merged;
}

export function usePlayer(): PlayerContextValue {
  const value = useContext(PlayerContext);

  if (!value) {
    throw new Error('usePlayer must be used inside a PlayerProvider');
  }

  return value;
}

export function usePlayerProgress(): PlayerProgress {
  const value = useContext(PlayerProgressContext);

  if (!value) {
    throw new Error('usePlayerProgress must be used inside a PlayerProvider');
  }

  return value;
}
