import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { Track } from '@musix/core';
import { scanMusicDirectory } from '../music/scanMusicDirectory';

type ScanStatus = 'idle' | 'scanning' | 'ready' | 'error';

export function HomeScreen() {
  const insets = useSafeAreaInsets();
  const [tracks, setTracks] = useState<Track[]>([]);
  const [status, setStatus] = useState<ScanStatus>('idle');
  const [error, setError] = useState<string | null>(null);

  const updateLibrary = useCallback(async () => {
    setStatus('scanning');
    setError(null);

    try {
      const found = await scanMusicDirectory();
      setTracks(found);
      setStatus('ready');
    } catch (cause) {
      setTracks([]);
      setError(
        cause instanceof Error
          ? cause.message
          : 'Something went wrong while reading the Music directory.',
      );
      setStatus('error');
    }
  }, []);

  const scanning = status === 'scanning';

  return (
    <View
      style={[
        styles.screen,
        { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 8 },
      ]}
    >
      <View style={styles.header}>
        <Text style={styles.heading}>musix</Text>
        <Text style={styles.subheading}>Music stored on this device</Text>
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Update Library"
        disabled={scanning}
        onPress={updateLibrary}
        style={({ pressed }) => [
          styles.button,
          pressed && styles.buttonPressed,
          scanning && styles.buttonDisabled,
        ]}
      >
        {scanning ? (
          <ActivityIndicator color="#ffffff" />
        ) : (
          <Text style={styles.buttonLabel}>Update Library</Text>
        )}
      </Pressable>

      <Text style={styles.status}>
        {status === 'ready'
          ? `${tracks.length} ${tracks.length === 1 ? 'file' : 'files'} in Music`
          : scanning
            ? 'Scanning the Music directory…'
            : 'Reads audio files from the Music directory.'}
      </Text>

      {error ? <Text style={styles.error}>{error}</Text> : null}

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
        ListEmptyComponent={
          <Text style={styles.empty}>
            {status === 'ready'
              ? 'No audio files found in the Music directory.'
              : status === 'error'
                ? ''
                : 'Tap “Update Library” to list the files in your Music directory.'}
          </Text>
        }
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
    backgroundColor: '#0b0b0d',
  },
  header: {
    marginBottom: 20,
  },
  heading: {
    color: '#f2f2f5',
    fontSize: 30,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  subheading: {
    marginTop: 4,
    color: '#8e8e98',
    fontSize: 13,
  },
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 50,
    borderRadius: 14,
    backgroundColor: '#7c5cff',
  },
  buttonPressed: {
    backgroundColor: '#6a4be6',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonLabel: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
  },
  status: {
    marginTop: 12,
    color: '#8e8e98',
    fontSize: 12,
  },
  error: {
    marginTop: 8,
    color: '#ff6b6b',
    fontSize: 12,
    lineHeight: 17,
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
    backgroundColor: '#15151a',
    borderWidth: 1,
    borderColor: '#26262e',
  },
  rowIndex: {
    width: 32,
    color: '#6c6c78',
    fontSize: 12,
    fontVariant: ['tabular-nums'],
  },
  rowBody: {
    flex: 1,
  },
  rowTitle: {
    color: '#f2f2f5',
    fontSize: 14,
    fontWeight: '500',
  },
  rowMeta: {
    marginTop: 3,
    color: '#8e8e98',
    fontSize: 11,
  },
  empty: {
    marginTop: 24,
    color: '#6c6c78',
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
  },
});
