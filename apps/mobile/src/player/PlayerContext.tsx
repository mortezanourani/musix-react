import { getTrackAlbumTitle, getTrackArtistName, type Track } from '@musix/core';
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
import {
  loadRecentlyPlayedTrackIds,
  saveRecentlyPlayedTrackIds,
} from './recentlyPlayedStorage';

/** How many entries the listening history keeps. */
const RECENT_HISTORY_LIMIT = 65;

export type RepeatMode = 'off' | 'all' | 'one';

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
  /** False when there is no next track and repeat is off. */
  canGoNext: boolean;
  /** Whether the previous control is available; it restarts the first track. */
  canGoPrevious: boolean;
  /** Track IDs in the order they were played, newest first. */
  recentlyPlayedTrackIds: readonly string[];
  /** Opens the player modal and starts the track, optionally with a queue. */
  playTrack: (track: Track, queue?: readonly Track[]) => void;
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
  const [queue, setQueue] = useState<Track[]>([]);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [isVisible, setIsVisible] = useState(false);
  const [shuffleEnabled, setShuffleEnabled] = useState(false);
  const [repeatMode, setRepeatMode] = useState<RepeatMode>('off');
  const [recentlyPlayedTrackIds, setRecentlyPlayedTrackIds] = useState<string[]>([]);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const finishHandled = useRef(false);
  // The order to restore when shuffle is turned off again.
  const unshuffledQueue = useRef<{ queue: Track[]; index: number } | null>(null);
  const currentTrack = currentIndex >= 0 ? queue[currentIndex] ?? null : null;
  const currentTrackId = currentTrack?.id ?? null;

  const canGoNext =
    currentIndex >= 0 &&
    (currentIndex < queue.length - 1 || (repeatMode === 'all' && queue.length > 1));
  const canGoPrevious = currentIndex >= 0;

  // Keep one native player for the whole queue so lock-screen controls have one owner.
  const player = useAudioPlayer(null, { updateInterval: 250 });
  const status = useAudioPlayerStatus(player);

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
          showNextTrack: canGoNext,
          showPreviousTrack: canGoPrevious,
        },
      );
    } catch {
      // Lock screen controls are best-effort; playback itself is unaffected.
    }
  }, [canGoNext, canGoPrevious, currentTrack, player]);

  // Replace the source on the shared player and start each newly selected track.
  useEffect(() => {
    if (currentTrack) {
      player.replace(currentTrack.uri);
      player.play();
    }
  }, [currentTrack?.id, currentTrack?.uri, player]);

  useEffect(() => {
    return () => {
      try {
        player.clearLockScreenControls();
      } catch {
        // The player may already be released while the provider unmounts.
      }
    };
  }, [player]);

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
  }, [currentTrack, currentIndex, player, queue.length, repeatMode, status.didJustFinish]);

  // Restore the history once; merge with tracks played while it was loading.
  useEffect(() => {
    let cancelled = false;

    loadRecentlyPlayedTrackIds().then((stored) => {
      if (cancelled) {
        return;
      }

      setRecentlyPlayedTrackIds((current) => mergeRecentTrackIds(current, stored));
      setHistoryLoaded(true);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  // Any track that becomes current has been played: a tap, the next/previous
  // controls, auto-advance, or an audiobook chapter reached the same way.
  useEffect(() => {
    if (!currentTrackId) {
      return;
    }

    setRecentlyPlayedTrackIds((previous) => {
      if (previous[0] === currentTrackId) {
        return previous;
      }

      return [
        currentTrackId,
        ...previous.filter((trackId) => trackId !== currentTrackId),
      ].slice(0, RECENT_HISTORY_LIMIT);
    });
  }, [currentTrackId]);

  // Saved only after hydration so the initial empty list cannot erase history.
  useEffect(() => {
    if (!historyLoaded) {
      return;
    }

    void saveRecentlyPlayedTrackIds(recentlyPlayedTrackIds).catch(() => {
      // History is best-effort; playback itself is unaffected.
    });
  }, [historyLoaded, recentlyPlayedTrackIds]);

  const playTrack = useCallback(
    (track: Track, nextQueue?: readonly Track[]) => {
      const items = nextQueue && nextQueue.length > 0 ? [...nextQueue] : [track];
      let index = items.findIndex((item) => item.id === track.id);

      if (index === -1) {
        items.unshift(track);
        index = 0;
      }

      if (shuffleEnabled && items.length > 1) {
        unshuffledQueue.current = { queue: items, index };
        setQueue(shuffleQueue(items, track));
        setCurrentIndex(0);
      } else {
        unshuffledQueue.current = null;
        setQueue(items);
        setCurrentIndex(index);
      }

      setIsVisible(true);

      if (currentTrack?.id === track.id) {
        if (player.duration > 0 && player.currentTime >= player.duration - 0.25) {
          void player.seekTo(0).then(() => player.play());
        } else {
          player.play();
        }
      }
    },
    [currentTrack?.id, player, shuffleEnabled],
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

  const playNextRef = useRef<() => void>(() => {});
  const playPreviousRef = useRef<() => void>(() => {});

  useEffect(() => {
    playNextRef.current = playNext;
    playPreviousRef.current = playPrevious;
  }, [playNext, playPrevious]);

  // Transport buttons on the lock screen / notification advance the queue.
  useEffect(() => {
    const nextSubscription = player.addListener('lockScreenNext', () => playNextRef.current());
    const previousSubscription = player.addListener('lockScreenPrevious', () =>
      playPreviousRef.current(),
    );

    return () => {
      nextSubscription.remove();
      previousSubscription.remove();
    };
  }, [player]);

  const value = useMemo(
    () => ({
      currentTrack,
      queue,
      currentIndex,
      isPlaying: status.playing,
      isVisible,
      shuffleEnabled,
      repeatMode,
      canGoNext,
      canGoPrevious,
      recentlyPlayedTrackIds,
      playTrack,
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
      canGoNext,
      canGoPrevious,
      recentlyPlayedTrackIds,
      playTrack,
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

function mergeRecentTrackIds(
  current: readonly string[],
  stored: readonly string[],
): string[] {
  const seen = new Set<string>();
  const merged: string[] = [];

  for (const trackId of [...current, ...stored]) {
    if (seen.has(trackId)) {
      continue;
    }

    seen.add(trackId);
    merged.push(trackId);

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
