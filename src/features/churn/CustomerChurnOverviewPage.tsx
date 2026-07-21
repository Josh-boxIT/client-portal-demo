import { useEffect, useState, type ReactNode } from 'react';
import { Link, Navigate } from 'react-router-dom';
import {
  AlertTriangle,
  Archive,
  CalendarDays,
  CheckCircle2,
  CreditCard,
  Inbox,
  Gauge,
  ReceiptText,
  Repeat2,
  ShieldCheck,
  UsersRound,
} from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { useAuthStore } from '@/store/auth';
import { useSessionStore } from '@/store/session';
import { useTenantStore } from '@/theme/tenantStore';
import { useServices } from '@/services/context';
import type { ChurnAssessment, ChurnDataSource } from '@/data/seed/customerChurn';
import { CardSkeletonGrid } from '@/components/common/CardSkeleton';
import { cn } from '@/lib/utils';
import {
  formatAssessmentDate,
  churnSourceLabel,
  getRiskTone,
} from './churnData';

interface SummaryCardProps {
  label: string;
  value: string | number;
  detail: string;
  icon: ReactNode;
  iconClassName?: string;
  className?: string;
}

function SummaryCard({ label, value, detail, icon, iconClassName, className }: SummaryCardProps) {
  return (
    <Card className={className}>
      <CardContent className="flex items-center gap-4 p-5">
        <div className={cn('rounded-xl bg-primary/10 p-3 text-primary', iconClassName)}>{icon}</div>
        <div>
          <p className="text-sm font-medium text-muted-foreground">{label}</p>
          <p className="mt-0.5 text-2xl font-semibold tracking-tight">{value}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">{detail}</p>
        </div>
      </CardContent>
    </Card>
  );
}

interface CustomerMetricProps {
  label: string;
  value: string | number;
  icon: ReactNode;
  source?: ChurnDataSource;
}

function CustomerMetric({ label, value, icon, source }: CustomerMetricProps) {
  return (
    <div className="rounded-lg border bg-muted/30 p-3">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span className="text-primary" aria-hidden="true">{icon}</span>
        {label}
        {source && (
          <Badge variant="outline" className="ml-auto px-1.5 py-0 text-[10px] font-normal">
            {churnSourceLabel(source)}
          </Badge>
        )}
      </div>
      <p className="mt-1.5 text-lg font-semibold tracking-tight">{value}</p>
    </div>
  );
}

