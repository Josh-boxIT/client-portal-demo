import { useEffect, useState, useMemo } from 'react';
import { useServices } from '@/services/context';
import { useSessionStore } from '@/store/session';
import type { Asset, AssetCategory, AssetStatus } from '@/services/types';
import { PageHeader } from '@/components/common/PageHeader';
import { TableSkeleton } from '@/components/common/TableSkeleton';
import { EmptyState } from '@/components/common/EmptyState';
import { StatCard } from '@/components/common/StatCard';
import { AssetStatusBadge } from '@/components/common/StatusBadge';
import { CardSkeletonGrid } from '@/components/common/CardSkeleton';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  HardDrive,
  Search,
  AlertTriangle,
  Clock,
  Package,
  Calendar,
  ArrowUpDown,
} from 'lucide-react';
import { formatDate } from '@/lib/format';
import { parseISO, differenceInDays, format, isBefore } from 'date-fns';
import { cn } from '@/lib/utils';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';

// ─── Constants ────────────────────────────────────────────────────────────────

// "today" is fixed to 2026-06-30 per project spec
const TODAY = parseISO('2026-06-30');
const WARRANTY_WARN_DAYS = 90; // highlight if warranty ends within 90 days
const WARRANTY_CRIT_DAYS = 0;  // expired

// ─── Helpers ──────────────────────────────────────────────────────────────────

function hasValidDate(s: string): boolean {
  if (!s) return false;
  const d = parseISO(s);
  return !Number.isNaN(d.getTime());
}

function warrantyClass(warrantyEnd: string): string {
  if (!hasValidDate(warrantyEnd)) return '';
  const end = parseISO(warrantyEnd);
  const diff = differenceInDays(end, TODAY);
  if (diff < WARRANTY_CRIT_DAYS) return 'text-red-600 font-semibold';
  if (diff < WARRANTY_WARN_DAYS) return 'text-yellow-600 font-medium';
  return '';
}

function warrantyLabel(warrantyEnd: string): string {
  if (!hasValidDate(warrantyEnd)) return '—';
  const end = parseISO(warrantyEnd);
  const diff = differenceInDays(end, TODAY);
  if (diff < 0) return `${formatDate(warrantyEnd)} (expired)`;
  if (diff < WARRANTY_WARN_DAYS) return `${formatDate(warrantyEnd)} (${diff}d left)`;
  return formatDate(warrantyEnd);
}

function refreshDueClass(refreshDue: string): string {
  if (!hasValidDate(refreshDue)) return '';
  const due = parseISO(refreshDue);
  const diff = differenceInDays(due, TODAY);
  if (diff < 0) return 'text-red-600 font-semibold';
  if (diff < 180) return 'text-yellow-600 font-medium';
  return '';
}

function assetQuarterLabel(refreshDue: string): string {
  const d = parseISO(refreshDue);
  const q = Math.floor(d.getMonth() / 3) + 1;
  return `${format(d, 'yyyy')}-Q${q}`;
}

type SortDir = 'asc' | 'desc';
type SortBy = 'name' | 'status' | 'warrantyEnd' | 'refreshDue';

function sortAssets(data: Asset[], by: SortBy, dir: SortDir): Asset[] {
  return [...data].sort((a, b) => {
    let cmp = 0;
    if (by === 'name') cmp = a.name.localeCompare(b.name);
    else if (by === 'status') cmp = a.status.localeCompare(b.status);
    else if (by === 'warrantyEnd') cmp = a.warrantyEnd.localeCompare(b.warrantyEnd);
    else if (by === 'refreshDue') cmp = a.refreshDue.localeCompare(b.refreshDue);
    return dir === 'asc' ? cmp : -cmp;
  });
}

// ─── Sort button ──────────────────────────────────────────────────────────────

