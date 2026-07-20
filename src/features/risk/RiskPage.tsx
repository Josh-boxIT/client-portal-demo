import { useEffect, useState, useMemo, useCallback } from 'react';
import { useServices } from '@/services/context';
import { useSessionStore } from '@/store/session';
import type { Risk, RiskSeverity, RiskLikelihood, RiskStatus } from '@/services/types';
import { PageHeader } from '@/components/common/PageHeader';
import { TableSkeleton } from '@/components/common/TableSkeleton';
import { EmptyState } from '@/components/common/EmptyState';
import { StatCard } from '@/components/common/StatCard';
import { RiskSeverityBadge } from '@/components/common/StatusBadge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { ShieldAlert, Search, ArrowUpDown, X, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

// ─── Constants ────────────────────────────────────────────────────────────────

const SEVERITIES: RiskSeverity[] = ['low', 'medium', 'high', 'critical'];
const LIKELIHOODS: RiskLikelihood[] = ['rare', 'unlikely', 'possible', 'likely', 'almost-certain'];
const STATUSES: RiskStatus[] = ['open', 'mitigating', 'accepted', 'closed'];

const severityLabel: Record<RiskSeverity, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  critical: 'Critical',
};

const likelihoodLabel: Record<RiskLikelihood, string> = {
  rare: 'Rare',
  unlikely: 'Unlikely',
  possible: 'Possible',
  likely: 'Likely',
  'almost-certain': 'Almost Certain',
};

const statusLabel: Record<RiskStatus, string> = {
  open: 'Open',
  mitigating: 'Mitigating',
  accepted: 'Accepted',
  closed: 'Closed',
};

const statusVariant: Record<RiskStatus, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  open: 'destructive',
  mitigating: 'default',
  accepted: 'secondary',
  closed: 'outline',
};

// ─── Heatmap cell color ───────────────────────────────────────────────────────
// Risk level = severity index (0-3) × likelihood index (0-4) → 0–12

function heatmapColor(sevIdx: number, likeIdx: number): string {
  const level = sevIdx * LIKELIHOODS.length + likeIdx;
  const max = (SEVERITIES.length - 1) * LIKELIHOODS.length + (LIKELIHOODS.length - 1); // 3*5+4 = 19
  const pct = level / max;
  if (pct < 0.25) return 'bg-green-100 text-green-900 hover:bg-green-200 border-green-200';
  if (pct < 0.5) return 'bg-yellow-100 text-yellow-900 hover:bg-yellow-200 border-yellow-200';
  if (pct < 0.75) return 'bg-orange-100 text-orange-900 hover:bg-orange-200 border-orange-200';
  return 'bg-red-100 text-red-900 hover:bg-red-200 border-red-200';
}

// ─── Risk Heatmap ─────────────────────────────────────────────────────────────

interface HeatmapProps {
  risks: Risk[];
  selectedCell: { severity: RiskSeverity; likelihood: RiskLikelihood } | null;
  onCellClick: (severity: RiskSeverity, likelihood: RiskLikelihood) => void;
}

