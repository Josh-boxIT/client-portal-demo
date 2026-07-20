import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useServices } from '@/services/context';
import { useSessionStore } from '@/store/session';
import type { Person, Device, License } from '@/services/types';
import { PageHeader } from '@/components/common/PageHeader';
import { CardSkeleton } from '@/components/common/CardSkeleton';
import { PersonStatusBadge, DeviceStatusBadge } from '@/components/common/StatusBadge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ArrowLeft,
  Monitor,
  Key,
  Users,
  Building2,
  Calendar,
  Mail,
  Briefcase,
  CheckCircle2,
  XCircle,
  AlertCircle,
  AtSign,
  ShieldCheck,
  Clock,
} from 'lucide-react';
import { formatDate, formatCurrency, formatRelative } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { AccountClass, DeviceStatus } from '@/services/types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const ACCOUNT_CLASS_LABEL: Record<Exclude<AccountClass, 'human'>, string> = {
  guest: 'Guest',
  'shared-mailbox': 'Shared mailbox',
  'room-mailbox': 'Room mailbox',
  'equipment-mailbox': 'Equipment mailbox',
  unlicensed: 'Unlicensed / service',
};

function deviceStatusIcon(status: DeviceStatus) {
  if (status === 'healthy') return <CheckCircle2 className="h-4 w-4 text-green-600" aria-hidden />;
  if (status === 'critical') return <XCircle className="h-4 w-4 text-red-600" aria-hidden />;
  return <AlertCircle className="h-4 w-4 text-yellow-500" aria-hidden />;
}

// ─── Loading skeleton ─────────────────────────────────────────────────────────

