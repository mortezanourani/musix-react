import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Track } from '@musix/core';

const STORAGE_KEY = 'musix.library.v1';
const STORAGE_VERSION = 1;

type StoredLibrary = {
  version: number;
  savedAt: number;
  tracks: Track[];
};

/** Restores the last scanned library, or an empty list when nothing is saved. */
export async function loadStoredLibrary(): Promise<Track[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);

    if (!raw) {
      return [];
    }

    const parsed: unknown = JSON.parse(raw);

    if (!isRecord(parsed) || parsed.version !== STORAGE_VERSION || !Array.isArray(parsed.tracks)) {
      return [];
    }

    return parsed.tracks.filter(isTrack);
  } catch {
    return [];
  }
}

/** Persists the scanned library so the pages survive an app restart. */
export async function saveStoredLibrary(tracks: readonly Track[]): Promise<void> {
  const payload: StoredLibrary = {
    version: STORAGE_VERSION,
    savedAt: Date.now(),
    tracks: [...tracks],
  };

  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isTrack(value: unknown): value is Track {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.uri === 'string' &&
    typeof value.title === 'string' &&
    typeof value.filename === 'string' &&
    typeof value.folder === 'string' &&
    typeof value.durationMs === 'number'
  );
}
