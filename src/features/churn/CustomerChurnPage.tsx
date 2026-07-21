import { useEffect, type ReactNode } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Archive,
  CalendarDays,
  CheckCircle2,
  CreditCard,
  Inbox,
  Gauge,
  ListChecks,
  ReceiptText,
  Repeat2,
  Sparkles,
} from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useSessionStore } from '@/store/session';
import { useAuthStore } from '@/store/auth';
import { useTenantStore } from '@/theme/tenantStore';
import { cn } from '@/lib/utils';
import { formatAssessmentDate, getAccessibleChurnRows, getRiskTone } from './churnData';

interface MetricCardProps {
  label: string;
  value: string | number;
  detail: string;
  icon: ReactNode;
  progress?: number;
  accentClass?: string;
}

function MetricCard({
  label,
  value,
  detail,
  icon,
  progress,
  accentClass = 'text-primary',
}: MetricCardProps) {
  return (
    <Card className="h-full">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{label}</p>
            <p className="mt-2 text-3xl font-semibold tracking-tight">{value}</p>
          </div>
          <div className={cn('rounded-lg bg-muted p-2.5', accentClass)}>{icon}</div>
        </div>
        {progress !== undefined && (
          <Progress value={progress} className="mt-4 h-2" aria-label={`${label}: ${progress}%`} />
        )}
        <p className="mt-3 text-xs leading-relaxed text-muted-foreground">{detail}</p>
      </CardContent>
    </Card>
  );
}

