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
  /** Replaces the set of albums shown under Books. Reverts when saving fails. */
  setAudiobookAlbums: (albumIds: ReadonlySet<string>) => Promise<void>;
};

const LibraryContext = createContext<LibraryContextValue | null>(null);

export function LibraryProvider({ children }: { children: ReactNode }) {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [status, setStatus] = useState<ScanStatus>('restoring');
  const [error, setError] = useState<string | null>(null);
  const [audiobookAlbumIds, setAudiobookAlbumIds] = useState<Set<string>>(new Set());
  const audiobookAlbumIdsRef = useRef<ReadonlySet<string>>(new Set());
  const updateStarted = useRef(false);

  const applyAudiobookAlbumIds = useCallback((albumIds: ReadonlySet<string>) => {
    audiobookAlbumIdsRef.current = albumIds;
    setAudiobookAlbumIds(albumIds instanceof Set ? albumIds : new Set(albumIds));
  }, []);

  useEffect(() => {
    let cancelled = false;

    Promise.all([loadStoredLibrary(), loadAudiobookAlbumIds()]).then(([stored, audiobookIds]) => {
      if (cancelled || updateStarted.current) {
        return;
      }

      applyAudiobookAlbumIds(audiobookIds);

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
  }, [applyAudiobookAlbumIds]);

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

  const setAudiobookAlbums = useCallback(
    async (albumIds: ReadonlySet<string>) => {
      const previous = audiobookAlbumIdsRef.current;
      const next = new Set(albumIds);

      applyAudiobookAlbumIds(next);

      try {
        await saveAudiobookAlbumIds(next);
      } catch (cause) {
        applyAudiobookAlbumIds(previous);
        throw cause;
      }
    },
    [applyAudiobookAlbumIds],
  );

  const value = useMemo(
    () => ({ tracks, status, error, updateLibrary, audiobookAlbumIds, setAudiobookAlbums }),
    [tracks, status, error, updateLibrary, audiobookAlbumIds, setAudiobookAlbums],
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
