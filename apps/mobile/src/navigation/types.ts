export type MainStackParamList = {
  HomeFeed: undefined;
  Settings: undefined;
  ArtistAlbums: { artistName: string };
  AlbumTracks: { albumId: string };
};

export type AlbumsStackParamList = {
  AlbumsList: undefined;
  AlbumTracks: { albumId: string };
};

export type ArtistsStackParamList = {
  ArtistsList: undefined;
  ArtistAlbums: { artistName: string };
  AlbumTracks: { albumId: string };
};
