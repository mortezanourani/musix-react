import { FlatList, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScreenHeader } from '../components/ScreenHeader';
import { TrackRow } from '../components/TrackRow';
import { useLibrary } from '../library/LibraryContext';
import { libraryEmptyMessage, libraryStatusMessage } from '../library/messages';
import { colors } from '../theme/colors';

export function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { tracks, status, error, updateLibrary } = useLibrary();

  const statusMessage = libraryStatusMessage(
    status,
    `${tracks.length} ${tracks.length === 1 ? 'file' : 'files'} in Music`,
  );
  const emptyMessage = libraryEmptyMessage(status, 'No audio files found in the Music directory.');

  return (
    <View style={[styles.screen, { paddingTop: insets.top + 16 }]}>
      <ScreenHeader
        title="Musix"
        subtitle="Music stored on this device"
        status={statusMessage}
        error={error}
        onRetry={updateLibrary}
      />

      <FlatList
        data={tracks}
        keyExtractor={(track) => track.id}
        style={styles.list}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        renderItem={({ item, index }) => (
          <TrackRow
            track={item}
            leading={String(index + 1).padStart(2, '0')}
            meta="library"
          />
        )}
        ListEmptyComponent={<Text style={styles.empty}>{emptyMessage}</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    paddingHorizontal: 20,
    paddingBottom: 8,
    backgroundColor: colors.background,
  },
  list: {
    flex: 1,
    marginTop: 4,
  },
  listContent: {
    paddingTop: 12,
    paddingBottom: 16,
  },
  empty: {
    marginTop: 24,
    color: colors.textSubtle,
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
  },
});