function RiskHeatmap({ risks, selectedCell, onCellClick }: HeatmapProps) {
  // Build counts per cell
  const counts = useMemo(() => {
    const map: Record<string, number> = {};
    for (const r of risks) {
      const key = `${r.severity}:${r.likelihood}`;
      map[key] = (map[key] ?? 0) + 1;
    }
    return map;
  }, [risks]);

  return (
    <div className="space-y-2">
      {/* Y-axis label */}
      <div className="flex items-start gap-3">
        <div
          className="text-xs font-medium text-muted-foreground [writing-mode:vertical-rl] [text-orientation:mixed] rotate-180 self-center leading-none shrink-0 hidden sm:block"
          aria-hidden="true"
        >
          Severity
        </div>

        <div className="flex-1 overflow-x-auto">
          {/* Header row — likelihood labels */}
          <div
            className="grid mb-1"
            style={{ gridTemplateColumns: `minmax(70px,90px) repeat(${LIKELIHOODS.length}, 1fr)` }}
          >
            <div /> {/* empty corner */}
            {LIKELIHOODS.map((lh) => (
              <div
                key={lh}
                className="text-center text-[10px] font-medium text-muted-foreground pb-1 leading-tight"
                aria-hidden="true"
              >
                {likelihoodLabel[lh]}
              </div>
            ))}
          </div>

          {/* Rows — severity top=critical → low */}
          {[...SEVERITIES].reverse().map((sev) => {
            const sevIdx = SEVERITIES.indexOf(sev);
            return (
              <div
                key={sev}
                className="grid mb-1"
                style={{ gridTemplateColumns: `minmax(70px,90px) repeat(${LIKELIHOODS.length}, 1fr)` }}
              >
                {/* Row label */}
                <div className="flex items-center pr-2">
                  <span className="text-xs font-medium text-muted-foreground" aria-hidden="true">
                    {severityLabel[sev]}
                  </span>
                </div>
                {LIKELIHOODS.map((lh, likeIdx) => {
                  const key = `${sev}:${lh}`;
                  const count = counts[key] ?? 0;
                  const isSelected =
                    selectedCell?.severity === sev && selectedCell?.likelihood === lh;
                  const colorClasses = heatmapColor(sevIdx, likeIdx);
                  return (
                    <button
                      key={lh}
                      className={cn(
                        'relative mx-0.5 rounded border transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
                        'aspect-square flex items-center justify-center text-sm font-semibold',
                        'min-h-[36px] sm:min-h-[44px]',
                        colorClasses,
                        isSelected && 'ring-2 ring-offset-1 ring-primary scale-105 shadow-md z-10'
                      )}
                      aria-label={`${severityLabel[sev]} severity, ${likelihoodLabel[lh]} likelihood: ${count} risk${count !== 1 ? 's' : ''}${isSelected ? ', active filter' : ''}`}
                      aria-pressed={isSelected}
                      onClick={() => onCellClick(sev, lh)}
                    >
                      {count > 0 ? count : <span className="text-xs opacity-30">—</span>}
                    </button>
                  );
                })}
              </div>
            );
          })}

          {/* X-axis label */}
          <div
            className="text-center text-xs font-medium text-muted-foreground mt-1"
            aria-hidden="true"
          >
            Likelihood →
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground flex-wrap">
        <span className="font-medium">Risk level:</span>
        {[
          { label: 'Low', className: 'bg-green-100 border-green-200' },
          { label: 'Moderate', className: 'bg-yellow-100 border-yellow-200' },
          { label: 'High', className: 'bg-orange-100 border-orange-200' },
          { label: 'Critical', className: 'bg-red-100 border-red-200' },
        ].map((l) => (
          <span key={l.label} className="flex items-center gap-1">
            <span className={cn('inline-block h-3.5 w-3.5 rounded border', l.className)} aria-hidden="true" />
            {l.label}
          </span>
        ))}
      </div>
    </div>
  );
}

// ─── Detail Sheet ─────────────────────────────────────────────────────────────

interface DetailSheetProps {
  risk: Risk | null;
  onClose: () => void;
}

