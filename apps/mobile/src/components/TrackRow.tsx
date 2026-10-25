import { UNKNOWN_ARTIST, type Track } from '@musix/core';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { ThemeColors } from '../theme/colors';
import { useThemedStyles } from '../theme/useThemedStyles';
import { formatDuration } from '../utils/format';

type TrackRowProps = {
  track: Track;
  /** Track number shown on the left, e.g. `03`. */
  leading?: string;
  /** `library` shows the folder, `album` keeps the row focused on the track. */
  meta?: 'library' | 'album';
  /** Marks the track that is currently in the player. */
  active?: boolean;
  onPress?: () => void;
};

/** A single track row shared by the Home list and album track lists. */
export function TrackRow({
  track,
  leading,
  meta = 'library',
  active = false,
  onPress,
}: TrackRowProps) {
  const styles = useThemedStyles(createStyles);
  const artist = track.artist ?? UNKNOWN_ARTIST;
  const details =
    meta === 'library'
      ? `${artist} · ${track.folder} · ${formatDuration(track.durationMs)}`
      : `${artist} · ${formatDuration(track.durationMs)}`;

  const content = (
    <>
      {leading ? (
        <Text style={[styles.leading, active && styles.activeAccent]}>{leading}</Text>
      ) : null}
      <View style={styles.body}>
        <Text style={[styles.title, active && styles.activeAccent]} numberOfLines={1}>
          {track.title}
        </Text>
        <Text style={styles.meta} numberOfLines={1}>
          {details}
        </Text>
      </View>
    </>
  );

  if (!onPress) {
    return <View style={styles.row}>{content}</View>;
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Play ${track.title} by ${artist}`}
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        active && styles.activeRow,
        pressed && styles.pressed,
      ]}
    >
      {content}
    </Pressable>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
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
    activeRow: {
      borderColor: colors.primary,
    },
    pressed: {
      opacity: 0.7,
    },
    leading: {
      width: 32,
      color: colors.textSubtle,
      fontSize: 12,
      fontVariant: ['tabular-nums'],
    },
    activeAccent: {
      color: colors.primary,
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
}
