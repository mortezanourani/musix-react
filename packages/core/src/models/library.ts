/** Shown for tracks that have no artist or album-artist tag. */
export const UNKNOWN_ARTIST = 'Unknown Artist';

/** Shown for tracks that have no album tag. */
export const UNKNOWN_ALBUM = 'Unknown Album';

/** An album derived from the tags of the tracks in the library. */
export interface AlbumSummary {
  /** Stable identifier built from the album title and artist. */
  id: string;
  /** Album title tag. */
  title: string;
  /** Artist tag used to tell same-titled albums apart. */
  artist: string;
  /** Cover art from the first track in the album that has one. */
  artworkUri: string | null;
  trackCount: number;
  durationMs: number;
}

/** An artist derived from the artist tags of the tracks in the library. */
export interface ArtistSummary {
  /** Artist name as written in the tag (first spelling encountered wins). */
  name: string;
  /** Cover art borrowed from one of the artist's albums. */
  artworkUri: string | null;
  albumCount: number;
  trackCount: number;
}
