import type { FastifyInstance } from 'fastify';
import type { AdminAuthProvider } from '../admin/auth/provider';
import type { AppDb } from '../db/client';
import { adminUsersRepo } from '../db/repositories';

export interface RegisterAuthRoutesOptions {
  authProvider: AdminAuthProvider;
  db: AppDb;
}

/** Demo email sign-in. Role gating remains at the route layer. */
export function registerAuthRoutes(app: FastifyInstance, opts: RegisterAuthRoutesOptions): void {
  const { authProvider, db } = opts;

  app.post('/api/auth/login', async (req, reply) => {
    const { email } = req.body as { email: string };
    const result = await authProvider.login({ email });
    if (!result) {
      return reply.status(401).send({ error: { code: 'unauthorized', message: 'Unauthorized: unknown email' } });
    }
    return reply.send(result);
  });

  app.get('/api/auth/me', async (req) => {
    const identity = req.adminIdentity!;
    const clientIds = identity.role === 'viewer' ? await adminUsersRepo(db).getClientAccess(identity.id) : [];
    return { id: identity.id, email: identity.email, name: identity.name, role: identity.role, clientIds };
  });

  app.post('/api/auth/logout', async (req, reply) => {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (token) await authProvider.logout(token);
    return reply.status(204).send();
  });
}
