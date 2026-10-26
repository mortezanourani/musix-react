import { getAlbumById, getAlbumTracks } from '@musix/core';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useLayoutEffect, useMemo } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { ArtworkTile } from '../components/ArtworkTile';
import { TrackRow } from '../components/TrackRow';
import { useLibrary } from '../library/LibraryContext';
import { libraryEmptyMessage } from '../library/messages';
import type { MainStackParamList } from '../navigation/types';
import { usePlayer } from '../player/PlayerContext';
import type { ThemeColors } from '../theme/colors';
import { useThemedStyles } from '../theme/useThemedStyles';
import { formatTotalDuration } from '../utils/format';

/** Shows the tracks of one album, opened from the Home feed. */
type AlbumTracksScreenProps = NativeStackScreenProps<MainStackParamList, 'AlbumTracks'>;

export function AlbumTracksScreen({ navigation, route }: AlbumTracksScreenProps) {
  const { albumId } = route.params;
  const { tracks, status, audiobookAlbumIds } = useLibrary();
  const { playTrack, currentTrack } = usePlayer();
  const styles = useThemedStyles(createStyles);
  const album = useMemo(() => getAlbumById(tracks, albumId, audiobookAlbumIds), [tracks, albumId, audiobookAlbumIds]);
  const albumTracks = useMemo(() => getAlbumTracks(tracks, albumId), [tracks, albumId]);
  const isAudiobook = album?.isAudiobook ?? false;

  // Read-only screen: albums are classified from the Manage Audiobooks page.
  useLayoutEffect(() => {
    navigation.setOptions({
      title: album?.title ?? 'Album',
    });
  }, [navigation, album?.title]);

  const emptyMessage = album
    ? libraryEmptyMessage(status, 'This album has no tracks.')
    : 'This album is no longer in your library.';

  return (
    <FlatList
      data={albumTracks}
      keyExtractor={(track) => track.id}
      contentContainerStyle={styles.listContent}
      showsVerticalScrollIndicator={false}
      ListHeaderComponent={
        album ? (
          <View style={styles.hero}>
            <View style={styles.artwork}>
              <ArtworkTile artworkUri={album.artworkUri} title={album.title} isAudiobook={isAudiobook} />
            </View>
            <View style={styles.heroBody}>
              <Text style={styles.heroTitle} numberOfLines={2}>
                {album.title}
              </Text>
              <Text style={styles.heroMeta} numberOfLines={1}>
                {album.artist}
              </Text>
              <Text style={styles.heroMeta}>
                {album.trackCount} {album.trackCount === 1 ? 'track' : 'tracks'} ·{' '}
                {formatTotalDuration(album.durationMs)}
              </Text>
              {isAudiobook ? <Text style={styles.heroKind}>Audiobook</Text> : null}
            </View>
          </View>
        ) : null
      }
      renderItem={({ item, index }) => (
        <TrackRow
          track={item}
          leading={String(item.trackNumber ?? index + 1).padStart(2, '0')}
          meta="album"
          active={currentTrack?.id === item.id}
          onPress={() => playTrack(item, albumTracks)}
        />
      )}
      ListEmptyComponent={<Text style={styles.empty}>{emptyMessage}</Text>}
    />
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    listContent: {
      paddingHorizontal: 20,
      paddingTop: 16,
      paddingBottom: 24,
    },
    hero: {
      flexDirection: 'row',
      marginBottom: 24,
      gap: 16,
    },
    artwork: {
      width: 124,
    },
    heroBody: {
      flex: 1,
      justifyContent: 'flex-end',
    },
    heroTitle: {
      color: colors.text,
      fontSize: 20,
      fontWeight: '700',
      lineHeight: 25,
    },
    heroMeta: {
      marginTop: 5,
      color: colors.textMuted,
      fontSize: 12,
    },
    heroKind: {
      marginTop: 7,
      color: colors.primary,
      fontSize: 11,
      fontWeight: '700',
      letterSpacing: 0.6,
      textTransform: 'uppercase',
    },
    empty: {
      marginTop: 24,
      color: colors.textSubtle,
      fontSize: 13,
      lineHeight: 19,
      textAlign: 'center',
    },
  });
}
