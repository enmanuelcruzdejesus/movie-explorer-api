import { Controller, Get, Post, Put, Delete, Param, Body, Query, UseGuards, Res, HttpStatus } from '@nestjs/common';
import type { Response } from 'express';
import { JwtScopeGuard } from '../auth/jwt-scope.guard';
import { Scopes } from '../auth/scopes.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import { FavoritesService } from './favorites.service';
import { ListFavoritesQueryDto } from './dto/list-favorites.dto';
import { CreateFavoriteDto } from './dto/create-favorite.dto';
import { UpdateFavoriteDto } from './dto/update-favorite.dto';
import type { FavoriteItem } from './favorites.repository';

function toPublic(i: FavoriteItem) {
  const { movieId, title, posterUrl, overview, note, tags, createdAt, updatedAt, version } = i;
  return { movieId, title, posterUrl, overview, note, tags, createdAt, updatedAt, version };
}

@Controller('favorites')
@UseGuards(JwtScopeGuard)
export class FavoritesController {
  constructor(private readonly service: FavoritesService) {}

  @Get()
  @Scopes('favorites:read')
  async list(
    @CurrentUser() user: { sub: string },
    @Query() query: ListFavoritesQueryDto,
  ) {
    const { items, cursor } = await this.service.list(user.sub, query.limit!, query.cursor);
    return { items: items.map(toPublic), cursor };
  }

  @Post()
  @Scopes('favorites:write')
  async create(
    @CurrentUser() user: { sub: string },
    @Body() dto: CreateFavoriteDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { created, item } = await this.service.add(user.sub, dto);
    res.status(created ? HttpStatus.CREATED : HttpStatus.OK);
    return { idempotent: !created, item: toPublic(item) };
  }

  @Put(':movieId')
  @Scopes('favorites:write')
  async update(
    @CurrentUser() user: { sub: string },
    @Param('movieId') movieId: string,
    @Body() dto: UpdateFavoriteDto,
  ) {
    const item = await this.service.update(user.sub, movieId, dto);
    return toPublic(item);
  }

  @Delete(':movieId')
  @Scopes('favorites:write')
  async remove(
    @CurrentUser() user: { sub: string },
    @Param('movieId') movieId: string,
  ) {
    await this.service.remove(user.sub, movieId);
    return { ok: true };
  }
}
