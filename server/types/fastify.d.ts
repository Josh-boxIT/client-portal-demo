import type { AppDb } from '../db/client';
import type { AdminIdentity } from '../admin/auth/provider';
import type { ConfigStore } from '../framework/config-store';

declare module 'fastify' {
  interface FastifyInstance {
    db: AppDb;
    configStore: ConfigStore;
  }

  interface FastifyRequest {
    adminIdentity?: AdminIdentity;
  }
}
