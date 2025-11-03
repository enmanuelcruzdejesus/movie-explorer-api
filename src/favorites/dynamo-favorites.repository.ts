import { Inject, ConflictException, NotFoundException } from '@nestjs/common';
import { DynamoDBDocumentClient, QueryCommand, PutCommand, UpdateCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';
import { DDB_DOC_CLIENT, FAVORITES_TABLE } from '../common/dynamo/dynamo.module';
import type { FavoritesRepository, FavoriteItem, ListResult } from './favorites.repository';

const nowIso = () => new Date().toISOString();
const toPk = (userId: string) => `USER#${userId}`;
const toSk = (movieId: string) => `MOVIE#${movieId}`;

function encodeCursor(key?: Record<string, unknown>) {
  return key ? Buffer.from(JSON.stringify(key)).toString('base64') : undefined;
}
function decodeCursor(cursor?: string) {
  if (!cursor) return undefined;
  return JSON.parse(Buffer.from(cursor, 'base64').toString('utf8'));
}

export class DynamoFavoritesRepository implements FavoritesRepository {
  constructor(
    @Inject(DDB_DOC_CLIENT) private readonly ddb: DynamoDBDocumentClient,
    @Inject(FAVORITES_TABLE) private readonly tableName: string,
  ) {}

  async list(userId: string, limit: number, cursor?: string): Promise<ListResult> {
    const res = await this.ddb.send(new QueryCommand({
      TableName: this.tableName,
      KeyConditionExpression: 'pk = :pk',
      ExpressionAttributeValues: { ':pk': toPk(userId) },
      Limit: limit,
      ExclusiveStartKey: decodeCursor(cursor),
    }));

    return {
      items: (res.Items ?? []) as FavoriteItem[],
      cursor: encodeCursor(res.LastEvaluatedKey),
    };
  }

  async putIfAbsent(
    userId: string,
    item: Omit<FavoriteItem, 'pk' | 'sk' | 'createdAt' | 'updatedAt' | 'version'>,
  ): Promise<{ created: boolean; item: FavoriteItem }> {
    const now = nowIso();
    const full: FavoriteItem = {
      ...item,
      pk: toPk(userId),
      sk: toSk(item.movieId),
      userId,
      createdAt: now,
      updatedAt: now,
      version: 1,
    };

    try {
      await this.ddb.send(new PutCommand({
        TableName: this.tableName,
        Item: full,
        ConditionExpression: 'attribute_not_exists(pk) AND attribute_not_exists(sk)',
      }));
      return { created: true, item: full };
    } catch (err: any) {
      if (err?.name === 'ConditionalCheckFailedException') {
        const updated = await this.updateSnapshot(userId, item.movieId, {
          title: item.title,
          posterUrl: item.posterUrl,
          overview: item.overview,
        });
        return { created: false, item: updated };
      }
      throw err;
    }
  }

  async updateWithVersion(
    userId: string,
    movieId: string,
    patch: Partial<FavoriteItem> & { version: number },
  ): Promise<FavoriteItem> {
    const names: Record<string, string> = { '#v': 'version', '#u': 'updatedAt' };
    const values: Record<string, unknown> = { ':expected': patch.version, ':vinc': 1, ':u': nowIso() };
    const sets: string[] = ['#v = #v + :vinc', '#u = :u'];

    const add = (k: keyof FavoriteItem, val?: unknown) => {
      if (val === undefined) return;
      const n = `#${k}`;
      const v = `:${k}`;
      names[n] = k as string;
      values[v] = val;
      sets.push(`${n} = ${v}`);
    };
    add('title', patch.title);
    add('posterUrl', patch.posterUrl);
    add('overview', patch.overview);
    add('note', patch.note);
    add('tags', patch.tags);

    const res = await this.ddb.send(new UpdateCommand({
      TableName: this.tableName,
      Key: { pk: toPk(userId), sk: toSk(movieId) },
      UpdateExpression: 'SET ' + sets.join(', '),
      ConditionExpression: '#v = :expected',
      ExpressionAttributeNames: names,
      ExpressionAttributeValues: values,
      ReturnValues: 'ALL_NEW',
    })).catch((err: any) => {
      if (err?.name === 'ConditionalCheckFailedException') {
        throw new ConflictException('Version mismatch');
      }
      throw err;
    });

    if (!res.Attributes) throw new NotFoundException('Favorite not found');
    return res.Attributes as FavoriteItem;
  }

  async updateSnapshot(userId: string, movieId: string, snapshot: Partial<FavoriteItem>): Promise<FavoriteItem> {
    const names: Record<string, string> = { '#u': 'updatedAt' };
    const values: Record<string, unknown> = { ':u': nowIso() };
    const sets: string[] = ['#u = :u'];

    const add = (k: keyof FavoriteItem, val?: unknown) => {
      if (val === undefined) return;
      const n = `#${k}`;
      const v = `:${k}`;
      names[n] = k as string;
      values[v] = val;
      sets.push(`${n} = ${v}`);
    };
    add('title', snapshot.title);
    add('posterUrl', snapshot.posterUrl);
    add('overview', snapshot.overview);

    const res = await this.ddb.send(new UpdateCommand({
      TableName: this.tableName,
      Key: { pk: toPk(userId), sk: toSk(movieId) },
      UpdateExpression: 'SET ' + sets.join(', '),
      ExpressionAttributeNames: names,
      ExpressionAttributeValues: values,
      ReturnValues: 'ALL_NEW',
    }));

    if (!res.Attributes) throw new NotFoundException('Favorite not found');
    return res.Attributes as FavoriteItem;
  }

  async delete(userId: string, movieId: string): Promise<void> {
    await this.ddb.send(new DeleteCommand({
      TableName: this.tableName,
      Key: { pk: toPk(userId), sk: toSk(movieId) },
    }));
  }
}
