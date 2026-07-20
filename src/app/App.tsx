import { useEffect } from 'react';
import { RouterProvider } from 'react-router-dom';
import { ServicesProvider } from '@/services/context';
import { router } from '@/routes';
import { useTenantStore } from '@/theme/tenantStore';

function LoadingSplash() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900">
      <div className="flex flex-col items-center gap-4 text-slate-400">
        <svg
          className="animate-spin h-8 w-8 text-slate-500"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
          />
        </svg>
        <span className="text-sm">Loading…</span>
      </div>
    </div>
  );
}

export function App() {
  const { loaded, load } = useTenantStore();

  useEffect(() => {
    void load();
  }, [load]);

  if (!loaded) return <LoadingSplash />;

  return (
    <ServicesProvider>
      <RouterProvider router={router} />
    </ServicesProvider>
  );
}
