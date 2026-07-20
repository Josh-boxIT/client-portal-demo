import { useEffect, useState } from 'react';
import { useServices } from '@/services/context';
import { useSessionStore } from '@/store/session';
import type { RoadmapItem, RoadmapStatus } from '@/services/types';
import { PageHeader } from '@/components/common/PageHeader';
import { CardSkeleton } from '@/components/common/CardSkeleton';
import { EmptyState } from '@/components/common/EmptyState';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
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
import { Map, LayoutGrid, Columns } from 'lucide-react';
import { cn } from '@/lib/utils';

// ─── Status config ─────────────────────────────────────────────────────────────

const statusConfig: Record<
  RoadmapStatus,
  { label: string; className: string; badgeVariant: 'default' | 'secondary' | 'outline' | 'warning' | 'info' | 'success' | 'destructive' }
> = {
  planned: { label: 'Planned', className: 'bg-gray-100 text-gray-700 border-gray-200', badgeVariant: 'secondary' },
  'in-progress': { label: 'In Progress', className: 'bg-blue-100 text-blue-800 border-blue-200', badgeVariant: 'info' },
  done: { label: 'Done', className: 'bg-green-100 text-green-800 border-green-200', badgeVariant: 'success' },
  blocked: { label: 'Blocked', className: 'bg-red-100 text-red-800 border-red-200', badgeVariant: 'destructive' },
};

const ALL_STATUSES: RoadmapStatus[] = ['planned', 'in-progress', 'done', 'blocked'];

// ─── RoadmapCard ──────────────────────────────────────────────────────────────

interface RoadmapCardProps {
  item: RoadmapItem;
  onClick: (item: RoadmapItem) => void;
}

function RoadmapCard({ item, onClick }: RoadmapCardProps) {
  const cfg = statusConfig[item.status];
  return (
    <Card
      className="cursor-pointer hover:shadow-md transition-shadow focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      role="button"
      tabIndex={0}
      aria-label={`${item.title}, ${cfg.label}, ${item.progress}% complete`}
      onClick={() => onClick(item)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick(item);
        }
      }}
    >
      <CardContent className="p-4">
        {/* Header row */}
        <div className="flex items-start justify-between gap-2 mb-1">
          <div className="font-medium text-sm leading-snug">{item.title}</div>
          <span
            className={cn(
              'inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold shrink-0',
              cfg.className
            )}
          >
            {cfg.label}
          </span>
        </div>
        {/* Owner */}
        <div className="text-xs text-muted-foreground mb-3 line-clamp-1">{item.owner}</div>
        {/* Progress */}
        <div className="flex items-center gap-2 mb-2">
          <Progress value={item.progress} className="h-1.5 flex-1" aria-label={`Progress: ${item.progress}%`} />
          <span className="text-xs text-muted-foreground shrink-0 tabular-nums">{item.progress}%</span>
        </div>
        {/* Category chip */}
        <Badge variant="outline" className="text-xs">
          {item.category}
        </Badge>
      </CardContent>
    </Card>
  );
}

// ─── Detail Sheet ─────────────────────────────────────────────────────────────

interface DetailSheetProps {
  item: RoadmapItem | null;
  onClose: () => void;
}

