import React from 'react';
import type { Role } from '@/services/types';
import { useSessionStore } from '@/store/session';
import { getSeed } from '@/data/index';
import { EmptyState } from './EmptyState';
import { Lock } from 'lucide-react';

interface RoleGateProps {
  allow: Role[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function RoleGate({ allow, children, fallback }: RoleGateProps) {
  const { activeTenantId, activePersonaId } = useSessionStore();

  let role: Role | null = null;
  try {
    const seed = getSeed(activeTenantId);
    const persona = seed.personas.find((p) => p.id === activePersonaId);
    role = persona?.role ?? null;
  } catch {
    // ignore
  }

  if (role && allow.includes(role)) {
    return <>{children}</>;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  return (
    <EmptyState
      icon={<Lock className="h-10 w-10" />}
      title="Access restricted"
      description="This section is only available to administrators. Ask your IT admin if you need access."
    />
  );
}
