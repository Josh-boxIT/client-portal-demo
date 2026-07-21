import type { AppDb } from '../db/client';
import { auditRepo, tenantRepo } from '../db/repositories';
import type { Tenant, TenantThemeTokens } from '../db/schema';
import type { ConfigStore } from '../framework/config-store';
import type { ConnectWiseCompanySummary } from '../integrations/connectwise';
import { ApiError, BadRequestError, NotFoundError } from '../framework/errors';

export interface ClientDto {
  id: string;
  slug: string;
  name: string;
  displayName: string | null;
  status: string;
  vertical: string | null;
  theme: TenantThemeTokens;
  connectWiseCompanyId: number | null;
  ninjaOneOrganizationId: number | null;
}

export interface UpdateClientPatch {
  name?: string;
  displayName?: string | null;
  slug?: string;
  status?: string;
  vertical?: string;
  theme?: Partial<TenantThemeTokens>;
  connectWiseCompanyId?: number | null;
  ninjaOneOrganizationId?: number | null;
}

export interface ConnectWiseCompanyView extends ConnectWiseCompanySummary {
  importedTenantId: string | null;
}

const IMPORT_PALETTES = [
  { primary: '245 75% 60%', accent: '250 65% 55%', primaryHex: '#4f46e5', accentHex: '#818cf8', gradient: 'linear-gradient(180deg, #312e81 0%, #1e1b4b 50%, #0f0c29 100%)' },
  { primary: '173 80% 40%', accent: '158 64% 52%', primaryHex: '#0d9488', accentHex: '#34d399', gradient: 'linear-gradient(180deg, #134e4a 0%, #0f3d3a 50%, #042f2e 100%)' },
  { primary: '199 89% 42%', accent: '198 93% 60%', primaryHex: '#0369a1', accentHex: '#38bdf8', gradient: 'linear-gradient(180deg, #0c4a6e 0%, #082f49 50%, #071f2e 100%)' },
  { primary: '263 70% 50%', accent: '258 90% 76%', primaryHex: '#7c3aed', accentHex: '#c4b5fd', gradient: 'linear-gradient(180deg, #4c1d95 0%, #2e1065 50%, #1e0a45 100%)' },
] as const;

function initials(name: string): string {
  return name.trim().split(/\s+/).slice(0, 2).map((word) => word[0]?.toUpperCase()).join('') || 'CW';
}

function slugBase(company: ConnectWiseCompanySummary): string {
  const candidate = company.name.normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 48);
  return candidate || `connectwise-${company.id}`;
}

async function availableSlug(db: AppDb, company: ConnectWiseCompanySummary): Promise<string> {
  const repo = tenantRepo(db);
  const base = slugBase(company);
  if (!await repo.getBySlug(base)) return base;
  const withId = `${base.slice(0, 40)}-${company.id}`;
  if (!await repo.getBySlug(withId)) return withId;
  for (let suffix = 2; suffix < 100; suffix += 1) {
    const candidate = `${withId}-${suffix}`;
    if (!await repo.getBySlug(candidate)) return candidate;
  }
  throw new ApiError(409, 'slug_conflict', 'Could not generate a unique client slug');
}

function toDto(tenant: Tenant): ClientDto {
  return {
    id: tenant.id,
    slug: tenant.slug,
    name: tenant.name,
    displayName: tenant.displayName ?? null,
    status: tenant.status,
    vertical: tenant.vertical,
    theme: tenant.theme,
    connectWiseCompanyId: tenant.connectWiseCompanyId ?? null,
    ninjaOneOrganizationId: tenant.ninjaOneOrganizationId ?? null,
  };
}

export async function listClientsView(db: AppDb): Promise<ClientDto[]> {
  return (await tenantRepo(db).list()).map(toDto);
}

