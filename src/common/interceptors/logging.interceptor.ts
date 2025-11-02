import {
  CallHandler, ExecutionContext, Injectable, NestInterceptor,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import type { Request, Response } from 'express';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  intercept(ctx: ExecutionContext, next: CallHandler): Observable<any> {
    const started = Date.now();
    const req = ctx.switchToHttp().getRequest<Request & { apiGateway?: any }>();
    const res = ctx.switchToHttp().getResponse<Response>();

    const method = req.method;
    const url = req.originalUrl || req.url;
    const requestId = req?.apiGateway?.event?.requestContext?.requestId ?? null;
    const user = req?.apiGateway?.event?.requestContext?.authorizer?.jwt?.claims?.sub ?? null;

    return next.handle().pipe(
      tap(() => {
        const ms = Date.now() - started;
        const status = res.statusCode;
        console.log(JSON.stringify({ msg: 'http_request', method, url, status, ms, user, requestId }));
      }),
    );
  }
}
