import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { SCOPES_METADATA_KEY } from './scopes.decorator';
import { getAuth0Claims } from './claims.util';

@Injectable()
export class JwtScopeGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(ctx: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<string[]>(SCOPES_METADATA_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]) || [];
    if (!required.length) return true;

    const req = ctx.switchToHttp().getRequest<Request & { apiGateway?: any }>();
    const claims = getAuth0Claims(req);
    const tokenScopes = (claims?.scope as string | undefined)?.split(' ') ?? [];

    const ok = required.every((s) => tokenScopes.includes(s));
    if (!ok) {
      throw new ForbiddenException(`Missing required scopes: ${required.join(', ')}`);
    }
    return true;
  }
}
