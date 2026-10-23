import { UNKNOWN_ARTIST, type Track } from '@musix/core';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/colors';
import { formatDuration } from '../utils/format';

type TrackRowProps = {
  track: Track;
  /** Track number shown on the left, e.g. `03`. */
  leading?: string;
  /** `library` shows the folder, `album` keeps the row focused on the track. */
  meta?: 'library' | 'album';
};

/** A single track row shared by the Home list and album track lists. */
export function TrackRow({ track, leading, meta = 'library' }: TrackRowProps) {
  const artist = track.artist ?? UNKNOWN_ARTIST;
  const details =
    meta === 'library'
      ? `${artist} · ${track.folder} · ${formatDuration(track.durationMs)}`
      : `${artist} · ${formatDuration(track.durationMs)}`;

  return (
    <View style={styles.row}>
      {leading ? <Text style={styles.leading}>{leading}</Text> : null}
      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={1}>
          {track.title}
        </Text>
        <Text style={styles.meta} numberOfLines={1}>
          {details}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  leading: {
    width: 32,
    color: colors.textSubtle,
    fontSize: 12,
    fontVariant: ['tabular-nums'],
  },
  body: {
    flex: 1,
  },
  title: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '500',
  },
  meta: {
    marginTop: 3,
    color: colors.textMuted,
    fontSize: 11,
  },
});
