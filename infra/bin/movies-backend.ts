#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { MoviesBackendStack } from '../lib/movie-stack';

const app = new cdk.App();

const stage = (app.node.tryGetContext('stage') ?? process.env.STAGE ?? 'dev') as string;
const auth0Issuer = (app.node.tryGetContext('auth0Issuer') ?? process.env.AUTH0_ISSUER) as string | undefined;
const auth0Audience = (app.node.tryGetContext('auth0Audience') ?? process.env.AUTH0_AUDIENCE) as string | undefined;

if (!auth0Issuer || !auth0Audience) {
  throw new Error('Missing Auth0 config. Provide -c auth0Issuer="https://TENANT/" -c auth0Audience="movies-api" or set AUTH0_ISSUER/AUTH0_AUDIENCE env vars.');
}

new MoviesBackendStack(app, `MoviesBackend-${stage}`, {
  env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION },
  stage,
  auth0Issuer,
  auth0Audience,
});
