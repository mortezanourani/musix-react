import { getArtistAlbums } from '@musix/core';
import type { RouteProp } from '@react-navigation/native';
import { useMemo } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { CollectionTile } from '../components/CollectionTile';
import { useLibrary } from '../library/LibraryContext';
import { libraryEmptyMessage, libraryStatusMessage } from '../library/messages';
import type { ArtistsStackParamList, MainStackParamList } from '../navigation/types';
import { colors } from '../theme/colors';

/**
 * Rendered by the Artists and Home stacks. Both pass an `artistName` and open
 * albums inside the stack they belong to.
 */
type ArtistAlbumsScreenProps = {
  navigation: {
    navigate: (screen: 'AlbumTracks', params: { albumId: string }) => void;
  };
  route:
    | RouteProp<ArtistsStackParamList, 'ArtistAlbums'>
    | RouteProp<MainStackParamList, 'ArtistAlbums'>;
};

export function ArtistAlbumsScreen({ navigation, route }: ArtistAlbumsScreenProps) {
  const { artistName } = route.params;
  const { tracks, status } = useLibrary();
  const albums = useMemo(() => getArtistAlbums(tracks, artistName), [tracks, artistName]);
  const trackCount = albums.reduce((total, album) => total + album.trackCount, 0);

  const statusMessage = libraryStatusMessage(
    status,
    `${albums.length} ${albums.length === 1 ? 'album' : 'albums'} · ${trackCount} ${
      trackCount === 1 ? 'track' : 'tracks'
    }`,
  );
  const emptyMessage = libraryEmptyMessage(status, 'No albums found for this artist.');

  return (
    <View style={styles.screen}>
      <Text style={styles.summary}>{statusMessage}</Text>

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
            subtitle={`${item.trackCount} ${item.trackCount === 1 ? 'track' : 'tracks'}`}
            accessibilityLabel={`Open album ${item.title}`}
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
    paddingTop: 12,
    paddingBottom: 8,
    backgroundColor: colors.background,
  },
  summary: {
    marginBottom: 16,
    color: colors.textMuted,
    fontSize: 12,
  },
  columns: {
    justifyContent: 'flex-start',
    gap: '3%',
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
