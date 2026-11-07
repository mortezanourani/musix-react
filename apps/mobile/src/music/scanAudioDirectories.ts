import type { Track } from '@musix/core';
import * as MediaLibrary from 'expo-media-library/legacy';
import { readTrackMetadata, type TrackMetadata } from './readTrackMetadata';

const PAGE_SIZE = 500;

const LIBRARY_DIRECTORIES = [
  { name: 'Music', mediaType: 'music' as const },
  { name: 'Audiobooks', mediaType: 'audiobook' as const },
];

export class MusicPermissionError extends Error {
  constructor() {
    super(
      'musix needs permission to read audio files. Allow access in the system dialog and try again.',
    );
    this.name = 'MusicPermissionError';
  }
}

/**
 * Reads audio files from the device's Music and Audiobooks directories and
 * enriches them with embedded tags.
 */
export async function scanAudioDirectories(): Promise<Track[]> {
  const permission = await MediaLibrary.requestPermissionsAsync(false, ['audio']);

  if (!permission.granted) {
    throw new MusicPermissionError();
  }

  const assets = await getAllAudioAssets();
  const tracks = assets.flatMap((asset) => {
    const directory = directoryFromUri(asset.uri);
    return directory ? [toTrack(asset, directory)] : [];
  });

  const metadata = await readTrackMetadata(
    tracks.map((track) => track.uri),
  );

  return tracks
    .map((track, index) => applyMetadata(track, metadata[index]))
    .sort((a, b) => a.title.localeCompare(b.title, undefined, { sensitivity: 'base' }));
}

async function getAllAudioAssets(): Promise<MediaLibrary.Asset[]> {
  const assets: MediaLibrary.Asset[] = [];
  let after: string | undefined;

  for (;;) {
    const page = await MediaLibrary.getAssetsAsync({
      mediaType: MediaLibrary.MediaType.audio,
      first: PAGE_SIZE,
      after,
    });

    assets.push(...page.assets);

    if (!page.hasNextPage) {
      return assets;
    }

    after = page.endCursor;
  }
}

function toTrack(
  asset: MediaLibrary.Asset,
  directory: (typeof LIBRARY_DIRECTORIES)[number],
): Track {
  return {
    id: asset.id,
    mediaType: directory.mediaType,
    filename: asset.filename,
    title: titleFromFilename(asset.filename),
    artist: null,
    author: null,
    albumArtist: null,
    album: null,
    trackNumber: null,
    folder: folderFromUri(asset.uri, directory.name),
    uri: asset.uri,
    artworkUri: null,
    durationMs: Number.isFinite(asset.duration) ? Math.round(asset.duration * 1000) : 0,
    modificationTime: asset.modificationTime ?? null,
  };
}

function applyMetadata(track: Track, metadata: TrackMetadata | undefined): Track {
  if (!metadata) {
    return track;
  }

  return {
    ...track,
    title: metadata.title ?? track.title,
    artist: metadata.artist,
    author: metadata.author,
    albumArtist: metadata.albumArtist,
    album: metadata.album,
    trackNumber: metadata.trackNumber,
    artworkUri: metadata.artworkUri,
  };
}

function titleFromFilename(filename: string): string {
  return filename.replace(/\.[^.]+$/, '');
}

function directoryFromUri(uri: string): (typeof LIBRARY_DIRECTORIES)[number] | null {
  const path = decodeURIComponent(uri);
  return LIBRARY_DIRECTORIES.find(({ name }) => new RegExp(`(^|/)${name}(/|$)`, 'i').test(path)) ?? null;
}

function folderFromUri(uri: string, directoryName: string): string {
  const path = decodeURIComponent(uri);
  const marker = `/${directoryName.toLowerCase()}/`;
  const index = path.toLowerCase().lastIndexOf(marker);

  if (index === -1) {
    return directoryName;
  }

  const relative = path.slice(index + marker.length);
  const folderEnd = relative.lastIndexOf('/');

  return folderEnd === -1 ? directoryName : `${directoryName}/${relative.slice(0, folderEnd)}`;
}
