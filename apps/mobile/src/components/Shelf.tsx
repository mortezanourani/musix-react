import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
  type ListRenderItem,
} from 'react-native';
import type { ThemeColors } from '../theme/colors';
import { useThemedStyles } from '../theme/useThemedStyles';

/** Left/right inset shared by the Home header and shelf titles. */
export const SHELF_PADDING = 20;

/** Space between two cards in a shelf. */
export const SHELF_GAP = 12;

type ShelfProps<T> = {
  title: string;
  data: readonly T[];
  keyExtractor: (item: T) => string;
  renderItem: ListRenderItem<T>;
  emptyMessage: string;
  /** Width of one card, used so the row can snap card by card. */
  cardWidth: number;
  /** Optional text button shown next to the shelf title, e.g. `Edit`. */
  actionLabel?: string;
  onActionPress?: () => void;
};

/**
 * A titled, horizontally swipeable row of cards. The list runs to the screen
 * edges while its content keeps the same inset as the rest of the page.
 */
export function Shelf<T>({
  title,
  data,
  keyExtractor,
  renderItem,
  emptyMessage,
  cardWidth,
  actionLabel,
  onActionPress,
}: ShelfProps<T>) {
  const styles = useThemedStyles(createStyles);

  return (
    <View style={styles.section}>
      <View style={styles.titleRow}>
        <Text style={styles.title}>{title}</Text>

        {actionLabel && onActionPress ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={actionLabel}
            onPress={onActionPress}
            hitSlop={8}
            style={({ pressed }) => pressed && styles.pressed}
          >
            <Text style={styles.action}>{actionLabel}</Text>
          </Pressable>
        ) : null}
      </View>

      {data.length === 0 ? (
        <Text style={styles.empty}>{emptyMessage}</Text>
      ) : (
        <FlatList
          horizontal
          data={data}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.row}
          ItemSeparatorComponent={ShelfGap}
          snapToInterval={cardWidth + SHELF_GAP}
          snapToAlignment="start"
          decelerationRate="fast"
          disableIntervalMomentum
        />
      )}
    </View>
  );
}

function ShelfGap() {
  return <View style={gapStyles.gap} />;
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    section: {
      marginBottom: 28,
    },
    titleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 12,
      paddingHorizontal: SHELF_PADDING,
    },
    title: {
      flexShrink: 1,
      color: colors.text,
      fontSize: 20,
      fontWeight: '700',
      letterSpacing: 0.2,
    },
    action: {
      color: colors.primary,
      fontSize: 13,
      fontWeight: '600',
    },
    pressed: {
      opacity: 0.6,
    },
    row: {
      paddingHorizontal: SHELF_PADDING,
    },
    empty: {
      paddingHorizontal: SHELF_PADDING,
      color: colors.textSubtle,
      fontSize: 13,
      lineHeight: 19,
    },
  });
}

const gapStyles = StyleSheet.create({
  gap: {
    width: SHELF_GAP,
  },
});