function RiskDetailSheet({ risk, onClose }: DetailSheetProps) {
  return (
    <Sheet open={risk !== null} onOpenChange={(open) => { if (!open) onClose(); }}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        {risk && (
          <>
            <SheetHeader className="mb-4">
              <SheetTitle>{risk.title}</SheetTitle>
              <SheetDescription>{risk.category}</SheetDescription>
            </SheetHeader>

            <div className="space-y-5">
              {/* Badges */}
              <div className="flex flex-wrap gap-2">
                <RiskSeverityBadge severity={risk.severity} />
                <Badge variant={statusVariant[risk.status]} className="text-xs capitalize">
                  {statusLabel[risk.status]}
                </Badge>
                <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold text-muted-foreground">
                  Likelihood: {likelihoodLabel[risk.likelihood]}
                </span>
              </div>

              {/* Owner */}
              <div>
                <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                  Owner
                </div>
                <div className="text-sm">{risk.owner}</div>
              </div>

              {/* Description */}
              <div>
                <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                  Description
                </div>
                <p className="text-sm leading-relaxed">{risk.description}</p>
              </div>

              {/* Mitigation */}
              <div>
                <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                  Mitigation plan
                </div>
                <p className="text-sm leading-relaxed text-foreground">{risk.mitigation}</p>
              </div>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

type SortField = 'title' | 'severity' | 'likelihood' | 'status' | 'owner';

export function RiskPage() {
  const { risk } = useServices();
  const { activeTenantId } = useSessionStore();

  const [data, setData] = useState<Risk[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortField, setSortField] = useState<SortField>('severity');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [selected, setSelected] = useState<Risk | null>(null);
  const [heatmapCell, setHeatmapCell] = useState<{
    severity: RiskSeverity;
    likelihood: RiskLikelihood;
  } | null>(null);

  useEffect(() => {
    setLoading(true);
    risk
      .list(activeTenantId, { pageSize: 200 })
      .then((r) => setData(r.data))
      .finally(() => setLoading(false));
  }, [activeTenantId, risk]);

  // Derived stats
  const openCount = data.filter((r) => r.status === 'open').length;
  const criticalCount = data.filter((r) => r.severity === 'critical').length;
  const mitigatingCount = data.filter((r) => r.status === 'mitigating').length;
  const closedCount = data.filter((r) => r.status === 'closed' || r.status === 'accepted').length;

  const handleSort = useCallback(
    (field: SortField) => {
      if (field === sortField) {
        setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
      } else {
        setSortField(field);
        setSortDir('desc');
      }
    },
    [sortField]
  );

  const handleCellClick = useCallback(
    (severity: RiskSeverity, likelihood: RiskLikelihood) => {
      setHeatmapCell((prev) =>
        prev?.severity === severity && prev?.likelihood === likelihood
          ? null
          : { severity, likelihood }
      );
    },
    []
  );

  const filtered = useMemo(() => {
    // Severity / likelihood order for sorting (kept inside the memo so they don't
    // recreate a new object reference on every render).
    const sevOrder: Record<RiskSeverity, number> = { low: 0, medium: 1, high: 2, critical: 3 };
    const likeOrder: Record<RiskLikelihood, number> = {
      rare: 0,
      unlikely: 1,
      possible: 2,
      likely: 3,
      'almost-certain': 4,
    };

    let rows = data;

    // Heatmap cell filter takes priority over severity dropdown
    if (heatmapCell) {
      rows = rows.filter(
        (r) => r.severity === heatmapCell.severity && r.likelihood === heatmapCell.likelihood
      );
    } else {
      if (severityFilter !== 'all') rows = rows.filter((r) => r.severity === severityFilter);
    }

    if (statusFilter !== 'all') rows = rows.filter((r) => r.status === statusFilter);

    if (search.trim()) {
      const q = search.toLowerCase();
      rows = rows.filter(
        (r) =>
          r.title.toLowerCase().includes(q) ||
          r.description.toLowerCase().includes(q) ||
          r.owner.toLowerCase().includes(q) ||
          r.category.toLowerCase().includes(q)
      );
    }

    return [...rows].sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case 'title':
          cmp = a.title.localeCompare(b.title);
          break;
        case 'severity':
          cmp = sevOrder[a.severity] - sevOrder[b.severity];
          break;
        case 'likelihood':
          cmp = likeOrder[a.likelihood] - likeOrder[b.likelihood];
          break;
        case 'status':
          cmp = a.status.localeCompare(b.status);
          break;
        case 'owner':
          cmp = a.owner.localeCompare(b.owner);
          break;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [data, heatmapCell, severityFilter, statusFilter, search, sortField, sortDir]);

  function SortableHead({ field, children }: { field: SortField; children: React.ReactNode }) {
    return (
      <TableHead
        className="cursor-pointer select-none"
        onClick={() => handleSort(field)}
        aria-sort={
          sortField === field ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'
        }
      >
        <div className="flex items-center gap-1">
          {children}
          <ArrowUpDown
            className={cn(
              'h-3 w-3',
              sortField === field ? 'text-foreground' : 'text-muted-foreground/40'
            )}
            aria-hidden="true"
          />
        </div>
      </TableHead>
    );
  }

  const hasActiveFilters =
    severityFilter !== 'all' || statusFilter !== 'all' || search.trim() !== '' || heatmapCell !== null;

  return (
    <div>
      <PageHeader title="Risk register" subtitle="Track and manage IT and security risks" />

      {loading ? (
        <div className="space-y-6">
          <TableSkeleton rows={3} cols={4} />
          <TableSkeleton rows={5} cols={6} />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Stat cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <StatCard
              title="Open risks"
              value={openCount}
              icon={<ShieldAlert className="h-4 w-4" />}
              subtitle="Require attention"
            />
            <StatCard
              title="Critical"
              value={criticalCount}
              icon={<AlertTriangle className="h-4 w-4 text-red-500" />}
              subtitle="Highest severity"
            />
            <StatCard
              title="Mitigating"
              value={mitigatingCount}
              icon={<ShieldAlert className="h-4 w-4 text-blue-500" />}
              subtitle="In progress"
            />
            <StatCard
              title="Resolved"
              value={closedCount}
              icon={<CheckCircle2 className="h-4 w-4 text-green-500" />}
              subtitle="Closed or accepted"
            />
          </div>

          {/* Heatmap */}
          {data.length > 0 && (
            <div className="rounded-lg border bg-card p-4 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-sm font-semibold">Severity × Likelihood matrix</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Click a cell to filter the table below
                  </p>
                </div>
                {heatmapCell && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 text-xs gap-1"
                    onClick={() => setHeatmapCell(null)}
                    aria-label="Clear heatmap filter"
                  >
                    <X className="h-3.5 w-3.5" />
                    Clear filter
                  </Button>
                )}
              </div>
              <RiskHeatmap
                risks={data}
                selectedCell={heatmapCell}
                onCellClick={handleCellClick}
              />
              {heatmapCell && (
                <p className="mt-3 text-xs text-muted-foreground">
                  Showing risks with{' '}
                  <strong>{severityLabel[heatmapCell.severity]}</strong> severity ×{' '}
                  <strong>{likelihoodLabel[heatmapCell.likelihood]}</strong> likelihood (
                  {filtered.length} risk{filtered.length !== 1 ? 's' : ''})
                </p>
              )}
            </div>
          )}

          {/* Filters & search */}
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1 max-w-sm">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"
                aria-hidden="true"
              />
              <Input
                className="pl-9"
                placeholder="Search risks..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                aria-label="Search risks"
              />
            </div>
            <Select value={severityFilter} onValueChange={setSeverityFilter} disabled={heatmapCell !== null}>
              <SelectTrigger className="w-[140px]" aria-label="Filter by severity">
                <SelectValue placeholder="Severity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All severities</SelectItem>
                {SEVERITIES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {severityLabel[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px]" aria-label="Filter by status">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                {STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {statusLabel[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                className="gap-1 self-start sm:self-auto"
                onClick={() => {
                  setSearch('');
                  setSeverityFilter('all');
                  setStatusFilter('all');
                  setHeatmapCell(null);
                }}
                aria-label="Clear all filters"
              >
                <X className="h-3.5 w-3.5" />
                Clear
              </Button>
            )}
          </div>

          {/* Table */}
          {filtered.length === 0 ? (
            <EmptyState
              icon={<ShieldAlert className="h-10 w-10" />}
              title="No risks found"
              description={
                hasActiveFilters
                  ? 'No risks match the current filters. Try adjusting your search or filters.'
                  : 'No risks have been logged yet.'
              }
              action={
                hasActiveFilters ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSearch('');
                      setSeverityFilter('all');
                      setStatusFilter('all');
                      setHeatmapCell(null);
                    }}
                  >
                    Clear filters
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <SortableHead field="title">Risk</SortableHead>
                    <TableHead>Category</TableHead>
                    <SortableHead field="severity">Severity</SortableHead>
                    <SortableHead field="likelihood">Likelihood</SortableHead>
                    <SortableHead field="status">Status</SortableHead>
                    <SortableHead field="owner">Owner</SortableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((r) => (
                    <TableRow
                      key={r.id}
                      className="cursor-pointer focus-within:bg-muted/50"
                      role="button"
                      tabIndex={0}
                      aria-label={`View details for: ${r.title}`}
                      onClick={() => setSelected(r)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          setSelected(r);
                        }
                      }}
                    >
                      <TableCell>
                        <div className="font-medium text-sm">{r.title}</div>
                        <div className="text-xs text-muted-foreground line-clamp-1 max-w-xs">
                          {r.description}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                        {r.category}
                      </TableCell>
                      <TableCell>
                        <RiskSeverityBadge severity={r.severity} />
                      </TableCell>
                      <TableCell className="text-sm capitalize text-muted-foreground whitespace-nowrap">
                        {likelihoodLabel[r.likelihood]}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={statusVariant[r.status]}
                          className="text-xs capitalize whitespace-nowrap"
                        >
                          {statusLabel[r.status]}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                        {r.owner}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      )}

      <RiskDetailSheet risk={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
