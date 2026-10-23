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
import { scanMusicDirectory } from '../music/scanMusicDirectory';

export type ScanStatus = 'restoring' | 'idle' | 'scanning' | 'ready' | 'error';

type LibraryContextValue = {
  tracks: Track[];
  status: ScanStatus;
  error: string | null;
  updateLibrary: () => Promise<void>;
};

const LibraryContext = createContext<LibraryContextValue | null>(null);

export function LibraryProvider({ children }: { children: ReactNode }) {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [status, setStatus] = useState<ScanStatus>('restoring');
  const [error, setError] = useState<string | null>(null);
  const updateStarted = useRef(false);

  useEffect(() => {
    let cancelled = false;

    loadStoredLibrary().then((stored) => {
      if (cancelled || updateStarted.current) {
        return;
      }

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

  const value = useMemo(
    () => ({ tracks, status, error, updateLibrary }),
    [tracks, status, error, updateLibrary],
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
