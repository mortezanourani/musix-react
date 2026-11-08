import type { Track } from '@musix/core';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useMemo, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { TrackRow } from '../components/TrackRow';
import { SearchBar } from '../components/SearchBar';
import { useLibrary } from '../library/LibraryContext';
import { libraryEmptyMessage } from '../library/messages';
import type { MainStackParamList } from '../navigation/types';
import type { ThemeColors } from '../theme/colors';
import { useThemedStyles } from '../theme/useThemedStyles';

type ManageFilesScreenProps = NativeStackScreenProps<MainStackParamList, 'ManageFiles'>;

export function ManageFilesScreen({ navigation }: ManageFilesScreenProps) {
  const { tracks, status } = useLibrary();
  const styles = useThemedStyles(createStyles);
  const [query, setQuery] = useState('');
  const searchTerm = query.trim().toLocaleLowerCase();

  const visibleTracks = useMemo(() => {
    const ordered = [...tracks].sort((a, b) =>
      a.title.localeCompare(b.title, undefined, { sensitivity: 'base' }),
    );

    if (!searchTerm) {
      return ordered;
    }

    return ordered.filter((track) => matchesSearch(track, searchTerm));
  }, [searchTerm, tracks]);

  const emptyMessage = searchTerm
    ? 'No files match your search.'
    : libraryEmptyMessage(status, 'No music files found. Update your library in Settings.');

  return (
    <FlatList
      data={visibleTracks}
      keyExtractor={(track) => track.id}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      ListHeaderComponent={
        <View style={styles.header}>
          <Text style={styles.description}>
            Choose a file to edit the tags saved in that audio file on your device.
          </Text>
          <SearchBar
            value={query}
            onChangeText={setQuery}
            placeholder="Search files, songs, albums, artists"
          />
          <Text style={styles.count}>
            {visibleTracks.length} {visibleTracks.length === 1 ? 'file' : 'files'}
          </Text>
        </View>
      }
      renderItem={({ item }) => (
        <TrackRow
          track={item}
          onPress={() => navigation.navigate('EditTrack', { trackId: item.id })}
        />
      )}
      ListEmptyComponent={<Text style={styles.empty}>{emptyMessage}</Text>}
    />
  );
}

function matchesSearch(track: Track, searchTerm: string): boolean {
  return [
    track.filename,
    track.title,
    track.artist,
    track.albumArtist,
    track.author,
    track.album,
    track.folder,
  ].some((value) => value?.toLocaleLowerCase().includes(searchTerm));
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    content: {
      flexGrow: 1,
      paddingHorizontal: 20,
      paddingTop: 16,
      paddingBottom: 24,
    },
    header: {
      gap: 14,
      marginBottom: 16,
    },
    description: {
      color: colors.textMuted,
      fontSize: 13,
      lineHeight: 19,
    },
    count: {
      color: colors.textSubtle,
      fontSize: 12,
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
