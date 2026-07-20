import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { differenceInDays, parseISO } from 'date-fns';
import { useServices } from '@/services/context';
import { useSessionStore } from '@/store/session';
import type { Person, Device, DeviceDetail, DeviceType, EnrichmentSource } from '@/services/types';
import { PageHeader } from '@/components/common/PageHeader';
import { CardSkeleton } from '@/components/common/CardSkeleton';
import { DeviceStatusBadge } from '@/components/common/StatusBadge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  ArrowLeft,
  AlertCircle,
  Monitor,
  Server,
  Smartphone,
  Tablet,
  Hash,
  Cpu,
  MonitorSmartphone,
  Factory,
  ShieldCheck,
  Users,
  Activity,
  HardDrive,
  Network,
  Globe,
  CalendarClock,
  Lock,
  Settings2,
  MapPin,
} from 'lucide-react';
import { formatRelative, formatBytes, formatDate } from '@/lib/format';
import { isInventoryDevice } from '@/lib/devices';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function deviceTypeIcon(type: DeviceType) {
  if (type === 'server') return Server;
  if (type === 'mobile') return Smartphone;
  if (type === 'tablet') return Tablet;
  return Monitor; // laptop / workstation
}

const enrichmentSourceLabel: Record<EnrichmentSource, string> = {
  ninjarmm: 'NinjaRMM',
  addigy: 'Addigy',
};

const lastSeenSourceLabel: Record<'connectwise' | EnrichmentSource, string> = {
  connectwise: 'ConnectWise',
  ninjarmm: 'NinjaRMM',
  addigy: 'Addigy',
};

function formatClockSpeed(hz?: number): string | null {
  if (!hz) return null;
  return `${(hz / 1e9).toFixed(1)} GHz`;
}

