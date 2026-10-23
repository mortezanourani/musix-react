export type RootTabParamList = {
  Home: undefined;
  Albums: undefined;
  Artists: undefined;
  Books: undefined;
  Search: undefined;
};

export type HomeStackParamList = {
  HomeFeed: undefined;
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
