import { MaterialCommunityIcons } from '@expo/vector-icons';
import { UNKNOWN_ARTIST, type Track } from '@musix/core';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { ThemeColors } from '../theme/colors';
import { useTheme } from '../theme/ThemeContext';
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
  onEdit?: () => void;
};

/** A single track row shared by the Home list and album track lists. */
export function TrackRow({
  track,
  leading,
  meta = 'library',
  active = false,
  onPress,
  onEdit,
}: TrackRowProps) {
  const { colors } = useTheme();
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

  return (
    <View style={[styles.row, active && styles.activeRow]}>
      <Pressable
        accessibilityRole={onPress ? 'button' : undefined}
        accessibilityLabel={onPress ? `Play ${track.title} by ${artist}` : undefined}
        accessibilityState={onPress ? { selected: active } : undefined}
        onPress={onPress}
        disabled={!onPress}
        style={({ pressed }) => [styles.trackContent, pressed && styles.pressed]}
      >
        {content}
      </Pressable>
      {onEdit ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Edit tags for ${track.title}`}
          onPress={onEdit}
          hitSlop={8}
          style={({ pressed }) => [styles.editButton, pressed && styles.pressed]}
        >
          <MaterialCommunityIcons name="pencil-outline" size={20} color={colors.textMuted} />
        </Pressable>
      ) : null}
    </View>
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
    trackContent: {
      flex: 1,
      minHeight: 40,
      flexDirection: 'row',
      alignItems: 'center',
    },
    editButton: {
      alignItems: 'center',
      justifyContent: 'center',
      width: 40,
      minHeight: 40,
      marginLeft: 8,
      borderRadius: 20,
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
