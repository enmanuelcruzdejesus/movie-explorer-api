import { Global, Module } from '@nestjs/common';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

export const DDB_DOC_CLIENT = Symbol('DDB_DOC_CLIENT');
export const FAVORITES_TABLE = Symbol('FAVORITES_TABLE');

@Global()
@Module({
  providers: [
    {
      provide: DDB_DOC_CLIENT,
      useFactory: () => {
        const region = process.env.AWS_REGION || 'us-east-1';
        const endpoint = process.env.DYNAMO_ENDPOINT || undefined; // set for DynamoDB Local
        const client = new DynamoDBClient({ region, endpoint });
        return DynamoDBDocumentClient.from(client, {
          marshallOptions: { removeUndefinedValues: true, convertClassInstanceToMap: true },
        });
      },
    },
    {
      provide: FAVORITES_TABLE,
      useFactory: () => process.env.DDB_FAVORITES_TABLE || 'Favorites',
    },
  ],
  exports: [DDB_DOC_CLIENT, FAVORITES_TABLE],
})
export class DynamoModule {}
