import type { FastifyInstance } from 'fastify';
import type { AdminAuthProvider } from '../admin/auth/provider';

const ADMIN_PREFIX = '/api/admin';
const ASSISTANT_PREFIX = '/api/assistant';
const ME_ROUTE = '/api/auth/me';
const LOGOUT_ROUTE = '/api/auth/logout';

/** Shared session-verify hook: strictly guards /api/admin/*, /api/auth/me, and
 *  /api/auth/logout (401 on missing/invalid token). All other routes (including
 *  /api/auth/login, /api/auth/callback, and the open /api/* data routes) remain
 *  open, but a valid Bearer token — when supplied — still populates
 *  req.adminIdentity so those routes can be identity-aware (e.g. to filter
 *  internal ticket notes for non-staff callers). Missing/invalid tokens on
 *  non-guarded routes never produce an error; the caller is simply treated as
 *  unauthenticated. */
export function registerSessionAuth(app: FastifyInstance, provider: AdminAuthProvider): void {
  app.addHook('onRequest', async (req, reply) => {
    const urlPath = req.url.split('?')[0];

    const guarded =
      urlPath === ADMIN_PREFIX ||
      urlPath.startsWith(`${ADMIN_PREFIX}/`) ||
      urlPath === ASSISTANT_PREFIX ||
      urlPath.startsWith(`${ASSISTANT_PREFIX}/`) ||
      urlPath === ME_ROUTE ||
      urlPath === LOGOUT_ROUTE;

    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

    if (!guarded) {
      if (token) {
        const identity = await provider.verify(token);
        if (identity) req.adminIdentity = identity;
      }
      return;
    }

    if (!token) {
      return reply.status(401).send({ error: { code: 'unauthorized', message: 'Unauthorized: missing bearer token' } });
    }

    const identity = await provider.verify(token);
    if (!identity) {
      return reply.status(401).send({ error: { code: 'unauthorized', message: 'Unauthorized: invalid or expired token' } });
    }

    req.adminIdentity = identity;
  });
}
