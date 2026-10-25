import { Pressable, StyleSheet, Text } from 'react-native';
import { ArtworkTile } from './ArtworkTile';
import type { ThemeColors } from '../theme/colors';
import { useThemedStyles } from '../theme/useThemedStyles';

type CollectionTileProps = {
  artworkUri: string | null;
  title: string;
  subtitle?: string;
  accessibilityLabel?: string;
  onPress: () => void;
  isAudiobook?: boolean;
};

/** A two-column album or artist tile: square art, then title and subtitle. */
export function CollectionTile({
  artworkUri,
  title,
  subtitle,
  accessibilityLabel,
  onPress,
  isAudiobook = false,
}: CollectionTileProps) {
  const styles = useThemedStyles(createStyles);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      onPress={onPress}
      style={({ pressed }) => [styles.tile, pressed && styles.pressed]}
    >
      <ArtworkTile artworkUri={artworkUri} title={title} isAudiobook={isAudiobook} />
      <Text style={styles.title} numberOfLines={1}>
        {title}
      </Text>
      {subtitle ? (
        <Text style={styles.subtitle} numberOfLines={1}>
          {subtitle}
        </Text>
      ) : null}
    </Pressable>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    tile: {
      width: '31.33333%',
      marginBottom: 20,
    },
    pressed: {
      opacity: 0.7,
    },
    title: {
      marginTop: 9,
      color: colors.text,
      fontSize: 14,
      fontWeight: '600',
    },
    subtitle: {
      marginTop: 3,
      color: colors.textMuted,
      fontSize: 11,
    },
  });
}
