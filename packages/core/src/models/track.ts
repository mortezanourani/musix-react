/**
 * A track discovered in the device's Music directory.
 *
 * Tag-derived values (artist, album, artwork) will be added once tag reading
 * is implemented; for now `title` is derived from the filename.
 */
export interface Track {
  /** Stable identifier coming from the platform media store. */
  id: string;
  /** File name including its extension, e.g. `01 - Intro.mp3`. */
  filename: string;
  /** Display title (currently the filename without its extension). */
  title: string;
  /** Folder relative to the Music directory, e.g. `Music` or `Music/Albums/X`. */
  folder: string;
  /** Platform URI used to open the file. */
  uri: string;
  /** Duration in milliseconds, or 0 when unknown. */
  durationMs: number;
  /** Last modification timestamp in milliseconds, or null when unknown. */
  modificationTime: number | null;
}
