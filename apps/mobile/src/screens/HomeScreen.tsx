import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLibrary } from '../library/LibraryContext';
import { colors } from '../theme/colors';

export function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { tracks, status, error, updateLibrary } = useLibrary();
  const scanning = status === 'scanning';

  const emptyMessage =
    status === 'ready'
      ? 'No audio files found in the Music directory.'
      : status === 'error'
        ? ''
        : 'Tap “Update Library” on the Search tab to list your music.';

  return (
    <View style={[styles.screen, { paddingTop: insets.top + 16 }]}>
      <View style={styles.header}>
        <Text style={styles.heading}>Musix</Text>
        <Text style={styles.subheading}>Music stored on this device</Text>
      </View>

      <Text style={styles.status}>
        {status === 'ready'
          ? `${tracks.length} ${tracks.length === 1 ? 'file' : 'files'} in Music`
          : scanning
            ? 'Scanning the Music directory…'
            : status === 'error'
              ? 'Library could not be updated.'
              : 'Update your library from the Search tab.'}
      </Text>

      {error ? (
        <View style={styles.errorRow}>
          <Text style={styles.error}>{error}</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Retry update"
            onPress={updateLibrary}
            hitSlop={8}
          >
            <Text style={styles.retry}>Retry</Text>
          </Pressable>
        </View>
      ) : null}

      <FlatList
        data={tracks}
        keyExtractor={(track) => track.id}
        style={styles.list}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        renderItem={({ item, index }) => (
          <View style={styles.row}>
            <Text style={styles.rowIndex}>{String(index + 1).padStart(2, '0')}</Text>
            <View style={styles.rowBody}>
              <Text style={styles.rowTitle} numberOfLines={1}>
                {item.title}
              </Text>
              <Text style={styles.rowMeta} numberOfLines={1}>
                {item.folder} · {formatDuration(item.durationMs)}
              </Text>
            </View>
          </View>
        )}
        ListEmptyComponent={<Text style={styles.empty}>{emptyMessage}</Text>}
      />
    </View>
  );
}

function formatDuration(durationMs: number): string {
  if (!durationMs) {
    return '--:--';
  }

  const totalSeconds = Math.round(durationMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    paddingHorizontal: 20,
    paddingBottom: 8,
    backgroundColor: colors.background,
  },
  header: {
    marginBottom: 16,
  },
  heading: {
    color: colors.text,
    fontSize: 30,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  subheading: {
    marginTop: 4,
    color: colors.textMuted,
    fontSize: 13,
  },
  status: {
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
  list: {
    flex: 1,
    marginTop: 4,
  },
  listContent: {
    paddingTop: 12,
    paddingBottom: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  rowIndex: {
    width: 32,
    color: colors.textSubtle,
    fontSize: 12,
    fontVariant: ['tabular-nums'],
  },
  rowBody: {
    flex: 1,
  },
  rowTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '500',
  },
  rowMeta: {
    marginTop: 3,
    color: colors.textMuted,
    fontSize: 11,
  },
  empty: {
    marginTop: 24,
    color: colors.textSubtle,
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
  },
});
