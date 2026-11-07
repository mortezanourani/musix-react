/**
 * An audio file discovered in the device's Music or Audiobooks directory.
 *
 * Tag-derived fields come from the file's embedded metadata. They are `null`
 * when the file has no tag for that field, or when tags could not be read.
 */
export interface Track {
  /** Directory category used to separate albums from audiobooks. */
  mediaType: 'music' | 'audiobook';
  /** Stable identifier coming from the platform media store. */
  id: string;
  /** File name including its extension, e.g. `01 - Intro.mp3`. */
  filename: string;
  /** Display title, from the title tag with the filename as a fallback. */
  title: string;
  /** Artist tag as written in the file, e.g. `A & B`. */
  artist: string | null;
  /** Author tag, used as an artist for audiobook files when available. */
  author: string | null;
  /** Album artist tag, used when the artist tag is missing. */
  albumArtist: string | null;
  /** Album tag. */
  album: string | null;
  /** Track number within its disc, or null when unknown. */
  trackNumber: number | null;
  /** Folder relative to its library directory, e.g. `Music/Albums/X` or `Audiobooks/Series`. */
  folder: string;
  /** Platform URI used to open the file. */
  uri: string;
  /** URI of the extracted cover art cached on disk, or null when the file has none. */
  artworkUri: string | null;
  /** Duration in milliseconds, or 0 when unknown. */
  durationMs: number;
  /** Last modification timestamp in milliseconds, or null when unknown. */
  modificationTime: number | null;
}
