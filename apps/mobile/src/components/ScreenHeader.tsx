import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { ThemeColors } from '../theme/colors';
import { useThemedStyles } from '../theme/useThemedStyles';

type ScreenHeaderProps = {
  title: string;
  subtitle?: string;
  status: string;
  error?: string | null;
  onRetry?: () => void;
};

/** Page heading plus the current library status and, on failure, a retry. */
export function ScreenHeader({ title, subtitle, status, error, onRetry }: ScreenHeaderProps) {
  const styles = useThemedStyles(createStyles);

  return (
    <View style={styles.header}>
      <Text style={styles.heading}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      <Text style={styles.status}>{status}</Text>

      {error ? (
        <View style={styles.errorRow}>
          <Text style={styles.error}>{error}</Text>
          {onRetry ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Retry update"
              onPress={onRetry}
              hitSlop={8}
            >
              <Text style={styles.retry}>Retry</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    header: {
      marginBottom: 16,
    },
    heading: {
      color: colors.text,
      fontSize: 30,
      fontWeight: '700',
      letterSpacing: 0.5,
    },
    subtitle: {
      marginTop: 4,
      color: colors.textMuted,
      fontSize: 13,
    },
    status: {
      marginTop: 4,
      color: colors.textMuted,
      fontSize: 12,
    },
    errorRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 8,
      gap: 10,
    },
    error: {
      flex: 1,
      color: colors.danger,
      fontSize: 12,
      lineHeight: 17,
    },
    retry: {
      color: colors.primary,
      fontSize: 12,
      fontWeight: '600',
    },
  });
}
