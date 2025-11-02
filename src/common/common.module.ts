import { Global, Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { DynamoModule } from './dynamo/dynamo.module';
import { LoggingInterceptor } from './interceptors/logging.interceptor';

@Global()
@Module({
  imports: [
    // App-wide config (reads .env, etc.)
    ConfigModule.forRoot({ isGlobal: true }),
    // DynamoDB client + table tokens
    DynamoModule,
  ],
  providers: [
    // Simple structured request log for CloudWatch
    { provide: APP_INTERCEPTOR, useClass: LoggingInterceptor },
  ],
  exports: [DynamoModule], // make Dynamo providers available to features
})
export class CommonModule {}
