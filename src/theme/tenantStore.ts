import { create } from 'zustand';
import type { TenantTheme, TenantPublic } from './tenants';
import { tenantThemeFromRecord } from './tenants';

interface TenantStoreState {
  tenants: TenantTheme[];
  loaded: boolean;
  load(): Promise<void>;
  getTenant(id: string): TenantTheme | undefined;
}

const LOAD_RETRY_DELAYS_MS = [200, 500, 1_000];

function wait(milliseconds: number): Promise<void> {
  return new Promise((resolve) => globalThis.setTimeout(resolve, milliseconds));
}

async function fetchTenants(): Promise<TenantTheme[]> {
  const res = await fetch('/api/tenants');
  if (!res.ok) throw new Error(`/api/tenants returned ${res.status}`);
  const body = (await res.json()) as { tenants: TenantPublic[] };
  return body.tenants.map(tenantThemeFromRecord);
}

export const useTenantStore = create<TenantStoreState>()((set, get) => ({
  tenants: [],
  loaded: false,

  async load() {
    for (let attempt = 0; attempt <= LOAD_RETRY_DELAYS_MS.length; attempt += 1) {
      try {
        set({ tenants: await fetchTenants(), loaded: true });
        return;
      } catch {
        const retryDelay = LOAD_RETRY_DELAYS_MS[attempt];
        if (retryDelay !== undefined) {
          await wait(retryDelay);
          continue;
        }
      }
    }

    // Network may be unavailable in a static preview. Finish loading so the UI
    // remains usable, but don't let a brief dev-server restart erase clients.
    set({ loaded: true });
  },

  getTenant(id: string): TenantTheme | undefined {
    return get().tenants.find((t) => t.id === id);
  },
}));
