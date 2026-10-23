import type { Track } from '@musix/core';
import * as MediaLibrary from 'expo-media-library/legacy';
import { readTrackMetadata, type TrackMetadata } from './readTrackMetadata';

const PAGE_SIZE = 500;

/** Matches `/Music/` on any volume (internal storage or SD card). */
const MUSIC_FOLDER_PATTERN = /(^|\/)Music(\/|$)/i;

export class MusicPermissionError extends Error {
  constructor() {
    super(
      'musix needs permission to read audio files. Allow access in the system dialog and try again.',
    );
    this.name = 'MusicPermissionError';
  }
}

/**
 * Reads every audio asset known to the device's media store, keeps the ones
 * stored inside the Music directory, and enriches them with embedded tags.
 */
export async function scanMusicDirectory(): Promise<Track[]> {
  const permission = await MediaLibrary.requestPermissionsAsync(false, ['audio']);

  if (!permission.granted) {
    throw new MusicPermissionError();
  }

  const assets = await getAllAudioAssets();
  const tracks = assets
    .filter((asset) => MUSIC_FOLDER_PATTERN.test(decodeURIComponent(asset.uri)))
    .map(toTrack);

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

function toTrack(asset: MediaLibrary.Asset): Track {
  return {
    id: asset.id,
    filename: asset.filename,
    title: titleFromFilename(asset.filename),
    artist: null,
    albumArtist: null,
    album: null,
    trackNumber: null,
    folder: folderFromUri(asset.uri),
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
    albumArtist: metadata.albumArtist,
    album: metadata.album,
    trackNumber: metadata.trackNumber,
    artworkUri: metadata.artworkUri,
  };
}

function titleFromFilename(filename: string): string {
  return filename.replace(/\.[^.]+$/, '');
}

function folderFromUri(uri: string): string {
  const path = decodeURIComponent(uri);
  const marker = '/music/';
  const index = path.toLowerCase().lastIndexOf(marker);

  if (index === -1) {
    return 'Music';
  }

  const relative = path.slice(index + marker.length);
  const folderEnd = relative.lastIndexOf('/');

  return folderEnd === -1 ? 'Music' : `Music/${relative.slice(0, folderEnd)}`;
}
