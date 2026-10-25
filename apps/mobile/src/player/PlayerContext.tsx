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

type PlayerContextValue = {
  currentTrack: Track | null;
  queue: readonly Track[];
  currentIndex: number;
  isPlaying: boolean;
  isVisible: boolean;
  /** Opens the player modal and starts the track, optionally with a queue. */
  playTrack: (track: Track, queue?: readonly Track[]) => void;
  /** Reopens the full player modal without changing playback. */
  openPlayer: () => void;
  /** Hides the modal and leaves playback running in the mini-player. */
  minimizePlayer: () => void;
  togglePlayback: () => void;
  playNext: () => void;
  playPrevious: () => void;
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
  const finishedTrackId = useRef<string | null>(null);

  const currentTrack = currentIndex >= 0 ? queue[currentIndex] ?? null : null;

  // Changing the source recreates the native player, which loads the new file.
  const player = useAudioPlayer(currentTrack?.uri ?? null, { updateInterval: 250 });
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
      return;
    }

    try {
      player.setActiveForLockScreen(
        true,
        {
          title: currentTrack.title,
          artist: getTrackArtistName(currentTrack),
          albumTitle: getTrackAlbumTitle(currentTrack),
          artworkUrl: currentTrack.artworkUri ?? undefined,
        },
        { showSeekForward: true, showSeekBackward: true },
      );
    } catch {
      // Lock screen controls are best-effort; playback itself is unaffected.
    }

    return () => {
      try {
        player.clearLockScreenControls();
      } catch {
        // The player may already be released while switching tracks.
      }
    };
  }, [currentTrack, player]);

  // Start every newly selected track; reopening the same track is handled by playTrack.
  useEffect(() => {
    if (currentTrack) {
      player.play();
    }
  }, [currentTrack, player]);

  // Advance through the queue when a track reaches its end.
  useEffect(() => {
    if (!status.didJustFinish) {
      finishedTrackId.current = null;
      return;
    }

    if (!currentTrack || finishedTrackId.current === currentTrack.id) {
      return;
    }

    finishedTrackId.current = currentTrack.id;

    if (currentIndex < queue.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      player.pause();
      void player.seekTo(0);
    }
  }, [currentTrack, currentIndex, player, queue.length, status.didJustFinish]);

  const playTrack = useCallback(
    (track: Track, nextQueue?: readonly Track[]) => {
      const items = nextQueue && nextQueue.length > 0 ? [...nextQueue] : [track];
      let index = items.findIndex((item) => item.id === track.id);

      if (index === -1) {
        items.unshift(track);
        index = 0;
      }

      setQueue(items);
      setCurrentIndex(index);
      setIsVisible(true);

      if (currentTrack?.id === track.id) {
        if (player.duration > 0 && player.currentTime >= player.duration - 0.25) {
          void player.seekTo(0).then(() => player.play());
        } else {
          player.play();
        }
      }
    },
    [currentTrack?.id, player],
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

  const playNext = useCallback(() => {
    setCurrentIndex((index) => (index < queue.length - 1 ? index + 1 : index));
  }, [queue.length]);

  const playPrevious = useCallback(() => {
    if (player.currentTime > 3 || currentIndex <= 0) {
      void player.seekTo(0);
      return;
    }

    setCurrentIndex(currentIndex - 1);
  }, [currentIndex, player]);

  const value = useMemo(
    () => ({
      currentTrack,
      queue,
      currentIndex,
      isPlaying: status.playing,
      isVisible,
      playTrack,
      openPlayer,
      minimizePlayer,
      togglePlayback,
      playNext,
      playPrevious,
      seekTo,
    }),
    [
      currentTrack,
      queue,
      currentIndex,
      status.playing,
      isVisible,
      playTrack,
      openPlayer,
      minimizePlayer,
      togglePlayback,
      playNext,
      playPrevious,
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
