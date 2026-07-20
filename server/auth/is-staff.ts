import type { AdminIdentity } from '../admin/auth/provider';

/**
 * boxIT staff = identity role 'admin' or 'editor'. Client users ('viewer') and
 * any absent/unknown identity are treated as non-staff (default-deny) — used to
 * gate access to internal-only data such as internal ticket notes.
 */
export function isBoxItStaff(identity?: AdminIdentity | null): boolean {
  return identity?.role === 'admin' || identity?.role === 'editor';
}
