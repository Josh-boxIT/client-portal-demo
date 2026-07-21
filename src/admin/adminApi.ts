import { request as sharedRequest } from '@/api/request';
import type {
  ActionDefDto,
  AdminUser,
  ClientView,
  CreateActionDefInput,
  CreateUserInput,
  TenantThemeTokens,
  UpdateActionDefPatch,
  UpdateUserPatch,
  ProductCatalogDto,
  ProductCatalogInput,
  ProductCatalogPatch,
} from './types';

const BASE = '/api/admin';

function request<T>(path: string, init?: RequestInit): Promise<T> {
  return sharedRequest<T>(BASE, path, init);
}

export interface UpdateClientPatch {
  name?: string;
  slug?: string;
  status?: string;
  vertical?: string;
  theme?: Partial<TenantThemeTokens>;
}

export const adminApi = {
  clients(): Promise<ClientView[]> {
    return request<ClientView[]>('/clients');
  },
  getClient(id: string): Promise<ClientView> {
    return request<ClientView>(`/clients/${encodeURIComponent(id)}`);
  },
  updateClient(id: string, patch: UpdateClientPatch): Promise<ClientView> {
    return request<ClientView>(`/clients/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(patch) });
  },
  users(): Promise<AdminUser[]> {
    return request<AdminUser[]>('/users');
  },
  getUser(id: string): Promise<AdminUser> {
    return request<AdminUser>(`/users/${encodeURIComponent(id)}`);
  },
  createUser(input: CreateUserInput): Promise<AdminUser> {
    return request<AdminUser>('/users', { method: 'POST', body: JSON.stringify(input) });
  },
  updateUser(id: string, patch: UpdateUserPatch): Promise<AdminUser> {
    return request<AdminUser>(`/users/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(patch) });
  },
  disableUser(id: string): Promise<AdminUser> {
    return request<AdminUser>(`/users/${encodeURIComponent(id)}/disable`, { method: 'POST' });
  },
  actionDefs(tenantId: string): Promise<ActionDefDto[]> {
    return request<ActionDefDto[]>(`/action-defs?tenantId=${encodeURIComponent(tenantId)}`);
  },
  createActionDef(input: CreateActionDefInput): Promise<ActionDefDto> {
    return request<ActionDefDto>('/action-defs', { method: 'POST', body: JSON.stringify(input) });
  },
  updateActionDef(id: string, patch: UpdateActionDefPatch): Promise<ActionDefDto> {
    return request<ActionDefDto>(`/action-defs/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(patch) });
  },
  deleteActionDef(id: string): Promise<void> {
    return request<void>(`/action-defs/${encodeURIComponent(id)}`, { method: 'DELETE' });
  },
  productCatalog(): Promise<ProductCatalogDto[]> {
    return request<ProductCatalogDto[]>('/product-catalog');
  },
  createProduct(input: ProductCatalogInput): Promise<ProductCatalogDto> {
    return request<ProductCatalogDto>('/product-catalog', { method: 'POST', body: JSON.stringify(input) });
  },
  updateProduct(id: string, patch: ProductCatalogPatch): Promise<ProductCatalogDto> {
    return request<ProductCatalogDto>(`/product-catalog/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(patch) });
  },
  deleteProduct(id: string): Promise<void> {
    return request<void>(`/product-catalog/${encodeURIComponent(id)}`, { method: 'DELETE' });
  },
};
