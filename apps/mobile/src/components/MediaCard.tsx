import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { ThemeColors } from '../theme/colors';
import { useThemedStyles } from '../theme/useThemedStyles';
import { ArtworkTile } from './ArtworkTile';

type MediaCardProps = {
  artworkUri: string | null;
  title: string;
  subtitle?: string;
  /** Width of the square artwork, in points. */
  width: number;
  accessibilityLabel?: string;
  onPress?: () => void;
};

/** A square artwork card with a title and subtitle, used in Home shelves. */
export function MediaCard({
  artworkUri,
  title,
  subtitle,
  width,
  accessibilityLabel,
  onPress,
}: MediaCardProps) {
  const styles = useThemedStyles(createStyles);

  const content = (
    <>
      <ArtworkTile artworkUri={artworkUri} title={title} />
      <Text style={styles.title} numberOfLines={1}>
        {title}
      </Text>
      {subtitle ? (
        <Text style={styles.subtitle} numberOfLines={1}>
          {subtitle}
        </Text>
      ) : null}
    </>
  );

  if (!onPress) {
    return <View style={{ width }}>{content}</View>;
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      onPress={onPress}
      style={({ pressed }) => [{ width }, pressed && styles.pressed]}
    >
      {content}
    </Pressable>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
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
