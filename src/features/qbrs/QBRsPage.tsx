import { useEffect, useState, useCallback } from 'react';
import { useServices } from '@/services/context';
import { useSessionStore } from '@/store/session';
import type { QBR, QBRActionItem } from '@/services/types';
import { PageHeader } from '@/components/common/PageHeader';
import { CardSkeleton } from '@/components/common/CardSkeleton';
import { EmptyState } from '@/components/common/EmptyState';
import { RoleGate } from '@/components/common/RoleGate';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import {
  PresentationIcon,
  TrendingUp,
  TrendingDown,
  Minus,
  ExternalLink,
  Calendar,
  CheckSquare,
} from 'lucide-react';
import { formatDate } from '@/lib/format';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// ─── QBR status badge ─────────────────────────────────────────────────────────

function QBRStatusBadge({ status }: { status: QBR['status'] }) {
  if (status === 'completed') {
    return (
      <Badge variant="success" className="text-xs">
        Completed
      </Badge>
    );
  }
  return (
    <Badge variant="secondary" className="text-xs">
      Upcoming
    </Badge>
  );
}

// ─── Trend icon ───────────────────────────────────────────────────────────────

function TrendIcon({ trend }: { trend?: 'up' | 'down' | 'flat' }) {
  if (trend === 'up') return <TrendingUp className="h-3.5 w-3.5 text-green-600" aria-label="Trending up" />;
  if (trend === 'down') return <TrendingDown className="h-3.5 w-3.5 text-red-500" aria-label="Trending down" />;
  return <Minus className="h-3.5 w-3.5 text-muted-foreground" aria-label="Stable" />;
}

// ─── Action items checklist ───────────────────────────────────────────────────

interface ActionChecklistProps {
  items: QBRActionItem[];
  localDone: Set<string>;
  onToggle: (id: string) => void;
}

function ActionChecklist({ items, localDone, onToggle }: ActionChecklistProps) {
  if (items.length === 0) {
    return (
      <p className="text-sm text-muted-foreground italic">No action items recorded.</p>
    );
  }

  const completedCount = items.filter((i) => localDone.has(i.id)).length;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-muted-foreground">
          {completedCount} of {items.length} completed
        </span>
      </div>
      {items.map((item) => {
        const done = localDone.has(item.id);
        return (
          <div key={item.id} className="flex items-start gap-3 py-1.5">
            <Checkbox
              id={`action-${item.id}`}
              checked={done}
              onCheckedChange={() => onToggle(item.id)}
              className="mt-0.5 shrink-0"
              aria-label={`Mark "${item.text}" as ${done ? 'incomplete' : 'complete'}`}
            />
            <Label
              htmlFor={`action-${item.id}`}
              className={cn(
                'text-sm leading-snug cursor-pointer flex-1',
                done && 'line-through text-muted-foreground'
              )}
            >
              <span>{item.text}</span>
              {item.owner && (
                <span className="ml-1 text-xs text-muted-foreground not-italic">
                  — {item.owner}
                </span>
              )}
            </Label>
          </div>
        );
      })}
    </div>
  );
}

// ─── QBR Detail Sheet ─────────────────────────────────────────────────────────

interface QBRDetailSheetProps {
  qbr: QBR | null;
  localDone: Map<string, Set<string>>; // qbrId → set of done item IDs
  onToggleAction: (qbrId: string, itemId: string) => void;
  onClose: () => void;
}

