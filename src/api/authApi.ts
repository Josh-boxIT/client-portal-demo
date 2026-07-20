/**
 * Shared auth API client. Hits /api/auth/* — one session for all active roles.
 */

import { request } from './request';
import type { Identity } from '@/store/auth';

const BASE = '/api/auth';

export interface LoginResponse {
  token: string;
  identity: Identity;
}

export const authApi = {
  /** POST /api/auth/login (dev email login) */
  login(email: string): Promise<LoginResponse> {
    return request<LoginResponse>(BASE, '/login', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  },

  /** GET /api/auth/me */
  me(): Promise<Identity> {
    return request<Identity>(BASE, '/me');
  },

  /** POST /api/auth/logout */
  logout(): Promise<void> {
    return request<void>(BASE, '/logout', { method: 'POST' });
  },
};
