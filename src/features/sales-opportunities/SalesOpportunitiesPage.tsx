import { useCallback, useEffect, useMemo, useState } from 'react';
import { Navigate, Link } from 'react-router-dom';
import {
  Bot, BriefcaseBusiness, CheckCircle2, ExternalLink, FileCheck2, RefreshCw,
  Send, ShieldAlert, Ticket, Users,
} from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { useServices } from '@/services/context';
import type {
  SalesOpportunityAnalysis, SalesOpportunityContext, SalesOpportunityFinding,
} from '@/services/types';
import { getAccessibleTenants, isBoxItStaff } from '@/lib/accessibleTenants';
import { useAuthStore } from '@/store/auth';
import { useSessionStore } from '@/store/session';
import { useTenantStore } from '@/theme/tenantStore';
import { cn } from '@/lib/utils';

type ScopeMode = 'current' | 'all';

const PRIORITY_ORDER = { high: 0, medium: 1, low: 2 } as const;
const PRIORITY_STYLE = {
  high: 'border-rose-200 bg-rose-100 text-rose-800',
  medium: 'border-amber-200 bg-amber-100 text-amber-800',
  low: 'border-sky-200 bg-sky-100 text-sky-800',
};

function money(value: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);
}

function date(value: string): string {
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }).format(new Date(value));
}

function OpportunityCard({
  finding,
  tenantName,
  sending,
  onSend,
}: {
  finding: SalesOpportunityFinding;
  tenantName: string;
  sending: boolean;
  onSend: () => void;
}) {
  return (
    <Card className="h-full border-primary/15">
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-start gap-2">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-muted-foreground">{tenantName}</p>
            <CardTitle className="mt-1 text-lg leading-6">{finding.title}</CardTitle>
          </div>
          <Badge variant="outline" className={PRIORITY_STYLE[finding.priority]}>{finding.priority} priority</Badge>
        </div>
        <div className="flex flex-wrap gap-2 pt-2">
          <Badge variant="secondary">{finding.kind}</Badge>
          <Badge variant="outline">{finding.confidence}% confidence</Badge>
          <Badge variant="outline">{finding.catalogProductId ? 'Catalog-backed' : 'Agent-discovered'}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Estimated monthly value</p>
          <p className="mt-1 text-xl font-semibold">
            {finding.monthlyValueLow === null || finding.monthlyValueHigh === null
              ? 'Not configured'
              : `${money(finding.monthlyValueLow)}–${money(finding.monthlyValueHigh)}`}
          </p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Why this matters</p>
          <p className="mt-1 text-sm leading-6">{finding.rationale}</p>
        </div>
        <div className="rounded-lg border bg-muted/35 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Suggested approach</p>
          <p className="mt-1 text-sm leading-6">{finding.suggestedApproach}</p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Evidence</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {finding.evidence.map((item) => (
              <Button key={`${item.sourceType}:${item.sourceId}`} variant="outline" size="sm" asChild>
                <Link to={item.href}>{item.label}<ExternalLink className="ml-1.5 h-3 w-3" /></Link>
              </Button>
            ))}
          </div>
        </div>
        <Button className="w-full" variant={finding.sentAt ? 'outline' : 'default'} disabled={Boolean(finding.sentAt) || sending} onClick={onSend}>
          {finding.sentAt ? <CheckCircle2 className="mr-2 h-4 w-4" /> : <Send className="mr-2 h-4 w-4" />}
          {finding.sentAt ? `Sent ${date(finding.sentAt)}` : sending ? 'Sending…' : 'Send to ConnectWise'}
        </Button>
      </CardContent>
    </Card>
  );
}