function DetailSkeleton() {
  return (
    <div className="space-y-6">
      <CardSkeleton />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <CardSkeleton />
        <div className="md:col-span-2 space-y-4">
          <CardSkeleton />
          <CardSkeleton />
        </div>
      </div>
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export function PersonDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { people, devices, licenses, prefetch } = useServices();
  const { activeTenantId } = useSessionStore();

  const [person, setPerson] = useState<Person | null>(null);
  const [personDevices, setPersonDevices] = useState<Device[]>([]);
  const [personLicenses, setPersonLicenses] = useState<License[]>([]);
  const [loading, setLoading] = useState(true);
  // Lazy M365 license resolution: `pendingSkuCount` mirrors
  // person.m365UnresolvedSkuIds.length until the live CIPP lookup resolves
  // (or drops) each one; resolved names land in `m365ExtraLicenses`.
  const [m365ExtraLicenses, setM365ExtraLicenses] = useState<string[]>([]);
  const [pendingSkuCount, setPendingSkuCount] = useState(0);
  // Tracks the background CIPP/M365 enrichment fetch, separate from the
  // page-level `loading` flag which only covers the fast CW-only data.
  const [m365Loading, setM365Loading] = useState(true);
  // True for the current `id` when the drilldown cache had a warm hit —
  // guards effects B/C from redundantly re-fetching/re-flashing identical
  // state that peek already seeded synchronously.
  const hadPeekRef = useRef(false);
  // True when the peek hit already carried resolved M365 license names —
  // lets effect C skip a redundant (if harmless) cache-hit re-fetch.
  const hadResolvedM365PeekRef = useRef(false);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;

    // Warm cache hit → seed synchronously so the page renders with no skeleton
    // flash. `hadPeekRef` is set only when the peeked person is already enriched,
    // so effect B can skip the redundant enrich upgrade.
    const peek = prefetch.peekPersonDrilldown(activeTenantId, id);
    if (peek) {
      hadPeekRef.current = !!peek.person.enrichedBy;
      hadResolvedM365PeekRef.current = peek.m365ExtraLicenses.length > 0;
      setPerson(peek.person);
      setPersonDevices(peek.devices);
      setPersonLicenses(peek.licenses);
      setM365ExtraLicenses(peek.m365ExtraLicenses);
      setPendingSkuCount(
        peek.m365ExtraLicenses.length > 0 ? 0 : (peek.person.m365UnresolvedSkuIds?.length ?? 0)
      );
      setLoading(false);
      if (peek.person.enrichedBy) setM365Loading(false);
    } else {
      hadPeekRef.current = false;
      hadResolvedM365PeekRef.current = false;
      setLoading(true);
      setM365ExtraLicenses([]);
      setPendingSkuCount(0);
    }

    // Always reconcile via the cache-backed services. On a full warm these are
    // free cache hits (no network); on a partial warm — the person was seeded
    // from the list before the devices/licenses warm finished — they fill the
    // gaps so cards are never stuck empty. The enrich:false result must never
    // clobber an already-enriched person (miss-path race with effect B).
    Promise.all([
      people.get(activeTenantId, id, { enrich: false }),
      devices.listForPerson(activeTenantId, id),
      licenses.listForPerson(activeTenantId, id),
    ])
      .then(([p, d, l]) => {
        if (cancelled) return;
        if (p) setPerson((prev) => (prev?.enrichedBy && !p.enrichedBy ? prev : p));
        setPersonDevices(d);
        setPersonLicenses(l);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [id, activeTenantId, people, devices, licenses, prefetch]);

  // Background CIPP/M365 enrichment: swap in the enriched person once it
  // resolves, so the page renders CW data immediately and M365 fields fill
  // in behind skeletons. Skipped on a warm cache hit — the peeked person is
  // already fully enriched.
  useEffect(() => {
    if (!id || hadPeekRef.current) return;
    setM365Loading(true);
    let cancelled = false;
    people
      .get(activeTenantId, id, { enrich: true })
      .then((enriched) => {
        if (cancelled || !enriched) return;
        setPerson(enriched);
        setPendingSkuCount(enriched.m365UnresolvedSkuIds?.length ?? 0);
      })
      .finally(() => {
        if (!cancelled) setM365Loading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id, activeTenantId, people]);

  useEffect(() => {
    const skuIds = person?.m365UnresolvedSkuIds;
    if (!id || !skuIds || skuIds.length === 0) return;
    // Already resolved via a warm cache hit — nothing left to fetch.
    if (hadResolvedM365PeekRef.current) return;
    let cancelled = false;
    people.resolveM365Licenses(activeTenantId, id).then((names) => {
      if (cancelled) return;
      setM365ExtraLicenses(names);
      setPendingSkuCount(0);
    });
    return () => {
      cancelled = true;
    };
  }, [id, activeTenantId, person, people]);

  if (loading) return <DetailSkeleton />;

  // Servers (Windows or Linux) are managed in the Devices tab, not surfaced in a
  // person's view — exclude them from the drilldown's device list and count.
  const visibleDevices = personDevices.filter((d) => d.type !== 'server');

  if (!person) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" aria-hidden />
        <h2 className="text-lg font-semibold">Person not found</h2>
        <p className="text-sm text-muted-foreground mt-1 mb-4">
          The requested employee record does not exist or has been removed.
        </p>
        <Button variant="outline" onClick={() => navigate('/people')}>
          <ArrowLeft className="h-4 w-4 mr-2" aria-hidden />
          Back to directory
        </Button>
      </div>
    );
  }

  const totalLicenseCost = personLicenses.reduce((sum, l) => sum + (l.costPerMonth ?? 0), 0);
  const hasLicenseCost = personLicenses.some((l) => l.costPerMonth !== undefined);
  const m365Licenses = person.m365Licenses ?? [];
  const licenseCount = personLicenses.length + m365Licenses.length + pendingSkuCount + m365ExtraLicenses.length;

  return (
    <div className="space-y-6">
      {/* Back link */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => navigate('/people')}
        className="gap-1.5 -ml-1"
        aria-label="Back to people directory"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Back to people
      </Button>

      {/* Page header with status badge */}
      <PageHeader
        title={person.name}
        subtitle={[person.title, person.department].filter(Boolean).join(' · ')}
        actions={<PersonStatusBadge status={person.status} />}
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* ── Left: Profile card ──────────────────────────────────────────── */}
        <div className="space-y-4">
          <Card>
            <CardContent className="pt-6">
              {/* Avatar + name */}
              <div className="flex flex-col items-center gap-3 text-center mb-4">
                <Avatar className="h-20 w-20">
                  <AvatarFallback className="text-2xl font-bold bg-primary/10 text-primary">
                    {person.avatarInitials}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <div className="font-semibold text-lg leading-tight">{person.name}</div>
                  <div className="text-sm text-muted-foreground">{person.title}</div>
                </div>
                <PersonStatusBadge status={person.status} />
              </div>

              <Separator className="mb-4" />

              {/* Details list */}
              <dl className="space-y-3 text-sm">
                <div className="flex items-start gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" aria-hidden />
                  <div>
                    <dt className="text-xs text-muted-foreground">Email</dt>
                    <dd className="font-medium break-all">{person.email}</dd>
                  </div>
                </div>

                {person.department && (
                  <div className="flex items-start gap-2">
                    <Building2 className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" aria-hidden />
                    <div>
                      <dt className="text-xs text-muted-foreground">Department</dt>
                      <dd className="font-medium">{person.department}</dd>
                    </div>
                  </div>
                )}

                <div className="flex items-start gap-2">
                  <Briefcase className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" aria-hidden />
                  <div>
                    <dt className="text-xs text-muted-foreground">Role</dt>
                    <dd className="font-medium">{person.role}</dd>
                  </div>
                </div>

                {person.manager && (
                  <div className="flex items-start gap-2">
                    <Users className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" aria-hidden />
                    <div>
                      <dt className="text-xs text-muted-foreground">Manager</dt>
                      <dd className="font-medium">{person.manager}</dd>
                    </div>
                  </div>
                )}

                <div className="flex items-start gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" aria-hidden />
                  <div>
                    <dt className="text-xs text-muted-foreground">Start date</dt>
                    <dd className="font-medium">{formatDate(person.startDate)}</dd>
                  </div>
                </div>
              </dl>
            </CardContent>
          </Card>

          {/* Microsoft 365 card — skeleton while enrichment loads; hidden once
              loaded if the person has no CIPP-enriched M365 fields at all */}
          {m365Loading ? (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <AtSign className="h-4 w-4" aria-hidden />
                  Microsoft 365
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <dl className="space-y-3 text-sm">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={`m365-field-skeleton-${i}`} className="flex items-start gap-2">
                      <Skeleton className="h-4 w-4 shrink-0 rounded" />
                      <div className="space-y-1.5 flex-1">
                        <Skeleton className="h-3 w-24" />
                        <Skeleton className="h-4 w-32" />
                      </div>
                    </div>
                  ))}
                </dl>
              </CardContent>
            </Card>
          ) : (
            (person.userPrincipalName ||
              person.accountEnabled !== undefined ||
              person.mfaStatus ||
              person.lastSignIn) && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <AtSign className="h-4 w-4" aria-hidden />
                  Microsoft 365
                  {person.accountClass && person.accountClass !== 'human' && (
                    <Badge variant="secondary" className="text-xs font-normal">
                      {ACCOUNT_CLASS_LABEL[person.accountClass]}
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <dl className="space-y-3 text-sm">
                  {person.userPrincipalName && (
                    <div className="flex items-start gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" aria-hidden />
                      <div>
                        <dt className="text-xs text-muted-foreground">User principal name</dt>
                        <dd className="font-medium break-all">{person.userPrincipalName}</dd>
                      </div>
                    </div>
                  )}

                  {person.accountEnabled !== undefined && (
                    <div className="flex items-start gap-2">
                      <ShieldCheck className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" aria-hidden />
                      <div>
                        <dt className="text-xs text-muted-foreground">Account status</dt>
                        <dd className="font-medium">
                          {person.accountEnabled ? (
                            <Badge className="bg-green-100 text-green-700 hover:bg-green-100">Enabled</Badge>
                          ) : (
                            <Badge className="bg-red-100 text-red-700 hover:bg-red-100">Disabled</Badge>
                          )}
                        </dd>
                      </div>
                    </div>
                  )}

                  {person.mfaStatus && (
                    <div className="flex items-start gap-2">
                      <ShieldCheck className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" aria-hidden />
                      <div>
                        <dt className="text-xs text-muted-foreground">MFA status</dt>
                        <dd className="font-medium">
                          <Badge variant="outline" className="text-xs">
                            {person.mfaStatus}
                          </Badge>
                        </dd>
                      </div>
                    </div>
                  )}

                  {person.lastSignIn && (
                    <div className="flex items-start gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" aria-hidden />
                      <div>
                        <dt className="text-xs text-muted-foreground">Last sign-in</dt>
                        <dd className="font-medium">{formatRelative(person.lastSignIn)}</dd>
                      </div>
                    </div>
                  )}
                </dl>
              </CardContent>
            </Card>
            )
          )}

          {/* Groups card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Users className="h-4 w-4" aria-hidden />
                Groups
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {(() => {
                const groups = person.groups.length > 0 ? person.groups : person.m365Groups ?? [];
                return groups.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No groups assigned</p>
                ) : (
                  <div className="flex flex-wrap gap-1.5" role="list" aria-label="Group memberships">
                    {groups.map((g) => (
                      <Badge key={g} variant="secondary" className="text-xs" role="listitem">
                        {g}
                      </Badge>
                    ))}
                  </div>
                );
              })()}
            </CardContent>
          </Card>
        </div>

        {/* ── Right: Devices + Licenses ───────────────────────────────────── */}
        <div className="md:col-span-2 space-y-4">
          {/* Devices */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Monitor className="h-4 w-4" aria-hidden />
                  Assigned devices
                </CardTitle>
                <Badge variant="outline" className="text-xs">
                  {visibleDevices.length}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              {visibleDevices.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <Monitor className="h-8 w-8 text-muted-foreground mb-2" aria-hidden />
                  <p className="text-sm text-muted-foreground">No devices assigned</p>
                </div>
              ) : (
                <div className="space-y-2" role="list" aria-label="Assigned devices">
                  {visibleDevices.map((d) => (
                    <div
                      key={d.id}
                      className={cn(
                        'flex items-center justify-between rounded-lg border p-3 transition-colors cursor-pointer hover:bg-muted/50',
                        d.status === 'critical' && 'border-red-200 bg-red-50/50',
                        d.status === 'warning' && 'border-yellow-200 bg-yellow-50/50',
                        d.status === 'offline' && 'border-gray-200 bg-gray-50/50'
                      )}
                      role="button"
                      tabIndex={0}
                      aria-label={`View ${d.name}`}
                      onClick={() => navigate(`/devices/${d.id}`)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          navigate(`/devices/${d.id}`);
                        }
                      }}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {deviceStatusIcon(d.status)}
                        <div className="min-w-0">
                          <div className="text-sm font-medium truncate">{d.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {d.model} · {d.os}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Last seen {formatRelative(d.lastSeen)}
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1.5 shrink-0 ml-2">
                        <DeviceStatusBadge status={d.status} />
                        {!d.compliant && (
                          <Badge variant="outline" className="text-xs text-red-600 border-red-200">
                            Non-compliant
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Licenses */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Key className="h-4 w-4" aria-hidden />
                  Licenses
                </CardTitle>
                <div className="flex items-center gap-2">
                  {personLicenses.length > 0 && hasLicenseCost && (
                    <span className="text-xs text-muted-foreground">
                      {formatCurrency(totalLicenseCost)}/mo
                    </span>
                  )}
                  <Badge variant="outline" className="text-xs">
                    {licenseCount}
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              {licenseCount === 0 && !m365Loading ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <Key className="h-8 w-8 text-muted-foreground mb-2" aria-hidden />
                  <p className="text-sm text-muted-foreground">No licenses assigned</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {personLicenses.length > 0 && (
                    <div className="space-y-2" role="list" aria-label="Assigned licenses">
                      {personLicenses.map((l) => (
                        <div
                          key={l.id}
                          className="flex items-center justify-between rounded-lg border p-3"
                          role="listitem"
                        >
                          <div className="min-w-0">
                            <div className="text-sm font-medium truncate">{l.product}</div>
                            <div className="text-xs text-muted-foreground">{l.sku}</div>
                          </div>
                          {l.costPerMonth !== undefined && (
                            <div className="text-sm font-semibold shrink-0 ml-2 tabular-nums">
                              {formatCurrency(l.costPerMonth)}/mo
                            </div>
                          )}
                        </div>
                      ))}

                      {personLicenses.length > 1 && hasLicenseCost && (
                        <>
                          <Separator />
                          <div className="flex items-center justify-between px-1 pt-1">
                            <span className="text-xs text-muted-foreground">Total monthly cost</span>
                            <span className="text-sm font-bold tabular-nums">
                              {formatCurrency(totalLicenseCost)}/mo
                            </span>
                          </div>
                        </>
                      )}
                    </div>
                  )}

                  {m365Loading ? (
                    <div className="space-y-2">
                      <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                        <AtSign className="h-3.5 w-3.5" aria-hidden />
                        From Microsoft 365
                      </div>
                      <div className="space-y-2" role="list" aria-label="Microsoft 365 licenses">
                        {Array.from({ length: 2 }).map((_, i) => (
                          <div
                            key={`m365-license-loading-skeleton-${i}`}
                            className="flex items-center gap-2.5 rounded-lg border p-3"
                            role="listitem"
                            aria-label="Loading Microsoft 365 license"
                          >
                            <Skeleton className="h-4 w-4 shrink-0 rounded" />
                            <Skeleton className="h-4 w-40" />
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    (m365Licenses.length > 0 || m365ExtraLicenses.length > 0 || pendingSkuCount > 0) && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                        <AtSign className="h-3.5 w-3.5" aria-hidden />
                        From Microsoft 365
                      </div>
                      <div className="space-y-2" role="list" aria-label="Microsoft 365 licenses">
                        {[...m365Licenses, ...m365ExtraLicenses].map((l) => (
                          <div
                            key={l}
                            className="flex items-center gap-2.5 rounded-lg border p-3"
                            role="listitem"
                          >
                            <Key className="h-4 w-4 text-muted-foreground shrink-0" aria-hidden />
                            <span className="text-sm font-medium">{l}</span>
                          </div>
                        ))}
                        {Array.from({ length: pendingSkuCount }).map((_, i) => (
                          <div
                            key={`m365-license-skeleton-${i}`}
                            className="flex items-center gap-2.5 rounded-lg border p-3"
                            role="listitem"
                            aria-label="Resolving license name"
                          >
                            <Skeleton className="h-4 w-4 shrink-0 rounded" />
                            <Skeleton className="h-4 w-40" />
                          </div>
                        ))}
                      </div>
                    </div>
                    )
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