function QBRDetailSheet({ qbr, localDone, onToggleAction, onClose }: QBRDetailSheetProps) {
  const doneset = qbr ? (localDone.get(qbr.id) ?? new Set<string>()) : new Set<string>();

  return (
    <Sheet open={qbr !== null} onOpenChange={(open) => { if (!open) onClose(); }}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        {qbr && (
          <>
            <SheetHeader className="mb-1">
              <SheetTitle className="flex items-center gap-2">
                {qbr.quarter} QBR
                <QBRStatusBadge status={qbr.status} />
              </SheetTitle>
              <SheetDescription className="flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" aria-hidden="true" />
                {formatDate(qbr.date)}
              </SheetDescription>
            </SheetHeader>

            {/* Summary */}
            <p className="text-sm text-muted-foreground leading-relaxed mb-5 mt-3">{qbr.summary}</p>

            <Separator className="mb-5" />

            {/* Metrics */}
            {qbr.metrics.length > 0 && (
              <section aria-labelledby={`metrics-${qbr.id}`} className="mb-6">
                <h3
                  id={`metrics-${qbr.id}`}
                  className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3"
                >
                  Key metrics
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {qbr.metrics.map((m) => (
                    <div
                      key={m.label}
                      className="rounded-lg border bg-muted/40 p-3"
                      aria-label={`${m.label}: ${m.value}${m.trend ? `, trending ${m.trend}` : ''}`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-muted-foreground leading-tight">{m.label}</span>
                        <TrendIcon trend={m.trend} />
                      </div>
                      <div className="text-lg font-semibold">{m.value}</div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            <Separator className="mb-5" />

            {/* Action items */}
            <section aria-labelledby={`actions-${qbr.id}`} className="mb-6">
              <h3
                id={`actions-${qbr.id}`}
                className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-1.5"
              >
                <CheckSquare className="h-3.5 w-3.5" aria-hidden="true" />
                Action items
              </h3>
              <ActionChecklist
                items={qbr.actionItems}
                localDone={doneset}
                onToggle={(itemId) => onToggleAction(qbr.id, itemId)}
              />
            </section>

            <Separator className="mb-5" />

            {/* Deck link */}
            <div>
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                Review deck
              </h3>
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                disabled={!qbr.deckUrl || qbr.deckUrl === '#'}
                onClick={() => {
                  if (qbr.deckUrl && qbr.deckUrl !== '#') {
                    window.open(qbr.deckUrl, '_blank', 'noopener noreferrer');
                  } else {
                    toast.info('Deck not yet available', {
                      description: 'The review deck will be linked once the QBR is finalized.',
                    });
                  }
                }}
                aria-label={
                  qbr.deckUrl && qbr.deckUrl !== '#'
                    ? 'Open review deck in new tab'
                    : 'Deck not yet available'
                }
              >
                <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                View deck
              </Button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

// ─── QBR card ─────────────────────────────────────────────────────────────────

interface QBRCardProps {
  qbr: QBR;
  onClick: (qbr: QBR) => void;
}

function QBRCard({ qbr, onClick }: QBRCardProps) {
  return (
    <Card
      className="cursor-pointer hover:shadow-md transition-shadow focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      role="button"
      tabIndex={0}
      aria-label={`${qbr.quarter} QBR — ${qbr.status === 'completed' ? 'Completed' : 'Upcoming'}`}
      onClick={() => onClick(qbr)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick(qbr);
        }
      }}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-base">{qbr.quarter} QBR</CardTitle>
          <QBRStatusBadge status={qbr.status} />
        </div>
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <Calendar className="h-3.5 w-3.5" aria-hidden="true" />
          {formatDate(qbr.date)}
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{qbr.summary}</p>
        {qbr.metrics.length > 0 && (
          <div className="grid grid-cols-2 gap-2">
            {qbr.metrics.slice(0, 4).map((m) => (
              <div key={m.label} className="rounded-md bg-muted/50 px-2 py-1.5">
                <div className="text-[10px] text-muted-foreground leading-tight">{m.label}</div>
                <div className="text-sm font-semibold flex items-center gap-1">
                  {m.value}
                  <TrendIcon trend={m.trend} />
                </div>
              </div>
            ))}
          </div>
        )}
        {qbr.actionItems.length > 0 && (
          <div className="mt-3 text-xs text-muted-foreground">
            {qbr.actionItems.filter((i) => i.done).length} / {qbr.actionItems.length} action items complete
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── QBRs content ─────────────────────────────────────────────────────────────

function QBRsContent() {
  const { qbr } = useServices();
  const { activeTenantId } = useSessionStore();
  const [data, setData] = useState<QBR[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<QBR | null>(null);
  // Map of qbrId -> Set of locally toggled action item IDs
  const [localDone, setLocalDone] = useState<Map<string, Set<string>>>(new Map());

  useEffect(() => {
    setLoading(true);
    qbr
      .list(activeTenantId, { pageSize: 20 })
      .then((r) => {
        setData(r.data);
        // Seed localDone from initial done state
        const initial = new Map<string, Set<string>>();
        r.data.forEach((q) => {
          const done = new Set(q.actionItems.filter((a) => a.done).map((a) => a.id));
          initial.set(q.id, done);
        });
        setLocalDone(initial);
      })
      .finally(() => setLoading(false));
  }, [activeTenantId, qbr]);

  const handleToggleAction = useCallback((qbrId: string, itemId: string) => {
    setLocalDone((prev) => {
      const next = new Map(prev);
      const set = new Set(next.get(qbrId) ?? []);
      if (set.has(itemId)) {
        set.delete(itemId);
      } else {
        set.add(itemId);
      }
      next.set(qbrId, set);
      return next;
    });
  }, []);

  const upcoming = data.filter((q) => q.status === 'upcoming');
  const completed = data.filter((q) => q.status === 'completed');

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <CardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <EmptyState
        icon={<PresentationIcon className="h-10 w-10" />}
        title="No QBRs yet"
        description="Quarterly Business Reviews will appear here once scheduled."
      />
    );
  }

  return (
    <>
      <Tabs defaultValue={upcoming.length > 0 ? 'upcoming' : 'completed'} className="space-y-4">
        <TabsList aria-label="QBR sections">
          <TabsTrigger value="upcoming">
            Upcoming
            {upcoming.length > 0 && (
              <span className="ml-1.5 rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                {upcoming.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="completed">
            Completed
            {completed.length > 0 && (
              <span className="ml-1.5 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">
                {completed.length}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="upcoming">
          {upcoming.length === 0 ? (
            <EmptyState
              icon={<Calendar className="h-8 w-8" />}
              title="No upcoming reviews"
              description="All scheduled QBRs will appear here."
            />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {upcoming.map((q) => (
                <QBRCard key={q.id} qbr={q} onClick={setSelected} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="completed">
          {completed.length === 0 ? (
            <EmptyState
              icon={<PresentationIcon className="h-8 w-8" />}
              title="No completed reviews yet"
              description="Past QBRs will appear here once finalized."
            />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {completed.map((q) => (
                <QBRCard key={q.id} qbr={q} onClick={setSelected} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <QBRDetailSheet
        qbr={selected}
        localDone={localDone}
        onToggleAction={handleToggleAction}
        onClose={() => setSelected(null)}
      />
    </>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export function QBRsPage() {
  return (
    <div>
      <PageHeader title="QBRs" subtitle="Quarterly Business Reviews — admin only" />
      <RoleGate allow={['client-admin']}>
        <QBRsContent />
      </RoleGate>
    </div>
  );
}