function DetailSheet({ item, onClose }: DetailSheetProps) {
  const cfg = item ? statusConfig[item.status] : null;
  return (
    <Sheet open={item !== null} onOpenChange={(open) => { if (!open) onClose(); }}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        {item && cfg && (
          <>
            <SheetHeader className="mb-4">
              <SheetTitle>{item.title}</SheetTitle>
              <SheetDescription>{item.quarter}</SheetDescription>
            </SheetHeader>

            <div className="space-y-4">
              {/* Status + category */}
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className={cn(
                    'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold',
                    cfg.className
                  )}
                >
                  {cfg.label}
                </span>
                <Badge variant="outline" className="text-xs">
                  {item.category}
                </Badge>
              </div>

              {/* Progress */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm font-medium">Progress</span>
                  <span className="text-sm text-muted-foreground">{item.progress}%</span>
                </div>
                <Progress value={item.progress} className="h-2" />
              </div>

              {/* Owner */}
              <div>
                <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                  Owner
                </div>
                <div className="text-sm">{item.owner}</div>
              </div>

              {/* Description */}
              <div>
                <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                  Description
                </div>
                <p className="text-sm leading-relaxed text-foreground">{item.description}</p>
              </div>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

// ─── Quarter grouped view ─────────────────────────────────────────────────────

function QuarterView({
  items,
  onSelect,
}: {
  items: RoadmapItem[];
  onSelect: (item: RoadmapItem) => void;
}) {
  const byQuarter = items.reduce<Record<string, RoadmapItem[]>>((acc, item) => {
    const q = item.quarter;
    if (!acc[q]) acc[q] = [];
    acc[q].push(item);
    return acc;
  }, {});

  const sortedQuarters = Object.keys(byQuarter).sort((a, b) => a.localeCompare(b));

  return (
    <div className="space-y-8">
      {sortedQuarters.map((quarter) => (
        <section key={quarter} aria-labelledby={`quarter-${quarter}`}>
          <h2
            id={`quarter-${quarter}`}
            className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-2"
          >
            <span className="h-px flex-1 bg-border" aria-hidden="true" />
            {quarter}
            <span className="h-px flex-1 bg-border" aria-hidden="true" />
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {byQuarter[quarter].map((item) => (
              <RoadmapCard key={item.id} item={item} onClick={onSelect} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

// ─── Status kanban view ───────────────────────────────────────────────────────

function StatusView({
  items,
  onSelect,
}: {
  items: RoadmapItem[];
  onSelect: (item: RoadmapItem) => void;
}) {
  const byStatus = ALL_STATUSES.reduce<Record<RoadmapStatus, RoadmapItem[]>>((acc, s) => {
    acc[s] = items.filter((i) => i.status === s);
    return acc;
  }, {} as Record<RoadmapStatus, RoadmapItem[]>);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      {ALL_STATUSES.map((status) => {
        const cfg = statusConfig[status];
        const col = byStatus[status];
        return (
          <div key={status} className="space-y-2">
            <div className="flex items-center gap-2 mb-2">
              <span
                className={cn(
                  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold',
                  cfg.className
                )}
              >
                {cfg.label}
              </span>
              <span className="text-xs text-muted-foreground">{col.length}</span>
            </div>
            <div className="space-y-2 min-h-[4rem]">
              {col.length === 0 ? (
                <div className="rounded-md border border-dashed p-4 text-center text-xs text-muted-foreground">
                  No items
                </div>
              ) : (
                col.map((item) => (
                  <RoadmapCard key={item.id} item={item} onClick={onSelect} />
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export function RoadmapsPage() {
  const { roadmap } = useServices();
  const { activeTenantId } = useSessionStore();

  const [data, setData] = useState<RoadmapItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'quarter' | 'status'>('quarter');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [selected, setSelected] = useState<RoadmapItem | null>(null);

  useEffect(() => {
    setLoading(true);
    roadmap
      .list(activeTenantId, { pageSize: 100 })
      .then((r) => setData(r.data))
      .finally(() => setLoading(false));
  }, [activeTenantId, roadmap]);

  // Derived filter options
  const categories = Array.from(new Set(data.map((d) => d.category))).sort();

  const filtered = data.filter((item) => {
    if (statusFilter !== 'all' && item.status !== statusFilter) return false;
    if (categoryFilter !== 'all' && item.category !== categoryFilter) return false;
    return true;
  });

  const actions = (
    <div className="flex items-center gap-2 flex-wrap">
      {/* Status filter */}
      <Select value={statusFilter} onValueChange={setStatusFilter}>
        <SelectTrigger className="w-[130px] h-8 text-xs" aria-label="Filter by status">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All statuses</SelectItem>
          {ALL_STATUSES.map((s) => (
            <SelectItem key={s} value={s}>
              {statusConfig[s].label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Category filter */}
      {categories.length > 0 && (
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-[130px] h-8 text-xs" aria-label="Filter by category">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {/* View toggle */}
      <div className="flex items-center rounded-md border overflow-hidden" role="group" aria-label="View layout">
        <Button
          size="sm"
          variant={view === 'quarter' ? 'secondary' : 'ghost'}
          className="h-8 rounded-none px-2.5 border-0"
          onClick={() => setView('quarter')}
          aria-pressed={view === 'quarter'}
          title="By quarter"
        >
          <Columns className="h-3.5 w-3.5" />
          <span className="ml-1.5 text-xs hidden sm:inline">By quarter</span>
        </Button>
        <Button
          size="sm"
          variant={view === 'status' ? 'secondary' : 'ghost'}
          className="h-8 rounded-none px-2.5 border-0 border-l"
          onClick={() => setView('status')}
          aria-pressed={view === 'status'}
          title="By status"
        >
          <LayoutGrid className="h-3.5 w-3.5" />
          <span className="ml-1.5 text-xs hidden sm:inline">By status</span>
        </Button>
      </div>
    </div>
  );

  return (
    <div>
      <PageHeader
        title="Roadmaps"
        subtitle="IT initiatives and planned projects by quarter"
        actions={actions}
      />

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Map className="h-10 w-10" />}
          title="No roadmap items"
          description={
            statusFilter !== 'all' || categoryFilter !== 'all'
              ? 'No items match your current filters. Try adjusting them.'
              : 'No roadmap items have been added yet.'
          }
          action={
            (statusFilter !== 'all' || categoryFilter !== 'all') ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setStatusFilter('all');
                  setCategoryFilter('all');
                }}
              >
                Clear filters
              </Button>
            ) : undefined
          }
        />
      ) : view === 'quarter' ? (
        <QuarterView items={filtered} onSelect={setSelected} />
      ) : (
        <StatusView items={filtered} onSelect={setSelected} />
      )}

      <DetailSheet item={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
