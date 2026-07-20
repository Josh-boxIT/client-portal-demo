import type { Identity } from '@/store/auth';
import type { TenantTheme } from '@/theme/tenants';

/**
 * Returns the tenants a given identity may see.
 * - admin/editor: all tenants.
 * - viewer: only tenants whose id is in accessibleClientIds.
 */
export function getAccessibleTenants(
  identity: Identity | null,
  accessibleClientIds: string[],
  tenants: TenantTheme[]
): TenantTheme[] {
  if (!identity) return [];
  if (identity.role === 'admin' || identity.role === 'editor') return tenants;
  return tenants.filter((t) => accessibleClientIds.includes(t.id));
}

/** True when the identity is boxIT/MSP staff (admin or editor), who may see internal notes. */
export function isBoxItStaff(identity: Identity | null): boolean {
  return identity?.role === 'admin' || identity?.role === 'editor';
}
