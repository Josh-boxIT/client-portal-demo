import { create } from 'zustand';
import type { ActivityItem } from '@/services/types';
import { useTenantStore } from '@/theme/tenantStore';
import { applyTheme } from '@/theme/applyTheme';
import { getSeed } from '@/data';

interface SessionState {
  activeTenantId: string;
  activePersonaId: string;
  activityFeed: ActivityItem[];
  dismissedBanners: string[];
  logout(): void;
  switchTenant(tenantId: string): void;
  switchPersona(personaId: string): void;
  pushActivity(item: ActivityItem): void;
  dismissBanner(id: string): void;
}

export const useSessionStore = create<SessionState>()((set) => ({
  activeTenantId: 'brightwater',
  activePersonaId: '',
  activityFeed: [],
  dismissedBanners: [],
  logout() {
    set({ activeTenantId: 'brightwater', activePersonaId: '', activityFeed: [], dismissedBanners: [] });
  },
  switchTenant(tenantId) {
    const theme = useTenantStore.getState().getTenant(tenantId);
    if (theme) applyTheme(theme);
    set({
      activeTenantId: tenantId,
      activePersonaId: getSeed(tenantId).personas[0]?.id ?? '',
      activityFeed: [],
      dismissedBanners: [],
    });
  },
  switchPersona(activePersonaId) {
    set({ activePersonaId });
  },
  pushActivity(item) {
    set((state) => ({ activityFeed: [item, ...state.activityFeed].slice(0, 50) }));
  },
  dismissBanner(id) {
    set((state) => ({ dismissedBanners: [...state.dismissedBanners, id] }));
  },
}));
