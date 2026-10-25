import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ThemeMode } from './ThemeContext';

const STORAGE_KEY = 'musix.theme.v1';

const THEME_MODES: readonly ThemeMode[] = ['system', 'light', 'dark'];

/** Restores the saved appearance preference, or `null` when none is stored. */
export async function loadStoredThemeMode(): Promise<ThemeMode | null> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);

    return isThemeMode(raw) ? raw : null;
  } catch {
    return null;
  }
}

/** Persists the appearance preference so it survives an app restart. */
export async function saveStoredThemeMode(mode: ThemeMode): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, mode);
}

function isThemeMode(value: unknown): value is ThemeMode {
  return THEME_MODES.includes(value as ThemeMode);
}
