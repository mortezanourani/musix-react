import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import type { Track } from '@musix/core';
import { scanMusicDirectory } from '../music/scanMusicDirectory';

export type ScanStatus = 'idle' | 'scanning' | 'ready' | 'error';

type LibraryContextValue = {
  tracks: Track[];
  status: ScanStatus;
  error: string | null;
  updateLibrary: () => Promise<void>;
};

const LibraryContext = createContext<LibraryContextValue | null>(null);

export function LibraryProvider({ children }: { children: ReactNode }) {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [status, setStatus] = useState<ScanStatus>('idle');
  const [error, setError] = useState<string | null>(null);

  const updateLibrary = useCallback(async () => {
    setStatus('scanning');
    setError(null);

    try {
      const found = await scanMusicDirectory();
      setTracks(found);
      setStatus('ready');
    } catch (cause) {
      setTracks([]);
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
