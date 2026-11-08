export type MainStackParamList = {
  HomeFeed: undefined;
  Settings: undefined;
  ManageFiles: undefined;
  ArtistAlbums: { artistName: string };
  AlbumTracks: { albumId: string };
  EditTrack: { trackId: string };
};
