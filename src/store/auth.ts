import { create } from 'zustand';
import type { AdminIdentity } from '@/admin/types';

const TOKEN_STORAGE_KEY = 'bx_auth_token';

/** App-wide identity. Extends AdminIdentity with optional clientIds (viewers only). */
export type Identity = AdminIdentity & { clientIds?: string[] };

interface AuthState {
  token: string | null;
  identity: Identity | null;
  accessibleClientIds: string[];
  setSession: (token: string, identity: Identity) => void;
  setToken: (token: string) => void;
  setIdentity: (identity: Identity) => void;
  setAccessibleClientIds: (ids: string[]) => void;
  clear: () => void;
}

function readStoredToken(): string | null {
  try {
    return sessionStorage.getItem(TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
}

function writeStoredToken(token: string): void {
  try {
    sessionStorage.setItem(TOKEN_STORAGE_KEY, token);
  } catch {
    /* ignore storage errors */
  }
}

function removeStoredToken(): void {
  try {
    sessionStorage.removeItem(TOKEN_STORAGE_KEY);
  } catch {
    /* ignore storage errors */
  }
}

export const useAuthStore = create<AuthState>()((set) => ({
  token: readStoredToken(),
  identity: null,
  accessibleClientIds: [],

  setSession(token, identity) {
    writeStoredToken(token);
    set({ token, identity });
  },

  setToken(token) {
    writeStoredToken(token);
    set({ token });
  },

  setIdentity(identity) {
    set({ identity });
  },

  setAccessibleClientIds(ids) {
    set({ accessibleClientIds: ids });
  },

  clear() {
    removeStoredToken();
    set({ token: null, identity: null, accessibleClientIds: [] });
  },
}));
