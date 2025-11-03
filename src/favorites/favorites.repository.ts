export type FavoriteItem = {
  pk: string;              // USER#<sub>
  sk: string;              // MOVIE#<movieId>
  userId: string;
  movieId: string;
  title?: string;
  posterUrl?: string;
  overview?: string;
  note?: string;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
  version: number;
};

export type ListResult = { items: FavoriteItem[]; cursor?: string };

export interface FavoritesRepository {
  list(userId: string, limit: number, cursor?: string): Promise<ListResult>;
  putIfAbsent(
    userId: string,
    item: Omit<FavoriteItem, 'pk' | 'sk' | 'createdAt' | 'updatedAt' | 'version'>
  ): Promise<{ created: boolean; item: FavoriteItem }>;
  updateWithVersion(
    userId: string,
    movieId: string,
    patch: Partial<FavoriteItem> & { version: number }
  ): Promise<FavoriteItem>;
  updateSnapshot(userId: string, movieId: string, snapshot: Partial<FavoriteItem>): Promise<FavoriteItem>;
  delete(userId: string, movieId: string): Promise<void>;
}

// DI token (cleaner than trying to inject an interface directly)
export const FAVORITES_REPOSITORY = Symbol('FAVORITES_REPOSITORY');
