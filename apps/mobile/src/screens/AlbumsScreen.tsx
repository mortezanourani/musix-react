import { buildAlbums } from '@musix/core';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useMemo } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CollectionTile } from '../components/CollectionTile';
import { ScreenHeader } from '../components/ScreenHeader';
import { useLibrary } from '../library/LibraryContext';
import { libraryEmptyMessage, libraryStatusMessage } from '../library/messages';
import type { AlbumsStackParamList } from '../navigation/types';
import { colors } from '../theme/colors';

type AlbumsScreenProps = NativeStackScreenProps<AlbumsStackParamList, 'AlbumsList'>;

export function AlbumsScreen({ navigation }: AlbumsScreenProps) {
  const insets = useSafeAreaInsets();
  const { tracks, status, error, updateLibrary } = useLibrary();
  const albums = useMemo(() => buildAlbums(tracks), [tracks]);

  const statusMessage = libraryStatusMessage(
    status,
    `${albums.length} ${albums.length === 1 ? 'album' : 'albums'}`,
  );
  const emptyMessage = libraryEmptyMessage(status, 'No album tags found in your music files.');

  return (
    <View style={[styles.screen, { paddingTop: insets.top + 16 }]}>
      <ScreenHeader
        title="Albums"
        status={statusMessage}
        error={error}
        onRetry={updateLibrary}
      />

      <FlatList
        data={albums}
        keyExtractor={(album) => album.id}
        numColumns={3}
        columnWrapperStyle={styles.columns}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <CollectionTile
            artworkUri={item.artworkUri}
            title={item.title}
            subtitle={item.artist}
            accessibilityLabel={`Open album ${item.title} by ${item.artist}`}
            onPress={() => navigation.navigate('AlbumTracks', { albumId: item.id })}
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
  columns: {
    justifyContent: 'space-between',
  },
  listContent: {
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
