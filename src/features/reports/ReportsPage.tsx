import { useEffect, useMemo, useState } from 'react';
import { subDays, parseISO, isAfter, format } from 'date-fns';
import { useServices } from '@/services/context';
import { useSessionStore } from '@/store/session';
import type { MetricPoint, MetricSeries } from '@/services/types';
import { PageHeader } from '@/components/common/PageHeader';
import { EmptyState } from '@/components/common/EmptyState';
import { CardSkeleton } from '@/components/common/CardSkeleton';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  BarChart,
  Bar,
  AreaChart,
  Area,
  LineChart,
  Line,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  XAxis,
  YAxis,
  Tooltip,  ResponsiveContainer,
  CartesianGrid,
  ReferenceLine,
  TooltipProps,
} from 'recharts';
import { formatCurrency, formatPercent } from '@/lib/format';
import { Activity, BarChart2 } from 'lucide-react';

// ── Date-range options ───────────────────────────────────────────────────────
const DATE_RANGES = [
  { label: 'Last 30 days', days: 30 },
  { label: 'Last 90 days', days: 90 },
  { label: 'Last 180 days', days: 180 },
  { label: 'All time', days: 0 },
] as const;

type DateRangeDays = (typeof DATE_RANGES)[number]['days'];

// ── Chart colour palette ────────────────────────────────────────────────────
const PRIMARY = 'hsl(var(--primary))';
const ACCENT = 'hsl(var(--accent))';
const MUTED = 'hsl(var(--muted-foreground))';

// ── Helpers ─────────────────────────────────────────────────────────────────
function filterPoints(points: MetricPoint[], days: DateRangeDays): MetricPoint[] {
  if (days === 0) return points;
  const cutoff = subDays(new Date(), days);
  return points.filter((p) => isAfter(parseISO(p.date), cutoff));
}

function shortDate(isoDate: string): string {
  // e.g. "2026-01-15" → "Jan 15" (day included so points within the same month don't collide)
  return format(parseISO(isoDate), 'MMM d');
}

// ── Custom tooltip ──────────────────────────────────────────────────────────
function MetricTooltip({
  active,
  payload,
  label,
  unit,
}: TooltipProps<number, string> & { unit?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border bg-background p-3 shadow-md text-sm">
      <p className="font-semibold mb-1">{label}</p>
      {payload.map((entry) => {
        const val = entry.value ?? 0;
        let formatted = String(val);
        if (unit === 'percent') formatted = `${val}%`;
        else if (unit === 'score') formatted = `${val}/100`;
        else if (unit === 'currency') formatted = formatCurrency(val);
        else formatted = String(val);
        return (
          <div key={entry.name} className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: entry.color }} />
            <span className="text-muted-foreground">{entry.name}:</span>
            <span className="font-medium">{formatted}</span>
          </div>
        );
      })}
    </div>
  );
}

// ── Chart card wrapper ──────────────────────────────────────────────────────
function ChartCard({
  title,
  subtitle,
  children,
  empty,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  empty?: boolean;
}) {
  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription className="text-xs">{subtitle}</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 min-h-0">
        {empty ? (
          <EmptyState
            icon={<Activity className="h-8 w-8" />}
            title="No data"
            description="No data available for this time range."
            className="py-10"
          />
        ) : (
          children
        )}
      </CardContent>
    </Card>
  );
}

