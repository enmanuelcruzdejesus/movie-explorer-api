import { createParamDecorator, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import type { Request } from 'express';
import { getAuth0Claims } from './claims.util';

export type CurrentUserPayload = {
  sub: string;
  scope?: string;
  email?: string;
};

export const CurrentUser = createParamDecorator((_data: unknown, ctx: ExecutionContext): CurrentUserPayload => {
  const req = ctx.switchToHttp().getRequest<Request & { apiGateway?: any }>();
  const claims = getAuth0Claims(req);
  if (!claims?.sub) throw new UnauthorizedException('Missing JWT "sub" claim.');
  return { sub: claims.sub, scope: claims.scope, email: claims.email };
});
