import { useEffect, useState, useMemo, useCallback } from 'react';
import { toast } from 'sonner';
import { useServices } from '@/services/context';
import { useSessionStore } from '@/store/session';
import type { Person, Device, PersonStatus, DeviceType, DeviceStatus } from '@/services/types';
import { PageHeader } from '@/components/common/PageHeader';
import { TableSkeleton } from '@/components/common/TableSkeleton';
import { EmptyState } from '@/components/common/EmptyState';
import { PersonStatusBadge, DeviceStatusBadge } from '@/components/common/StatusBadge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Users, Monitor, Package, Search, ArrowUpDown, RefreshCw, UserCog } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { formatRelative } from '@/lib/format';
import { cn } from '@/lib/utils';
import { isInventoryDevice } from '@/lib/devices';

// ─── Types ────────────────────────────────────────────────────────────────────

type SortDir = 'asc' | 'desc';

interface PeopleSort {
  by: 'name' | 'department' | 'status';
  dir: SortDir;
}

// ─── Account class helpers ────────────────────────────────────────────────────

/** `undefined` (no CIPP match) is treated as human — the directory is CW-authoritative. */
function isHuman(p: Person): boolean {
  return p.accountClass === undefined || p.accountClass === 'human';
}

const ACCOUNT_CLASS_LABEL: Record<string, string> = {
  guest: 'Guest',
  'shared-mailbox': 'Shared mailbox',
  'room-mailbox': 'Room mailbox',
  'equipment-mailbox': 'Equipment mailbox',
  unlicensed: 'Unlicensed',
};

// ─── Sort helpers ─────────────────────────────────────────────────────────────

