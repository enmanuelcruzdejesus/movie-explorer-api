import { Injectable, Inject } from '@nestjs/common';
import { CreateFavoriteDto } from './dto/create-favorite.dto';
import { UpdateFavoriteDto } from './dto/update-favorite.dto';
import * as favoritesRepository from './favorites.repository';

@Injectable()
export class FavoritesService {
  constructor(
    @Inject(favoritesRepository.FAVORITES_REPOSITORY) private readonly repo: favoritesRepository.FavoritesRepository,
  ) {}

  list(userId: string, limit: number, cursor?: string): Promise<favoritesRepository.ListResult> {
    return this.repo.list(userId, limit, cursor);
  }

  async add(userId: string, dto: CreateFavoriteDto) {
    const { movieId, title, posterUrl, overview, note, tags } = dto;
    return this.repo.putIfAbsent(userId, { userId, movieId, title, posterUrl, overview, note, tags });
  }

  update(userId: string, movieId: string, dto: UpdateFavoriteDto) {
    return this.repo.updateWithVersion(userId, movieId, dto);
  }

  remove(userId: string, movieId: string) {
    return this.repo.delete(userId, movieId);
  }
}
