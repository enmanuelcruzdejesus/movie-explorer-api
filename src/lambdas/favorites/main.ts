import 'reflect-metadata';
import express from 'express';
import serverlessExpress from '@vendia/serverless-express';
import { ExpressAdapter } from '@nestjs/platform-express';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { FavoritesModule } from '../../favorites/favorites.module';

let server: ReturnType<typeof serverlessExpress> | undefined;

async function bootstrap() {
  const expressApp = express();
  const adapter = new ExpressAdapter(expressApp);
  const app = await NestFactory.create(FavoritesModule, adapter, { bufferLogs: true });

  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  await app.init(); // required with custom adapter
  return serverlessExpress({ app: expressApp });
}

export const handler = async (event: any, context: any) => {
  server = server ?? (await bootstrap());
  return server(event, context, () => {});
};
