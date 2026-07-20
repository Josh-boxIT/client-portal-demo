import { randomUUID } from 'node:crypto';
import type { AppDb } from '../../db/client';
import type { AdminAuthProvider, AdminIdentity } from './provider';
import { resolveIdentity } from './resolve';

/** Sample-only provider: one-click login by a seeded demo email. */
export class FakeAdminAuthProvider implements AdminAuthProvider {
  private tokens = new Map<string, AdminIdentity>();

  constructor(private db: AppDb) {}

  async login(input: { email: string }): Promise<{ token: string; identity: AdminIdentity } | null> {
    const res = await resolveIdentity(this.db, { email: input.email });
    if (!res.ok) return null;
    const token = randomUUID();
    this.tokens.set(token, res.identity);
    return { token, identity: res.identity };
  }

  async verify(token: string): Promise<AdminIdentity | null> {
    return this.tokens.get(token) ?? null;
  }

  async logout(token: string): Promise<void> {
    this.tokens.delete(token);
  }
}