/** Prettify a raw object key for display: split camelCase, replace `_`/`-` with spaces, capitalize. */
function prettifyKey(key: string): string {
  const spaced = key
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .toLowerCase()
    .trim();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

function isBitLockerProtected(status?: string): boolean {
  return (status ?? '').toUpperCase() === 'PROTECTED';
}

function BitLockerBadge({ status }: { status?: string }) {
  if (isBitLockerProtected(status)) {
    return (
      <Badge variant="success" className="text-xs">
        Protected
      </Badge>
    );
  }
  return <span className="text-xs text-muted-foreground">{status ?? '—'}</span>;
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

export function DeviceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { devices, people, prefetch } = useServices();
  const { activeTenantId } = useSessionStore();

  const [device, setDevice] = useState<Device | null>(null);
  const [owner, setOwner] = useState<Person | null>(null);
  const [loading, setLoading] = useState(true);

  const [detail, setDetail] = useState<DeviceDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(true);
  const [telemetryLoading, setTelemetryLoading] = useState(false);
  // True when the peek hit already carried the warmed NinjaRMM detail — lets the
  // detail effect skip a redundant (cache-hit) re-fetch.
  const hadDetailPeekRef = useRef(false);

  // Inventory-ness is stable for a device id (telemetry refresh never changes it).
  // Depending on this boolean instead of the whole `device` object prevents the
  // telemetry effect — which replaces `device` via setDevice — from re-triggering itself.
  const isInventory = device ? isInventoryDevice(device) : null;

  useEffect(() => {
    if (!id) return;
    let cancelled = false;

    // Warm cache hit → seed synchronously so the page renders with no skeleton flash.
    const peek = prefetch.peekDeviceDrilldown(activeTenantId, id);
    if (peek) {
      setDevice(peek.device);
      setOwner(peek.owner);
      setLoading(false);
      if (peek.detail !== undefined) {
        hadDetailPeekRef.current = true;
        setDetail(peek.detail);
        setDetailLoading(false);
      } else {
        hadDetailPeekRef.current = false;
      }
    } else {
      hadDetailPeekRef.current = false;
      setLoading(true);
    }

    // Always reconcile device + owner via the cache-backed services. Free cache
    // hits on a full warm; on a partial warm (device seeded from the list before
    // its owner person was cached) this fills owner/device so nothing is stuck.
    async function load() {
      try {
        const d = await devices.get(activeTenantId, id as string);
        const o = d?.owner ? await people.get(activeTenantId, d.owner) : null;
        if (!cancelled) {
          if (d) setDevice(d);
          setOwner(o);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [id, activeTenantId, devices, people, prefetch]);

  // Second, lazy fetch: rich NinjaRMM telemetry — never blocks the base render.
  // Skipped when the peek hit already had the warmed detail cached.
  useEffect(() => {
    if (!id || hadDetailPeekRef.current) return;
    if (isInventory) {
      setDetailLoading(false);
      return;
    }
    let active = true;

    async function loadDetail() {
      setDetailLoading(true);
      try {
        const d = await devices.getDetail(activeTenantId, id as string);
        if (active) setDetail(d);
      } catch {
        if (active) setDetail(null);
      } finally {
        if (active) setDetailLoading(false);
      }
    }

    void loadDetail();
    return () => {
      active = false;
    };
  }, [id, activeTenantId, devices, isInventory]);

  // Live telemetry refresh: re-pull the Telemetry & status card's fields from
  // NinjaRMM when the drill-down opens. Backgrounded — never blocks the page.
  useEffect(() => {
    if (!id) return;
    if (isInventory) {
      setTelemetryLoading(false);
      return;
    }
    let cancelled = false;
    setTelemetryLoading(true);
    (async () => {
      try {
        const fresh = await devices.getLiveTelemetry(activeTenantId, id as string);
        if (!cancelled && fresh) {
          setDevice((prev) =>
            prev
              ? {
                  ...prev,
                  online: fresh.online,
                  status: fresh.status,
                  lastSeen: fresh.lastSeen,
                  lastSeenSource: fresh.lastSeenSource,
                  lastLoggedIn: fresh.lastLoggedIn,
                  enrichedBy: fresh.enrichedBy,
                }
              : prev
          );
        }
      } finally {
        if (!cancelled) setTelemetryLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, activeTenantId, devices, isInventory]);

  if (loading) return <DetailSkeleton />;

  if (!device) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" aria-hidden />
        <h2 className="text-lg font-semibold">Device not found</h2>
        <p className="text-sm text-muted-foreground mt-1 mb-4">
          The requested device record does not exist or has been removed.
        </p>
        <Button variant="outline" onClick={() => navigate('/people?tab=devices')}>
          <ArrowLeft className="h-4 w-4 mr-2" aria-hidden />
          Back to devices
        </Button>
      </div>
    );
  }

  const TypeIcon = deviceTypeIcon(device.type);
  const inventory = isInventoryDevice(device);
  const ninjaHasHardware =
    !!detail && ((detail.processors?.length ?? 0) > 0 || detail.ramBytes !== undefined);
  const hideHardware = !inventory && !!device.hardware && ninjaHasHardware;

  const buildNinjaCards = (d: DeviceDetail) => ({
    cpu: (
      <>
        {((d.processors?.length ?? 0) > 0 ||
          d.ramBytes !== undefined ||
          d.boxit?.cpuArchitecture ||
          d.cpuArchitecture) && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Cpu className="h-4 w-4" aria-hidden />
                CPU & memory
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0 space-y-4">
              {d.processors?.map((proc, i) => (
                <div key={i}>
                  {i > 0 && <Separator className="mb-3" />}
                  <dl className="space-y-2 text-sm">
                    <div className="flex items-center justify-between gap-4">
                      <dt className="text-xs text-muted-foreground">Processor</dt>
                      <dd className="font-medium text-right">{proc.name ?? '—'}</dd>
                    </div>
                    {proc.architecture && (
                      <div className="flex items-center justify-between">
                        <dt className="text-xs text-muted-foreground">Architecture</dt>
                        <dd className="font-medium">{proc.architecture}</dd>
                      </div>
                    )}
                    {(proc.cores !== undefined || proc.logicalCores !== undefined) && (
                      <div className="flex items-center justify-between">
                        <dt className="text-xs text-muted-foreground">Cores / Logical</dt>
                        <dd className="font-medium">
                          {proc.cores ?? '—'} / {proc.logicalCores ?? '—'}
                        </dd>
                      </div>
                    )}
                    {formatClockSpeed(proc.clockSpeedHz) && (
                      <div className="flex items-center justify-between">
                        <dt className="text-xs text-muted-foreground">Clock speed</dt>
                        <dd className="font-medium">
                          {formatClockSpeed(proc.clockSpeedHz)}
                        </dd>
                      </div>
                    )}
                  </dl>
                </div>
              ))}
              {d.ramBytes !== undefined && (
                <>
                  {d.processors && d.processors.length > 0 && <Separator />}
                  <div className="flex items-center justify-between text-sm">
                    <dt className="text-xs text-muted-foreground">RAM</dt>
                    <dd className="font-medium">{formatBytes(d.ramBytes)}</dd>
                  </div>
                </>
              )}
              {(d.boxit?.cpuArchitecture ?? d.cpuArchitecture) && (
                <>
                  {((d.processors?.length ?? 0) > 0 ||
                    d.ramBytes !== undefined) && <Separator />}
                  <div className="flex items-center justify-between text-sm">
                    <dt className="text-xs text-muted-foreground">CPU architecture</dt>
                    <dd className="font-medium">
                      {d.boxit?.cpuArchitecture ?? d.cpuArchitecture}
                    </dd>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        )}
      </>
    ),
    system: (
      <>
        {(d.domain ||
          d.domainRole ||
          d.boxit?.azureAdJoined ||
          d.boxit?.domainJoinStatus ||
          d.timezone) && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Settings2 className="h-4 w-4" aria-hidden />
                System
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <dl className="space-y-3 text-sm">
                {d.domain && (
                  <div className="flex items-center justify-between">
                    <dt className="text-xs text-muted-foreground">Domain</dt>
                    <dd className="font-medium">{d.domain}</dd>
                  </div>
                )}
                {d.domainRole && (
                  <div className="flex items-center justify-between">
                    <dt className="text-xs text-muted-foreground">Domain role</dt>
                    <dd className="font-medium">{d.domainRole}</dd>
                  </div>
                )}
                {d.boxit?.domainJoinStatus && (
                  <div className="flex items-center justify-between">
                    <dt className="text-xs text-muted-foreground">Domain join status</dt>
                    <dd className="font-medium">{d.boxit.domainJoinStatus}</dd>
                  </div>
                )}
                {d.boxit?.azureAdJoined && (
                  <div className="flex items-center justify-between">
                    <dt className="text-xs text-muted-foreground">Azure AD joined</dt>
                    <dd className="font-medium">{d.boxit.azureAdJoined}</dd>
                  </div>
                )}
                {d.timezone && (
                  <div className="flex items-center justify-between">
                    <dt className="text-xs text-muted-foreground">Time zone</dt>
                    <dd className="font-medium">{d.timezone}</dd>
                  </div>
                )}
              </dl>
            </CardContent>
          </Card>
        )}
      </>
    ),
    network: (
      <>
        {((d.localIps?.length ?? 0) > 0 || d.publicIp) && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Network className="h-4 w-4" aria-hidden />
                Network
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <dl className="space-y-3 text-sm">
                {d.localIps && d.localIps.length > 0 && (
                  <div className="flex items-center justify-between gap-4">
                    <dt className="text-xs text-muted-foreground">Local IPs</dt>
                    <dd className="font-medium text-right">{d.localIps.join(', ')}</dd>
                  </div>
                )}
                {d.publicIp && (
                  <div className="flex items-center justify-between gap-4">
                    <dt className="text-xs text-muted-foreground flex items-center gap-1">
                      <Globe className="h-3 w-3" aria-hidden />
                      Public IP
                    </dt>
                    <dd className="font-medium text-right">{d.publicIp}</dd>
                  </div>
                )}
              </dl>
            </CardContent>
          </Card>
        )}
      </>
    ),
    security: (() => {
      const cVol = d.volumes?.find(
        (v) => (v.driveLetter ?? v.name ?? '').toUpperCase().startsWith('C') && v.bitLocker
      );
      const hasFirewallFields =
        d.boxit?.publicFirewallEnabled !== undefined ||
        d.boxit?.domainFirewallEnabled !== undefined ||
        d.boxit?.privateFirewallEnabled !== undefined;
      if (!d.boxit?.avInstalled && !hasFirewallFields && !cVol) return null;
      return (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <ShieldCheck className="h-4 w-4" aria-hidden />
              Security
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 space-y-3">
            {d.boxit?.avInstalled && (
              <div className="flex items-center justify-between text-sm">
                <dt className="text-xs text-muted-foreground">Antivirus installed</dt>
                <dd className="font-medium">{d.boxit.avInstalled}</dd>
              </div>
            )}
            {d.boxit?.publicFirewallEnabled !== undefined && (
              <div className="flex items-center justify-between text-sm">
                <dt className="text-xs text-muted-foreground">Public firewall</dt>
                <dd className="font-medium">{d.boxit.publicFirewallEnabled}</dd>
              </div>
            )}
            {d.boxit?.domainFirewallEnabled !== undefined && (
              <div className="flex items-center justify-between text-sm">
                <dt className="text-xs text-muted-foreground">Domain firewall</dt>
                <dd className="font-medium">{d.boxit.domainFirewallEnabled}</dd>
              </div>
            )}
            {d.boxit?.privateFirewallEnabled !== undefined && (
              <div className="flex items-center justify-between text-sm">
                <dt className="text-xs text-muted-foreground">Private firewall</dt>
                <dd className="font-medium">{d.boxit.privateFirewallEnabled}</dd>
              </div>
            )}
            {(d.boxit?.avInstalled || hasFirewallFields) && cVol && <Separator />}
            {cVol && (
              <div>
                <div className="flex items-center justify-between">
                  <dt className="text-xs text-muted-foreground flex items-center gap-1">
                    <Lock className="h-3 w-3" aria-hidden />
                    {cVol.driveLetter ?? cVol.name ?? 'C:'}
                  </dt>
                  <dd>
                    <BitLockerBadge status={cVol.bitLocker?.protectionStatus} />
                  </dd>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      );
    })(),
    warranty: (
      <>
        {(d.warranty?.startDate || d.warranty?.endDate) && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <CalendarClock className="h-4 w-4" aria-hidden />
                Warranty
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <dl className="space-y-3 text-sm">
                {d.warranty.startDate && (
                  <div className="flex items-center justify-between">
                    <dt className="text-xs text-muted-foreground">Start</dt>
                    <dd className="font-medium">{formatDate(d.warranty.startDate)}</dd>
                  </div>
                )}
                {d.warranty.endDate && (
                  <div className="flex items-center justify-between">
                    <dt className="text-xs text-muted-foreground">End</dt>
                    <dd className="font-medium">{formatDate(d.warranty.endDate)}</dd>
                  </div>
                )}
                {d.warranty.endDate &&
                  (() => {
                    const days = differenceInDays(parseISO(d.warranty.endDate), new Date());
                    return (
                      <div className="flex items-center justify-between">
                        <dt className="text-xs text-muted-foreground">Status</dt>
                        <dd
                          className={
                            days < 0 ? 'font-medium text-red-600' : 'font-medium text-muted-foreground'
                          }
                        >
                          {days < 0 ? 'Expired' : `${days} days left`}
                        </dd>
                      </div>
                    );
                  })()}
              </dl>
            </CardContent>
          </Card>
        )}
      </>
    ),
    location: (
      <>
        {d.location && Object.keys(d.location).length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <MapPin className="h-4 w-4" aria-hidden />
                Location
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <dl className="space-y-3 text-sm">
                {Object.entries(d.location).map(([key, value]) => (
                  <div key={key} className="flex items-center justify-between gap-4">
                    <dt className="text-xs text-muted-foreground">{prettifyKey(key)}</dt>
                    <dd className="font-medium text-right">
                      {typeof value === 'string' || typeof value === 'number'
                        ? value
                        : JSON.stringify(value)}
                    </dd>
                  </div>
                ))}
              </dl>
            </CardContent>
          </Card>
        )}
      </>
    ),
  });

  return (
    <div className="space-y-6">
      {/* Back link */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => navigate('/people?tab=devices')}
        className="gap-1.5 -ml-1"
        aria-label="Back to devices"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Back to devices
      </Button>

      {/* Page header with status badge */}
      <PageHeader
        title={device.name}
        subtitle={`${device.model} · ${device.os}`}
        actions={<DeviceStatusBadge status={device.status} />}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Left rail: Device overview (incl. Owner) + hardware ─────────── */}
        <div className="flex flex-col gap-6">
          <Card>
            <CardContent className="pt-6">
              {/* Icon + name */}
              <div className="flex flex-col items-center gap-3 text-center mb-4">
                <div className="h-20 w-20 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                  <TypeIcon className="h-10 w-10" aria-hidden />
                </div>
                <div>
                  <div className="font-semibold text-lg leading-tight">{device.name}</div>
                  <div className="text-sm text-muted-foreground">{device.model}</div>
                </div>
                <DeviceStatusBadge status={device.status} />
              </div>

              <Separator className="mb-4" />

              {/* Details list */}
              <dl className="space-y-3 text-sm">
                <div className="flex items-start gap-2">
                  <Hash className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" aria-hidden />
                  <div>
                    <dt className="text-xs text-muted-foreground">Serial</dt>
                    <dd className="font-medium break-all">{device.serial}</dd>
                  </div>
                </div>

                <div className="flex items-start gap-2">
                  <Cpu className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" aria-hidden />
                  <div>
                    <dt className="text-xs text-muted-foreground">Type</dt>
                    <dd className="font-medium capitalize">{device.type}</dd>
                  </div>
                </div>

                <div className="flex items-start gap-2">
                  <MonitorSmartphone
                    className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0"
                    aria-hidden
                  />
                  <div>
                    <dt className="text-xs text-muted-foreground">OS</dt>
                    <dd className="font-medium">{device.os}</dd>
                  </div>
                </div>

                {device.manufacturer && (
                  <div className="flex items-start gap-2">
                    <Factory
                      className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0"
                      aria-hidden
                    />
                    <div>
                      <dt className="text-xs text-muted-foreground">Manufacturer</dt>
                      <dd className="font-medium">{device.manufacturer}</dd>
                    </div>
                  </div>
                )}
              </dl>

              {/* Owner (relocated into overview) */}
              <Separator className="my-4" />
              <div>
                <div className="text-xs text-muted-foreground mb-2 flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5" aria-hidden />
                  Owner
                </div>
                {owner ? (
                  <div
                    className="flex items-center gap-3 rounded-lg border p-3 cursor-pointer hover:bg-muted/50 transition-colors"
                    role="button"
                    tabIndex={0}
                    aria-label={`View ${owner.name}`}
                    onClick={() => navigate(`/people/${owner.id}`)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        navigate(`/people/${owner.id}`);
                      }
                    }}
                  >
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="text-xs bg-primary/10 text-primary font-semibold">
                        {owner.avatarInitials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate">{owner.name}</div>
                      {[owner.title, owner.department].filter(Boolean).join(' · ') && (
                        <div className="text-xs text-muted-foreground truncate">
                          {[owner.title, owner.department].filter(Boolean).join(' · ')}
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No owner assigned</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Hardware card */}
          {!inventory && device.hardware && !ninjaHasHardware && (
            <Card className="flex-1 h-full flex flex-col">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Cpu className="h-4 w-4" aria-hidden />
                  Hardware
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <dl className="space-y-3 text-sm">
                  <div className="flex items-center justify-between">
                    <dt className="text-xs text-muted-foreground">CPU</dt>
                    <dd className="font-medium">{device.hardware.cpu ?? '—'}</dd>
                  </div>
                  <div className="flex items-center justify-between">
                    <dt className="text-xs text-muted-foreground">RAM</dt>
                    <dd className="font-medium">
                      {device.hardware.ramBytes ? formatBytes(device.hardware.ramBytes) : '—'}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between">
                    <dt className="text-xs text-muted-foreground">Disk</dt>
                    <dd className="font-medium">
                      {device.hardware.diskBytes ? formatBytes(device.hardware.diskBytes) : '—'}
                    </dd>
                  </div>
                </dl>
              </CardContent>
            </Card>
          )}
        </div>

        {/* ── Right region: System info (inventory) or Telemetry + NinjaRMM detail ── */}
        <div className="lg:col-span-2 space-y-6">
          {inventory ? (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Cpu className="h-4 w-4" aria-hidden />
                  System information
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <dl className="space-y-3 text-sm">
                  <div className="flex items-center justify-between">
                    <dt className="text-xs text-muted-foreground">Manufacturer</dt>
                    <dd className="font-medium">{device.manufacturer ?? '—'}</dd>
                  </div>
                  <div className="flex items-center justify-between">
                    <dt className="text-xs text-muted-foreground">Model</dt>
                    <dd className="font-medium">{device.model || '—'}</dd>
                  </div>
                  <div className="flex items-center justify-between">
                    <dt className="text-xs text-muted-foreground">CPU</dt>
                    <dd className="font-medium">{device.hardware?.cpu ?? '—'}</dd>
                  </div>
                  <div className="flex items-center justify-between">
                    <dt className="text-xs text-muted-foreground">RAM</dt>
                    <dd className="font-medium">
                      {device.hardware?.ramBytes ? formatBytes(device.hardware.ramBytes) : '—'}
                    </dd>
                  </div>
                </dl>
              </CardContent>
            </Card>
          ) : (
            <>
          {/* Telemetry & status */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Activity className="h-4 w-4" aria-hidden />
                Telemetry & status
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <dl className="space-y-3 text-sm">
                {telemetryLoading ? (
                  <>
                    <div className="flex items-center justify-between">
                      <dt className="text-xs text-muted-foreground">Online</dt>
                      <dd>
                        <Skeleton className="h-4 w-16" />
                      </dd>
                    </div>
                    <div className="flex items-center justify-between">
                      <dt className="text-xs text-muted-foreground">Last seen</dt>
                      <dd>
                        <Skeleton className="h-4 w-40" />
                      </dd>
                    </div>
                    <div className="flex items-center justify-between">
                      <dt className="text-xs text-muted-foreground">Last logged in</dt>
                      <dd>
                        <Skeleton className="h-4 w-32" />
                      </dd>
                    </div>
                    {device.enrichedBy && (
                      <div className="flex items-center justify-between">
                        <dt className="text-xs text-muted-foreground">Enriched by</dt>
                        <dd>
                          <Skeleton className="h-4 w-20" />
                        </dd>
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    {device.online !== undefined && (
                      <div className="flex items-center justify-between">
                        <dt className="text-xs text-muted-foreground">Online</dt>
                        <dd className="font-medium flex items-center gap-1.5">
                          <span
                            className={
                              device.online
                                ? 'h-2 w-2 rounded-full bg-green-500'
                                : 'h-2 w-2 rounded-full bg-gray-400'
                            }
                            aria-hidden
                          />
                          {device.online ? 'Online' : 'Offline'}
                        </dd>
                      </div>
                    )}

                    <div className="flex items-center justify-between">
                      <dt className="text-xs text-muted-foreground">Last seen</dt>
                      <dd className="font-medium">
                        {formatRelative(device.lastSeen)}
                        {device.lastSeenSource &&
                          ` · via ${lastSeenSourceLabel[device.lastSeenSource]}`}
                      </dd>
                    </div>

                    <div className="flex items-center justify-between">
                      <dt className="text-xs text-muted-foreground">Last logged in</dt>
                      <dd className="font-medium">{device.lastLoggedIn ?? '—'}</dd>
                    </div>

                    {device.enrichedBy && (
                      <div className="flex items-center justify-between">
                        <dt className="text-xs text-muted-foreground">Enriched by</dt>
                        <dd>
                          <Badge variant="secondary" className="text-xs">
                            {enrichmentSourceLabel[device.enrichedBy]}
                          </Badge>
                        </dd>
                      </div>
                    )}
                  </>
                )}
              </dl>
            </CardContent>
          </Card>

          {/* ── NinjaRMM detail region ──────────────────────────────────── */}
          <div className="space-y-4">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              NinjaRMM telemetry
            </p>

            {detailLoading && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <CardSkeleton />
                <CardSkeleton />
              </div>
            )}

            {!detailLoading && !detail && (
              <p className="text-sm text-muted-foreground">
                No NinjaRMM detail available for this device.
              </p>
            )}

            {!detailLoading && detail && (() => {
              const cards = buildNinjaCards(detail);
              return hideHardware ? (
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                  {cards.cpu}
                  {cards.system}
                </div>
              ) : (
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                  {cards.cpu}
                  {cards.system}
                  {cards.network}
                  {cards.security}
                  {cards.warranty}
                  {cards.location}
                </div>
              );
            })()}
          </div>
            </>
          )}
        </div>
      </div>

      {/* Full-width Network & Security (half each) when the Hardware card is hidden */}
      {hideHardware && detail && (() => {
        const cards = buildNinjaCards(detail);
        return (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {cards.network}
            {cards.security}
            {cards.warranty}
            {cards.location}
          </div>
        );
      })()}

      {/* ── Full-width storage tables (Volumes + Disks) ─────────────────── */}
      {!inventory &&
        !detailLoading &&
        detail &&
        ((detail.volumes?.length ?? 0) > 0 || (detail.disks?.length ?? 0) > 0) && (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {/* Storage — Volumes */}
            {detail.volumes && detail.volumes.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <HardDrive className="h-4 w-4" aria-hidden />
                    Volumes
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Drive</TableHead>
                        <TableHead>Label</TableHead>
                        <TableHead>File system</TableHead>
                        <TableHead>Size</TableHead>
                        <TableHead>Free</TableHead>
                        <TableHead>BitLocker</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {detail.volumes.map((vol, i) => (
                        <TableRow key={i}>
                          <TableCell className="font-medium">
                            {vol.driveLetter ?? vol.name ?? '—'}
                          </TableCell>
                          <TableCell>{vol.label ?? '—'}</TableCell>
                          <TableCell>{vol.fileSystem ?? '—'}</TableCell>
                          <TableCell>
                            {vol.capacityBytes !== undefined
                              ? formatBytes(vol.capacityBytes)
                              : '—'}
                          </TableCell>
                          <TableCell>
                            {vol.freeBytes !== undefined ? formatBytes(vol.freeBytes) : '—'}
                          </TableCell>
                          <TableCell>
                            <BitLockerBadge status={vol.bitLocker?.protectionStatus} />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}

            {/* Storage — Disks */}
            {detail.disks && detail.disks.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <HardDrive className="h-4 w-4" aria-hidden />
                    Disks
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Model</TableHead>
                        <TableHead>Media type</TableHead>
                        <TableHead>Interface</TableHead>
                        <TableHead>Size</TableHead>
                        <TableHead>SMART</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {detail.disks.map((disk, i) => (
                        <TableRow key={i}>
                          <TableCell className="font-medium">{disk.model ?? '—'}</TableCell>
                          <TableCell>{disk.mediaType ?? '—'}</TableCell>
                          <TableCell>{disk.interfaceType ?? '—'}</TableCell>
                          <TableCell>
                            {disk.sizeBytes !== undefined ? formatBytes(disk.sizeBytes) : '—'}
                          </TableCell>
                          <TableCell>{disk.smartStatus ?? '—'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
          </div>
        )}
    </div>
  );
}
