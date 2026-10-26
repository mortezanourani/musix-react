import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'musix.recentlyPlayed.v1';

/** Loads played track IDs, newest first, or an empty list when nothing is saved. */
export async function loadRecentlyPlayedTrackIds(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);

    if (!raw) {
      return [];
    }

    const parsed: unknown = JSON.parse(raw);

    if (!Array.isArray(parsed)) {
      return [];
    }

    const seen = new Set<string>();
    const trackIds: string[] = [];

    for (const value of parsed) {
      if (typeof value !== 'string' || seen.has(value)) {
        continue;
      }

      seen.add(value);
      trackIds.push(value);
    }

    return trackIds;
  } catch {
    return [];
  }
}

/** Persists played track IDs in play order (newest first). */
export async function saveRecentlyPlayedTrackIds(trackIds: readonly string[]): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(trackIds));
}
