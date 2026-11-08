import { requireOptionalNativeModule } from 'expo';

/** Tag values read from one audio file. Missing values are null. */
export type TrackMetadata = {
  title: string | null;
  artist: string | null;
  author: string | null;
  albumArtist: string | null;
  album: string | null;
  trackNumber: number | null;
  artworkUri: string | null;
};

type RawMetadata = {
  title?: unknown;
  artist?: unknown;
  author?: unknown;
  albumArtist?: unknown;
  album?: unknown;
  trackNumber?: unknown;
  artworkUri?: unknown;
};

type MusicMetadataNativeModule = {
  readMetadata(uris: string[]): Promise<RawMetadata[]>;
  writeMetadata(
    uri: string,
    title: string,
    artist: string,
    album: string,
    trackNumber: string,
  ): Promise<void>;
};

export class MusicMetadataUnavailableError extends Error {
  constructor() {
    super(
      'Audio tag access needs the musix development build. The native tag module is not available in Expo Go.',
    );
    this.name = 'MusicMetadataUnavailableError';
  }
}

let nativeModule: MusicMetadataNativeModule | null | undefined;

function getNativeModule(): MusicMetadataNativeModule | null {
  if (nativeModule === undefined) {
    nativeModule = requireOptionalNativeModule<MusicMetadataNativeModule>('MusicMetadata');
  }

  return nativeModule;
}

/** Reads tags and cached cover-art URIs for the given audio files. */
export async function readTrackMetadata(uris: string[]): Promise<TrackMetadata[]> {
  const module = getNativeModule();

  if (!module) {
    throw new MusicMetadataUnavailableError();
  }

  const rows = await module.readMetadata(uris);

  return rows.map((row) => ({
    title: asText(row.title),
    artist: asText(row.artist),
    author: asText(row.author),
    albumArtist: asText(row.albumArtist),
    album: asText(row.album),
    trackNumber: asNumber(row.trackNumber),
    artworkUri: asText(row.artworkUri),
  }));
}

/** Writes the editable tags directly to the audio file on the device. */
export async function writeTrackMetadata(
  uri: string,
  metadata: Pick<TrackMetadata, 'album' | 'artist' | 'title' | 'trackNumber'>,
): Promise<void> {
  const module = getNativeModule();

  if (!module) {
    throw new MusicMetadataUnavailableError();
  }

  await module.writeMetadata(
    uri,
    metadata.title ?? '',
    metadata.artist ?? '',
    metadata.album ?? '',
    metadata.trackNumber === null ? '' : String(metadata.trackNumber),
  );
}

function asText(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function asNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}
