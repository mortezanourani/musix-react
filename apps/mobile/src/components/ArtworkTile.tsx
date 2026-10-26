import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useEffect, useState, type ComponentProps } from 'react';
import { Image, StyleSheet, View } from 'react-native';

/** What a tile is showing, used to pick a recognisable fallback thumbnail. */
export type ArtworkKind = 'album' | 'audiobook' | 'artist' | 'track';

type IconName = ComponentProps<typeof MaterialCommunityIcons>['name'];

const FALLBACK_ICONS: Record<ArtworkKind, IconName> = {
  album: 'album',
  audiobook: 'book-open-page-variant',
  artist: 'account-music',
  track: 'music-note',
};

/**
 * Each kind gets its own colour family so a missing cover still tells the user
 * at a glance whether they are looking at an album, a book, an artist or a track.
 */
const FALLBACK_COLORS: Record<ArtworkKind, readonly string[]> = {
  album: ['#243447', '#2a3644', '#253a4a', '#20364a'],
  audiobook: ['#4a3424', '#4d3a22', '#432b31', '#3f3623'],
  artist: ['#3a2a4d', '#3d2a3a', '#432b47', '#34305a'],
  track: ['#233b3b', '#2b3d33', '#2f3a2a', '#1f3b33'],
};

type ArtworkTileProps = {
  artworkUri: string | null;
  /** Used to give fallback tiles a stable colour. */
  title: string;
  /** Which fallback thumbnail to show when there is no artwork. */
  kind?: ArtworkKind;
  /** Corner radius of the square tile. */
  borderRadius?: number;
  /** Size of the fallback thumbnail icon. */
  iconSize?: number;
};

/** A square cover image that falls back to a thumbnail for its kind. */
export function ArtworkTile({
  artworkUri,
  title,
  kind = 'album',
  borderRadius = 14,
  iconSize = 48,
}: ArtworkTileProps) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [artworkUri]);

  const showImage = artworkUri !== null && !failed;

  return (
    <View
      style={[
        styles.tile,
        { backgroundColor: tileColor(kind, title), borderRadius },
      ]}
    >
      {showImage ? (
        <Image
          source={{ uri: artworkUri }}
          style={styles.image}
          resizeMode="cover"
          onError={() => setFailed(true)}
        />
      ) : (
        <MaterialCommunityIcons
          name={FALLBACK_ICONS[kind]}
          size={iconSize}
          color="rgba(255, 255, 255, 0.88)"
        />
      )}
      {kind === 'audiobook' && showImage && (
        <View style={styles.audiobookBadge}>
          <MaterialCommunityIcons name="book" size={16} color="#ffffff" />
        </View>
      )}
    </View>
  );
}

function tileColor(kind: ArtworkKind, value: string): string {
  const palette = FALLBACK_COLORS[kind];
  let hash = 0;

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) | 0;
  }

  return palette[Math.abs(hash) % palette.length];
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
  audiobookBadge: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 10,
    padding: 4,
  },
});
