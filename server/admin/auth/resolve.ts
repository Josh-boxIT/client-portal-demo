import type { AppDb } from '../../db/client';
import { adminUsersRepo } from '../../db/repositories';
import type { AdminIdentity } from './provider';

export type IdentityResult =
  | { ok: true; identity: AdminIdentity }
  | { ok: false; reason: 'unknown' | 'disabled' };

export async function resolveIdentity(db: AppDb, claims: { email?: string }): Promise<IdentityResult> {
  const email = claims.email?.trim().toLowerCase();
  const user = email ? await adminUsersRepo(db).getByEmail(email) : undefined;
  if (!user) return { ok: false, reason: 'unknown' };
  if (user.status !== 'active') return { ok: false, reason: 'disabled' };
  return { ok: true, identity: { id: user.id, email: user.email, name: user.name, role: user.role } };
}
