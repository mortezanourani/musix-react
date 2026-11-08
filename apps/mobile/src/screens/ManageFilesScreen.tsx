import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { Track } from '@musix/core';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SearchBar } from '../components/SearchBar';
import { useLibrary } from '../library/LibraryContext';
import { libraryEmptyMessage } from '../library/messages';
import type { MainStackParamList } from '../navigation/types';
import type { ThemeColors } from '../theme/colors';
import { useTheme } from '../theme/ThemeContext';
import { useThemedStyles } from '../theme/useThemedStyles';
import { formatDuration } from '../utils/format';

type ManageFilesScreenProps = NativeStackScreenProps<MainStackParamList, 'ManageFiles'>;
type Directory = {
  key: string;
  name: string;
  directories: Map<string, Directory>;
  tracks: Track[];
};
type DirectoryRow = {
  type: 'directory';
  key: string;
  name: string;
  depth: number;
  trackCount: number;
};
type FileRow = { type: 'file'; key: string; track: Track; depth: number };
type TreeRow = DirectoryRow | FileRow;

const ROOTS = [
  { mediaType: 'music', label: 'Music', icon: 'music' as const },
  { mediaType: 'audiobook', label: 'Audiobooks', icon: 'book-music' as const },
] as const;

export function ManageFilesScreen({ navigation }: ManageFilesScreenProps) {
  const { tracks, status } = useLibrary();
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const [query, setQuery] = useState('');
  const [expanded, setExpanded] = useState<Set<string>>(
    () => new Set(ROOTS.map(({ mediaType }) => `root:${mediaType}`)),
  );
  const searchTerm = query.trim().toLocaleLowerCase();

  const visibleTracks = useMemo(
    () => (searchTerm ? tracks.filter((track) => matchesSearch(track, searchTerm)) : tracks),
    [searchTerm, tracks],
  );
  const trees = useMemo(() => buildDirectoryTrees(visibleTracks), [visibleTracks]);
  const rows = useMemo(() => {
    const result: TreeRow[] = [];

    for (const root of ROOTS) {
      const directory = trees.get(root.mediaType);
      if (!directory) continue;

      const rootKey = `root:${root.mediaType}`;
      result.push({
        type: 'directory',
        key: rootKey,
        name: root.label,
        depth: 0,
        trackCount: countTracks(directory),
      });

      if (searchTerm || expanded.has(rootKey)) {
        appendChildren(directory, 1, expanded, result, searchTerm.length > 0);
      }
    }

    return result;
  }, [expanded, searchTerm, trees]);

  const emptyMessage = searchTerm
    ? 'No files match your search.'
    : libraryEmptyMessage(status, 'No music files found. Update your library in Settings.');

  const toggleDirectory = (key: string) => {
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  return (
    <FlatList
      style={styles.screen}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      data={rows}
      keyExtractor={(row) => row.key}
      ListHeaderComponent={
        <View style={styles.header}>
          <Text style={styles.description}>
            Browse your Music and Audiobooks folders. Select a file to edit the tags saved in it.
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
      ListEmptyComponent={<Text style={styles.empty}>{emptyMessage}</Text>}
      renderItem={({ item: row }) => {
        if (row.type === 'file') {
          return (
            <FileItem
              key={row.key}
              track={row.track}
              depth={row.depth}
              onPress={() => navigation.navigate('EditTrack', { trackId: row.track.id })}
            />
          );
        }

        const isRoot = row.depth === 0;
        const root = ROOTS.find(({ mediaType }) => row.key === `root:${mediaType}`);
        const isExpanded = searchTerm || expanded.has(row.key);

        return (
          <Pressable
            key={row.key}
            accessibilityRole="button"
            accessibilityLabel={`${isExpanded ? 'Collapse' : 'Expand'} ${row.name}, ${row.trackCount} files`}
            accessibilityState={{ expanded: Boolean(isExpanded) }}
            onPress={() => toggleDirectory(row.key)}
            style={({ pressed }) => [
              styles.directoryRow,
              { paddingLeft: 12 + row.depth * 20 },
              isRoot && styles.rootRow,
              pressed && styles.pressed,
            ]}
          >
            <MaterialCommunityIcons
              name={isRoot ? root?.icon ?? 'folder' : isExpanded ? 'folder-open' : 'folder'}
              size={isRoot ? 22 : 19}
              color={isRoot ? colors.primary : colors.textMuted}
            />
            <Text style={[styles.directoryName, isRoot && styles.rootName]} numberOfLines={1}>
              {row.name}
            </Text>
            <Text style={styles.directoryCount}>{row.trackCount}</Text>
            {!searchTerm ? (
              <MaterialCommunityIcons
                name={isExpanded ? 'chevron-down' : 'chevron-right'}
                size={20}
                color={colors.textSubtle}
              />
            ) : null}
          </Pressable>
        );
      }}
    />
  );
}

function FileItem({
  track,
  depth,
  onPress,
}: {
  track: Track;
  depth: number;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Edit tags for ${track.filename}`}
      onPress={onPress}
      style={({ pressed }) => [
        styles.fileRow,
        { paddingLeft: 22 + depth * 20 },
        pressed && styles.pressed,
      ]}
    >
      <MaterialCommunityIcons name="music-note" size={18} color={colors.textSubtle} />
      <View style={styles.fileDetails}>
        <Text style={styles.fileName} numberOfLines={1}>
          {track.filename}
        </Text>
        <Text style={styles.fileMeta} numberOfLines={1}>
          {track.title}
          {track.artist ? ` · ${track.artist}` : ''}
          {track.durationMs > 0 ? ` · ${formatDuration(track.durationMs)}` : ''}
        </Text>
      </View>
      <MaterialCommunityIcons name="chevron-right" size={20} color={colors.textSubtle} />
    </Pressable>
  );
}

function buildDirectoryTrees(tracks: Track[]): Map<Track['mediaType'], Directory> {
  const trees = new Map<Track['mediaType'], Directory>();

  for (const root of ROOTS) {
    trees.set(root.mediaType, {
      key: `root:${root.mediaType}`,
      name: root.label,
      directories: new Map(),
      tracks: [],
    });
  }

  for (const track of tracks) {
    const root = trees.get(track.mediaType);
    if (!root) continue;

    const pathParts = track.folder.split(/[\\/]/).filter(Boolean).slice(1);
    let directory = root;

    for (const part of pathParts) {
      let child = directory.directories.get(part);
      if (!child) {
        child = {
          key: `${directory.key}/${part}`,
          name: part,
          directories: new Map(),
          tracks: [],
        };
        directory.directories.set(part, child);
      }
      directory = child;
    }

    directory.tracks.push(track);
  }

  return trees;
}

function appendChildren(
  directory: Directory,
  depth: number,
  expanded: Set<string>,
  rows: TreeRow[],
  forceExpand: boolean,
) {
  const childDirectories = [...directory.directories.values()].sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }),
  );
  const files = [...directory.tracks].sort((a, b) =>
    a.filename.localeCompare(b.filename, undefined, { sensitivity: 'base' }),
  );

  for (const child of childDirectories) {
    rows.push({
      type: 'directory',
      key: child.key,
      name: child.name,
      depth,
      trackCount: countTracks(child),
    });

    if (forceExpand || expanded.has(child.key)) {
      appendChildren(child, depth + 1, expanded, rows, forceExpand);
    }
  }

  for (const track of files) {
    rows.push({ type: 'file', key: `file:${track.id}`, track, depth });
  }
}

function countTracks(directory: Directory): number {
  return (
    directory.tracks.length +
    [...directory.directories.values()].reduce((total, child) => total + countTracks(child), 0)
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
    screen: {
      flex: 1,
      backgroundColor: colors.background,
    },
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
    directoryRow: {
      minHeight: 46,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      borderRadius: 9,
    },
    rootRow: {
      minHeight: 52,
      marginTop: 4,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    directoryName: {
      flex: 1,
      color: colors.text,
      fontSize: 14,
    },
    rootName: {
      fontSize: 15,
      fontWeight: '700',
    },
    directoryCount: {
      color: colors.textSubtle,
      fontSize: 12,
      fontVariant: ['tabular-nums'],
    },
    fileRow: {
      minHeight: 54,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    fileDetails: {
      flex: 1,
      gap: 3,
    },
    fileName: {
      color: colors.text,
      fontSize: 13,
      fontWeight: '500',
    },
    fileMeta: {
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
    pressed: {
      opacity: 0.65,
    },
  });
}
