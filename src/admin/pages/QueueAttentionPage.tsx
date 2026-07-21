import { useEffect, useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import {
  AlertTriangle,
  Bot,
  CheckCircle2,
  Clock3,
  Eye,
  Gauge,
  Layers3,
  ListChecks,
  Search,
} from 'lucide-react';
import { toast } from 'sonner';
import { useServices } from '@/services/context';
import { useAuthStore } from '@/store/auth';
import { useSessionStore } from '@/store/session';
import { useTenantStore } from '@/theme/tenantStore';
import type {
  BacklogIntelligenceItem,
  BacklogIntelligenceSnapshot,
  BacklogPriorityBand,
} from '@/services/types';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

type BandFilter = 'ALL' | Exclude<BacklogPriorityBand, 'NO_ACTION'>;

const BAND_LABELS: Record<Exclude<BacklogPriorityBand, 'NO_ACTION'>, string> = {
  ACT_NOW: 'Act now',
  REVIEW_TODAY: 'Review today',
  REVIEW_THIS_WEEK: 'Review this week',
  MONITOR: 'Monitor',
};

const BAND_STYLES: Record<Exclude<BacklogPriorityBand, 'NO_ACTION'>, string> = {
  ACT_NOW: 'border-red-200 bg-red-50 text-red-700',
  REVIEW_TODAY: 'border-amber-200 bg-amber-50 text-amber-700',
  REVIEW_THIS_WEEK: 'border-violet-200 bg-violet-50 text-violet-700',
  MONITOR: 'border-sky-200 bg-sky-50 text-sky-700',
};

function formatSnapshotTime(value: string): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
  }).format(new Date(value));
}

function formatHours(value: number): string {
  if (value < 2) return `${Math.round(value * 60)}m`;
  if (value >= 48) return `${Math.round(value / 24)}d`;
  return `${Math.round(value)}h`;
}

function scoreBarColor(score: number): string {
  if (score >= 80) return 'bg-red-500';
  if (score >= 50) return 'bg-amber-500';
  return 'bg-sky-500';
}

function StatCard({
  label,
  value,
  detail,
  icon,
  tone,
}: {
  label: string;
  value: number;
  detail: string;
  icon: React.ReactNode;
  tone: string;
}) {
  return (
    <div className="rounded-xl border bg-card p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">{label}</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight text-foreground">{value}</p>
        </div>
        <div className={`rounded-lg border p-2 ${tone}`}>{icon}</div>
      </div>
      <p className="mt-2 text-xs leading-5 text-muted-foreground">{detail}</p>
    </div>
  );
}

function FactorBreakdown({ item }: { item: BacklogIntelligenceItem }) {
  const factors = [
    ['Age pressure', item.factorBreakdown.agePressure],
    ['SLA proximity', item.factorBreakdown.slaProximity],
    ['Bounce count', item.factorBreakdown.bounceCount],
    ['Staleness', item.factorBreakdown.staleness],
    ['Waiting decay', item.factorBreakdown.waitingStateDecay],
    ['Missing information', item.factorBreakdown.missingInformation],
    ['Client weight', item.factorBreakdown.clientWeight],
    ...Object.entries(item.factorBreakdown.modifiers ?? {}).map(
      ([key, value]) =>
        [key.replace(/([A-Z])/g, ' $1').replace(/^./, (letter) => letter.toUpperCase()), value] as [
          string,
          number,
        ]
    ),
  ] as Array<[string, number]>;

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {factors.map(([label, value]) => (
        <div key={label} className="rounded-lg border bg-muted/40 px-3 py-2">
          <p className="text-[11px] text-muted-foreground">{label}</p>
          <p className="mt-0.5 text-sm font-semibold text-foreground">
            {value > 0 ? `+${value}` : value}
          </p>
        </div>
      ))}
    </div>
  );
}

