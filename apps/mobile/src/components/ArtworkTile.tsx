import { useEffect, useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const TILE_COLORS = [
  '#243447',
  '#3a2a4d',
  '#432b31',
  '#2b3d33',
  '#3f3623',
  '#2a3644',
  '#3d2a3a',
  '#233b3b',
] as const;

type ArtworkTileProps = {
  artworkUri: string | null;
  /** Used for the fallback initials and the tile colour. */
  title: string;
  /** Corner radius of the square tile. */
  borderRadius?: number;
  /** Font size for the fallback initials. */
  initialsFontSize?: number;
  /** Shows a book badge to indicate this is an audiobook. */
  isAudiobook?: boolean;
};

/** A square cover image that falls back to the collection's initials. */
export function ArtworkTile({
  artworkUri,
  title,
  borderRadius = 14,
  initialsFontSize = 34,
  isAudiobook = false,
}: ArtworkTileProps) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [artworkUri]);

  const showImage = artworkUri !== null && !failed;

  return (
    <View style={[styles.tile, { backgroundColor: tileColor(title), borderRadius }]}>
      {showImage ? (
        <Image
          source={{ uri: artworkUri }}
          style={styles.image}
          resizeMode="cover"
          onError={() => setFailed(true)}
        />
      ) : (
        <Text style={[styles.initials, { fontSize: initialsFontSize }]} numberOfLines={1}>
          {initials(title)}
        </Text>
      )}
      {isAudiobook && (
        <View style={styles.audiobookBadge}>
          <MaterialCommunityIcons name="book" size={16} color="#ffffff" />
        </View>
      )}
    </View>
  );
}

function initials(value: string): string {
  const words = value.trim().split(/\s+/).filter(Boolean);
  const letters = words.slice(0, 2).map((word) => word.charAt(0));

  return (letters.join('') || '?').toUpperCase();
}

function tileColor(value: string): string {
  let hash = 0;

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) | 0;
  }

  return TILE_COLORS[Math.abs(hash) % TILE_COLORS.length];
}

const styles = StyleSheet.create({
  tile: {
    width: '100%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  image: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
  initials: {
    color: '#ffffff',
    fontWeight: '700',
    letterSpacing: 1,
  },
  audiobookBadge: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 10,
    padding: 4,
  },
});
