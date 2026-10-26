import { buildAlbums, buildArtists, getTrackArtistName } from '@musix/core';
import type { AlbumSummary, Track } from '@musix/core';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MediaCard } from '../components/MediaCard';
import { SearchBar } from '../components/SearchBar';
import { Shelf, SHELF_GAP, SHELF_PADDING } from '../components/Shelf';
import { useLibrary } from '../library/LibraryContext';
import { libraryEmptyMessage, libraryStatusMessage } from '../library/messages';
import type { MainStackParamList } from '../navigation/types';
import { usePlayer } from '../player/PlayerContext';
import {MaterialCommunityIcons} from "@expo/vector-icons";
import type { ThemeColors } from "../theme/colors";
import { useTheme } from "../theme/ThemeContext";
import { useThemedStyles } from "../theme/useThemedStyles";

type HomeScreenProps = NativeStackScreenProps<MainStackParamList, 'HomeFeed'>;

/** How many tracks the Recently played shelf keeps around. */
const RECENT_TRACK_LIMIT = 20;

export function HomeScreen({ navigation }: HomeScreenProps) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const { tracks, status, error, updateLibrary, audiobookAlbumIds } = useLibrary();
  const { playTrack, recentlyPlayedTrackIds } = usePlayer();
  const [query, setQuery] = useState('');

  const searchTerm = query.trim().toLocaleLowerCase();
  const searching = searchTerm.length > 0;

  const tracksById = useMemo(
      () => new Map(tracks.map((track) => [track.id, track])),
      [tracks],
  );

  // Real listening history, newest first, resolved against the current library.
  const recentTracks = useMemo(
      () =>
          recentlyPlayedTrackIds
              .map((trackId) => tracksById.get(trackId))
              .filter((track): track is Track => track !== undefined)
              .slice(0, RECENT_TRACK_LIMIT),
      [recentlyPlayedTrackIds, tracksById],
  );
  const artists = useMemo(() => buildArtists(tracks), [tracks]);
  const albums = useMemo(() => buildAlbums(tracks, audiobookAlbumIds), [tracks, audiobookAlbumIds]);

  const regularAlbums = useMemo(() => albums.filter((a) => !a.isAudiobook), [albums]);
  const audiobooks = useMemo(() => albums.filter((a) => a.isAudiobook), [albums]);

  const visibleTracks = useMemo(() => {
    if (!searching) {
      return recentTracks;
    }

    return tracks
        .filter((track) =>
            [track.title, track.artist, track.albumArtist, track.album].some((value) =>
                value?.toLocaleLowerCase().includes(searchTerm),
            ),
        )
        .slice(0, RECENT_TRACK_LIMIT);
  }, [recentTracks, searching, searchTerm, tracks]);

  const visibleArtists = useMemo(() => {
    if (!searching) {
      return artists;
    }

    return artists.filter((artist) => artist.name.toLocaleLowerCase().includes(searchTerm));
  }, [artists, searching, searchTerm]);

  const visibleAlbums = useMemo(() => {
    if (!searching) {
      return regularAlbums;
    }

    return regularAlbums.filter(
        (album) =>
            album.title.toLocaleLowerCase().includes(searchTerm) ||
            album.artist.toLocaleLowerCase().includes(searchTerm),
    );
  }, [regularAlbums, searching, searchTerm]);

  const visibleAudiobooks = useMemo(() => {
    if (!searching) {
      return audiobooks;
    }

    return audiobooks.filter(
        (album) =>
            album.title.toLocaleLowerCase().includes(searchTerm) ||
            album.artist.toLocaleLowerCase().includes(searchTerm),
    );
  }, [audiobooks, searching, searchTerm]);

  const noResults =
      searching &&
      visibleTracks.length === 0 &&
      visibleAlbums.length === 0 &&
      visibleArtists.length === 0 &&
      visibleAudiobooks.length === 0;

  // Size the row for two and a half squares, then shrink each card by 10%.
  const cardWidth = ((width - SHELF_PADDING - SHELF_GAP * 2) / 3.5);

  return (
      <ScrollView
          style={styles.screen}
          contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: 12 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
      >
        <View style={styles.header}>
          <Text style={styles.heading}>Musix</Text>
          <Pressable
              onPress={() => navigation.navigate('Settings')}
              style={{ marginRight: 16, position: "absolute", top: 12, right: 0,  }}
              hitSlop={8}
          >
            <MaterialCommunityIcons
                name="cog"
                size={24}
                color={colors.text}
            />
          </Pressable>
          <SearchBar value={query} onChangeText={setQuery} />

          {status !== 'ready' ? (
              <View style={styles.statusRow}>
                <Text style={styles.status}>
                  {status === 'error'
                      ? error ?? 'Library update failed.'
                      : libraryStatusMessage(status, '')}
                </Text>
                {status === 'error' ? (
                    <Pressable
                        accessibilityRole="button"
                        accessibilityLabel="Retry update"
                        onPress={updateLibrary}
                        hitSlop={8}
                    >
                      <Text style={styles.retry}>Retry</Text>
                    </Pressable>
                ) : null}
              </View>
          ) : null}
        </View>

        {noResults ? (
            <Text style={styles.noResults}>
              No songs, albums, or artists match “{query.trim()}”.
            </Text>
        ) : (
            <>
              {visibleTracks.length > 0 || !searching ? (
                  <Shelf
                      title={searching ? 'Songs' : 'Recently played'}
                      data={visibleTracks}
                      keyExtractor={(track) => track.id}
                      cardWidth={cardWidth}
                      emptyMessage={libraryEmptyMessage(
                          status,
                          searching
                              ? 'No tracks match your search.'
                              : 'Tracks you play will appear here.',
                      )}
                      renderItem={({ item }) => (
                          <MediaCard
                              width={cardWidth}
                              artworkUri={item.artworkUri}
                              title={item.title}
                              subtitle={getTrackArtistName(item)}
                              accessibilityLabel={`Play ${item.title} by ${getTrackArtistName(item)}`}
                              onPress={() => playTrack(item, visibleTracks)}
                          />
                      )}
                  />
              ) : null}

              {visibleAlbums.length > 0 || !searching ? (
                  <Shelf
                      title="Albums"
                      data={visibleAlbums}
                      keyExtractor={(album) => album.id}
                      cardWidth={cardWidth}
                      emptyMessage={libraryEmptyMessage(
                          status,
                          'Albums from your library will appear here.',
                      )}
                      renderItem={({ item }) => (
                          <MediaCard
                              width={cardWidth}
                              artworkUri={item.artworkUri}
                              title={item.title}
                              subtitle={item.artist}
                              accessibilityLabel={`Open album ${item.title} by ${item.artist}`}
                              onPress={() => navigation.navigate('AlbumTracks', { albumId: item.id })}
                          />
                      )}
                  />
              ) : null}

              {visibleArtists.length > 0 || !searching ? (
                  <Shelf
                      title="Artists"
                      data={visibleArtists}
                      keyExtractor={(artist) => artist.name.toLocaleLowerCase()}
                      cardWidth={cardWidth}
                      emptyMessage={libraryEmptyMessage(
                          status,
                          'Artists from your library will appear here.',
                      )}
                      renderItem={({ item }) => (
                          <MediaCard
                              width={cardWidth}
                              artworkUri={item.artworkUri}
                              title={item.name}
                              subtitle={`${item.albumCount} ${item.albumCount === 1 ? 'album' : 'albums'}`}
                              accessibilityLabel={`Open albums by ${item.name}`}
                              onPress={() =>
                                  navigation.navigate('ArtistAlbums', { artistName: item.name })
                              }
                          />
                      )}
                  />
              ) : null}

              {visibleAudiobooks.length > 0 || !searching ? (
                  <Shelf<AlbumSummary>
                      title="Books"
                      data={visibleAudiobooks}
                      keyExtractor={(album) => album.id}
                      cardWidth={cardWidth}
                      actionLabel="Edit"
                      onActionPress={() => navigation.navigate('ManageAudiobooks')}
                      emptyMessage={libraryEmptyMessage(
                          status,
                          'Audiobooks and PDFs will appear here.',
                      )}
                      renderItem={({ item }) => (
                          <MediaCard
                              width={cardWidth}
                              artworkUri={item.artworkUri}
                              title={item.title}
                              subtitle={item.artist}
                              accessibilityLabel={`Open audiobook ${item.title} by ${item.artist}`}
                              onPress={() => navigation.navigate('AlbumTracks', { albumId: item.id })}
                          />
                      )}
                  />
              ) : null}
            </>
        )}
      </ScrollView>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      paddingHorizontal: SHELF_PADDING,
      marginBottom: 24,
    },
    heading: {
      marginBottom: 14,
      color: colors.text,
      fontSize: 30,
      fontWeight: '700',
      letterSpacing: 0.5,
    },
    statusRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 10,
      gap: 10,
    },
    status: {
      flex: 1,
      color: colors.textMuted,
      fontSize: 12,
      lineHeight: 17,
    },
    retry: {
      color: colors.primary,
      fontSize: 12,
      fontWeight: '600',
    },
    noResults: {
      paddingHorizontal: SHELF_PADDING,
      color: colors.textMuted,
      fontSize: 13,
      lineHeight: 19,
    },
  });
}
