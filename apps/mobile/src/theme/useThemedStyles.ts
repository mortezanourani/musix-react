import { useMemo } from 'react';
import type { ThemeColors } from './colors';
import { useTheme } from './ThemeContext';

/**
 * Builds a StyleSheet from the active palette and rebuilds it only when the
 * theme changes. `factory` should be defined at module scope so it stays stable.
 */
export function useThemedStyles<T>(factory: (colors: ThemeColors) => T): T {
  const { colors } = useTheme();

  return useMemo(() => factory(colors), [colors, factory]);
}
