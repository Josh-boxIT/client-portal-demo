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
  MONITOR: 'Monitor',
};

const BAND_STYLES: Record<Exclude<BacklogPriorityBand, 'NO_ACTION'>, string> = {
  ACT_NOW: 'border-rose-400/30 bg-rose-400/10 text-rose-300',
  REVIEW_TODAY: 'border-amber-400/30 bg-amber-400/10 text-amber-300',
  MONITOR: 'border-sky-400/30 bg-sky-400/10 text-sky-300',
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
  return `${Math.round(value)}h`;
}

function scoreBarColor(score: number): string {
  if (score >= 80) return 'bg-rose-400';
  if (score >= 50) return 'bg-amber-400';
  return 'bg-sky-400';
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
    <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-slate-500">{label}</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-100">{value}</p>
        </div>
        <div className={`rounded-lg border p-2 ${tone}`}>{icon}</div>
      </div>
      <p className="mt-2 text-xs leading-5 text-slate-500">{detail}</p>
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
        <div key={label} className="rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-2">
          <p className="text-[11px] text-slate-500">{label}</p>
          <p className="mt-0.5 text-sm font-semibold text-slate-200">
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
    <article className="rounded-xl border border-slate-800 bg-slate-900 p-4 transition-colors hover:border-slate-700">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start">
        <div className="flex w-full items-center gap-3 xl:w-20 xl:flex-col xl:items-stretch">
          <div className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-center">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              Risk
            </p>
            <p className="text-2xl font-semibold text-slate-100">{item.riskScore}</p>
          </div>
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-800 xl:w-full">
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
            <span className="rounded-full border border-violet-400/25 bg-violet-400/10 px-2.5 py-1 text-[11px] font-semibold text-violet-300">
              {item.clusterDisposition}
            </span>
            <span className="text-xs font-medium text-slate-500">
              {item.primaryTicketExternalId}
            </span>
          </div>

          <div className="mt-2 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-base font-semibold text-slate-100">{item.display.title}</h2>
              <p className="mt-0.5 text-xs text-slate-500">
                {item.display.queue} · {item.display.serviceSummary} ·{' '}
                {item.recommendedLane.replace(/_/g, ' ')}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-3 text-xs text-slate-400">
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
                className="flex gap-2 rounded-lg bg-slate-950/70 px-3 py-2.5 text-xs leading-5 text-slate-300"
              >
                <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-indigo-400" />
                <span>{reason}</span>
              </div>
            ))}
          </div>

          <div className="mt-3 flex flex-col gap-3 border-t border-slate-800 pt-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                Suggested human action
              </p>
              <p className="mt-1 text-xs leading-5 text-slate-300">
                {item.suggestedHumanAction.summary}
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="shrink-0 border-slate-700 bg-slate-950 text-slate-200 hover:bg-slate-800 hover:text-white"
              onClick={() => onInvestigate(item)}
            >
              <Bot className="mr-2 h-4 w-4" />
              Investigate in Forge
            </Button>
          </div>

          {bundleCount > 0 && (
            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-500">
              <Layers3 className="h-3.5 w-3.5" />
              <span>
                {bundleCount} bundled {bundleCount === 1 ? 'record' : 'records'}:
              </span>
              {item.memberTicketExternalIds.slice(1).map((ticketId) => (
                <span
                  key={ticketId}
                  className="rounded bg-slate-800 px-1.5 py-0.5 font-mono text-[10px] text-slate-400"
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
  const { backlogIntelligence } = useServices();
  const { identity } = useAuthStore();
  const isStaff = identity?.role === 'admin' || identity?.role === 'editor';
  const [snapshot, setSnapshot] = useState<BacklogIntelligenceSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [queue, setQueue] = useState('ALL');
  const [band, setBand] = useState<BandFilter>('ALL');
  const [search, setSearch] = useState('');
  const [selectedItem, setSelectedItem] = useState<BacklogIntelligenceItem | null>(null);

  useEffect(() => {
    if (!isStaff) {
      setLoading(false);
      return;
    }
    backlogIntelligence
      .getSnapshot()
      .then(setSnapshot)
      .catch((error) => {
        toast.error(error instanceof Error ? error.message : 'Queue Attention data is unavailable');
      })
      .finally(() => setLoading(false));
  }, [backlogIntelligence, isStaff]);

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
        ].some((value) => value.toLowerCase().includes(query));
      return matchesQueue && matchesBand && matchesSearch;
    });
  }, [snapshot, queue, band, search]);

  if (!isStaff) {
    return <Navigate to="/" replace />;
  }

  if (loading) {
    return (
      <div className="space-y-4" aria-label="Loading Queue Attention">
        <div className="h-20 animate-pulse rounded-xl bg-slate-900" />
        <div className="grid grid-cols-4 gap-4">
          {[0, 1, 2, 3].map((key) => (
            <div key={key} className="h-32 animate-pulse rounded-xl bg-slate-900" />
          ))}
        </div>
        <div className="h-72 animate-pulse rounded-xl bg-slate-900" />
      </div>
    );
  }

  if (!snapshot) {
    return (
      <div className="rounded-xl border border-rose-400/20 bg-rose-400/5 p-8 text-center">
        <AlertTriangle className="mx-auto h-8 w-8 text-rose-300" />
        <h1 className="mt-3 text-lg font-semibold text-slate-100">
          Queue Attention data is unavailable
        </h1>
        <p className="mt-1 text-sm text-slate-400">
          The scanner snapshot could not be loaded. No queue recommendation was inferred.
        </p>
      </div>
    );
  }

  const recurrenceClusters = snapshot.items.filter((item) => item.itemType === 'CLUSTER').length;
  const planCheckpointCount = snapshot.items.filter(
    (item) => item.plannedWorkState === 'PLAN_STALE'
  ).length;
  const waitingFollowUpCount = snapshot.items.filter((item) => item.display.followUpDueAt).length;

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 p-5 sm:p-6">
        <div className="absolute -right-24 -top-24 h-56 w-56 rounded-full bg-indigo-500/10 blur-3xl" />
        <div className="relative flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-400">
                Backlog Intelligence
              </p>
              <span className="rounded-full border border-emerald-400/25 bg-emerald-400/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-300">
                READ ONLY
              </span>
            </div>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-50">
              Queue Attention
            </h1>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-400">
              Explainable, human-approved review priorities from the latest scanner snapshot.
              Bundled alerts stay under their active parent.
            </p>
          </div>
          <div className="flex flex-col gap-2 text-xs lg:items-end">
            <div className="flex items-center gap-2 text-slate-300">
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              Refreshed {formatSnapshotTime(snapshot.generatedAt)}
            </div>
            <div className="flex items-center gap-2 text-amber-300">
              <AlertTriangle className="h-4 w-4" />
              Partial history coverage
            </div>
            <span className="font-mono text-[10px] text-slate-600">
              {snapshot.schemaVersion} · {snapshot.scoringVersion}
            </span>
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Queue summary">
        <StatCard
          label="Act now"
          value={snapshot.summary.countsByPriorityBand.ACT_NOW}
          detail="SLA-sensitive or material-impact work"
          icon={<AlertTriangle className="h-5 w-5" />}
          tone="border-rose-400/25 bg-rose-400/10 text-rose-300"
        />
        <StatCard
          label="Review today"
          value={snapshot.summary.countsByPriorityBand.REVIEW_TODAY}
          detail="Stale, weak-handoff, or recurrence review"
          icon={<ListChecks className="h-5 w-5" />}
          tone="border-amber-400/25 bg-amber-400/10 text-amber-300"
        />
        <StatCard
          label="Monitor"
          value={snapshot.summary.countsByPriorityBand.MONITOR}
          detail="Watch lane with no immediate action"
          icon={<Eye className="h-5 w-5" />}
          tone="border-sky-400/25 bg-sky-400/10 text-sky-300"
        />
        <StatCard
          label="Recurrence clusters"
          value={recurrenceClusters}
          detail={`${snapshot.summary.scannedTicketCount - snapshot.summary.eligibleTicketCount} child records collapsed into evidence`}
          icon={<Layers3 className="h-5 w-5" />}
          tone="border-violet-400/25 bg-violet-400/10 text-violet-300"
        />
      </section>

      <section
        className="rounded-xl border border-slate-800 bg-slate-900 p-4"
        aria-label="Queue filters"
      >
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <label className="space-y-1.5 text-xs text-slate-500">
            Scope
            <select
              disabled
              className="h-9 w-full rounded-md border border-slate-700 bg-slate-950 px-3 text-sm text-slate-300 disabled:opacity-100"
            >
              <option>Organization</option>
            </select>
          </label>
          <label className="space-y-1.5 text-xs text-slate-500">
            Account
            <select
              disabled
              className="h-9 w-full rounded-md border border-slate-700 bg-slate-950 px-3 text-sm text-slate-300 disabled:opacity-100"
            >
              <option>All demo accounts</option>
            </select>
          </label>
          <label className="space-y-1.5 text-xs text-slate-500">
            Queue
            <select
              value={queue}
              onChange={(event) => setQueue(event.target.value)}
              className="h-9 w-full rounded-md border border-slate-700 bg-slate-950 px-3 text-sm text-slate-200 focus:border-indigo-400 focus:outline-none"
            >
              <option value="ALL">All queues</option>
              {snapshot.scope.queueIds.map((queueId) => (
                <option key={queueId} value={queueId}>
                  {queueId}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1.5 text-xs text-slate-500">
            Priority band
            <select
              value={band}
              onChange={(event) => setBand(event.target.value as BandFilter)}
              className="h-9 w-full rounded-md border border-slate-700 bg-slate-950 px-3 text-sm text-slate-200 focus:border-indigo-400 focus:outline-none"
            >
              <option value="ALL">All bands</option>
              <option value="ACT_NOW">Act now</option>
              <option value="REVIEW_TODAY">Review today</option>
              <option value="MONITOR">Monitor</option>
            </select>
          </label>
          <label className="space-y-1.5 text-xs text-slate-500">
            Search
            <span className="relative block">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-600" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Ticket or service"
                className="h-9 w-full rounded-md border border-slate-700 bg-slate-950 pl-9 pr-3 text-sm text-slate-200 placeholder:text-slate-600 focus:border-indigo-400 focus:outline-none"
              />
            </span>
          </label>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <section className="space-y-3" aria-labelledby="ranked-queue-heading">
          <div className="flex items-center justify-between">
            <div>
              <h2 id="ranked-queue-heading" className="text-base font-semibold text-slate-100">
                Ranked operational queue
              </h2>
              <p className="mt-0.5 text-xs text-slate-500">
                {filteredItems.length} parent or standalone{' '}
                {filteredItems.length === 1 ? 'item' : 'items'} shown
              </p>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <Gauge className="h-4 w-4" />
              Highest risk first
            </div>
          </div>
          {filteredItems.length > 0 ? (
            filteredItems.map((item) => (
              <AttentionRow key={item.itemId} item={item} onInvestigate={setSelectedItem} />
            ))
          ) : (
            <div className="rounded-xl border border-dashed border-slate-700 bg-slate-900/60 p-10 text-center text-sm text-slate-500">
              No operational items match these filters.
            </div>
          )}
        </section>

        <aside className="space-y-4">
          <section className="rounded-xl border border-slate-800 bg-slate-900 p-4">
            <h2 className="text-sm font-semibold text-slate-100">Queue checks</h2>
            <div className="mt-3 divide-y divide-slate-800">
              <div className="flex items-center justify-between py-3">
                <div>
                  <p className="text-xs font-medium text-slate-300">Needs plan checkpoint</p>
                  <p className="mt-0.5 text-[11px] text-slate-500">
                    Missing or overdue proactive plans
                  </p>
                </div>
                <span className="text-lg font-semibold text-slate-200">{planCheckpointCount}</span>
              </div>
              <div className="flex items-center justify-between py-3">
                <div>
                  <p className="text-xs font-medium text-slate-300">Waiting follow-up</p>
                  <p className="mt-0.5 text-[11px] text-slate-500">
                    Customer, vendor, or internal dependency
                  </p>
                </div>
                <span className="text-lg font-semibold text-slate-200">{waitingFollowUpCount}</span>
              </div>
              <div className="flex items-center justify-between py-3">
                <div>
                  <p className="text-xs font-medium text-slate-300">Bundled evidence</p>
                  <p className="mt-0.5 text-[11px] text-slate-500">
                    Child records hidden from urgency ranking
                  </p>
                </div>
                <span className="text-lg font-semibold text-slate-200">
                  {snapshot.summary.scannedTicketCount - snapshot.summary.eligibleTicketCount}
                </span>
              </div>
            </div>
          </section>

          <section className="rounded-xl border border-slate-800 bg-slate-900 p-4">
            <h2 className="text-sm font-semibold text-slate-100">Top patterns</h2>
            <div className="mt-3 space-y-4">
              {snapshot.topPatterns.map((pattern, index) => (
                <div key={pattern.title} className="flex gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-400/10 text-[11px] font-semibold text-indigo-300">
                    {index + 1}
                  </span>
                  <div>
                    <p className="text-xs font-medium text-slate-300">{pattern.title}</p>
                    <p className="mt-1 text-[11px] leading-4 text-slate-500">{pattern.summary}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </aside>
      </div>

      <section className="rounded-xl border border-slate-800 bg-slate-900 p-4">
        <div className="flex items-center gap-2">
          <ListChecks className="h-4 w-4 text-indigo-300" />
          <h2 className="text-sm font-semibold text-slate-100">Suggested dispatch agenda</h2>
        </div>
        <ol className="mt-3 grid gap-2 lg:grid-cols-2">
          {snapshot.suggestedDispatchAgenda.map((agendaItem) => (
            <li
              key={agendaItem.itemId}
              className="flex gap-3 rounded-lg border border-slate-800 bg-slate-950/60 p-3"
            >
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-slate-800 text-xs font-semibold text-slate-300">
                {agendaItem.rank}
              </span>
              <p className="text-xs leading-5 text-slate-400">{agendaItem.summary}</p>
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
        <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto border-slate-700 bg-slate-950 text-slate-100">
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
                  <span className="font-mono text-xs text-slate-500">
                    {selectedItem.primaryTicketExternalId}
                  </span>
                </div>
                <DialogTitle className="pt-2 text-slate-100">Forge investigation brief</DialogTitle>
                <DialogDescription className="text-slate-400">
                  Bounded, read-only context for “Why does this item need attention?” No ticket
                  changes are available from this view.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-5">
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-slate-600">
                      Risk score
                    </p>
                    <p className="mt-1 text-lg font-semibold text-slate-100">
                      {selectedItem.riskScore}/100
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-slate-600">
                      Confidence
                    </p>
                    <p className="mt-1 text-sm font-semibold text-slate-200">
                      {selectedItem.confidence}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-slate-600">SLA state</p>
                    <p className="mt-1 text-sm font-semibold text-slate-200">
                      {selectedItem.display.slaState}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-slate-600">Members</p>
                    <p className="mt-1 text-sm font-semibold text-slate-200">
                      {selectedItem.memberTicketExternalIds.length}
                    </p>
                  </div>
                </div>

                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Supporting evidence
                  </h3>
                  <ul className="mt-2 space-y-2">
                    {selectedItem.attentionReasons.map((reason) => (
                      <li
                        key={reason}
                        className="rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm leading-6 text-slate-300"
                      >
                        {reason}
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Score explanation
                  </h3>
                  <FactorBreakdown item={selectedItem} />
                </div>

                <div className="rounded-lg border border-indigo-400/20 bg-indigo-400/5 p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-indigo-300">
                    Suggested human action ·{' '}
                    {selectedItem.suggestedHumanAction.actionType.replace(/_/g, ' ')}
                  </p>
                  <p className="mt-1 text-sm leading-6 text-slate-300">
                    {selectedItem.suggestedHumanAction.summary}
                  </p>
                </div>

                {selectedItem.dataQualityNotes.length > 0 && (
                  <div>
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Data-quality notes
                    </h3>
                    <ul className="mt-2 space-y-1 text-xs text-slate-400">
                      {selectedItem.dataQualityNotes.map((note) => (
                        <li key={note}>• {note}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              <DialogFooter>
                <p className="mr-auto self-center text-[11px] text-slate-600">
                  Forge connection is not configured in this local demo.
                </p>
                <Button
                  variant="outline"
                  className="border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800 hover:text-white"
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