export async function markImportedCompanies(
  db: AppDb,
  companies: ConnectWiseCompanySummary[],
): Promise<ConnectWiseCompanyView[]> {
  const imported = new Map(
    (await tenantRepo(db).list())
      .filter((tenant) => tenant.connectWiseCompanyId !== null)
      .map((tenant) => [tenant.connectWiseCompanyId, tenant.id]),
  );
  return companies.map((company) => ({
    ...company,
    importedTenantId: imported.get(company.id) ?? null,
  }));
}

export async function importConnectWiseCompany(
  db: AppDb,
  configStore: ConfigStore,
  company: ConnectWiseCompanySummary,
  actor: string,
): Promise<ClientDto> {
  const repo = tenantRepo(db);
  const existing = await repo.getByConnectWiseCompanyId(company.id);
  if (existing) {
    throw new ApiError(409, 'company_already_imported', `${company.name} is already imported as ${existing.name}`);
  }
  if (await repo.getById(`cw-${company.id}`)) {
    throw new ApiError(409, 'client_id_conflict', `Client ID cw-${company.id} is already in use`);
  }
  const slug = await availableSlug(db, company);
  const palette = IMPORT_PALETTES[company.id % IMPORT_PALETTES.length];
  const created = await repo.create({
    id: `cw-${company.id}`,
    slug,
    name: company.name,
    vertical: company.market || null,
    theme: {
      primary: palette.primary,
      primaryForeground: '0 0% 100%',
      accent: palette.accent,
      accentForeground: '0 0% 100%',
      ring: palette.primary,
      sidebarGradient: palette.gradient,
    },
    logo: {
      kind: 'generated',
      shape: ['wave', 'leaf', 'spark', 'hex'][company.id % 4],
      primary: palette.primaryHex,
      accent: palette.accentHex,
      text: initials(company.name),
    },
    supportPhone: company.phoneNumber || null,
    supportHours: 'Contact boxIT for support',
    connectWiseCompanyId: company.id,
    ninjaOneOrganizationId: null,
    status: 'active',
  });
  await auditRepo(db).write({
    actor,
    action: 'client.import.connectwise',
    target: created.id,
    metadata: {
      connectWiseCompanyId: company.id,
      connectWiseIdentifier: company.identifier,
      name: company.name,
      slug,
    },
  });
  await configStore.reload();
  return toDto(created);
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
  for (const [label, value] of [
    ['ConnectWise company ID', patch.connectWiseCompanyId],
    ['NinjaOne organization ID', patch.ninjaOneOrganizationId],
  ] as const) {
    if (value !== undefined && value !== null && (!Number.isInteger(value) || value <= 0)) {
      throw new BadRequestError(`${label} must be a positive integer or null`);
    }
  }
  const repo = tenantRepo(db);
  const existing = await repo.getById(id);
  if (!existing) throw new NotFoundError(`Client ${id} not found`);
  const updated = await repo.update(id, {
    ...(patch.name !== undefined ? { name: patch.name.trim() } : {}),
    ...(patch.displayName !== undefined
      ? { displayName: patch.displayName?.trim() || null }
      : {}),
    ...(patch.slug !== undefined ? { slug: patch.slug.trim() } : {}),
    ...(patch.status !== undefined ? { status: patch.status } : {}),
    ...(patch.vertical !== undefined ? { vertical: patch.vertical.trim() } : {}),
    ...(patch.theme !== undefined ? { theme: { ...existing.theme, ...patch.theme } } : {}),
    ...(patch.connectWiseCompanyId !== undefined ? { connectWiseCompanyId: patch.connectWiseCompanyId } : {}),
    ...(patch.ninjaOneOrganizationId !== undefined ? { ninjaOneOrganizationId: patch.ninjaOneOrganizationId } : {}),
  });
  await auditRepo(db).write({
    actor,
    action: 'client.update',
    target: id,
    metadata: {
      name: updated.name,
      displayName: updated.displayName,
      slug: updated.slug,
      connectWiseCompanyId: updated.connectWiseCompanyId,
      ninjaOneOrganizationId: updated.ninjaOneOrganizationId,
    },
  });
  await configStore.reload();
  return toDto(updated);
}
