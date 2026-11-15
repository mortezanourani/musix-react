import AsyncStorage from '@react-native-async-storage/async-storage';

const PLAYBACK_RATES_KEY = 'musix.playbackRates.v1';
const RESUME_POSITIONS_KEY = 'musix.resumePositions.v1';

/** Speeds offered in the player; both platforms accept this whole range. */
export const PLAYBACK_RATE_OPTIONS = [0.75, 1, 1.25, 1.5, 1.75, 2] as const;

export type PlaybackRates = {
  music: number;
  audiobook: number;
};

export const DEFAULT_PLAYBACK_RATES: PlaybackRates = {
  music: 1,
  audiobook: 1,
};

/** Playback positions in seconds, keyed by track ID. */
export type ResumePositions = Record<string, number>;

/** Restores the speed saved for each media type. */
export async function loadPlaybackRates(): Promise<PlaybackRates> {
  try {
    const raw = await AsyncStorage.getItem(PLAYBACK_RATES_KEY);

    if (!raw) {
      return DEFAULT_PLAYBACK_RATES;
    }

    const parsed: unknown = JSON.parse(raw);

    if (!isRecord(parsed)) {
      return DEFAULT_PLAYBACK_RATES;
    }

    return {
      music: normalizeRate(parsed.music),
      audiobook: normalizeRate(parsed.audiobook),
    };
  } catch {
    return DEFAULT_PLAYBACK_RATES;
  }
}

/** Persists the speed chosen for music and audiobooks. */
export async function savePlaybackRates(rates: PlaybackRates): Promise<void> {
  await AsyncStorage.setItem(PLAYBACK_RATES_KEY, JSON.stringify(rates));
}

/** Restores saved playback positions, newest writes last. */
export async function loadResumePositions(): Promise<ResumePositions> {
  try {
    const raw = await AsyncStorage.getItem(RESUME_POSITIONS_KEY);

    if (!raw) {
      return {};
    }

    const parsed: unknown = JSON.parse(raw);

    if (!isRecord(parsed)) {
      return {};
    }

    const positions: ResumePositions = {};

    for (const [trackId, value] of Object.entries(parsed)) {
      if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
        positions[trackId] = value;
      }
    }

    return positions;
  } catch {
    return {};
  }
}

/** Persists playback positions so audiobooks can resume after a restart. */
export async function saveResumePositions(positions: ResumePositions): Promise<void> {
  await AsyncStorage.setItem(RESUME_POSITIONS_KEY, JSON.stringify(positions));
}

function normalizeRate(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return 1;
  }

  return Math.min(Math.max(value, 0.5), 2);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
