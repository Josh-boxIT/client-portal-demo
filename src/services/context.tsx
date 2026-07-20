import React, { createContext, useContext, useMemo } from 'react';
import type { Services } from './types';
import { buildServices } from './index';

const ServicesContext = createContext<Services | null>(null);

export function ServicesProvider({ children }: { children: React.ReactNode }): React.ReactElement {
  // Services are stateless; build once per app mount.
  const services = useMemo(() => buildServices(), []);
  return <ServicesContext.Provider value={services}>{children}</ServicesContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components -- hook colocated with its provider by design
export function useServices(): Services {
  const ctx = useContext(ServicesContext);
  if (!ctx) throw new Error('useServices() must be used within <ServicesProvider>');
  return ctx;
}
