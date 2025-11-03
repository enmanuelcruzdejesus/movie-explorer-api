import { Module } from '@nestjs/common';
import { CommonModule } from '../common/common.module';
import { AuthModule } from '../auth/auth.module';
import { FavoritesController } from './favorites.controller';
import { FavoritesService } from './favorites.service';
import { FAVORITES_REPOSITORY } from './favorites.repository';
import { DynamoFavoritesRepository } from './dynamo-favorites.repository';

@Module({
  imports: [CommonModule, AuthModule],
  controllers: [FavoritesController],
  providers: [
    FavoritesService,
    { provide: FAVORITES_REPOSITORY, useClass: DynamoFavoritesRepository },
  ],
})
export class FavoritesModule {}
