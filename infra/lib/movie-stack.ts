import * as path from 'path';
import * as cdk from 'aws-cdk-lib';
import { Duration, RemovalPolicy, Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import * as apigwv2 from 'aws-cdk-lib/aws-apigatewayv2';
import * as integrations from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import * as authorizers from 'aws-cdk-lib/aws-apigatewayv2-authorizers';

export interface MoviesBackendStackProps extends StackProps {
  auth0Issuer: string;   // e.g. https://YOUR-TENANT.us.auth0.com/
  auth0Audience: string; // e.g. movies-api
  stage?: string;        // e.g. dev, staging, prod
}

export class MoviesBackendStack extends Stack {
  constructor(scope: Construct, id: string, props: MoviesBackendStackProps) {
    super(scope, id, props);

    const stage = props.stage ?? 'dev';

    // DynamoDB table for favorites
    const favoritesTable = new dynamodb.Table(this, 'FavoritesTable', {
      tableName: `Favorites-${stage}`,
      partitionKey: { name: 'pk', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'sk', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      pointInTimeRecoverySpecification: { pointInTimeRecoveryEnabled: true },
      removalPolicy: RemovalPolicy.DESTROY, // change to RETAIN for prod
    });

    // Lambda: /favorites (Express + Nest)
    const favoritesFn = new NodejsFunction(this, 'FavoritesFunction', {
      entry: path.resolve(__dirname, '../../src/lambdas/favorites/main.ts'),
      handler: 'handler',
      runtime: lambda.Runtime.NODEJS_20_X,
      architecture: lambda.Architecture.ARM_64,
      memorySize: 1024,
      timeout: Duration.seconds(10),
      bundling: {
        minify: true,
        sourceMap: true,
        target: 'node20',
        // 👇 add these to avoid resolving optional Nest packages
        externalModules: [
          '@nestjs/microservices',
          '@nestjs/websockets',
          '@nestjs/websockets/socket-module',
          '@nestjs/microservices/microservices-module',
        ],
        // aws-sdk v2 is already externalized by CDK; v3 is bundled by default
      },
      environment: {
        DDB_FAVORITES_TABLE: favoritesTable.tableName,
        AWS_NODEJS_CONNECTION_REUSE_ENABLED: '1',
      },
    });
    favoritesTable.grantReadWriteData(favoritesFn);

    // HTTP API (API Gateway v2) + Auth0 JWT Authorizer
    const httpApi = new apigwv2.HttpApi(this, 'MoviesHttpApi', {
      apiName: `movies-${stage}`,
      corsPreflight: {
        allowHeaders: ['Authorization', 'Content-Type'],
        allowMethods: [
          apigwv2.CorsHttpMethod.GET,
          apigwv2.CorsHttpMethod.POST,
          apigwv2.CorsHttpMethod.PUT,
          apigwv2.CorsHttpMethod.DELETE,
          apigwv2.CorsHttpMethod.OPTIONS,
        ],
        allowOrigins: ['*'], // tighten for prod
      },
    });

    const jwtAuth = new authorizers.HttpJwtAuthorizer('Auth0Authorizer', props.auth0Issuer, {
      jwtAudience: [props.auth0Audience],
    });

    const favoritesIntegration = new integrations.HttpLambdaIntegration('FavoritesIntegration', favoritesFn);

    // Routes → Lambda + Authorizer
    httpApi.addRoutes({
      path: '/favorites',
      methods: [apigwv2.HttpMethod.GET, apigwv2.HttpMethod.POST],
      integration: favoritesIntegration,
      authorizer: jwtAuth,
    });

    httpApi.addRoutes({
      path: '/favorites/{movieId}',
      methods: [apigwv2.HttpMethod.PUT, apigwv2.HttpMethod.DELETE],
      integration: favoritesIntegration,
      authorizer: jwtAuth,
    });

    // Outputs
    new cdk.CfnOutput(this, 'ApiEndpoint', { value: httpApi.apiEndpoint });
    new cdk.CfnOutput(this, 'FavoritesFunctionName', { value: favoritesFn.functionName });
    new cdk.CfnOutput(this, 'FavoritesTableName', { value: favoritesTable.tableName });
  }
}
