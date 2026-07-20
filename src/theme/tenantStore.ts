import { create } from 'zustand';
import type { TenantTheme, TenantPublic } from './tenants';
import { tenantThemeFromRecord } from './tenants';

interface TenantStoreState {
  tenants: TenantTheme[];
  loaded: boolean;
  load(): Promise<void>;
  getTenant(id: string): TenantTheme | undefined;
}

export const useTenantStore = create<TenantStoreState>()((set, get) => ({
  tenants: [],
  loaded: false,

  async load() {
    try {
      const res = await fetch('/api/tenants');
      if (!res.ok) throw new Error(`/api/tenants returned ${res.status}`);
      const body = (await res.json()) as { tenants: TenantPublic[] };
      const themes = body.tenants.map(tenantThemeFromRecord);
      set({ tenants: themes, loaded: true });
    } catch {
      // Network not available (e.g. static preview). Mark loaded anyway so the
      // UI doesn't hang, but tenants list will be empty.
      set({ loaded: true });
    }
  },

  getTenant(id: string): TenantTheme | undefined {
    return get().tenants.find((t) => t.id === id);
  },
}));
