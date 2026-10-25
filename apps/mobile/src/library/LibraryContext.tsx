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
import type { Track } from '@musix/core';
import { loadStoredLibrary, saveStoredLibrary } from './libraryStorage';
import { loadAudiobookAlbumIds, saveAudiobookAlbumIds } from './audiobookStorage';
import { scanMusicDirectory } from '../music/scanMusicDirectory';

export type ScanStatus = 'restoring' | 'idle' | 'scanning' | 'ready' | 'error';

type LibraryContextValue = {
  tracks: Track[];
  status: ScanStatus;
  error: string | null;
  updateLibrary: () => Promise<void>;
  audiobookAlbumIds: ReadonlySet<string>;
  toggleAudiobookAlbum: (albumId: string) => Promise<void>;
};

const LibraryContext = createContext<LibraryContextValue | null>(null);

export function LibraryProvider({ children }: { children: ReactNode }) {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [status, setStatus] = useState<ScanStatus>('restoring');
  const [error, setError] = useState<string | null>(null);
  const [audiobookAlbumIds, setAudiobookAlbumIds] = useState<Set<string>>(new Set());
  const updateStarted = useRef(false);

  useEffect(() => {
    let cancelled = false;

    Promise.all([loadStoredLibrary(), loadAudiobookAlbumIds()]).then(([stored, audiobookIds]) => {
      if (cancelled || updateStarted.current) {
        return;
      }

      setAudiobookAlbumIds(audiobookIds);

      if (stored.length > 0) {
        setTracks(stored);
        setStatus('ready');
      } else {
        setStatus('idle');
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const updateLibrary = useCallback(async () => {
    updateStarted.current = true;
    setStatus('scanning');
    setError(null);

    try {
      const found = await scanMusicDirectory();
      setTracks(found);
      setStatus('ready');

      try {
        await saveStoredLibrary(found);
      } catch {
        // Keep the freshly scanned library in memory even if saving fails.
      }
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : 'Something went wrong while reading the Music directory.',
      );
      setStatus('error');
    }
  }, []);

  const toggleAudiobookAlbum = useCallback(async (albumId: string) => {
    setAudiobookAlbumIds((prev) => {
      const next = new Set(prev);
      if (next.has(albumId)) {
        next.delete(albumId);
      } else {
        next.add(albumId);
      }
      // Fire and forget persistence
      saveAudiobookAlbumIds(next);
      return next;
    });
  }, []);

  const value = useMemo(
    () => ({ tracks, status, error, updateLibrary, audiobookAlbumIds, toggleAudiobookAlbum }),
    [tracks, status, error, updateLibrary, audiobookAlbumIds, toggleAudiobookAlbum],
  );

  return <LibraryContext.Provider value={value}>{children}</LibraryContext.Provider>;
}

export function useLibrary(): LibraryContextValue {
  const value = useContext(LibraryContext);

  if (!value) {
    throw new Error('useLibrary must be used inside a LibraryProvider');
  }

  return value;
}
