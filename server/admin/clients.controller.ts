import type { AppDb } from '../db/client';
import { auditRepo, tenantRepo } from '../db/repositories';
import type { Tenant, TenantThemeTokens } from '../db/schema';
import type { ConfigStore } from '../framework/config-store';
import { NotFoundError } from '../framework/errors';

export interface ClientDto {
  id: string;
  slug: string;
  name: string;
  status: string;
  vertical: string | null;
  theme: TenantThemeTokens;
}

export interface UpdateClientPatch {
  name?: string;
  slug?: string;
  status?: string;
  vertical?: string;
  theme?: Partial<TenantThemeTokens>;
}

function toDto(tenant: Tenant): ClientDto {
  return {
    id: tenant.id,
    slug: tenant.slug,
    name: tenant.name,
    status: tenant.status,
    vertical: tenant.vertical,
    theme: tenant.theme,
  };
}

export async function listClientsView(db: AppDb): Promise<ClientDto[]> {
  return (await tenantRepo(db).list()).map(toDto);
}

export async function getClient(db: AppDb, id: string): Promise<ClientDto> {
  const tenant = await tenantRepo(db).getById(id);
  if (!tenant) throw new NotFoundError(`Client ${id} not found`);
  return toDto(tenant);
}

export async function updateClient(
  db: AppDb,
  configStore: ConfigStore,
  id: string,
  patch: UpdateClientPatch,
  actor: string,
): Promise<ClientDto> {
  const repo = tenantRepo(db);
  const existing = await repo.getById(id);
  if (!existing) throw new NotFoundError(`Client ${id} not found`);
  const updated = await repo.update(id, {
    ...(patch.name !== undefined ? { name: patch.name.trim() } : {}),
    ...(patch.slug !== undefined ? { slug: patch.slug.trim() } : {}),
    ...(patch.status !== undefined ? { status: patch.status } : {}),
    ...(patch.vertical !== undefined ? { vertical: patch.vertical.trim() } : {}),
    ...(patch.theme !== undefined ? { theme: { ...existing.theme, ...patch.theme } } : {}),
  });
  await auditRepo(db).write({ actor, action: 'client.update', target: id, metadata: { name: updated.name, slug: updated.slug } });
  await configStore.reload();
  return toDto(updated);
}
