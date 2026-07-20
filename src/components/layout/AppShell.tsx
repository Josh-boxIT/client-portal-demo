import { useEffect, useRef, useState } from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import { useSessionStore } from '@/store/session';
import { useAuthStore } from '@/store/auth';
import { authApi } from '@/api/authApi';
import { useTenantStore } from '@/theme/tenantStore';
import { getAccessibleTenants } from '@/lib/accessibleTenants';
import { applyTheme } from '@/theme/applyTheme';
import { getSeed } from '@/data';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { Sheet, SheetContent } from '@/components/ui/sheet';

export function AppShell() {
  const { token, identity, setIdentity, setAccessibleClientIds, accessibleClientIds, clear } = useAuthStore();
  const { activeTenantId, activePersonaId, switchTenant, switchPersona } = useSessionStore();
  const { tenants } = useTenantStore();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [hydrationFailed, setHydrationFailed] = useState(false);
  const hydratingRef = useRef(false);
  const tenantInitDone = useRef(false);

  // Hydrate identity from /api/auth/me when we have a token but no identity yet
  // (e.g. after a page reload, since identity is not persisted).
  useEffect(() => {
    if (!token || identity || hydratingRef.current) return;
    hydratingRef.current = true;
    authApi
      .me()
      .then((id) => {
        setIdentity(id);
        setAccessibleClientIds(id.clientIds ?? []);
      })
      .catch(() => {
        clear();
        setHydrationFailed(true);
      })
      .finally(() => {
        hydratingRef.current = false;
      });
  }, [token, identity, setIdentity, setAccessibleClientIds, clear]);

  // Once identity is known, ensure activeTenantId is one the user may access.
  useEffect(() => {
    if (!identity || tenantInitDone.current) return;
    const accessible = getAccessibleTenants(identity, accessibleClientIds, tenants);
    if (accessible.length === 0) return;
    const isCurrentAccessible = accessible.some((t) => t.id === activeTenantId);
    if (!isCurrentAccessible) {
      switchTenant(accessible[0].id);
    } else {
      const t = useTenantStore.getState().getTenant(activeTenantId);
      if (t) applyTheme(t);
      if (!activePersonaId) {
        const personas = getSeed(activeTenantId).personas;
        const matching = personas.find((persona) => persona.email.toLowerCase() === identity.email.toLowerCase());
        switchPersona(matching?.id ?? personas[0]?.id ?? '');
      }
    }
    tenantInitDone.current = true;
  }, [identity, accessibleClientIds, tenants, activeTenantId, activePersonaId, switchTenant, switchPersona]);

  if (!token || hydrationFailed) {
    return <Navigate to="/login" replace />;
  }

  if (!identity) {
    return (
      <div className="flex h-screen items-center justify-center bg-background text-muted-foreground">
        Loading…
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-[260px] shrink-0 flex-col">
        <Sidebar className="h-full" />
      </aside>

      {/* Mobile sidebar drawer */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="p-0 w-[260px]">
          <Sidebar onClose={() => setMobileOpen(false)} className="h-full" />
        </SheetContent>
      </Sheet>

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <TopBar onMenuClick={() => setMobileOpen(true)} />

        <main className="flex-1 overflow-y-auto">
          <div className="container max-w-7xl mx-auto px-4 py-6">
            <Outlet />
          </div>
        </main>
      </div>

      <Toaster richColors position="top-right" />
    </div>
  );
}