function AttentionRow({
  item,
  onInvestigate,
}: {
  item: BacklogIntelligenceItem;
  onInvestigate: (item: BacklogIntelligenceItem) => void;
}) {
  const bundleCount = Math.max(0, item.memberTicketExternalIds.length - 1);

  return (
    <article className="rounded-xl border bg-card p-4 shadow-sm transition-colors hover:border-primary/30">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start">
        <div className="flex w-full items-center gap-3 xl:w-20 xl:flex-col xl:items-stretch">
          <div className="rounded-lg border bg-muted/40 px-3 py-2 text-center">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Attention
            </p>
            <p className="text-2xl font-semibold text-foreground">{item.riskScore}</p>
          </div>
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted xl:w-full">
            <div
              className={`h-full rounded-full ${scoreBarColor(item.riskScore)}`}
              style={{ width: `${item.riskScore}%` }}
            />
          </div>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${BAND_STYLES[item.priorityBand as Exclude<BacklogPriorityBand, 'NO_ACTION'>]}`}
            >
              {BAND_LABELS[item.priorityBand as Exclude<BacklogPriorityBand, 'NO_ACTION'>]}
            </span>
            <span className="rounded-full border border-violet-200 bg-violet-50 px-2.5 py-1 text-[11px] font-semibold text-violet-700">
              {item.clusterDisposition}
            </span>
            <span className="text-xs font-medium text-muted-foreground">
              {item.primaryTicketExternalId}
            </span>
          </div>

          <div className="mt-2 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-base font-semibold text-foreground">{item.display.title}</h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {item.display.queue} · {item.display.serviceSummary} ·{' '}
                {item.recommendedLane.replace(/_/g, ' ')}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Clock3 className="h-3.5 w-3.5" />
                Age {formatHours(item.display.ageHours)}
              </span>
              <span>
                Activity{' '}
                {item.display.hoursSinceMeaningfulActivity === null
                  ? 'unavailable'
                  : `${formatHours(item.display.hoursSinceMeaningfulActivity)} ago`}
              </span>
            </div>
          </div>

          <div className="mt-3 grid gap-2 md:grid-cols-2">
            {item.attentionReasons.slice(0, 2).map((reason) => (
              <div
                key={reason}
                className="flex gap-2 rounded-lg bg-muted/50 px-3 py-2.5 text-xs leading-5 text-foreground"
              >
                <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-primary" />
                <span>{reason}</span>
              </div>
            ))}
          </div>

          <div className="mt-3 flex flex-col gap-3 border-t pt-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Suggested human action
              </p>
              <p className="mt-1 text-xs leading-5 text-foreground">
                {item.suggestedHumanAction.summary}
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="shrink-0"
              onClick={() => onInvestigate(item)}
            >
              <Bot className="mr-2 h-4 w-4" />
              Investigate in Forge
            </Button>
          </div>

          {bundleCount > 0 && (
            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <Layers3 className="h-3.5 w-3.5" />
              <span>
                {bundleCount} bundled {bundleCount === 1 ? 'record' : 'records'}:
              </span>
              {item.memberTicketExternalIds.slice(1).map((ticketId) => (
                <span
                  key={ticketId}
                  className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground"
                >
                  {ticketId}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </article>
  );
}

export function QueueAttentionPage() {
  const identity = useAuthStore((state) => state.identity);

  if (identity?.role !== 'admin') return <Navigate to="/" replace />;

  return <AdminQueueAttentionPage />;
}

function AdminQueueAttentionPage() {
  const { backlogIntelligence } = useServices();
  const { activeTenantId, activePersonaId } = useSessionStore();
  const tenantName = useTenantStore((state) => state.getTenant(activeTenantId)?.name ?? activeTenantId);
  const [snapshot, setSnapshot] = useState<BacklogIntelligenceSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [queue, setQueue] = useState('ALL');
  const [band, setBand] = useState<BandFilter>('ALL');
  const [search, setSearch] = useState('');
  const [selectedItem, setSelectedItem] = useState<BacklogIntelligenceItem | null>(null);

  useEffect(() => {
    setLoading(true);
    setSnapshot(null);
    backlogIntelligence
      .getSnapshot({
        tenantId: activeTenantId,
        viewerAccess: 'staff',
        personaId: activePersonaId,
      })
      .then(setSnapshot)
      .catch((error) => {
        toast.error(error instanceof Error ? error.message : 'Queue Attention data is unavailable');
      })
      .finally(() => setLoading(false));
  }, [activePersonaId, activeTenantId, backlogIntelligence]);

  const filteredItems = useMemo(() => {
    if (!snapshot) return [];
    const query = search.trim().toLowerCase();
    return snapshot.items.filter((item) => {
      const matchesQueue = queue === 'ALL' || item.display.queue === queue;
      const matchesBand = band === 'ALL' || item.priorityBand === band;
      const matchesSearch =
        !query ||
        [
          item.primaryTicketExternalId,
          item.display.title,
          item.display.serviceSummary,
          item.recommendedLane,
          item.display.accountName,
          item.display.assignedResource,
          item.display.ticketStatus,
        ].some((value) => value?.toLowerCase().includes(query));
      return matchesQueue && matchesBand && matchesSearch;
    });
  }, [snapshot, queue, band, search]);

  if (loading) {
    return (
      <div className="space-y-4" aria-label="Loading Queue Attention">
        <div className="h-20 animate-pulse rounded-xl bg-muted" />
        <div className="grid grid-cols-4 gap-4">
          {[0, 1, 2, 3].map((key) => (
            <div key={key} className="h-32 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
        <div className="h-72 animate-pulse rounded-xl bg-muted" />
      </div>
    );
  }

  if (!snapshot) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-8 text-center">
        <AlertTriangle className="mx-auto h-8 w-8 text-red-600" />
        <h1 className="mt-3 text-lg font-semibold text-foreground">
          Queue Attention data is unavailable
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          The scanner snapshot could not be loaded. No queue recommendation was inferred.
        </p>
      </div>
    );
  }

  const auditPendingCount = snapshot.items.filter(
    (item) => item.display.auditVerifiedOpen === false
  ).length;

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-2xl border bg-card p-5 shadow-sm sm:p-6">
        <div className="absolute -right-24 -top-24 h-56 w-56 rounded-full bg-primary/5 blur-3xl" />
        <div className="relative flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                Backlog Intelligence
              </p>
              <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                READ ONLY
              </span>
            </div>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
              Queue Attention
            </h1>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
              {tenantName} findings from the latest read-only operational scan, ranked for human review.
            </p>
          </div>
          <div className="flex flex-col gap-2 text-xs lg:items-end">
            <div className="flex items-center gap-2 text-foreground">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              Refreshed {formatSnapshotTime(snapshot.generatedAt)}
            </div>
            <div className="flex items-center gap-2 text-amber-700">
              <AlertTriangle className="h-4 w-4" />
              Partial history coverage
            </div>
            <span className="font-mono text-[10px] text-muted-foreground">
              {snapshot.schemaVersion} · {snapshot.scoringVersion}
            </span>
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Queue summary">
        <StatCard
          label="Findings"
          value={snapshot.summary.flaggedTicketCount}
          detail="Visible in this company view"
          icon={<ListChecks className="h-5 w-5" />}
          tone="border-sky-200 bg-sky-50 text-sky-700"
        />
        <StatCard
          label="Act now"
          value={snapshot.summary.countsByPriorityBand.ACT_NOW}
          detail="Highest-priority stagnant work"
          icon={<AlertTriangle className="h-5 w-5" />}
          tone="border-red-200 bg-red-50 text-red-700"
        />
        <StatCard
          label="Review today"
          value={snapshot.summary.countsByPriorityBand.REVIEW_TODAY}
          detail="Needs same-day human review"
          icon={<ListChecks className="h-5 w-5" />}
          tone="border-amber-200 bg-amber-50 text-amber-700"
        />
        <StatCard
          label="Review this week"
          value={snapshot.summary.countsByPriorityBand.REVIEW_THIS_WEEK}
          detail="Stagnant work queued for weekly review"
          icon={<Eye className="h-5 w-5" />}
          tone="border-violet-200 bg-violet-50 text-violet-700"
        />
      </section>

      <section
        className="rounded-xl border bg-card p-4 shadow-sm"
        aria-label="Queue filters"
      >
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <label className="space-y-1.5 text-xs text-muted-foreground">
            Scope
            <select
              disabled
              className="h-9 w-full rounded-md border bg-muted px-3 text-sm text-muted-foreground disabled:opacity-100"
            >
              <option>Current company</option>
            </select>
          </label>
          <label className="space-y-1.5 text-xs text-muted-foreground">
            Account
            <select
              disabled
              className="h-9 w-full rounded-md border bg-muted px-3 text-sm text-muted-foreground disabled:opacity-100"
            >
              <option>{tenantName}</option>
            </select>
          </label>
          <label className="space-y-1.5 text-xs text-muted-foreground">
            Queue
            <select
              value={queue}
              onChange={(event) => setQueue(event.target.value)}
              className="h-9 w-full rounded-md border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="ALL">All queues</option>
              {snapshot.scope.queueIds.map((queueId) => (
                <option key={queueId} value={queueId}>
                  {queueId}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1.5 text-xs text-muted-foreground">
            Priority band
            <select
              value={band}
              onChange={(event) => setBand(event.target.value as BandFilter)}
              className="h-9 w-full rounded-md border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="ALL">All bands</option>
              <option value="ACT_NOW">Act now</option>
              <option value="REVIEW_TODAY">Review today</option>
              <option value="REVIEW_THIS_WEEK">Review this week</option>
              <option value="MONITOR">Monitor</option>
            </select>
          </label>
          <label className="space-y-1.5 text-xs text-muted-foreground">
            Search
            <span className="relative block">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Ticket or service"
                className="h-9 w-full rounded-md border bg-background pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </span>
          </label>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <section className="space-y-3" aria-labelledby="ranked-queue-heading">
          <div className="flex items-center justify-between">
            <div>
              <h2 id="ranked-queue-heading" className="text-base font-semibold text-foreground">
                Ranked operational queue
              </h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {filteredItems.length} of {snapshot.summary.displayedItemCount ?? snapshot.items.length}{' '}
                selected findings shown
              </p>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Gauge className="h-4 w-4" />
              Highest attention first
            </div>
          </div>
          {filteredItems.length > 0 ? (
            filteredItems.map((item) => (
              <AttentionRow key={item.itemId} item={item} onInvestigate={setSelectedItem} />
            ))
          ) : (
            <div className="rounded-xl border border-dashed bg-muted/30 p-10 text-center text-sm text-muted-foreground">
              No operational items match these filters.
            </div>
          )}
        </section>

        <aside className="space-y-4">
          <section className="rounded-xl border bg-card p-4 shadow-sm">
            <h2 className="text-sm font-semibold text-foreground">Queue checks</h2>
            <div className="mt-3 divide-y">
              <div className="flex items-center justify-between py-3">
                <div>
                  <p className="text-xs font-medium text-foreground">Unassigned findings</p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    No resource owner in the source scan
                  </p>
                </div>
                <span className="text-lg font-semibold text-foreground">
                  {snapshot.summary.unassignedCount ?? 0}
                </span>
              </div>
              <div className="flex items-center justify-between py-3">
                <div>
                  <p className="text-xs font-medium text-foreground">Audit verification pending</p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    Visible tickets not confirmed open in PSA
                  </p>
                </div>
                <span className="text-lg font-semibold text-foreground">
                  {auditPendingCount}
                </span>
              </div>
              <div className="flex items-center justify-between py-3">
                <div>
                  <p className="text-xs font-medium text-foreground">Bundled evidence</p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    Child tickets requiring parent verification
                  </p>
                </div>
                <span className="text-lg font-semibold text-foreground">
                  {snapshot.summary.bundledChildCount ?? 0}
                </span>
              </div>
            </div>
          </section>

          <section className="rounded-xl border bg-card p-4 shadow-sm">
            <h2 className="text-sm font-semibold text-foreground">Top patterns</h2>
            <div className="mt-3 space-y-4">
              {snapshot.topPatterns.map((pattern, index) => (
                <div key={pattern.title} className="flex gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-semibold text-primary">
                    {index + 1}
                  </span>
                  <div>
                    <p className="text-xs font-medium text-foreground">{pattern.title}</p>
                    <p className="mt-1 text-[11px] leading-4 text-muted-foreground">{pattern.summary}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </aside>
      </div>

      <section className="rounded-xl border bg-card p-4 shadow-sm">
        <div className="flex items-center gap-2">
          <ListChecks className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold text-foreground">Suggested dispatch agenda</h2>
        </div>
        <ol className="mt-3 grid gap-2 lg:grid-cols-2">
          {snapshot.suggestedDispatchAgenda.map((agendaItem) => (
            <li
              key={agendaItem.itemId}
              className="flex gap-3 rounded-lg border bg-muted/30 p-3"
            >
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-primary/10 text-xs font-semibold text-primary">
                {agendaItem.rank}
              </span>
              <p className="text-xs leading-5 text-muted-foreground">{agendaItem.summary}</p>
            </li>
          ))}
        </ol>
      </section>

      <Dialog
        open={selectedItem !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedItem(null);
        }}
      >
        <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
          {selectedItem && (
            <>
              <DialogHeader>
                <div className="flex flex-wrap items-center gap-2 pr-6">
                  <span
                    className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${BAND_STYLES[selectedItem.priorityBand as Exclude<BacklogPriorityBand, 'NO_ACTION'>]}`}
                  >
                    {
                      BAND_LABELS[
                        selectedItem.priorityBand as Exclude<BacklogPriorityBand, 'NO_ACTION'>
                      ]
                    }
                  </span>
                  <span className="font-mono text-xs text-muted-foreground">
                    {selectedItem.primaryTicketExternalId}
                  </span>
                </div>
                <DialogTitle className="pt-2">Forge investigation brief</DialogTitle>
                <DialogDescription>
                  Bounded, read-only context for “Why does this item need attention?” No ticket
                  changes are available from this view.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-5">
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      Attention score
                    </p>
                    <p className="mt-1 text-lg font-semibold text-foreground">
                      {selectedItem.riskScore}/100
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      Confidence
                    </p>
                    <p className="mt-1 text-sm font-semibold text-foreground">
                      {selectedItem.confidence}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">SLA state</p>
                    <p className="mt-1 text-sm font-semibold text-foreground">
                      {selectedItem.display.slaState}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Members</p>
                    <p className="mt-1 text-sm font-semibold text-foreground">
                      {selectedItem.memberTicketExternalIds.length}
                    </p>
                  </div>
                </div>

                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Supporting evidence
                  </h3>
                  <ul className="mt-2 space-y-2">
                    {selectedItem.attentionReasons.map((reason) => (
                      <li
                        key={reason}
                        className="rounded-lg border bg-muted/40 px-3 py-2 text-sm leading-6 text-foreground"
                      >
                        {reason}
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Score explanation
                  </h3>
                  <FactorBreakdown item={selectedItem} />
                </div>

                <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-primary">
                    Suggested human action ·{' '}
                    {selectedItem.suggestedHumanAction.actionType.replace(/_/g, ' ')}
                  </p>
                  <p className="mt-1 text-sm leading-6 text-foreground">
                    {selectedItem.suggestedHumanAction.summary}
                  </p>
                </div>

                {selectedItem.dataQualityNotes.length > 0 && (
                  <div>
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Data-quality notes
                    </h3>
                    <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                      {selectedItem.dataQualityNotes.map((note) => (
                        <li key={note}>• {note}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              <DialogFooter>
                <p className="mr-auto self-center text-[11px] text-muted-foreground">
                  Forge connection is not configured in this local demo.
                </p>
                <Button
                  variant="outline"
                  onClick={() => setSelectedItem(null)}
                >
                  Close
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
