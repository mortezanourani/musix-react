import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'musix.recentlyPlayed.v2';
const LEGACY_STORAGE_KEY = 'musix.recentlyPlayed.v1';

/** A recently played album, artist, or track. */
export type RecentItem =
  | { kind: 'track'; id: string }
  | { kind: 'album'; id: string }
  | { kind: 'artist'; name: string };

/** Stable identity used to de-duplicate entries in the history. */
export function recentItemKey(item: RecentItem): string {
  switch (item.kind) {
    case 'track':
      return `track:${item.id}`;
    case 'album':
      return `album:${item.id}`;
    case 'artist':
      return `artist:${item.name.toLocaleLowerCase()}`;
  }
}

/** Loads recent items, newest first, migrating legacy track-only history. */
export async function loadRecentlyPlayedItems(): Promise<RecentItem[]> {
  const stored = await readItems(STORAGE_KEY);

  if (stored !== null) {
    return stored;
  }

  return (await readLegacyTrackIds()).map((id) => ({ kind: 'track', id }));
}

/** Persists recent items in play order (newest first). */
export async function saveRecentlyPlayedItems(items: readonly RecentItem[]): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

async function readItems(key: string): Promise<RecentItem[] | null> {
  try {
    const raw = await AsyncStorage.getItem(key);

    if (!raw) {
      return null;
    }

    const parsed: unknown = JSON.parse(raw);

    if (!Array.isArray(parsed)) {
      return null;
    }

    const seen = new Set<string>();
    const items: RecentItem[] = [];

    for (const value of parsed) {
      const item = parseRecentItem(value);

      if (!item) {
        continue;
      }

      const key = recentItemKey(item);

      if (seen.has(key)) {
        continue;
      }

      seen.add(key);
      items.push(item);
    }

    return items;
  } catch {
    return null;
  }
}

function parseRecentItem(value: unknown): RecentItem | null {
  if (typeof value !== 'object' || value === null) {
    return null;
  }

  const candidate = value as { kind?: unknown; id?: unknown; name?: unknown };

  if (candidate.kind === 'track' && typeof candidate.id === 'string' && candidate.id) {
    return { kind: 'track', id: candidate.id };
  }

  if (candidate.kind === 'album' && typeof candidate.id === 'string' && candidate.id) {
    return { kind: 'album', id: candidate.id };
  }

  if (candidate.kind === 'artist' && typeof candidate.name === 'string' && candidate.name) {
    return { kind: 'artist', name: candidate.name };
  }

  return null;
}

async function readLegacyTrackIds(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(LEGACY_STORAGE_KEY);

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
      if (typeof value !== 'string' || !value || seen.has(value)) {
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
