import { MaterialCommunityIcons } from '@expo/vector-icons';
import { buildAlbums, type AlbumSummary } from '@musix/core';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useEffect, useLayoutEffect, useMemo, useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { ArtworkTile } from '../components/ArtworkTile';
import { SearchBar } from '../components/SearchBar';
import { UndoBar } from '../components/UndoBar';
import { useLibrary } from '../library/LibraryContext';
import { libraryEmptyMessage } from '../library/messages';
import type { MainStackParamList } from '../navigation/types';
import type { ThemeColors } from '../theme/colors';
import { useTheme } from '../theme/ThemeContext';
import { useThemedStyles } from '../theme/useThemedStyles';
import { formatTotalDuration } from '../utils/format';

type ManageAudiobooksScreenProps = NativeStackScreenProps<MainStackParamList, 'ManageAudiobooks'>;

type Filter = 'all' | 'music' | 'books';

const FILTERS: readonly { key: Filter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'music', label: 'Music' },
  { key: 'books', label: 'Books' },
];

/** How long the undo bar stays on screen after a save. */
const UNDO_VISIBLE_MS = 6000;

/**
 * The only place where albums move between Music and Books. Changes are staged
 * locally and written once, so browsing an album can no longer reclassify it.
 */
export function ManageAudiobooksScreen({ navigation }: ManageAudiobooksScreenProps) {
  const { tracks, status, audiobookAlbumIds, setAudiobookAlbums } = useLibrary();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [original, setOriginal] = useState<ReadonlySet<string>>(
    () => new Set(audiobookAlbumIds),
  );
  const [draft, setDraft] = useState<Set<string>>(() => new Set(audiobookAlbumIds));
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [undo, setUndo] = useState<{ message: string; previous: Set<string> } | null>(null);
  const styles = useThemedStyles(createStyles);

  const albums = useMemo(() => buildAlbums(tracks, draft), [tracks, draft]);

  const counts = useMemo(() => {
    const books = albums.reduce(
      (total, album) => total + (draft.has(album.id) ? 1 : 0),
      0,
    );

    return { all: albums.length, books, music: albums.length - books };
  }, [albums, draft]);

  const added = useMemo(
    () => Array.from(draft).filter((albumId) => !original.has(albumId)).length,
    [draft, original],
  );
  const removed = useMemo(
    () => Array.from(original).filter((albumId) => !draft.has(albumId)).length,
    [draft, original],
  );
  const changeCount = added + removed;
  const dirty = changeCount > 0;

  const visibleAlbums = useMemo(() => {
    const term = query.trim().toLocaleLowerCase();

    return albums.filter((album) => {
      const inBooks = draft.has(album.id);

      if (filter === 'music' && inBooks) {
        return false;
      }

      if (filter === 'books' && !inBooks) {
        return false;
      }

      if (!term) {
        return true;
      }

      return (
        album.title.toLocaleLowerCase().includes(term) ||
        album.artist.toLocaleLowerCase().includes(term)
      );
    });
  }, [albums, draft, filter, query]);

  // Adopt changes made outside this screen (for example while the library is
  // still restoring), but never overwrite a selection the user is editing.
  useEffect(() => {
    if (dirty || saving) {
      return;
    }

    setOriginal((previous) =>
      setsEqual(previous, audiobookAlbumIds) ? previous : new Set(audiobookAlbumIds),
    );
    setDraft((previous) =>
      setsEqual(previous, audiobookAlbumIds) ? previous : new Set(audiobookAlbumIds),
    );
  }, [audiobookAlbumIds, dirty, saving]);

  const toggleAlbum = useCallback((albumId: string) => {
    setUndo(null);
    setSaveError(null);
    setDraft((previous) => {
      const next = new Set(previous);

      if (next.has(albumId)) {
        next.delete(albumId);
      } else {
        next.add(albumId);
      }

      return next;
    });
  }, []);

  const handleSave = useCallback(async () => {
    if (!dirty || saving) {
      return;
    }

    const previous = new Set(original);
    const next = new Set(draft);
    const addedCount = added;
    const removedCount = removed;

    setSaving(true);
    setSaveError(null);
    setUndo(null);

    try {
      await setAudiobookAlbums(next);
      setOriginal(next);
      setUndo({
        message: describeChange(addedCount, removedCount),
        previous,
      });
    } catch {
      setSaveError('Could not save your selection. Check storage access and try again.');
    } finally {
      setSaving(false);
    }
  }, [added, dirty, draft, original, removed, saving, setAudiobookAlbums]);

  const handleUndo = useCallback(async () => {
    if (!undo || saving) {
      return;
    }

    const target = undo.previous;

    setUndo(null);
    setSaving(true);
    setSaveError(null);

    try {
      await setAudiobookAlbums(target);
      setOriginal(new Set(target));
      setDraft(new Set(target));
    } catch {
      setSaveError('Could not undo the change. Check storage access and try again.');
    } finally {
      setSaving(false);
    }
  }, [saving, setAudiobookAlbums, undo]);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Save audiobook selection"
          accessibilityState={{ disabled: !dirty || saving }}
          disabled={!dirty || saving}
          onPress={handleSave}
          hitSlop={8}
        >
          <Text style={[styles.headerSave, (!dirty || saving) && styles.headerSaveDisabled]}>
            {saving ? 'Saving…' : 'Save'}
          </Text>
        </Pressable>
      ),
    });
  }, [
    dirty,
    handleSave,
    navigation,
    saving,
    styles.headerSave,
    styles.headerSaveDisabled,
  ]);

  // Guard the back gesture so pending selections are never dropped silently.
  useEffect(() => {
    return navigation.addListener('beforeRemove', (event) => {
      if (!dirty || saving) {
        return;
      }

      event.preventDefault();
      Alert.alert('Discard changes?', "Your album selection hasn't been saved.", [
        { text: 'Keep editing', style: 'cancel' },
        {
          text: 'Discard',
          style: 'destructive',
          onPress: () => navigation.dispatch(event.data.action),
        },
      ]);
    });
  }, [dirty, navigation, saving]);

  // Hide the undo bar after a moment so it never blocks the list.
  useEffect(() => {
    if (!undo) {
      return;
    }

    const timer = setTimeout(() => setUndo(null), UNDO_VISIBLE_MS);

    return () => clearTimeout(timer);
  }, [undo]);

  const emptyMessage =
    albums.length === 0
      ? libraryEmptyMessage(status, 'No albums in your library yet.')
      : 'No albums match your search.';

  return (
    <View style={styles.screen}>
      <FlatList
        data={visibleAlbums}
        keyExtractor={(album) => album.id}
        contentContainerStyle={styles.listContent}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View style={styles.header}>
            <SearchBar value={query} onChangeText={setQuery} placeholder="Search albums" />

            <View style={styles.filters}>
              {FILTERS.map(({ key, label }) => {
                const active = filter === key;

                return (
                  <Pressable
                    key={key}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                    onPress={() => setFilter(key)}
                    style={({ pressed }) => [
                      styles.pill,
                      active && styles.pillActive,
                      pressed && styles.pressed,
                    ]}
                  >
                    <Text style={[styles.pillLabel, active && styles.pillLabelActive]}>
                      {label} {counts[key]}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Text style={[styles.summary, saveError !== null && styles.summaryError]}>
              {saveError ??
                (dirty
                  ? `${changeCount} unsaved ${changeCount === 1 ? 'change' : 'changes'}`
                  : `${counts.books} ${counts.books === 1 ? 'book' : 'books'} · ${counts.music} ${
                      counts.music === 1 ? 'album' : 'albums'
                    }`)}
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <AlbumChoiceRow
            album={item}
            checked={draft.has(item.id)}
            onToggle={() => toggleAlbum(item.id)}
          />
        )}
        ListEmptyComponent={<Text style={styles.empty}>{emptyMessage}</Text>}
      />

      {undo ? <UndoBar message={undo.message} onAction={handleUndo} /> : null}
    </View>
  );
}

type AlbumChoiceRowProps = {
  album: AlbumSummary;
  checked: boolean;
  onToggle: () => void;
};

function AlbumChoiceRow({ album, checked, onToggle }: AlbumChoiceRowProps) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);

  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      accessibilityLabel={`${album.title} by ${album.artist}`}
      onPress={onToggle}
      style={({ pressed }) => [
        styles.row,
        checked && styles.rowChecked,
        pressed && styles.pressed,
      ]}
    >
      <View style={styles.artwork}>
        <ArtworkTile
          artworkUri={album.artworkUri}
          title={album.title}
          borderRadius={8}
          initialsFontSize={16}
        />
      </View>

      <View style={styles.rowBody}>
        <Text
          style={[styles.rowTitle, checked && styles.rowTitleChecked]}
          numberOfLines={1}
        >
          {album.title}
        </Text>
        <Text style={styles.rowMeta} numberOfLines={1}>
          {album.artist} · {album.trackCount}{' '}
          {album.trackCount === 1 ? 'track' : 'tracks'} ·{' '}
          {formatTotalDuration(album.durationMs)}
        </Text>
      </View>

      <MaterialCommunityIcons
        name={checked ? 'checkbox-marked-circle' : 'checkbox-blank-circle-outline'}
        size={24}
        color={checked ? colors.primary : colors.textSubtle}
      />
    </Pressable>
  );
}

