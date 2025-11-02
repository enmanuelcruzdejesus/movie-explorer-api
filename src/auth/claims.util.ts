import type { Request } from 'express';

/**
 * Extract Auth0 claims in multiple environments:
 * - PROD: API Gateway JWT Authorizer attaches claims to event.requestContext.authorizer.jwt.claims
 * - LOCAL: you may inject mock claims on req["claims"] (e.g., via a dev middleware)
 * - LOCAL (optional): decode *unverified* JWT payload when ALLOW_UNVERIFIED_LOCAL_TOKENS=true
 */
export function getAuth0Claims(req: Request & { apiGateway?: any }): any {
  // 1) API Gateway (recommended in AWS)
  const apigwClaims = req?.apiGateway?.event?.requestContext?.authorizer?.jwt?.claims;
  if (apigwClaims) return apigwClaims;

  // 2) Manually injected (e.g., in tests or local dev middleware)
  if ((req as any)?.claims) return (req as any).claims;

  // 3) Local dev convenience: decode payload without verification (NOT FOR PROD)
  if (process.env.ALLOW_UNVERIFIED_LOCAL_TOKENS === 'true') {
    const auth = req.headers?.authorization || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : undefined;
    if (token && token.split('.').length === 3) {
      try {
        const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString('utf8'));
        return payload;
      } catch {
        /* ignore */
      }
    }
  }

  // 4) Fallback: allow a trivial dev user (useful when no token locally)
  if (process.env.NODE_ENV === 'local' && process.env.DEV_AUTH_SUB) {
    return {
      sub: process.env.DEV_AUTH_SUB,
      scope: process.env.DEV_AUTH_SCOPE || 'favorites:read favorites:write movies:read',
      email: process.env.DEV_AUTH_EMAIL,
      iss: process.env.AUTH0_ISSUER,
      aud: process.env.AUTH0_AUDIENCE,
    };
  }

  return undefined;
}
