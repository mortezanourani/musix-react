import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { ThemeColors } from '../theme/colors';
import { useThemedStyles } from '../theme/useThemedStyles';

type UndoBarProps = {
  message: string;
  actionLabel?: string;
  onAction: () => void;
};

/** Floating confirmation bar that offers to revert the change just made. */
export function UndoBar({ message, actionLabel = 'Undo', onAction }: UndoBarProps) {
  const styles = useThemedStyles(createStyles);

  return (
    <View style={styles.container} accessibilityLiveRegion="polite">
      <Text style={styles.message} numberOfLines={2}>
        {message}
      </Text>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={actionLabel}
        onPress={onAction}
        hitSlop={8}
        style={({ pressed }) => [styles.action, pressed && styles.pressed]}
      >
        <Text style={styles.actionLabel}>{actionLabel}</Text>
      </Pressable>
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: {
      position: 'absolute',
      left: 20,
      right: 20,
      bottom: 16,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderRadius: 12,
      backgroundColor: colors.surface,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      shadowColor: '#000000',
      shadowOpacity: 0.18,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 4 },
      elevation: 10,
    },
    message: {
      flex: 1,
      color: colors.text,
      fontSize: 13,
      lineHeight: 18,
    },
    action: {
      paddingVertical: 4,
    },
    actionLabel: {
      color: colors.primary,
      fontSize: 13,
      fontWeight: '700',
    },
    pressed: {
      opacity: 0.6,
    },
  });
}