export function CustomerChurnOverviewPage() {
  const { identity } = useAuthStore();
  const { switchTenant } = useSessionStore();
  const { tenants } = useTenantStore();
  const { customerChurn } = useServices();
  const [assessments, setAssessments] = useState<ChurnAssessment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const tenantById = new Map(tenants.map((tenant) => [tenant.id, tenant]));
  const rows = assessments.flatMap((assessment) => {
    const customer = tenantById.get(assessment.customerId);
    return customer ? [{ customer, assessment }] : [];
  }).sort((a, b) => b.assessment.score - a.assessment.score);

  useEffect(() => {
    if (identity?.role !== 'admin') return;
    setLoading(true);
    setError('');
    customerChurn.list(useSessionStore.getState().activeTenantId)
      .then(setAssessments)
      .catch((caught) => setError(caught instanceof Error ? caught.message : 'Could not load churn data'))
      .finally(() => setLoading(false));
  }, [customerChurn, identity?.role]);

  if (identity?.role !== 'admin') return <Navigate to="/" replace />;
  const elevatedRiskCount = rows.filter(({ assessment }) => assessment.score >= 60).length;
  const averageRisk = rows.length > 0
    ? Math.round(rows.reduce((total, { assessment }) => total + assessment.score, 0) / rows.length)
    : 0;

  return (
    <div>
      <PageHeader
        title="Customer Churn"
        subtitle="AI-assisted retention risk across the customers you can access"
      />

      {loading ? (
        <div className="mb-6"><CardSkeletonGrid count={3} /></div>
      ) : (
      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <SummaryCard
          label="Customers monitored"
          value={rows.length}
          detail="With a current churn assessment"
          icon={<UsersRound className="h-5 w-5" />}
        />
        <SummaryCard
          label="High or critical risk"
          value={elevatedRiskCount}
          detail="Customers scoring 60 or higher"
          icon={<AlertTriangle className="h-5 w-5" />}
          iconClassName="bg-orange-100 text-orange-700"
        />
        <SummaryCard
          label="Average risk score"
          value={averageRisk}
          detail="Across visible customers"
          icon={<ShieldCheck className="h-5 w-5" />}
          iconClassName="bg-blue-100 text-blue-700"
          className="sm:col-span-2 xl:col-span-1"
        />
      </div>
      )}

      {loading ? null : error ? (
        <Card><CardContent className="py-16 text-center text-destructive">{error}</CardContent></Card>
      ) : rows.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground">
            No churn assessments are available for your customers.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {rows.map(({ customer, assessment }) => {
            const tone = getRiskTone(assessment.score);
            return (
              <Card key={customer.id} className="overflow-hidden">
                <CardHeader className="space-y-4 pb-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <Link
                        to={`/customer-churn/${encodeURIComponent(customer.id)}`}
                        onClick={() => switchTenant(customer.id)}
                        className="text-lg font-semibold text-primary underline-offset-4 hover:underline focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      >
                        {customer.name}
                      </Link>
                      {customer.vertical && (
                        <p className="mt-1 text-xs text-muted-foreground">{customer.vertical}</p>
                      )}
                    </div>
                    <Badge className={cn('shrink-0', tone.badgeClass)} variant="outline">
                      {tone.label}
                    </Badge>
                  </div>

                  <div>
                    <div className="mb-2 flex items-end justify-between">
                      <span className="text-xs font-medium text-muted-foreground">Churn risk score</span>
                      <span className={cn('text-3xl font-bold tracking-tight', tone.scoreClass)}>
                        {assessment.score}
                        <span className="ml-1 text-sm font-medium text-muted-foreground">/ 100</span>
                      </span>
                    </div>
                    <div
                      className="h-2.5 overflow-hidden rounded-full bg-muted"
                      role="meter"
                      aria-label={`${customer.name} churn risk score`}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-valuenow={assessment.score}
                    >
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${assessment.score}%`, backgroundColor: tone.ring }}
                      />
                    </div>
                  </div>
                </CardHeader>

                <CardContent>
                  <div className="grid grid-cols-2 gap-2.5">
                    <CustomerMetric
                      label="Account age"
                      value={`${assessment.accountAgeYears} yrs`}
                      icon={<CalendarDays className="h-3.5 w-3.5" />}
                      source={assessment.metricSources.accountAgeYears}
                    />
                    <CustomerMetric
                      label="Credit usage"
                      value={`${assessment.creditLimitUsagePercent}%`}
                      icon={<CreditCard className="h-3.5 w-3.5" />}
                      source={assessment.metricSources.creditLimitUsagePercent}
                    />
                    <CustomerMetric
                      label="Days past due"
                      value={assessment.daysPastDue}
                      icon={<ReceiptText className="h-3.5 w-3.5" />}
                      source={assessment.metricSources.daysPastDue}
                    />
                    <CustomerMetric
                      label="On-time payments"
                      value={`${assessment.onTimePaymentRatio}%`}
                      icon={<CheckCircle2 className="h-3.5 w-3.5" />}
                      source={assessment.metricSources.onTimePaymentRatio}
                    />
                    <CustomerMetric
                      label="SLA conformance"
                      value={`${assessment.slaConformancePercent}%`}
                      icon={<Gauge className="h-3.5 w-3.5" />}
                      source={assessment.metricSources.slaConformancePercent}
                    />
                    <CustomerMetric
                      label="Open cases"
                      value={assessment.openCases}
                      icon={<Inbox className="h-3.5 w-3.5" />}
                      source={assessment.metricSources.openCases}
                    />
                    <CustomerMetric
                      label="Closed cases"
                      value={assessment.closedCases}
                      icon={<Archive className="h-3.5 w-3.5" />}
                      source={assessment.metricSources.closedCases}
                    />
                    <CustomerMetric
                      label="Repeat cases"
                      value={assessment.repeatCases}
                      icon={<Repeat2 className="h-3.5 w-3.5" />}
                      source={assessment.metricSources.repeatCases}
                    />
                    <CustomerMetric
                      label="Last assessed"
                      value={formatAssessmentDate(assessment.assessedAt)}
                      icon={<CalendarDays className="h-3.5 w-3.5" />}
                    />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
