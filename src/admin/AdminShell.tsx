import { useEffect, useRef, useState } from 'react';
import { Navigate, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { authApi } from '@/api/authApi';
import { useAuthStore } from '@/store/auth';
import { useSessionStore } from '@/store/session';

interface NavItem {
  to: string;
  label: string;
}

const NAV_ITEMS: NavItem[] = [
  { to: '/admin/clients', label: 'Clients' },
];

export function AdminShell() {
  const navigate = useNavigate();
  const { token, identity, setIdentity, setAccessibleClientIds, clear } = useAuthStore();
  const [hydrationFailed, setHydrationFailed] = useState(false);
  const hydratingRef = useRef(false);

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

  if (!token || hydrationFailed) {
    return <Navigate to="/login" replace />;
  }

  if (!identity) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-950 text-slate-400">
        Loading…
      </div>
    );
  }

  if (identity.role !== 'admin' && identity.role !== 'editor') {
    return <Navigate to="/" replace />;
  }

  const navItems: NavItem[] = [
    ...NAV_ITEMS,
    ...(identity.role === 'admin' ? [
      { to: '/admin/products', label: 'Products' },
      { to: '/admin/users', label: 'Users' },
    ] : []),
  ];

  async function handleLogout() {
    try {
      await authApi.logout();
    } catch {
      /* best-effort */
    }
    clear();
    useSessionStore.getState().logout();
    toast.success('Signed out');
    navigate('/login', { replace: true });
  }

  return (
    <div className="flex h-screen overflow-hidden bg-slate-950">
      {/* Sidebar */}
      <aside className="w-56 shrink-0 flex flex-col bg-slate-900 border-r border-slate-800">
        {/* Brand */}
        <div className="flex items-center gap-2 px-4 py-5 border-b border-slate-800">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-indigo-600 shrink-0">
            <span className="text-white font-bold text-sm tracking-tight">bx</span>
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-100 leading-none">boxIT Admin</p>
            <p className="text-xs text-slate-500 mt-0.5">Staff portal</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-1">
          {navItems.map(({ to, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                [
                  'flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-indigo-600/20 text-indigo-400'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200',
                ].join(' ')
              }
            >
              {label}
            </NavLink>
          ))}
        </nav>
      </aside>

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header */}
        <header className="flex items-center justify-between px-6 py-3 bg-slate-900 border-b border-slate-800 shrink-0">
          <span className="text-sm font-medium text-slate-300">
            {identity.name ?? identity.email ?? 'Admin'}
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className="text-slate-400 hover:text-slate-100 hover:bg-slate-800"
          >
            Sign out
          </Button>
        </header>

        <main className="flex-1 overflow-y-auto bg-slate-950">
          <div className="container max-w-6xl mx-auto px-6 py-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
