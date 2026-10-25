import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useColorScheme } from 'react-native';
import { darkColors, lightColors, type ThemeColors } from './colors';
import { loadStoredThemeMode, saveStoredThemeMode } from './themeStorage';

export type ThemeMode = 'system' | 'light' | 'dark';

type ThemeContextValue = {
  /** The user's preference, which may be `system`. */
  mode: ThemeMode;
  /** The palette that `mode` resolves to right now. */
  colors: ThemeColors;
  isDark: boolean;
  setMode: (mode: ThemeMode) => Promise<void>;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemScheme = useColorScheme();
  const [mode, setMode] = useState<ThemeMode>('system');

  useEffect(() => {
    let cancelled = false;

    loadStoredThemeMode().then((stored) => {
      if (!cancelled && stored) {
        setMode(stored);
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const updateMode = useCallback(async (next: ThemeMode) => {
    setMode(next);

    try {
      await saveStoredThemeMode(next);
    } catch {
      // Keep the choice for this session even if it cannot be saved.
    }
  }, []);

  const isDark = mode === 'system' ? systemScheme !== 'light' : mode === 'dark';

  const value = useMemo(
    () => ({
      mode,
      colors: isDark ? darkColors : lightColors,
      isDark,
      setMode: updateMode,
    }),
    [mode, isDark, updateMode],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const value = useContext(ThemeContext);

  if (!value) {
    throw new Error('useTheme must be used inside a ThemeProvider');
  }

  return value;
}