function sortPeople(data: Person[], sort: PeopleSort): Person[] {
  return [...data].sort((a, b) => {
    let cmp = 0;
    if (sort.by === 'name') cmp = a.name.localeCompare(b.name);
    else if (sort.by === 'department') cmp = a.department.localeCompare(b.department);
    else if (sort.by === 'status') cmp = a.status.localeCompare(b.status);
    return sort.dir === 'asc' ? cmp : -cmp;
  });
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SortHeader({
  label,
  column,
  sort,
  onSort,
}: {
  label: string;
  column: PeopleSort['by'];
  sort: PeopleSort;
  onSort: (col: PeopleSort['by']) => void;
}) {
  const active = sort.by === column;
  return (
    <button
      className={cn(
        'flex items-center gap-1 text-xs font-medium uppercase tracking-wide hover:text-foreground transition-colors',
        active ? 'text-foreground' : 'text-muted-foreground'
      )}
      onClick={() => onSort(column)}
      aria-label={`Sort by ${label}`}
    >
      {label}
      <ArrowUpDown className="h-3 w-3 opacity-60" />
    </button>
  );
}

// ─── People tab ───────────────────────────────────────────────────────────────

function PeopleTab() {
  const { people, devices, prefetch } = useServices();
  const { activeTenantId } = useSessionStore();
  const navigate = useNavigate();

  const [allData, setAllData] = useState<Person[]>([]);
  // Device counts are owner-derived: CW leaves `person.deviceIds` empty and links
  // ownership via `device.owner` instead (same basis the drilldown uses).
  const [deviceCounts, setDeviceCounts] = useState<Map<string, number>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<PersonStatus | 'all'>('all');
  const [filterDept, setFilterDept] = useState<string>('all');
  const [sort, setSort] = useState<PeopleSort>({ by: 'name', dir: 'asc' });
  const [showSystem, setShowSystem] = useState(false);

  useEffect(() => {
    setLoading(true);
    setError(null);
    people.list(activeTenantId, { pageSize: 200 })
      .then((r) => {
        setAllData(r.data);
        // Warm every person's drilldown data in the background so clicking a
        // row renders instantly (fire-and-forget; safe to call repeatedly).
        prefetch.warmPeopleDrilldowns(activeTenantId);
      })
      .catch(() => setError('We couldn’t load people. Please try again.'))
      .finally(() => setLoading(false));
    // Tally device counts by owner (cache-backed; best-effort — a failure just
    // leaves the counts at 0 rather than blocking the directory).
    devices.list(activeTenantId, { pageSize: 200 })
      .then((r) => {
        const counts = new Map<string, number>();
        for (const d of r.data) {
          // Servers (Windows or Linux) live in the Devices tab, not a person's count.
          // Inventory stock has no real owner and lives in the Inventory tab.
          if (!d.owner || d.type === 'server' || isInventoryDevice(d)) continue;
          counts.set(d.owner, (counts.get(d.owner) ?? 0) + 1);
        }
        setDeviceCounts(counts);
      })
      .catch(() => setDeviceCounts(new Map()));
  }, [activeTenantId, people, devices, prefetch, reloadKey]);

  const departments = useMemo(() => {
    const depts = Array.from(new Set(allData.map((p) => p.department))).sort();
    return depts;
  }, [allData]);

  const filtered = useMemo(() => {
    let result = allData;
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.email.toLowerCase().includes(q) ||
          p.title.toLowerCase().includes(q) ||
          p.department.toLowerCase().includes(q)
      );
    }
    if (filterStatus !== 'all') result = result.filter((p) => p.status === filterStatus);
    if (filterDept !== 'all') result = result.filter((p) => p.department === filterDept);
    if (!showSystem) result = result.filter(isHuman);
    return sortPeople(result, sort);
  }, [allData, search, filterStatus, filterDept, showSystem, sort]);

  function handleSort(col: PeopleSort['by']) {
    setSort((prev) =>
      prev.by === col
        ? { by: col, dir: prev.dir === 'asc' ? 'desc' : 'asc' }
        : { by: col, dir: 'asc' }
    );
  }

  return (
    <div className="space-y-4">
      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" aria-hidden />
          <Input
            className="pl-9"
            placeholder="Search people..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search people"
          />
        </div>

        <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v as PersonStatus | 'all')}>
          <SelectTrigger className="w-[150px]" aria-label="Filter by status">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="onboarding">Onboarding</SelectItem>
            <SelectItem value="offboarding">Offboarding</SelectItem>
            <SelectItem value="suspended">Suspended</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filterDept} onValueChange={setFilterDept}>
          <SelectTrigger className="w-[160px]" aria-label="Filter by department">
            <SelectValue placeholder="All departments" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All departments</SelectItem>
            {departments.map((d) => (
              <SelectItem key={d} value={d}>{d}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button
          size="sm"
          variant={showSystem ? 'default' : 'outline'}
          aria-pressed={showSystem}
          onClick={() => setShowSystem((s) => !s)}
        >
          <UserCog className="h-4 w-4" aria-hidden />
          Show system accounts
        </Button>

        <span className="text-xs text-muted-foreground ml-auto">
          {filtered.length} {filtered.length === 1 ? 'person' : 'people'}
        </span>
      </div>

      {/* Table */}
      {error ? (
        <EmptyState
          icon={<Users className="h-10 w-10" />}
          title="Couldn’t load people"
          description={error}
          action={
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                prefetch.invalidate(activeTenantId);
                setReloadKey((k) => k + 1);
              }}
            >
              Retry
            </Button>
          }
        />
      ) : loading ? (
        <TableSkeleton rows={8} cols={5} />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Users className="h-10 w-10" />}
          title="No people found"
          description="Try adjusting your filters or search query."
        />
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>
                  <SortHeader label="Name" column="name" sort={sort} onSort={handleSort} />
                </TableHead>
                <TableHead>Title</TableHead>
                <TableHead>
                  <SortHeader label="Department" column="department" sort={sort} onSort={handleSort} />
                </TableHead>
                <TableHead>Manager</TableHead>
                <TableHead>
                  <SortHeader label="Status" column="status" sort={sort} onSort={handleSort} />
                </TableHead>
                <TableHead className="text-right">Devices</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((p) => (
                <TableRow
                  key={p.id}
                  className="cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => navigate(`/people/${p.id}`)}
                  tabIndex={0}
                  role="button"
                  aria-label={`View ${p.name}`}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      navigate(`/people/${p.id}`);
                    }
                  }}
                >
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8 shrink-0">
                        <AvatarFallback className="text-xs bg-primary/10 text-primary font-semibold">
                          {p.avatarInitials}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <div className="text-sm font-medium truncate">{p.name}</div>
                          {showSystem && p.accountClass && p.accountClass !== 'human' && (
                            <Badge variant="secondary" className="text-[10px] text-muted-foreground shrink-0">
                              {ACCOUNT_CLASS_LABEL[p.accountClass] ?? p.accountClass}
                            </Badge>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground truncate">{p.email}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">{p.title}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{p.department}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {p.manager ? (
                      <span className="truncate block max-w-[120px]">{p.manager}</span>
                    ) : (
                      <span className="text-muted-foreground/50">—</span>
                    )}
                  </TableCell>
                  <TableCell><PersonStatusBadge status={p.status} /></TableCell>
                  <TableCell className="text-right text-sm text-muted-foreground">
                    {deviceCounts.get(p.id) ?? 0}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

// ─── Devices tab ──────────────────────────────────────────────────────────────

function DevicesTab() {
  const { devices, people, prefetch } = useServices();
  const { activeTenantId } = useSessionStore();
  const navigate = useNavigate();

  const [allDevices, setAllDevices] = useState<Device[]>([]);
  const [allPeople, setAllPeople] = useState<Person[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<DeviceType | 'all'>('all');
  const [filterStatus, setFilterStatus] = useState<DeviceStatus | 'all'>('all');

  const load = useCallback(
    async (opts?: { force?: boolean }) => {
      if (opts?.force) {
        setRefreshing(true);
        prefetch.invalidate(activeTenantId);
      } else {
        setLoading(true);
      }
      try {
        const [d, p] = await Promise.all([
          devices.list(activeTenantId, {
            pageSize: 200,
            ...(opts?.force ? { filters: { refresh: '1' } } : {}),
          }),
          people.list(activeTenantId, { pageSize: 200 }),
        ]);
        setAllDevices(d.data);
        setAllPeople(p.data);
        // Warm every device's rich NinjaRMM detail in the background so
        // clicking a row renders instantly (fire-and-forget, idempotent).
        prefetch.warmDeviceDrilldowns(activeTenantId);
        if (opts?.force) {
          toast.success('Devices refreshed', { description: `${d.data.length} devices loaded` });
        }
      } catch {
        if (opts?.force) toast.error('Failed to refresh devices. Please try again.');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [activeTenantId, devices, people, prefetch]
  );

  useEffect(() => {
    void load();
  }, [load]);

  const personMap = useMemo(
    () => new Map(allPeople.map((p) => [p.id, p.name])),
    [allPeople]
  );

  const filtered = useMemo(() => {
    let result = allDevices.filter((d) => !isInventoryDevice(d));
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (d) =>
          d.name.toLowerCase().includes(q) ||
          d.model.toLowerCase().includes(q) ||
          d.os.toLowerCase().includes(q) ||
          (d.owner && personMap.get(d.owner)?.toLowerCase().includes(q))
      );
    }
    if (filterType !== 'all') result = result.filter((d) => d.type === filterType);
    if (filterStatus !== 'all') result = result.filter((d) => d.status === filterStatus);
    return result;
  }, [allDevices, search, filterType, filterStatus, personMap]);

  return (
    <div className="space-y-4">
      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" aria-hidden />
          <Input
            className="pl-9"
            placeholder="Search devices..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search devices"
          />
        </div>

        <Select value={filterType} onValueChange={(v) => setFilterType(v as DeviceType | 'all')}>
          <SelectTrigger className="w-[140px]" aria-label="Filter by type">
            <SelectValue placeholder="All types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            <SelectItem value="laptop">Laptop</SelectItem>
            <SelectItem value="workstation">Workstation</SelectItem>
            <SelectItem value="mobile">Mobile</SelectItem>
            <SelectItem value="tablet">Tablet</SelectItem>
            <SelectItem value="server">Server</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v as DeviceStatus | 'all')}>
          <SelectTrigger className="w-[140px]" aria-label="Filter by status">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="healthy">Healthy</SelectItem>
            <SelectItem value="warning">Warning</SelectItem>
            <SelectItem value="critical">Critical</SelectItem>
            <SelectItem value="offline">Offline</SelectItem>
          </SelectContent>
        </Select>

        <Button
          size="sm"
          variant="outline"
          disabled={refreshing || loading}
          onClick={() => void load({ force: true })}
        >
          <RefreshCw className={refreshing ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} aria-hidden />
          {refreshing ? 'Refreshing…' : 'Refresh'}
        </Button>

        <span className="text-xs text-muted-foreground ml-auto">
          {filtered.length} {filtered.length === 1 ? 'device' : 'devices'}
        </span>
      </div>

      {/* Table */}
      {loading ? (
        <TableSkeleton rows={8} cols={6} />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Monitor className="h-10 w-10" />}
          title="No devices found"
          description="Try adjusting your filters or search query."
        />
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>OS</TableHead>
                <TableHead>Owner</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last Seen</TableHead>
                <TableHead>Last Logged In</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((d) => (
                <TableRow
                  key={d.id}
                  className="cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => navigate(`/devices/${d.id}`)}
                  tabIndex={0}
                  role="button"
                  aria-label={`View ${d.name}`}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      navigate(`/devices/${d.id}`);
                    }
                  }}
                >
                  <TableCell>
                    <div className="font-medium text-sm">{d.name}</div>
                    <div className="text-xs text-muted-foreground">{d.model}</div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="capitalize text-xs">
                      {d.type}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{d.os}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {d.owner ? (personMap.get(d.owner) ?? d.owner) : (
                      <span className="text-muted-foreground/50">Unassigned</span>
                    )}
                  </TableCell>
                  <TableCell><DeviceStatusBadge status={d.status} /></TableCell>
                  <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                    {formatRelative(d.lastSeen)}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {d.lastLoggedIn ?? <span className="text-muted-foreground/50">—</span>}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

// ─── Inventory tab ────────────────────────────────────────────────────────────

function InventoryTab() {
  const { devices, prefetch } = useServices();
  const { activeTenantId } = useSessionStore();
  const navigate = useNavigate();

  const [allDevices, setAllDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<DeviceType | 'all'>('all');

  const load = useCallback(
    async (opts?: { force?: boolean }) => {
      if (opts?.force) {
        setRefreshing(true);
        prefetch.invalidate(activeTenantId);
      } else {
        setLoading(true);
      }
      try {
        const d = await devices.list(activeTenantId, {
          pageSize: 200,
          ...(opts?.force ? { filters: { refresh: '1' } } : {}),
        });
        setAllDevices(d.data);
        if (opts?.force) {
          toast.success('Devices refreshed', { description: `${d.data.length} devices loaded` });
        }
      } catch {
        if (opts?.force) toast.error('Failed to refresh devices. Please try again.');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [activeTenantId, devices, prefetch]
  );

  useEffect(() => {
    void load();
  }, [load]);

  const inventory = useMemo(() => allDevices.filter(isInventoryDevice), [allDevices]);

  const filtered = useMemo(() => {
    let result = inventory;
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (d) =>
          d.name.toLowerCase().includes(q) ||
          d.model.toLowerCase().includes(q) ||
          d.serial.toLowerCase().includes(q)
      );
    }
    if (filterType !== 'all') result = result.filter((d) => d.type === filterType);
    return result;
  }, [inventory, search, filterType]);

  return (
    <div className="space-y-4">
      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" aria-hidden />
          <Input
            className="pl-9"
            placeholder="Search inventory..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search inventory"
          />
        </div>

        <Select value={filterType} onValueChange={(v) => setFilterType(v as DeviceType | 'all')}>
          <SelectTrigger className="w-[140px]" aria-label="Filter by type">
            <SelectValue placeholder="All types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            <SelectItem value="laptop">Laptop</SelectItem>
            <SelectItem value="workstation">Workstation</SelectItem>
            <SelectItem value="mobile">Mobile</SelectItem>
            <SelectItem value="tablet">Tablet</SelectItem>
            <SelectItem value="server">Server</SelectItem>
          </SelectContent>
        </Select>

        <Button
          size="sm"
          variant="outline"
          disabled={refreshing || loading}
          onClick={() => void load({ force: true })}
        >
          <RefreshCw className={refreshing ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} aria-hidden />
          {refreshing ? 'Refreshing…' : 'Refresh'}
        </Button>

        <span className="text-xs text-muted-foreground ml-auto">
          {filtered.length} {filtered.length === 1 ? 'device' : 'devices'}
        </span>
      </div>

      {/* Table */}
      {loading ? (
        <TableSkeleton rows={8} cols={5} />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Package className="h-10 w-10" />}
          title="No inventory devices"
          description="Try adjusting your filters or search query."
        />
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Model</TableHead>
                <TableHead>Serial</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last Seen</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((d) => (
                <TableRow
                  key={d.id}
                  className="cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => navigate(`/devices/${d.id}`)}
                  tabIndex={0}
                  role="button"
                  aria-label={`View ${d.name}`}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      navigate(`/devices/${d.id}`);
                    }
                  }}
                >
                  <TableCell>
                    <div className="font-medium text-sm">{d.name}</div>
                    <div className="text-xs text-muted-foreground">{d.model}</div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="capitalize text-xs">
                      {d.type}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{d.model}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{d.serial}</TableCell>
                  <TableCell><DeviceStatusBadge status={d.status} /></TableCell>
                  <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                    {formatRelative(d.lastSeen)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function PeoplePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const raw = searchParams.get('tab');
  const tab = raw === 'devices' || raw === 'inventory' ? raw : 'people';

  return (
    <div>
      <PageHeader
        title="People & devices"
        subtitle="Employee directory and device management"
      />

      <Tabs
        value={tab}
        onValueChange={(v) =>
          setSearchParams(
            v === 'devices' ? { tab: 'devices' } : v === 'inventory' ? { tab: 'inventory' } : {},
            { replace: true }
          )
        }
        className="space-y-4"
      >
        <TabsList aria-label="People and Devices views">
          <TabsTrigger value="people" className="gap-2">
            <Users className="h-4 w-4" aria-hidden />
            People
          </TabsTrigger>
          <TabsTrigger value="devices" className="gap-2">
            <Monitor className="h-4 w-4" aria-hidden />
            Devices
          </TabsTrigger>
          <TabsTrigger value="inventory" className="gap-2">
            <Package className="h-4 w-4" aria-hidden />
            Inventory
          </TabsTrigger>
        </TabsList>

        <TabsContent value="people">
          <PeopleTab />
        </TabsContent>

        <TabsContent value="devices">
          <DevicesTab />
        </TabsContent>

        <TabsContent value="inventory">
          <InventoryTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
