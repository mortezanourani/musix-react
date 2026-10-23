import { buildArtists } from '@musix/core';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useMemo } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CollectionTile } from '../components/CollectionTile';
import { ScreenHeader } from '../components/ScreenHeader';
import { useLibrary } from '../library/LibraryContext';
import { libraryEmptyMessage, libraryStatusMessage } from '../library/messages';
import type { ArtistsStackParamList } from '../navigation/types';
import { colors } from '../theme/colors';

type ArtistsScreenProps = NativeStackScreenProps<ArtistsStackParamList, 'ArtistsList'>;

export function ArtistsScreen({ navigation }: ArtistsScreenProps) {
  const insets = useSafeAreaInsets();
  const { tracks, status, error, updateLibrary } = useLibrary();
  const artists = useMemo(() => buildArtists(tracks), [tracks]);

  const statusMessage = libraryStatusMessage(
    status,
    `${artists.length} ${artists.length === 1 ? 'artist' : 'artists'}`,
  );
  const emptyMessage = libraryEmptyMessage(status, 'No artist tags found in your music files.');

  return (
    <View style={[styles.screen, { paddingTop: insets.top + 16 }]}>
      <ScreenHeader
        title="Artists"
        status={statusMessage}
        error={error}
        onRetry={updateLibrary}
      />

      <FlatList
        data={artists}
        keyExtractor={(artist) => artist.name.toLocaleLowerCase()}
        numColumns={3}
        columnWrapperStyle={styles.columns}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <CollectionTile
            artworkUri={item.artworkUri}
            title={item.name}
            subtitle={`${item.albumCount} ${item.albumCount === 1 ? 'album' : 'albums'}`}
            accessibilityLabel={`Open albums by ${item.name}`}
            onPress={() => navigation.navigate('ArtistAlbums', { artistName: item.name })}
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
