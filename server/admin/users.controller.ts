import type { AppDb } from '../db/client';
import { adminUsersRepo, tenantRepo, auditRepo, newId } from '../db/repositories';
import type { AdminRole, AdminUserRow } from '../db/schema';
import { ApiError, NotFoundError } from '../framework/errors';

export interface AdminUserDto {
  id: string;
  email: string;
  name: string;
  role: AdminRole;
  status: 'active' | 'disabled';
  clientIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateUserInput {
  email: string;
  name: string;
  role: AdminRole;
  clientIds?: string[];
}

export interface UpdateUserPatch {
  name?: string;
  role?: AdminRole;
  status?: 'active' | 'disabled';
  clientIds?: string[];
}

const ROLES: AdminRole[] = ['admin', 'editor', 'viewer'];

async function toDto(db: AppDb, row: AdminUserRow): Promise<AdminUserDto> {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    role: row.role,
    status: row.status,
    clientIds: row.role === 'viewer' ? await adminUsersRepo(db).getClientAccess(row.id) : [],
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function assertValidRole(role: string): asserts role is AdminRole {
  if (!ROLES.includes(role as AdminRole)) {
    throw new ApiError(400, 'bad_request', `Invalid role: ${role}`);
  }
}

/** Throw if the change would remove the last active admin. */
async function guardLastAdmin(db: AppDb, current: AdminUserRow, next: { role?: AdminRole; status?: 'active' | 'disabled' }): Promise<void> {
  const wasActiveAdmin = current.role === 'admin' && current.status === 'active';
  if (!wasActiveAdmin) return;
  const losingAdmin = (next.role !== undefined && next.role !== 'admin') || next.status === 'disabled';
  if (losingAdmin && (await adminUsersRepo(db).countActiveByRole('admin')) <= 1) {
    throw new ApiError(409, 'last_admin', 'Cannot remove the last active admin');
  }
}

export async function listUsers(db: AppDb): Promise<AdminUserDto[]> {
  const rows = await adminUsersRepo(db).list();
  return Promise.all(rows.map((u) => toDto(db, u)));
}

export async function getUser(db: AppDb, id: string): Promise<AdminUserDto> {
  const row = await adminUsersRepo(db).getById(id);
  if (!row) throw new NotFoundError(`User ${id} not found`);
  return toDto(db, row);
}

export async function createUser(db: AppDb, input: CreateUserInput, actor: string): Promise<AdminUserDto> {
  assertValidRole(input.role);
  const repo = adminUsersRepo(db);
  const email = input.email.trim().toLowerCase();
  if (!email) throw new ApiError(400, 'bad_request', 'Email is required');
  if (await repo.getByEmail(email)) throw new ApiError(409, 'conflict', 'A user with that email already exists');

  const row = await repo.create({ id: newId('usr_'), email, name: input.name.trim(), role: input.role, status: 'active' });
  if (input.role === 'viewer' && input.clientIds?.length) {
    await validateTenantIds(db, input.clientIds);
    await repo.setClientAccess(row.id, input.clientIds);
  }
  await auditRepo(db).write({ actor, action: 'admin_user.create', target: row.id, metadata: { email, role: input.role } });
  return toDto(db, (await repo.getById(row.id))!);
}

export async function updateUser(db: AppDb, id: string, patch: UpdateUserPatch, actor: string): Promise<AdminUserDto> {
  const repo = adminUsersRepo(db);
  const existing = await repo.getById(id);
  if (!existing) throw new NotFoundError(`User ${id} not found`);
  if (patch.role !== undefined) assertValidRole(patch.role);

  await guardLastAdmin(db, existing, { role: patch.role, status: patch.status });

  const updates: Partial<AdminUserRow> = {};
  if (patch.name !== undefined) updates.name = patch.name.trim();
  if (patch.role !== undefined) updates.role = patch.role;
  if (patch.status !== undefined) updates.status = patch.status;
  const updated = await repo.update(id, updates);

  const finalRole = updated.role;
  if (finalRole === 'viewer') {
    if (patch.clientIds !== undefined) {
      await validateTenantIds(db, patch.clientIds);
      await repo.setClientAccess(id, patch.clientIds);
    }
  } else {
    // Non-viewers hold no client grants.
    await repo.setClientAccess(id, []);
  }

  await auditRepo(db).write({ actor, action: 'admin_user.update', target: id, metadata: { role: finalRole, status: updated.status } });
  return toDto(db, (await repo.getById(id))!);
}

export async function disableUser(db: AppDb, id: string, actor: string): Promise<AdminUserDto> {
  const repo = adminUsersRepo(db);
  const existing = await repo.getById(id);
  if (!existing) throw new NotFoundError(`User ${id} not found`);
  await guardLastAdmin(db, existing, { status: 'disabled' });
  await repo.update(id, { status: 'disabled' });
  await auditRepo(db).write({ actor, action: 'admin_user.disable', target: id });
  return toDto(db, (await repo.getById(id))!);
}

async function validateTenantIds(db: AppDb, tenantIds: string[]): Promise<void> {
  const tr = tenantRepo(db);
  for (const id of tenantIds) {
    if (!(await tr.getById(id))) throw new ApiError(400, 'bad_request', `Unknown client: ${id}`);
  }
}
