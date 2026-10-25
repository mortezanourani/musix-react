import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'musix.audiobooks.v1';

/** Loads the set of album IDs marked as audiobooks. */
export async function loadAudiobookAlbumIds(): Promise<Set<string>> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);

    if (!raw) {
      return new Set();
    }

    const parsed: unknown = JSON.parse(raw);

    if (!Array.isArray(parsed)) {
      return new Set();
    }

    return new Set(parsed.filter((id): id is string => typeof id === 'string'));
  } catch {
    return new Set();
  }
}

/** Persists the set of album IDs marked as audiobooks. */
export async function saveAudiobookAlbumIds(albumIds: ReadonlySet<string>): Promise<void> {
  const payload = Array.from(albumIds);
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
}