function setsEqual(a: ReadonlySet<string>, b: ReadonlySet<string>): boolean {
  if (a.size !== b.size) {
    return false;
  }

  for (const value of a) {
    if (!b.has(value)) {
      return false;
    }
  }

  return true;
}

function describeChange(added: number, removed: number): string {
  const parts: string[] = [];

  if (added > 0) {
    parts.push(`Moved ${added} ${added === 1 ? 'album' : 'albums'} to Books`);
  }

  if (removed > 0) {
    parts.push(`Moved ${removed} ${removed === 1 ? 'album' : 'albums'} to Music`);
  }

  return parts.join(' · ');
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: colors.background,
    },
    listContent: {
      paddingHorizontal: 20,
      paddingTop: 12,
      paddingBottom: 100,
    },
    header: {
      marginBottom: 16,
      gap: 12,
    },
    filters: {
      flexDirection: 'row',
      gap: 8,
    },
    pill: {
      paddingVertical: 6,
      paddingHorizontal: 12,
      borderRadius: 999,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    pillActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    pillLabel: {
      color: colors.textMuted,
      fontSize: 12,
      fontWeight: '600',
    },
    pillLabelActive: {
      color: colors.onPrimary,
    },
    summary: {
      color: colors.textMuted,
      fontSize: 12,
      lineHeight: 17,
    },
    summaryError: {
      color: colors.danger,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      marginBottom: 8,
      paddingVertical: 10,
      paddingHorizontal: 12,
      borderRadius: 12,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    rowChecked: {
      borderColor: colors.primary,
    },
    artwork: {
      width: 48,
    },
    rowBody: {
      flex: 1,
    },
    rowTitle: {
      color: colors.text,
      fontSize: 14,
      fontWeight: '500',
    },
    rowTitleChecked: {
      color: colors.primary,
    },
    rowMeta: {
      marginTop: 3,
      color: colors.textMuted,
      fontSize: 11,
    },
    pressed: {
      opacity: 0.7,
    },
    empty: {
      marginTop: 24,
      color: colors.textSubtle,
      fontSize: 13,
      lineHeight: 19,
      textAlign: 'center',
    },
    headerSave: {
      color: colors.primary,
      fontSize: 16,
      fontWeight: '600',
    },
    headerSaveDisabled: {
      color: colors.textSubtle,
    },
  });
}