export function SalesOpportunitiesPage() {
  const { salesOpportunities } = useServices();
  const { identity, accessibleClientIds } = useAuthStore();
  const { activeTenantId } = useSessionStore();
  const { tenants } = useTenantStore();
  const staff = isBoxItStaff(identity);
  const accessible = useMemo(
    () => getAccessibleTenants(identity, accessibleClientIds, tenants),
    [identity, accessibleClientIds, tenants],
  );
  const [mode, setMode] = useState<ScopeMode>('current');
  const [contexts, setContexts] = useState<Record<string, SalesOpportunityContext>>({});
  const [analyses, setAnalyses] = useState<Record<string, SalesOpportunityAnalysis | null>>({});
  const [enabled, setEnabled] = useState<Record<string, boolean>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState<Set<string>>(new Set());
  const [sending, setSending] = useState<string | null>(null);
  const [sentFinding, setSentFinding] = useState<SalesOpportunityFinding | null>(null);

  const targetIds = useMemo(
    () => mode === 'current' ? [activeTenantId] : accessible.map((tenant) => tenant.id),
    [mode, activeTenantId, accessible],
  );

  const load = useCallback(async (ids: string[]) => {
    setLoading(true);
    const results = await Promise.allSettled(ids.map(async (tenantId) => {
      const [context, latest, status] = await Promise.all([
        salesOpportunities.context(tenantId), salesOpportunities.latest(tenantId), salesOpportunities.status(tenantId),
      ]);
      return { tenantId, context, latest, status };
    }));
    const nextErrors: Record<string, string> = {};
    results.forEach((result, index) => {
      const tenantId = ids[index];
      if (result.status === 'fulfilled') {
        setContexts((current) => ({ ...current, [tenantId]: result.value.context }));
        setAnalyses((current) => ({ ...current, [tenantId]: result.value.latest }));
        setEnabled((current) => ({ ...current, [tenantId]: result.value.status.enabled }));
      } else {
        nextErrors[tenantId] = result.reason instanceof Error ? result.reason.message : 'Unable to load client data';
      }
    });
    setErrors(nextErrors);
    setLoading(false);
  }, [salesOpportunities]);

  useEffect(() => {
    if (staff && targetIds.length) void load(targetIds);
  }, [staff, targetIds, load]);

  if (!staff) return <Navigate to="/" replace />;

  async function runOne(tenantId: string) {
    setRunning((current) => new Set(current).add(tenantId));
    setErrors((current) => { const next = { ...current }; delete next[tenantId]; return next; });
    try {
      const result = await salesOpportunities.analyze(tenantId);
      setAnalyses((current) => ({ ...current, [tenantId]: result }));
    } catch (error) {
      setErrors((current) => ({ ...current, [tenantId]: error instanceof Error ? error.message : 'Analysis failed' }));
    } finally {
      setRunning((current) => { const next = new Set(current); next.delete(tenantId); return next; });
    }
  }

  async function runTargets() {
    for (let index = 0; index < targetIds.length; index += 2) {
      await Promise.allSettled(targetIds.slice(index, index + 2).map(runOne));
    }
  }

  async function handleSend(finding: SalesOpportunityFinding) {
    setSending(finding.fingerprint);
    try {
      const sent = await salesOpportunities.sendToConnectWise(finding.tenantId, finding.fingerprint);
      setAnalyses((current) => ({
        ...current,
        [finding.tenantId]: current[finding.tenantId]
          ? { ...current[finding.tenantId]!, findings: current[finding.tenantId]!.findings.map((item) => item.fingerprint === sent.fingerprint ? sent : item) }
          : null,
      }));
      setSentFinding(sent);
    } catch (error) {
      setErrors((current) => ({ ...current, [finding.tenantId]: error instanceof Error ? error.message : 'Send failed' }));
    } finally {
      setSending(null);
    }
  }

  const findings = targetIds.flatMap((tenantId) => analyses[tenantId]?.findings ?? []).sort((a, b) =>
    PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority] ||
    b.confidence - a.confidence ||
    (b.monthlyValueHigh ?? -1) - (a.monthlyValueHigh ?? -1),
  );
  const currentContext = contexts[activeTenantId];
  const anyRunning = running.size > 0;
  const allEnabled = targetIds.length > 0 && targetIds.every((id) => enabled[id]);

  return (
    <div>
      <PageHeader
        title="Sales Opportunities"
        subtitle="AI agent analysis of ConnectWise agreements, service history, and churn signals"
        actions={<Button onClick={() => void runTargets()} disabled={loading || anyRunning || !allEnabled}>
          <Bot className={cn('mr-2 h-4 w-4', anyRunning && 'animate-pulse')} />
          {anyRunning ? `Analyzing ${running.size} client${running.size === 1 ? '' : 's'}…` : mode === 'all' ? 'Analyze all clients' : 'Analyze client'}
        </Button>}
      />

      <div className="mb-6 inline-flex rounded-lg border bg-muted/40 p-1">
        <Button size="sm" variant={mode === 'current' ? 'default' : 'ghost'} onClick={() => setMode('current')}>Current client</Button>
        <Button size="sm" variant={mode === 'all' ? 'default' : 'ghost'} onClick={() => setMode('all')}>All clients</Button>
      </div>

      {!loading && !allEnabled && (
        <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          OpenAI is not configured. Saved findings remain available, but new analysis requires <code>OPENAI_API_KEY</code>.
        </div>
      )}

      {Object.entries(errors).map(([tenantId, message]) => (
        <div key={tenantId} className="mb-4 flex items-center justify-between rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
          <span><strong>{contexts[tenantId]?.tenantName ?? tenantId}:</strong> {message}</span>
          <Button variant="outline" size="sm" onClick={() => void load([tenantId])}><RefreshCw className="mr-2 h-3.5 w-3.5" />Retry</Button>
        </div>
      ))}

      {mode === 'current' && currentContext && (
        <>
          <div className="mb-6 grid gap-4 md:grid-cols-3">
            <Card><CardContent className="flex items-center gap-4 p-5"><FileCheck2 className="h-7 w-7 text-primary" /><div><p className="text-sm text-muted-foreground">ConnectWise agreement</p><p className="font-semibold">{currentContext.agreements[0]?.name ?? 'No agreement'}</p></div></CardContent></Card>
            <Card><CardContent className="flex items-center gap-4 p-5"><Ticket className="h-7 w-7 text-primary" /><div><p className="text-sm text-muted-foreground">Tickets searched</p><p className="text-2xl font-semibold">{currentContext.ticketCount}</p></div></CardContent></Card>
            <Card><CardContent className="flex items-center gap-4 p-5"><ShieldAlert className="h-7 w-7 text-primary" /><div><p className="text-sm text-muted-foreground">Churn risk</p><p className="text-2xl font-semibold">{currentContext.churn?.score ?? '—'}<span className="text-sm text-muted-foreground"> / 100</span></p></div></CardContent></Card>
          </div>

          {currentContext.agreements.map((agreement) => (
            <Card id={`agreement-${agreement.id}`} key={agreement.id} className="mb-8 scroll-mt-20">
              <CardHeader><div className="flex flex-wrap items-center gap-3"><BriefcaseBusiness className="h-5 w-5 text-primary" /><CardTitle>{agreement.name}</CardTitle><Badge>{agreement.status}</Badge><Badge variant="outline">Demo ConnectWise data</Badge></div></CardHeader>
              <CardContent className="space-y-5">
                <div className="grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
                  <div><p className="text-muted-foreground">Agreement ID</p><p className="font-medium">{agreement.externalId}</p></div>
                  <div><p className="text-muted-foreground">Term</p><p className="font-medium">{agreement.startDate} – {agreement.endDate}</p></div>
                  <div><p className="text-muted-foreground">Monthly amount</p><p className="font-medium">{money(agreement.monthlyAmount)}</p></div>
                  <div><p className="text-muted-foreground">Coverage</p><p className="font-medium">{agreement.coveredUsers} users · {agreement.coveredDevices} devices</p></div>
                  <div><p className="text-muted-foreground">Renewal</p><p className="font-medium">{agreement.autoRenew ? 'Auto-renews' : 'Manual renewal'} · {agreement.renewalNoticeDays} days</p></div>
                  <div className="sm:col-span-2"><p className="text-muted-foreground">SLA</p><p className="font-medium">{agreement.sla}</p></div>
                  <div><p className="text-muted-foreground">Billing</p><p className="font-medium capitalize">{agreement.billingCycle}</p></div>
                </div>
                <div className="overflow-x-auto rounded-lg border">
                  <table className="w-full text-sm"><thead className="bg-muted/50"><tr><th className="px-3 py-2 text-left">Line item</th><th className="px-3 py-2 text-right">Qty</th><th className="px-3 py-2 text-right">Monthly</th></tr></thead><tbody>
                    {agreement.lineItems.map((item) => <tr key={item.id} className="border-t"><td className="px-3 py-2"><p className="font-medium">{item.name}</p><p className="text-xs text-muted-foreground">{item.description}</p></td><td className="px-3 py-2 text-right">{item.quantity}</td><td className="px-3 py-2 text-right">{money(item.monthlyAmount)}</td></tr>)}
                  </tbody></table>
                </div>
                <div className="grid gap-4 text-sm md:grid-cols-3">
                  <div><p className="font-semibold">Contacts</p>{agreement.contractContacts.map((contact) => <p key={contact.email} className="mt-1 text-muted-foreground">{contact.name} · {contact.role}</p>)}</div>
                  <div><p className="font-semibold">Add-ons</p>{agreement.addOns.map((item) => <p key={item} className="mt-1 text-muted-foreground">• {item}</p>)}</div>
                  <div><p className="font-semibold">Exclusions</p>{agreement.exclusions.map((item) => <p key={item} className="mt-1 text-muted-foreground">• {item}</p>)}</div>
                </div>
              </CardContent>
            </Card>
          ))}
        </>
      )}

      {mode === 'all' && (
        <div className="mb-6 grid gap-3 md:grid-cols-3">
          {targetIds.map((tenantId) => <Card key={tenantId}><CardContent className="p-4"><div className="flex items-center justify-between"><div><p className="font-semibold">{contexts[tenantId]?.tenantName ?? tenantId}</p><p className="text-xs text-muted-foreground">{analyses[tenantId]?.findings.length ?? 0} latest findings</p></div>{running.has(tenantId) ? <Bot className="h-5 w-5 animate-pulse text-primary" /> : <Users className="h-5 w-5 text-muted-foreground" />}</div></CardContent></Card>)}
        </div>
      )}

      {loading ? (
        <div className="space-y-3"><Progress value={55} /><p className="text-center text-sm text-muted-foreground">Pulling demo ConnectWise context…</p></div>
      ) : findings.length === 0 ? (
        <Card><CardContent className="py-12 text-center"><Bot className="mx-auto h-9 w-9 text-muted-foreground" /><h2 className="mt-3 font-semibold">No saved opportunities yet</h2><p className="mt-1 text-sm text-muted-foreground">Run the agent to evaluate agreements, tickets, churn, and configured offerings.</p></CardContent></Card>
      ) : (
        <section><div className="mb-4"><h2 className="text-lg font-semibold">Ranked opportunities</h2><p className="text-sm text-muted-foreground">{findings.length} evidence-backed finding{findings.length === 1 ? '' : 's'} from the latest analysis</p></div><div className="grid gap-5 xl:grid-cols-2">
          {findings.map((finding) => <OpportunityCard key={`${finding.tenantId}:${finding.fingerprint}`} finding={finding} tenantName={contexts[finding.tenantId]?.tenantName ?? finding.tenantId} sending={sending === finding.fingerprint} onSend={() => void handleSend(finding)} />)}
        </div></section>
      )}

      <Dialog open={Boolean(sentFinding)} onOpenChange={(open) => !open && setSentFinding(null)}>
        <DialogContent><DialogHeader><DialogTitle>Sent Opportunity to ConnectWise</DialogTitle><DialogDescription>{sentFinding?.title} was recorded as sent for this demo. No external ConnectWise record was created.</DialogDescription></DialogHeader><DialogFooter><Button onClick={() => setSentFinding(null)}>Done</Button></DialogFooter></DialogContent>
      </Dialog>
    </div>
  );
}
