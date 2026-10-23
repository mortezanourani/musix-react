import type { AlbumSummary, ArtistSummary } from '../models/library';
import { UNKNOWN_ALBUM, UNKNOWN_ARTIST } from '../models/library';
import type { Track } from '../models/track';

/**
 * Separators used to detect multiple artists in a single artist tag, e.g.
 * `A; B`, `A & B`, or `A feat. B`.
 */
const ARTIST_SEPARATOR = /\s*(?:;|&|\bfeat\b\.?|\bft\b\.?|\bfeaturing\b)\s*/i;

function normalizeTag(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

/** Splits a raw artist tag into unique artist names, preserving their order. */
export function splitArtists(value: string | null | undefined): string[] {
  const trimmed = normalizeTag(value);

  if (!trimmed) {
    return [];
  }

  const seen = new Set<string>();
  const artists: string[] = [];

  for (const part of trimmed.split(ARTIST_SEPARATOR)) {
    const name = part.trim();
    const key = name.toLocaleLowerCase();

    if (!name || seen.has(key)) {
      continue;
    }

    seen.add(key);
    artists.push(name);
  }

  return artists;
}

/** The artist used for album grouping: artist tag first, then album artist. */
export function getTrackArtistName(track: Track): string {
  return normalizeTag(track.artist) ?? normalizeTag(track.albumArtist) ?? UNKNOWN_ARTIST;
}

/** Every artist a track belongs to, used to populate the Artists page. */
export function getTrackArtistNames(track: Track): string[] {
  const artists = splitArtists(track.artist);

  if (artists.length > 0) {
    return artists;
  }

  const albumArtists = splitArtists(track.albumArtist);

  return albumArtists.length > 0 ? albumArtists : [UNKNOWN_ARTIST];
}

/** Album title shown for a track, with a fallback for untagged files. */
export function getTrackAlbumTitle(track: Track): string {
  return normalizeTag(track.album) ?? UNKNOWN_ALBUM;
}

/**
 * Stable album identity derived from the album title and artist, so two
 * different artists with the same album title stay separate.
 */
export function getAlbumId(track: Track): string {
  const album = getTrackAlbumTitle(track).toLocaleLowerCase();
  const artist = getTrackArtistName(track).toLocaleLowerCase();

  return `${encodeURIComponent(artist)}::${encodeURIComponent(album)}`;
}

/** Builds the album list shown on the Albums page. */
export function buildAlbums(tracks: readonly Track[]): AlbumSummary[] {
  const albums = new Map<string, Omit<AlbumSummary, 'id'>>();

  for (const track of tracks) {
    const id = getAlbumId(track);
    const existing = albums.get(id);

    if (existing) {
      existing.trackCount += 1;
      existing.durationMs += track.durationMs;
      existing.artworkUri ??= track.artworkUri;
      continue;
    }

    albums.set(id, {
      title: getTrackAlbumTitle(track),
      artist: getTrackArtistName(track),
      artworkUri: track.artworkUri,
      trackCount: 1,
      durationMs: track.durationMs,
    });
  }

  return Array.from(albums, ([id, album]) => ({ id, ...album })).sort((a, b) => {
    const unknownOrder = compareUnknownLast(a.title, b.title, UNKNOWN_ALBUM);

    return unknownOrder !== 0
      ? unknownOrder
      : a.artist.localeCompare(b.artist, undefined, { sensitivity: 'base' });
  });
}

/** Builds the artist list shown on the Artists page. */
export function buildArtists(tracks: readonly Track[]): ArtistSummary[] {
  const artists = new Map<
    string,
    { name: string; artworkUri: string | null; trackCount: number; albumIds: Set<string> }
  >();

  for (const track of tracks) {
    for (const name of getTrackArtistNames(track)) {
      const key = name.toLocaleLowerCase();
      let artist = artists.get(key);

      if (!artist) {
        artist = { name, artworkUri: null, trackCount: 0, albumIds: new Set() };
        artists.set(key, artist);
      }

      artist.trackCount += 1;
      artist.artworkUri ??= track.artworkUri;
      artist.albumIds.add(getAlbumId(track));
    }
  }

  return Array.from(artists.values())
    .map(({ name, artworkUri, trackCount, albumIds }) => ({
      name,
      artworkUri,
      trackCount,
      albumCount: albumIds.size,
    }))
    .sort((a, b) => compareUnknownLast(a.name, b.name, UNKNOWN_ARTIST));
}

/** Finds one album by its id. */
export function getAlbumById(tracks: readonly Track[], albumId: string): AlbumSummary | null {
  return buildAlbums(tracks).find((album) => album.id === albumId) ?? null;
}

/** All tracks in an album, in track-number order. */
export function getAlbumTracks(tracks: readonly Track[], albumId: string): Track[] {
  return tracks
    .filter((track) => getAlbumId(track) === albumId)
    .sort(
      (a, b) =>
        (a.trackNumber ?? Number.MAX_SAFE_INTEGER) - (b.trackNumber ?? Number.MAX_SAFE_INTEGER) ||
        a.title.localeCompare(b.title, undefined, { sensitivity: 'base' }),
    );
}

/** Albums that contain at least one track by the given artist. */
export function getArtistAlbums(tracks: readonly Track[], artistName: string): AlbumSummary[] {
  const key = artistName.toLocaleLowerCase();

  return buildAlbums(
    tracks.filter((track) =>
      getTrackArtistNames(track).some((name) => name.toLocaleLowerCase() === key),
    ),
  );
}

function compareUnknownLast(a: string, b: string, unknown: string): number {
  const unknownKey = unknown.toLocaleLowerCase();
  const aUnknown = a.toLocaleLowerCase() === unknownKey;
  const bUnknown = b.toLocaleLowerCase() === unknownKey;

  if (aUnknown !== bUnknown) {
    return aUnknown ? 1 : -1;
  }

  return a.localeCompare(b, undefined, { sensitivity: 'base' });
}
