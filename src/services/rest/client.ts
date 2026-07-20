import type { ListParams, Page } from '../types';
import { useAuthStore } from '@/store/auth';

/**
 * Thin client for the normalized backend API (`/api`). The SPA stays vendor-
 * agnostic: it speaks domains to a same-origin `/api` (Vite proxies to the
 * backend in dev). The active tenant scopes every request via `x-tenant-id`.
 */

const BASE = '/api';

export class RestError extends Error {
  readonly status: number;
  readonly code?: string;
  constructor(status: number, message: string, code?: string) {
    super(message);
    this.name = 'RestError';
    this.status = status;
    this.code = code;
  }
}

function buildQuery(params?: ListParams): string {
  if (!params) return '';
  const sp = new URLSearchParams();
  if (params.page) sp.set('page', String(params.page));
  if (params.pageSize) sp.set('pageSize', String(params.pageSize));
  if (params.search) sp.set('search', params.search);
  if (params.sortBy) sp.set('sortBy', params.sortBy);
  if (params.sortDir) sp.set('sortDir', params.sortDir);
  if (params.filters) {
    for (const [k, v] of Object.entries(params.filters)) {
      if (v === undefined) continue;
      if (Array.isArray(v)) v.forEach((x) => sp.append(`filter.${k}`, x));
      else sp.set(`filter.${k}`, v);
    }
  }
  const s = sp.toString();
  return s ? `?${s}` : '';
}

async function request<T>(tenantId: string, path: string, init?: RequestInit): Promise<T> {
  const headers: Record<string, string> = { 'x-tenant-id': tenantId };
  if (init?.body) headers['Content-Type'] = 'application/json';
  const token = useAuthStore.getState().token;
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${BASE}${path}`, { ...init, headers: { ...headers, ...init?.headers } });
  if (!res.ok) {
    let code: string | undefined;
    let message = res.statusText;
    try {
      const body = (await res.json()) as { error?: { code?: string; message?: string } };
      code = body.error?.code;
      if (body.error?.message) message = body.error.message;
    } catch {
      /* non-JSON error body */
    }
    throw new RestError(res.status, message, code);
  }
  return (await res.json()) as T;
}

export const rest = {
  list<T>(tenantId: string, resource: string, params?: ListParams): Promise<Page<T>> {
    return request<Page<T>>(tenantId, `/${resource}${buildQuery(params)}`);
  },
  async getOrNull<T>(tenantId: string, resource: string, id: string): Promise<T | null> {
    try {
      return await request<T>(tenantId, `/${resource}/${encodeURIComponent(id)}`);
    } catch (err) {
      if (err instanceof RestError && err.status === 404) return null;
      throw err;
    }
  },
  /** Same as `getOrNull`, but for an arbitrary sub-path (e.g. `devices/:id/detail`). */
  async getOrNullPath<T>(tenantId: string, path: string): Promise<T | null> {
    try {
      return await request<T>(tenantId, `/${path}`);
    } catch (err) {
      if (err instanceof RestError && err.status === 404) return null;
      throw err;
    }
  },
  create<T>(tenantId: string, resource: string, body: unknown): Promise<T> {
    return request<T>(tenantId, `/${resource}`, { method: 'POST', body: JSON.stringify(body) });
  },
  updatePath<T>(tenantId: string, path: string, body: unknown): Promise<T> {
    return request<T>(tenantId, `/${path}`, { method: 'PATCH', body: JSON.stringify(body) });
  },
  createPath<T>(tenantId: string, path: string, body: unknown): Promise<T> {
    return request<T>(tenantId, `/${path}`, { method: 'POST', body: JSON.stringify(body) });
  },
  /** Raw GET of an arbitrary sub-path returning `T` directly (not a `Page<T>` envelope). */
  getPath<T>(tenantId: string, path: string): Promise<T> {
    return request<T>(tenantId, `/${path}`);
  },
};
