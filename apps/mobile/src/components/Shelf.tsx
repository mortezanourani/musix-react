import { FlatList, StyleSheet, Text, View, type ListRenderItem } from 'react-native';
import { colors } from '../theme/colors';

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
}: ShelfProps<T>) {
  return (
    <View style={styles.section}>
      <Text style={styles.title}>{title}</Text>

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
  return <View style={styles.gap} />;
}

const styles = StyleSheet.create({
  section: {
    marginBottom: 28,
  },
  title: {
    marginBottom: 12,
    paddingHorizontal: SHELF_PADDING,
    color: colors.text,
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  row: {
    paddingHorizontal: SHELF_PADDING,
  },
  gap: {
    width: SHELF_GAP,
  },
  empty: {
    paddingHorizontal: SHELF_PADDING,
    color: colors.textSubtle,
    fontSize: 13,
    lineHeight: 19,
  },
});
