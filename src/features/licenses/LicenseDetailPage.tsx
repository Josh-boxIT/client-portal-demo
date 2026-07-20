import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useServices } from '@/services/context';
import { useSessionStore } from '@/store/session';
import type { License } from '@/services/types';
import { PageHeader } from '@/components/common/PageHeader';
import { CardSkeleton } from '@/components/common/CardSkeleton';
import { EmptyState } from '@/components/common/EmptyState';
import { LicenseStatusBadge } from '@/components/common/StatusBadge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Key, Users, AlertCircle } from 'lucide-react';

/**
 * License detail: seat counts for one per-SKU license + the users assigned
 * to it (mirrors PersonDetailPage's layout/loading conventions). Works on
 * both mock and rest — `assignedUsers` is embedded on the `License` itself
 * (warm, materialized by the licenses sync/list handler), so no separate
 * fetch is needed here.
 */

function initialsFor(name: string): string {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? '';
  const last = parts.length > 1 ? parts[parts.length - 1][0] : '';
  return `${first}${last}`.toUpperCase() || '?';
}

function DetailSkeleton() {
  return (
    <div className="space-y-6">
      <CardSkeleton />
      <CardSkeleton />
    </div>
  );
}

export function LicenseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { licenses } = useServices();
  const { activeTenantId } = useSessionStore();

  const [license, setLicense] = useState<License | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setLoading(true);

    licenses
      .list(activeTenantId, { pageSize: 500 })
      .then((page) => {
        if (cancelled) return;
        setLicense(page.data.find((l) => l.id === id) ?? null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [id, activeTenantId, licenses]);

  if (loading) return <DetailSkeleton />;

  const users = license?.assignedUsers ?? [];

  if (!license) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" aria-hidden />
        <h2 className="text-lg font-semibold">License not found</h2>
        <p className="text-sm text-muted-foreground mt-1 mb-4">
          The requested license does not exist or has been removed.
        </p>
        <Button variant="outline" onClick={() => navigate('/licenses')}>
          <ArrowLeft className="h-4 w-4 mr-2" aria-hidden />
          Back to licenses
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back link */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => navigate('/licenses')}
        className="gap-1.5 -ml-1"
        aria-label="Back to licenses"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Back to licenses
      </Button>

      {/* Page header */}
      <PageHeader
        title={license.product}
        subtitle={`${license.sku} · ${license.consumedUnits}/${license.totalUnits} seats assigned`}
        actions={<LicenseStatusBadge status={license.status} />}
      />

      {/* Assigned users */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <Users className="h-4 w-4" aria-hidden />
              Assigned users
            </CardTitle>
            <Badge variant="outline" className="text-xs">
              {users.length}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {users.length === 0 ? (
            <EmptyState
              icon={<Key className="h-10 w-10" />}
              title="No users assigned"
              description="No one currently holds this license."
            />
          ) : (
            <div className="space-y-2" role="list" aria-label="Assigned users">
              {users.map((u, i) => {
                const clickable = !!u.personId;
                return (
                  <div
                    key={u.personId ?? `${u.email}-${i}`}
                    className={
                      clickable
                        ? 'flex items-center justify-between rounded-lg border p-3 transition-colors cursor-pointer hover:bg-muted/50'
                        : 'flex items-center justify-between rounded-lg border p-3'
                    }
                    role={clickable ? 'button' : 'listitem'}
                    tabIndex={clickable ? 0 : undefined}
                    aria-label={clickable ? `View ${u.name}` : undefined}
                    onClick={clickable ? () => navigate(`/people/${u.personId}`) : undefined}
                    onKeyDown={
                      clickable
                        ? (e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              navigate(`/people/${u.personId}`);
                            }
                          }
                        : undefined
                    }
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Avatar className="h-8 w-8 shrink-0">
                        <AvatarFallback className="text-xs bg-primary/10 text-primary font-semibold">
                          {initialsFor(u.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <div className="text-sm font-medium truncate">{u.name}</div>
                        <div className="text-xs text-muted-foreground truncate">{u.email}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-2">
                      {u.department && (
                        <span className="text-xs text-muted-foreground">{u.department}</span>
                      )}
                      {!clickable && (
                        <Badge variant="secondary" className="text-xs font-normal">
                          M365 only
                        </Badge>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