function SortHeader({
  label,
  column,
  sortBy,
  onSort,
}: {
  label: string;
  column: SortBy;
  sortBy: SortBy;
  sortDir: SortDir;
  onSort: (col: SortBy) => void;
}) {
  const active = sortBy === column;
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

// ─── Refresh timeline ─────────────────────────────────────────────────────────

interface QuarterBucket {
  quarter: string;
  count: number;
  assets: Asset[];
  isPast: boolean;
}

const CHART_COLORS = ['#6366f1', '#8b5cf6', '#a78bfa', '#c4b5fd', '#ddd6fe'];

function RefreshTimeline({ assets }: { assets: Asset[] }) {
  // Only include non-retired assets with a refreshDue date
  const upcoming = assets.filter((a) => a.status !== 'retired' && hasValidDate(a.refreshDue));

  const buckets = useMemo((): QuarterBucket[] => {
    const map = new Map<string, Asset[]>();
    for (const a of upcoming) {
      const key = assetQuarterLabel(a.refreshDue);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(a);
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([quarter, qAssets]) => ({
        quarter,
        count: qAssets.length,
        assets: qAssets,
        isPast: isBefore(parseISO(qAssets[0].refreshDue), TODAY),
      }));
  }, [upcoming]);

  const chartData = buckets.map((b) => ({ name: b.quarter, count: b.count, isPast: b.isPast }));

  if (buckets.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Calendar className="h-4 w-4" aria-hidden />
          Refresh timeline — assets by refresh-due quarter
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Bar chart */}
        <div className="h-44" role="img" aria-label="Bar chart of assets by refresh quarter">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
              <XAxis
                dataKey="name"
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                allowDecimals={false}
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
              />
              <RechartsTooltip
                formatter={(value: number) => [`${value} asset${value !== 1 ? 's' : ''}`, 'Count']}
                contentStyle={{ fontSize: 12, borderRadius: 6 }}
              />
              <Bar dataKey="count" radius={[4, 4, 0, 0]} maxBarSize={48}>
                {chartData.map((entry, idx) => (
                  <Cell
                    key={entry.name}
                    fill={entry.isPast ? '#ef4444' : CHART_COLORS[idx % CHART_COLORS.length]}
                    fillOpacity={entry.isPast ? 0.7 : 1}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <Separator />

        {/* Grouped list */}
        <div className="space-y-4">
          {buckets.map((bucket) => (
            <div key={bucket.quarter}>
              <div className="flex items-center gap-2 mb-2">
                <Badge
                  variant={bucket.isPast ? 'destructive' : 'secondary'}
                  className="text-xs font-semibold"
                >
                  {bucket.quarter}
                </Badge>
                {bucket.isPast && (
                  <span className="text-xs text-red-600 font-medium">Overdue</span>
                )}
                <span className="text-xs text-muted-foreground ml-auto">
                  {bucket.count} asset{bucket.count !== 1 ? 's' : ''}
                </span>
              </div>
              <div className="space-y-1.5 pl-2 border-l-2 border-muted">
                {bucket.assets.map((a) => (
                  <div
                    key={a.id}
                    className="flex items-center justify-between text-sm py-0.5"
                  >
                    <div className="min-w-0">
                      <span className="font-medium truncate block">{a.name}</span>
                      <span className="text-xs text-muted-foreground">{a.model} · {a.type}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-3">
                      <AssetStatusBadge status={a.status} />
                      <span className={cn('text-xs', refreshDueClass(a.refreshDue))}>
                        {formatDate(a.refreshDue)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function AssetsPage() {
  const { assets } = useServices();
  const { activeTenantId } = useSessionStore();

  const [allData, setAllData] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState<AssetCategory | 'all'>('all');
  const [filterStatus, setFilterStatus] = useState<AssetStatus | 'all'>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [showNoWarranty, setShowNoWarranty] = useState(false);
  const [sortBy, setSortBy] = useState<SortBy>('name');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    setLoading(true);
    setError(null);
    assets.list(activeTenantId, { pageSize: 200 })
      .then((r) => setAllData(r.data))
      .catch(() => setError('We couldn’t load assets. Please try again.'))
      .finally(() => setLoading(false));
  }, [activeTenantId, assets, reloadKey]);

  // Retired assets are hidden by default across the page; only surface them
  // when the user explicitly filters to the "retired" status.
  const activeData = useMemo(
    () => allData.filter((a) => a.status !== 'retired' && hasValidDate(a.warrantyEnd)),
    [allData]
  );

  // Derived stat values
  const stats = useMemo(() => {
    const total = activeData.length;
    const aging = activeData.filter((a) => a.status === 'aging').length;
    const eol = activeData.filter((a) => a.status === 'eol').length;
    return { total, aging, eol };
  }, [activeData]);

  // Unique types for filter
  const assetTypes = useMemo(
    () => Array.from(new Set(allData.map((a) => a.type))).sort(),
    [allData]
  );

  // Filtered + sorted list
  const filtered = useMemo(() => {
    let result = showNoWarranty ? allData : allData.filter((a) => hasValidDate(a.warrantyEnd));
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (a) =>
          a.name.toLowerCase().includes(q) ||
          a.model.toLowerCase().includes(q) ||
          a.type.toLowerCase().includes(q)
      );
    }
    if (filterCategory !== 'all') result = result.filter((a) => a.category === filterCategory);
    if (filterStatus === 'all') result = result.filter((a) => a.status !== 'retired');
    else result = result.filter((a) => a.status === filterStatus);
    if (filterType !== 'all') result = result.filter((a) => a.type === filterType);
    return sortAssets(result, sortBy, sortDir);
  }, [allData, search, filterCategory, filterStatus, filterType, showNoWarranty, sortBy, sortDir]);

  function handleSort(col: SortBy) {
    if (sortBy === col) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(col);
      setSortDir('asc');
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Assets & lifecycle"
        subtitle="Hardware and software asset inventory with warranty and refresh tracking"
      />

      {/* ── Stat cards ──────────────────────────────────────────────────── */}
      {loading ? (
        <CardSkeletonGrid count={3} />
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          <StatCard
            title="Total assets"
            value={stats.total}
            icon={<Package className="h-5 w-5" />}
          />
          <StatCard
            title="Aging"
            value={stats.aging}
            subtitle="Approaching end of life"
            icon={<Clock className="h-5 w-5 text-yellow-500" />}
          />
          <StatCard
            title="End of life"
            value={stats.eol}
            subtitle="Require immediate attention"
            icon={<AlertTriangle className="h-5 w-5 text-red-500" />}
          />
        </div>
      )}

      {/* ── Refresh timeline ────────────────────────────────────────────── */}
      {!loading && allData.length > 0 && <RefreshTimeline assets={allData} />}

      {/* ── Asset table ─────────────────────────────────────────────────── */}
      <div>
        {/* Filter bar */}
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" aria-hidden />
            <Input
              className="pl-9"
              placeholder="Search assets..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search assets"
            />
          </div>

          <Select
            value={filterCategory}
            onValueChange={(v) => setFilterCategory(v as AssetCategory | 'all')}
          >
            <SelectTrigger className="w-[140px]" aria-label="Filter by category">
              <SelectValue placeholder="All categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              <SelectItem value="hardware">Hardware</SelectItem>
              <SelectItem value="software">Software</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={filterStatus}
            onValueChange={(v) => setFilterStatus(v as AssetStatus | 'all')}
          >
            <SelectTrigger className="w-[150px]" aria-label="Filter by lifecycle status">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="in-service">In service</SelectItem>
              <SelectItem value="aging">Aging</SelectItem>
              <SelectItem value="eol">End of life</SelectItem>
              <SelectItem value="retired">Retired</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-[150px]" aria-label="Filter by type">
              <SelectValue placeholder="All types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              {assetTypes.map((t) => (
                <SelectItem key={t} value={t}>{t}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex items-center gap-2">
            <Checkbox
              id="show-no-warranty"
              checked={showNoWarranty}
              onCheckedChange={(v) => setShowNoWarranty(v === true)}
            />
            <Label
              htmlFor="show-no-warranty"
              className="text-sm text-muted-foreground cursor-pointer whitespace-nowrap"
            >
              Show assets without warranty data
            </Label>
          </div>

          <span className="text-xs text-muted-foreground ml-auto">
            {filtered.length} {filtered.length === 1 ? 'asset' : 'assets'}
          </span>
        </div>

        {/* Table */}
        {error ? (
          <EmptyState
            icon={<HardDrive className="h-10 w-10" />}
            title="Couldn’t load assets"
            description={error}
            action={
              <Button size="sm" variant="outline" onClick={() => setReloadKey((k) => k + 1)}>
                Retry
              </Button>
            }
          />
        ) : loading ? (
          <TableSkeleton rows={6} cols={6} />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<HardDrive className="h-10 w-10" />}
            title="No assets found"
            description="Try adjusting your filters or search query."
          />
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>
                    <SortHeader
                      label="Name"
                      column="name"
                      sortBy={sortBy}
                      sortDir={sortDir}
                      onSort={handleSort}
                    />
                  </TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>
                    <SortHeader
                      label="Status"
                      column="status"
                      sortBy={sortBy}
                      sortDir={sortDir}
                      onSort={handleSort}
                    />
                  </TableHead>
                  <TableHead>Model</TableHead>
                  <TableHead>
                    <SortHeader
                      label="Warranty end"
                      column="warrantyEnd"
                      sortBy={sortBy}
                      sortDir={sortDir}
                      onSort={handleSort}
                    />
                  </TableHead>
                  <TableHead>
                    <SortHeader
                      label="Refresh due"
                      column="refreshDue"
                      sortBy={sortBy}
                      sortDir={sortDir}
                      onSort={handleSort}
                    />
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell>
                      <div className="font-medium text-sm">{a.name}</div>
                      <div className="text-xs text-muted-foreground">{a.type}</div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={cn(
                          'capitalize text-xs',
                          a.category === 'hardware'
                            ? 'text-blue-700 border-blue-200'
                            : 'text-purple-700 border-purple-200'
                        )}
                      >
                        {a.category}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <AssetStatusBadge status={a.status} />
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{a.model}</TableCell>
                    <TableCell>
                      <span
                        className={cn('text-sm', warrantyClass(a.warrantyEnd))}
                        title={`Warranty: ${a.warrantyEnd}`}
                      >
                        {warrantyLabel(a.warrantyEnd)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span
                        className={cn('text-sm', refreshDueClass(a.refreshDue))}
                        title={`Refresh due: ${a.refreshDue}`}
                      >
                        {formatDate(a.refreshDue)}
                        {hasValidDate(a.refreshDue) && isBefore(parseISO(a.refreshDue), TODAY) && (
                          <AlertTriangle
                            className="inline-block h-3 w-3 ml-1 text-red-500"
                            aria-label="Overdue"
                          />
                        )}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
}