export function CustomerChurnPage() {
  const { customerId = '' } = useParams();
  const { activeTenantId, switchTenant } = useSessionStore();
  const { identity, accessibleClientIds } = useAuthStore();
  const { tenants } = useTenantStore();
  const row = getAccessibleChurnRows(identity, accessibleClientIds, tenants)
    .find(({ customer }) => customer.id === customerId);
  const customer = row?.customer;
  const assessment = row?.assessment;

  useEffect(() => {
    if (customer && activeTenantId !== customer.id) {
      switchTenant(customer.id);
    }
  }, [activeTenantId, customer, switchTenant]);

  if (!customer || !assessment) {
    return <Navigate to="/customer-churn" replace />;
  }
  const tone = getRiskTone(assessment.score);

  return (
    <div>
      <PageHeader
        title={`Customer Churn: ${customer.name}`}
        subtitle="AI-assisted account retention risk assessment"
        leading={
          <Button asChild size="sm" variant="outline">
            <Link to="/customer-churn">
              <ArrowLeft aria-hidden="true" />
              Return
            </Link>
          </Button>
        }
        actions={<Badge variant="outline">Last assessed {formatAssessmentDate(assessment.assessedAt)}</Badge>}
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <Card className="overflow-hidden border-primary/20 bg-gradient-to-br from-primary/5 via-card to-card">
          <CardHeader className="pb-4">
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Sparkles className="h-5 w-5" aria-hidden="true" />
              </div>
              <div>
                <CardTitle className="text-lg">AI risk assessment</CardTitle>
                <p className="mt-1 text-xs text-muted-foreground">
                  Based on account, payment, and support activity
                </p>
              </div>
              <Badge className={cn('ml-auto', tone.badgeClass)} variant="outline">
                {tone.label}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <section aria-labelledby="assessment-heading">
              <h3 id="assessment-heading" className="text-sm font-semibold">
                Assessment
              </h3>
              <p className="mt-2 text-base leading-7 text-foreground/90">
                {assessment.assessment}
              </p>
            </section>

            <section
              className="rounded-lg border border-primary/20 bg-primary/5 p-4"
              aria-labelledby="suggested-actions-heading"
            >
              <div className="flex items-center gap-2 text-primary">
                <ListChecks className="h-4 w-4" aria-hidden="true" />
                <h3 id="suggested-actions-heading" className="text-sm font-semibold">
                  Suggested actions
                </h3>
              </div>
              <p className="mt-2 text-sm leading-6 text-foreground/90">
                {assessment.suggestedActions}
              </p>
            </section>

            <div className="rounded-md border border-border/60 bg-background/60 px-4 py-3 text-xs text-muted-foreground">
              AI-generated assessment. Review source data and account context before taking action.
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2 text-center">
            <CardTitle className="text-base">Churn risk score</CardTitle>
            <p className="text-xs text-muted-foreground">0 least risky · 100 most risky</p>
          </CardHeader>
          <CardContent className="flex flex-col items-center pb-6">
            <div
              className="relative mt-2 flex h-44 w-44 items-center justify-center rounded-full p-3"
              style={{
                background: `conic-gradient(${tone.ring} ${assessment.score}%, hsl(var(--muted)) ${assessment.score}% 100%)`,
              }}
              role="meter"
              aria-label="Churn risk score"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={assessment.score}
            >
              <div className="flex h-full w-full flex-col items-center justify-center rounded-full bg-card shadow-inner">
                <span className={cn('text-5xl font-bold tracking-tight', tone.scoreClass)}>
                  {assessment.score}
                </span>
                <span className="mt-1 text-xs font-medium text-muted-foreground">out of 100</span>
              </div>
            </div>
            <Badge className={cn('mt-4', tone.badgeClass)} variant="outline">
              {tone.label}
            </Badge>
          </CardContent>
        </Card>
      </div>

      <section className="mt-8" aria-labelledby="risk-indicators-heading">
        <div className="mb-4">
          <h2 id="risk-indicators-heading" className="text-lg font-semibold">
            Key risk indicators
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Trailing 90-day period unless otherwise noted
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            label="Account age"
            value={`${assessment.accountAgeYears} yrs`}
            detail="Time since the customer account was opened"
            icon={<CalendarDays className="h-5 w-5" aria-hidden="true" />}
          />
          <MetricCard
            label="Credit limit usage"
            value={`${assessment.creditLimitUsagePercent}%`}
            detail="Current balance as a percentage of available credit"
            icon={<CreditCard className="h-5 w-5" aria-hidden="true" />}
            progress={assessment.creditLimitUsagePercent}
            accentClass={assessment.creditLimitUsagePercent >= 75 ? 'text-orange-600' : 'text-primary'}
          />
          <MetricCard
            label="Days past due"
            value={assessment.daysPastDue}
            detail="Based on the account's most overdue invoice"
            icon={<ReceiptText className="h-5 w-5" aria-hidden="true" />}
            accentClass={assessment.daysPastDue >= 30 ? 'text-red-600' : 'text-orange-600'}
          />
          <MetricCard
            label="On-time payment ratio"
            value={`${assessment.onTimePaymentRatio}%`}
            detail="Invoices paid on or before their due date"
            icon={<CheckCircle2 className="h-5 w-5" aria-hidden="true" />}
            progress={assessment.onTimePaymentRatio}
            accentClass={assessment.onTimePaymentRatio >= 90 ? 'text-green-600' : 'text-amber-600'}
          />
          <MetricCard
            label="SLA conformance"
            value={`${assessment.slaConformancePercent}%`}
            detail="Qualifying support responses delivered within the client's SLA target; higher is better"
            icon={<Gauge className="h-5 w-5" aria-hidden="true" />}
            progress={assessment.slaConformancePercent}
            accentClass={assessment.slaConformancePercent >= 95
              ? 'text-green-600'
              : assessment.slaConformancePercent >= 85
                ? 'text-amber-600'
                : 'text-red-600'}
          />
          <MetricCard
            label="Open cases"
            value={assessment.openCases}
            detail="Cases currently waiting for resolution"
            icon={<Inbox className="h-5 w-5" aria-hidden="true" />}
            accentClass={assessment.openCases >= 5 ? 'text-orange-600' : 'text-primary'}
          />
          <MetricCard
            label="Closed cases"
            value={assessment.closedCases}
            detail="Cases resolved during the same 90-day period"
            icon={<Archive className="h-5 w-5" aria-hidden="true" />}
            accentClass="text-green-600"
          />
          <MetricCard
            label="Repeat cases"
            value={assessment.repeatCases}
            detail="Cases linked to an issue reported more than once"
            icon={<Repeat2 className="h-5 w-5" aria-hidden="true" />}
            accentClass={assessment.repeatCases >= 3 ? 'text-red-600' : 'text-amber-600'}
          />
        </div>
      </section>
    </div>
  );
}
