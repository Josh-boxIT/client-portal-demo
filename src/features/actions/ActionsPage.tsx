import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import * as LucideIcons from 'lucide-react';
import type { LucideProps } from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useServices } from '@/services/context';
import { useSessionStore } from '@/store/session';
import { useAuthStore } from '@/store/auth';
import { isBoxItStaff } from '@/lib/accessibleTenants';
import type { ActionDef } from '@/services/types';
import { ActionWizard } from './ActionWizard';
import {
  UserPlus,
  UserMinus,
  KeyRound,
  Unlock,
  ShieldOff,
  Package,
  MailPlus,
  ShieldAlert,
} from 'lucide-react';

const ICON_MAP: Record<string, React.ReactNode> = {
  UserPlus: <UserPlus className="h-6 w-6" />,
  UserMinus: <UserMinus className="h-6 w-6" />,
  KeyRound: <KeyRound className="h-6 w-6" />,
  Unlock: <Unlock className="h-6 w-6" />,
  ShieldOff: <ShieldOff className="h-6 w-6" />,
  Package: <Package className="h-6 w-6" />,
  MailPlus: <MailPlus className="h-6 w-6" />,
  ShieldAlert: <ShieldAlert className="h-6 w-6" />,
};

/** Resolve an admin-authored icon name (any lucide icon) with a curated fast path
 *  and a dynamic fallback for free-form names; unknown names fall back to Package. */
function resolveIcon(name: string): React.ReactNode {
  if (ICON_MAP[name]) return ICON_MAP[name];
  const Comp = (LucideIcons as unknown as Record<string, React.ComponentType<LucideProps> | undefined>)[name];
  const Icon = Comp ?? Package;
  return <Icon className="h-6 w-6" />;
}

export function ActionsPage() {
  const { actions } = useServices();
  const { activeTenantId } = useSessionStore();
  const { identity } = useAuthStore();
  const navigate = useNavigate();

  const [defs, setDefs] = useState<ActionDef[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [wizardOpen, setWizardOpen] = useState(false);
  const [selectedAction, setSelectedAction] = useState<ActionDef | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    actions
      .listDefs(activeTenantId, { pageSize: 100 })
      .then((page) => {
        if (!cancelled) setDefs(page.data);
      })
      .catch(() => {
        if (!cancelled) setError('Failed to load actions. Please try again.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [actions, activeTenantId]);

  function handleStart(action: ActionDef) {
    setSelectedAction(action);
    setWizardOpen(true);
  }

  function handleWizardClose(open: boolean) {
    setWizardOpen(open);
    if (!open) {
      // Brief delay so wizard can animate out before we clear it
      setTimeout(() => setSelectedAction(null), 300);
    }
  }

  return (
    <div>
      <PageHeader
        title="Actions"
        subtitle="Self-service automations — get things done without waiting for IT."
        actions={
          isBoxItStaff(identity) ? (
            <Button variant="outline" size="sm" onClick={() => navigate('/actions/manage')}>
              Manage actions
            </Button>
          ) : undefined
        }
      />

      {loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-40 rounded-lg" />
          ))}
        </div>
      )}

      {!loading && error && (
        <p className="text-sm text-destructive">{error}</p>
      )}

      {!loading && !error && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {defs.map((action) => (
            <Card
              key={action.id}
              className="hover:shadow-md transition-shadow group"
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                    {resolveIcon(action.icon)}
                  </div>
                  <span className="text-xs text-muted-foreground bg-muted rounded px-1.5 py-0.5">
                    {action.category}
                  </span>
                </div>
                <CardTitle className="text-sm mt-3">{action.title}</CardTitle>
                <CardDescription className="text-xs">{action.description}</CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full"
                  onClick={() => handleStart(action)}
                  aria-label={`Start action: ${action.title}`}
                >
                  Start
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <ActionWizard
        open={wizardOpen}
        onOpenChange={handleWizardClose}
        actionDef={selectedAction}
      />
    </div>
  );
}