// ── Chart: Tickets Volume (bar) ─────────────────────────────────────────────
function TicketsVolumeChart({ series, days }: { series: MetricSeries; days: DateRangeDays }) {
  const data = useMemo(
    () => filterPoints(series.points, days).map((p) => ({ date: shortDate(p.date), value: p.value })),
    [series, days],
  );
  return (
    <ChartCard
      title="Ticket Volume"
      subtitle="Number of tickets opened each month"
      empty={data.length === 0}
    >
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis dataKey="date" tick={{ fontSize: 11, fill: MUTED }} />
          <YAxis tick={{ fontSize: 11, fill: MUTED }} allowDecimals={false} width={36} />
          <Tooltip<number, string> content={(props) => <MetricTooltip {...props} unit="count" />} />
          <Bar dataKey="value" name="Tickets" fill={PRIMARY} radius={[3, 3, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

// ── Chart: SLA Attainment (area with 95% target line) ──────────────────────
function SlaAttainmentChart({ series, days }: { series: MetricSeries; days: DateRangeDays }) {
  const data = useMemo(
    () => filterPoints(series.points, days).map((p) => ({ date: shortDate(p.date), value: p.value })),
    [series, days],
  );
  return (
    <ChartCard
      title="SLA Attainment"
      subtitle="% of tickets resolved within SLA target"
      empty={data.length === 0}
    >
      <ResponsiveContainer width="100%" height={220}>
        <AreaChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id="slaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={PRIMARY} stopOpacity={0.3} />
              <stop offset="95%" stopColor={PRIMARY} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis dataKey="date" tick={{ fontSize: 11, fill: MUTED }} />
          <YAxis
            domain={[60, 100]}
            tickFormatter={(v: number) => `${v}%`}
            tick={{ fontSize: 11, fill: MUTED }}
            width={42}
          />
          <Tooltip<number, string> content={(props) => <MetricTooltip {...props} unit="percent" />} />
          <ReferenceLine
            y={95}
            stroke={ACCENT}
            strokeDasharray="4 4"
            strokeWidth={1.5}
            label={{ value: 'Target 95%', fill: MUTED, fontSize: 11, position: 'insideTopRight' }}
          />
          <Area
            type="monotone"
            dataKey="value"
            name="SLA %"
            stroke={PRIMARY}
            strokeWidth={2}
            fill="url(#slaGrad)"
            dot={{ r: 3, fill: PRIMARY }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

// ── Chart: Security Score (line) ─────────────────────────────────────────────
function SecurityScoreChart({ series, days }: { series: MetricSeries; days: DateRangeDays }) {
  const data = useMemo(
    () => filterPoints(series.points, days).map((p) => ({ date: shortDate(p.date), value: p.value })),
    [series, days],
  );
  return (
    <ChartCard
      title="Security Score"
      subtitle="Tenant security posture score out of 100"
      empty={data.length === 0}
    >
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis dataKey="date" tick={{ fontSize: 11, fill: MUTED }} />
          <YAxis
            domain={[0, 100]}
            tick={{ fontSize: 11, fill: MUTED }}
            width={36}
          />
          <Tooltip<number, string> content={(props) => <MetricTooltip {...props} unit="score" />} />
          <ReferenceLine
            y={80}
            stroke={ACCENT}
            strokeDasharray="4 4"
            strokeWidth={1.5}
            label={{ value: 'Goal 80', fill: MUTED, fontSize: 11, position: 'insideTopRight' }}
          />
          <Line
            type="monotone"
            dataKey="value"
            name="Score"
            stroke={PRIMARY}
            strokeWidth={2.5}
            dot={{ r: 4, fill: PRIMARY, strokeWidth: 0 }}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

// ── Chart: Device Compliance (area) ─────────────────────────────────────────
function DeviceComplianceChart({ series, days }: { series: MetricSeries; days: DateRangeDays }) {
  const data = useMemo(
    () => filterPoints(series.points, days).map((p) => ({ date: shortDate(p.date), value: p.value })),
    [series, days],
  );
  return (
    <ChartCard
      title="Device Compliance"
      subtitle="% of devices meeting compliance policy"
      empty={data.length === 0}
    >
      <ResponsiveContainer width="100%" height={220}>
        <AreaChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id="complianceGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={ACCENT} stopOpacity={0.35} />
              <stop offset="95%" stopColor={ACCENT} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis dataKey="date" tick={{ fontSize: 11, fill: MUTED }} />
          <YAxis
            domain={[0, 100]}
            tickFormatter={(v: number) => `${v}%`}
            tick={{ fontSize: 11, fill: MUTED }}
            width={42}
          />
          <Tooltip<number, string> content={(props) => <MetricTooltip {...props} unit="percent" />} />
          <ReferenceLine
            y={90}
            stroke={PRIMARY}
            strokeDasharray="4 4"
            strokeWidth={1.5}
            label={{ value: 'Target 90%', fill: MUTED, fontSize: 11, position: 'insideTopRight' }}
          />
          <Area
            type="monotone"
            dataKey="value"
            name="Compliance %"
            stroke={ACCENT}
            strokeWidth={2}
            fill="url(#complianceGrad)"
            dot={{ r: 3, fill: ACCENT }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

// ── Chart: License Utilization (bar + radar) ─────────────────────────────────
function LicenseUtilizationChart({ series, days }: { series: MetricSeries; days: DateRangeDays }) {
  const data = useMemo(
    () => filterPoints(series.points, days).map((p) => ({ date: shortDate(p.date), value: p.value })),
    [series, days],
  );

  // Radar uses latest few points as "dimensions" — one point per month
  const radarData = data.map((d) => ({
    subject: d.date,
    value: d.value,
    fullMark: 100,
  }));

  return (
    <ChartCard
      title="License Utilization"
      subtitle="% of available licenses currently in use"
      empty={data.length === 0}
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="date" tick={{ fontSize: 10, fill: MUTED }} />
            <YAxis
              domain={[0, 100]}
              tickFormatter={(v: number) => `${v}%`}
              tick={{ fontSize: 10, fill: MUTED }}
              width={40}
            />
            <Tooltip<number, string> content={(props) => <MetricTooltip {...props} unit="percent" />} />
            <Bar dataKey="value" name="Utilized %" fill={PRIMARY} radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>

        {radarData.length >= 3 && (
          <ResponsiveContainer width="100%" height={200}>
            <RadarChart data={radarData} cx="50%" cy="50%" outerRadius={75}>
              <PolarGrid stroke="hsl(var(--border))" />
              <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10, fill: MUTED }} />
              <Radar
                name="License %"
                dataKey="value"
                stroke={ACCENT}
                fill={ACCENT}
                fillOpacity={0.3}
              />
              <Tooltip<number, string> content={(props) => <MetricTooltip {...props} unit="percent" />} />
            </RadarChart>
          </ResponsiveContainer>
        )}
      </div>
    </ChartCard>
  );
}

// ── Summary stat strip ───────────────────────────────────────────────────────
function SummaryStrip({ allSeries, days }: { allSeries: MetricSeries[]; days: DateRangeDays }) {
  function latest(key: string): number | null {
    const s = allSeries.find((s) => s.key === key);
    if (!s) return null;
    const pts = filterPoints(s.points, days);
    return pts.length > 0 ? pts[pts.length - 1].value : null;
  }

  const stats = [
    { label: 'SLA Attainment', value: latest('sla-attainment'), unit: 'percent' },
    { label: 'Security Score', value: latest('security-score'), unit: 'score' },
    { label: 'Device Compliance', value: latest('device-compliance'), unit: 'percent' },
    { label: 'License Utilization', value: latest('license-utilization'), unit: 'percent' },
  ];

  function fmt(value: number | null, unit: string): string {
    if (value === null) return '—';
    if (unit === 'percent') return formatPercent(value / 100);
    if (unit === 'score') return `${value}/100`;
    if (unit === 'currency') return formatCurrency(value);
    return String(value);
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
      {stats.map((s) => (
        <Card key={s.label}>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">{s.label}</p>
            <p className="mt-1 text-2xl font-bold">{fmt(s.value, s.unit)}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Latest</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────
export function ReportsPage() {
  const { metrics } = useServices();
  const { activeTenantId } = useSessionStore();
  const [allSeries, setAllSeries] = useState<MetricSeries[]>([]);
  const [loading, setLoading] = useState(true);
  const [rangeDays, setRangeDays] = useState<DateRangeDays>(180);

  useEffect(() => {
    setLoading(true);
    metrics.listSeries(activeTenantId, { pageSize: 20 })
      .then((r) => setAllSeries(r.data))
      .finally(() => setLoading(false));
  }, [activeTenantId, metrics]);

  function getSeries(key: string): MetricSeries | undefined {
    return allSeries.find((s) => s.key === key);
  }

  const metricKeys = [
    'tickets-volume',
    'sla-attainment',
    'security-score',
    'device-compliance',
    'license-utilization',
  ];
  const hasAny = allSeries.length > 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports & Metrics"
        subtitle="Performance trends and KPIs across your IT environment"
        actions={
          <select
            className="text-sm border rounded px-3 py-1.5 bg-background"
            value={rangeDays}
            onChange={(e) => setRangeDays(Number(e.target.value) as DateRangeDays)}
            aria-label="Date range"
          >
            {DATE_RANGES.map((r) => (
              <option key={r.days} value={r.days}>{r.label}</option>
            ))}
          </select>
        }
      />

      {loading ? (
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[0, 1, 2, 3].map((i) => (
              <Card key={i}>
                <CardContent className="p-4 space-y-2">
                  <div className="h-3 w-20 rounded bg-muted animate-pulse" />
                  <div className="h-8 w-24 rounded bg-muted animate-pulse" />
                </CardContent>
              </Card>
            ))}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[0, 1, 2, 3, 4].map((i) => <CardSkeleton key={i} />)}
          </div>
        </div>
      ) : !hasAny ? (
        <EmptyState
          icon={<BarChart2 className="h-10 w-10" />}
          title="No metrics data"
          description="No metric series were found for this tenant."
        />
      ) : (
        <>
          <SummaryStrip allSeries={allSeries} days={rangeDays} />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Tickets Volume */}
            {getSeries('tickets-volume') ? (
              <TicketsVolumeChart series={getSeries('tickets-volume')!} days={rangeDays} />
            ) : (
              <ChartCard title="Ticket Volume" subtitle="Number of tickets opened each month" empty>
                <></>
              </ChartCard>
            )}

            {/* SLA Attainment */}
            {getSeries('sla-attainment') ? (
              <SlaAttainmentChart series={getSeries('sla-attainment')!} days={rangeDays} />
            ) : (
              <ChartCard title="SLA Attainment" subtitle="% of tickets resolved within SLA target" empty>
                <></>
              </ChartCard>
            )}

            {/* Security Score */}
            {getSeries('security-score') ? (
              <SecurityScoreChart series={getSeries('security-score')!} days={rangeDays} />
            ) : (
              <ChartCard title="Security Score" subtitle="Tenant security posture score out of 100" empty>
                <></>
              </ChartCard>
            )}

            {/* Device Compliance */}
            {getSeries('device-compliance') ? (
              <DeviceComplianceChart series={getSeries('device-compliance')!} days={rangeDays} />
            ) : (
              <ChartCard title="Device Compliance" subtitle="% of devices meeting compliance policy" empty>
                <></>
              </ChartCard>
            )}

            {/* License Utilization — full width */}
            <div className="md:col-span-2">
              {getSeries('license-utilization') ? (
                <LicenseUtilizationChart series={getSeries('license-utilization')!} days={rangeDays} />
              ) : (
                <ChartCard title="License Utilization" subtitle="% of available licenses currently in use" empty>
                  <></>
                </ChartCard>
              )}
            </div>
          </div>

          {/* Missing series notice */}
          {metricKeys.some((k) => !getSeries(k)) && (
            <p className="text-xs text-muted-foreground text-center">
              Some metric series are not available for this tenant.
            </p>
          )}
        </>
      )}
    </div>
  );
}
