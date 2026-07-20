import { useEffect, useMemo, useState } from 'react';
import { useServices } from '@/services/context';
import { useSessionStore } from '@/store/session';
import type { BudgetLine, License } from '@/services/types';
import { PageHeader } from '@/components/common/PageHeader';
import { StatCard } from '@/components/common/StatCard';
import { EmptyState } from '@/components/common/EmptyState';
import { RoleGate } from '@/components/common/RoleGate';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  CartesianGrid,
  TooltipProps,
} from 'recharts';
import { formatCurrency } from '@/lib/format';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  BarChart2,
} from 'lucide-react';

// ── Colour palette ──────────────────────────────────────────────────────────
const CHART_COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--accent))',
  '#6366f1',
  '#f59e0b',
  '#10b981',
  '#ef4444',
];

// ── Custom tooltip ──────────────────────────────────────────────────────────
function CurrencyTooltip({ active, payload, label }: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border bg-background p-3 shadow-md text-sm">
      <p className="font-semibold mb-1">{label}</p>
      {payload.map((entry) => (
        <div key={entry.name} className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: entry.color }} />
          <span className="text-muted-foreground">{entry.name}:</span>
          <span className="font-medium">{formatCurrency(entry.value ?? 0)}</span>
        </div>
      ))}
    </div>
  );
}

// ── Skeleton while loading ──────────────────────────────────────────────────
function BudgetSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[0, 1, 2, 3].map((i) => (
          <Card key={i}>
            <CardContent className="p-6 space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-8 w-32" />
              <Skeleton className="h-3 w-20" />
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {[0, 1, 2, 3].map((i) => (
          <Card key={i}>
            <CardHeader><Skeleton className="h-5 w-40" /></CardHeader>
            <CardContent><Skeleton className="h-56 w-full rounded" /></CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ── Variance badge ──────────────────────────────────────────────────────────
function VarianceBadge({ variance }: { variance: number }) {
  if (variance > 0) {
    return (
      <Badge variant="destructive" className="flex items-center gap-1 text-xs">
        <TrendingUp className="h-3 w-3" /> +{formatCurrency(variance)} over
      </Badge>
    );
  }
  if (variance < 0) {
    return (
      <Badge className="flex items-center gap-1 text-xs bg-emerald-100 text-emerald-800 hover:bg-emerald-100">
        <TrendingDown className="h-3 w-3" /> {formatCurrency(Math.abs(variance))} under
      </Badge>
    );
  }
  return (
    <Badge variant="secondary" className="text-xs">On budget</Badge>
  );
}

// ── Main page ───────────────────────────────────────────────────────────────
export function BudgetPage() {
  return (
    <div>
      <PageHeader
        title="Budget"
        subtitle="IT spend tracking and projections"
      />
      <RoleGate allow={['client-admin']}>
        <BudgetContent />
      </RoleGate>
    </div>
  );
}

// ── Budget content (admin only) ─────────────────────────────────────────────
function BudgetContent() {
  const { budget, licenses } = useServices();
  const { activeTenantId } = useSessionStore();

  const [lines, setLines] = useState<BudgetLine[]>([]);
  const [licenseData, setLicenseData] = useState<License[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<'monthly' | 'annual'>('monthly');
  const [sortBy, setSortBy] = useState<'category' | 'period' | 'variance'>('period');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [filterCategory, setFilterCategory] = useState<string>('all');

  useEffect(() => {
    setLoading(true);
    Promise.all([
      budget.list(activeTenantId, { pageSize: 500 }),
      licenses.list(activeTenantId, { pageSize: 500 }),
    ])
      .then(([b, l]) => {
        setLines(b.data);
        setLicenseData(l.data);
      })
      .finally(() => setLoading(false));
  }, [activeTenantId, budget, licenses]);

  // ── Derived data ─────────────────────────────────────────────────────────
  const categories = useMemo(
    () => Array.from(new Set(lines.map((l) => l.category))).sort(),
    [lines],
  );

  // Monthly YYYY-MM lines only (exclude quarterly like 2026-Q2)
  const monthlyLines = useMemo(
    () => lines.filter((l) => /^\d{4}-\d{2}$/.test(l.period)),
    [lines],
  );

  // Annual: group monthly lines by category, sum all fields
  const annualLines = useMemo(() => {
    const map: Record<string, BudgetLine> = {};
    for (const l of lines) {
      if (!map[l.category]) {
        map[l.category] = { ...l, period: 'annual' };
      } else {
        map[l.category].budgeted += l.budgeted;
        map[l.category].actual += l.actual;
        map[l.category].projected += l.projected;
      }
    }
    return Object.values(map);
  }, [lines]);

  const activeLines = period === 'monthly' ? monthlyLines : annualLines;

  // Stat cards
  const totalBudgeted = activeLines.reduce((s, l) => s + l.budgeted, 0);
  const totalActual = activeLines.reduce((s, l) => s + l.actual, 0);
  const variance = totalActual - totalBudgeted;
  const totalProjected = activeLines.reduce((s, l) => s + l.projected, 0);

  // Bar chart: budgeted vs actual by category (aggregated)
  const categoryChartData = useMemo(() => {
    const map: Record<string, { budgeted: number; actual: number; projected: number }> = {};
    for (const l of activeLines) {
      if (!map[l.category]) map[l.category] = { budgeted: 0, actual: 0, projected: 0 };
      map[l.category].budgeted += l.budgeted;
      map[l.category].actual += l.actual;
      map[l.category].projected += l.projected;
    }
    return Object.entries(map).map(([category, v]) => ({
      category: category.length > 18 ? category.slice(0, 16) + '…' : category,
      fullCategory: category,
      ...v,
    }));
  }, [activeLines]);

  // Line chart: spend over months (actual vs projected)
  const monthlyChartData = useMemo(() => {
    const map: Record<string, { actual: number; projected: number; budgeted: number }> = {};
    for (const l of monthlyLines) {
      if (!map[l.period]) map[l.period] = { actual: 0, projected: 0, budgeted: 0 };
      map[l.period].actual += l.actual;
      map[l.period].projected += l.projected;
      map[l.period].budgeted += l.budgeted;
    }
    return Object.entries(map)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([period, v]) => ({ month: period.slice(5), ...v }));
  }, [monthlyLines]);

  // License cost breakdown by product. Licenses are modeled per-SKU (one row
  // per product, with seat counts) — "count" is consumed seats, "totalCost" is
  // consumed seats × per-seat cost (costPerMonth is optional; no CIPP cost
  // source yet, so rows without one simply don't contribute cost).
  const licenseCostData = useMemo(() => {
    const map: Record<string, { product: string; count: number; totalCost: number }> = {};
    for (const l of licenseData) {
      if (!map[l.product]) map[l.product] = { product: l.product, count: 0, totalCost: 0 };
      map[l.product].count += l.consumedUnits;
      map[l.product].totalCost += (l.costPerMonth ?? 0) * l.consumedUnits;
    }
    return Object.values(map).sort((a, b) => b.totalCost - a.totalCost);
  }, [licenseData]);

  // Table data: sort + filter
  const filteredLines = useMemo(() => {
    let result = [...activeLines];
    if (filterCategory !== 'all') {
      result = result.filter((l) => l.category === filterCategory);
    }
    result.sort((a, b) => {
      let cmp = 0;
      if (sortBy === 'category') cmp = a.category.localeCompare(b.category);
      else if (sortBy === 'period') cmp = a.period.localeCompare(b.period);
      else if (sortBy === 'variance') cmp = (a.actual - a.budgeted) - (b.actual - b.budgeted);
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return result;
  }, [activeLines, filterCategory, sortBy, sortDir]);

  function toggleSort(col: 'category' | 'period' | 'variance') {
    if (sortBy === col) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortBy(col); setSortDir('asc'); }
  }

  if (loading) return <BudgetSkeleton />;

  if (lines.length === 0) {
    return (
      <EmptyState
        icon={<BarChart2 className="h-10 w-10" />}
        title="No budget data"
        description="No budget lines found for this tenant."
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Period toggle */}
      <div className="flex items-center gap-3">
        <Tabs value={period} onValueChange={(v) => setPeriod(v as 'monthly' | 'annual')}>
          <TabsList>
            <TabsTrigger value="monthly">Monthly</TabsTrigger>
            <TabsTrigger value="annual">Annual</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard
          title="Total Budgeted"
          value={formatCurrency(totalBudgeted)}
          subtitle={period === 'annual' ? 'Full year' : 'This period'}
          icon={<DollarSign className="h-4 w-4" />}
        />
        <StatCard
          title="Total Actual"
          value={formatCurrency(totalActual)}
          subtitle={period === 'annual' ? 'Year to date' : 'Spent so far'}
          icon={<DollarSign className="h-4 w-4" />}
        />
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-medium text-muted-foreground">Variance</p>
              {variance > 0
                ? <TrendingUp className="h-4 w-4 text-destructive" />
                : <TrendingDown className="h-4 w-4 text-emerald-600" />}
            </div>
            <div className={`mt-2 text-2xl font-bold ${variance > 0 ? 'text-destructive' : 'text-emerald-600'}`}>
              {variance > 0 ? '+' : ''}{formatCurrency(variance)}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {variance > 0 ? 'Over budget' : variance < 0 ? 'Under budget' : 'On budget'}
            </p>
          </CardContent>
        </Card>
        <StatCard
          title="Projected Annual"
          value={formatCurrency(totalProjected)}
          subtitle="Full-year projection"
          icon={<TrendingUp className="h-4 w-4" />}
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Bar chart: budgeted vs actual by category */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Spend by Category</CardTitle>
            <CardDescription>Budgeted vs actual {period === 'annual' ? '(annual)' : '(all months)'}</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={categoryChartData} margin={{ top: 4, right: 8, bottom: 24, left: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="category"
                  tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                  angle={-30}
                  textAnchor="end"
                  interval={0}
                  height={48}
                />
                <YAxis
                  tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`}
                  tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                  width={52}
                />
                <Tooltip content={<CurrencyTooltip />} />
                <Legend verticalAlign="top" height={28} />
                <Bar dataKey="budgeted" name="Budgeted" fill={CHART_COLORS[0]} fillOpacity={0.4} radius={[3, 3, 0, 0]} />
                <Bar dataKey="actual" name="Actual" fill={CHART_COLORS[0]} radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Line chart: monthly spend trend */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Monthly Spend Trend</CardTitle>
            <CardDescription>Actual vs projected spend over time</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={monthlyChartData} margin={{ top: 4, right: 8, bottom: 4, left: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                />
                <YAxis
                  tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`}
                  tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                  width={52}
                />
                <Tooltip content={<CurrencyTooltip />} />
                <Legend verticalAlign="top" height={28} />
                <Line
                  type="monotone"
                  dataKey="budgeted"
                  name="Budgeted"
                  stroke="hsl(var(--muted-foreground))"
                  strokeWidth={1.5}
                  strokeDasharray="4 4"
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="actual"
                  name="Actual"
                  stroke={CHART_COLORS[0]}
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
                <Line
                  type="monotone"
                  dataKey="projected"
                  name="Projected"
                  stroke={CHART_COLORS[1]}
                  strokeWidth={2}
                  strokeDasharray="6 2"
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* License cost breakdown */}
      {licenseCostData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">License Cost Breakdown</CardTitle>
            <CardDescription>Monthly cost per product (all licenses)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={licenseCostData}
                    dataKey="totalCost"
                    nameKey="product"
                    cx="50%"
                    cy="50%"
                    outerRadius={90}
                    label={({ percent }: { percent?: number }) =>
                      percent !== undefined && percent > 0.05
                        ? `${(percent * 100).toFixed(0)}%`
                        : ''
                    }
                    labelLine={false}
                  >
                    {licenseCostData.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number, name: string) => [formatCurrency(value) + '/mo', name]}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2">
                {licenseCostData.map((item, i) => (
                  <div key={item.product} className="flex items-center justify-between text-sm py-1 border-b last:border-0">
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ background: CHART_COLORS[i % CHART_COLORS.length] }}
                      />
                      <span className="truncate text-muted-foreground">{item.product}</span>
                    </div>
                    <div className="flex items-center gap-3 shrink-0 ml-2">
                      <span className="text-xs text-muted-foreground">{item.count}×</span>
                      <span className="font-medium">{formatCurrency(item.totalCost)}/mo</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Budget lines table */}
      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <CardTitle className="text-base">Budget Lines</CardTitle>
            <CardDescription>
              {filteredLines.length} line{filteredLines.length !== 1 ? 's' : ''}
              {filterCategory !== 'all' ? ` in "${filterCategory}"` : ''}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <select
              className="text-sm border rounded px-2 py-1 bg-background"
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              aria-label="Filter by category"
            >
              <option value="all">All categories</option>
              {categories.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/40">
              <tr>
                <th
                  className="text-left px-4 py-2 font-medium text-muted-foreground cursor-pointer select-none hover:text-foreground transition-colors"
                  onClick={() => toggleSort('category')}
                >
                  Category {sortBy === 'category' ? (sortDir === 'asc' ? '↑' : '↓') : ''}
                </th>
                <th
                  className="text-left px-4 py-2 font-medium text-muted-foreground cursor-pointer select-none hover:text-foreground transition-colors"
                  onClick={() => toggleSort('period')}
                >
                  Period {sortBy === 'period' ? (sortDir === 'asc' ? '↑' : '↓') : ''}
                </th>
                <th className="text-right px-4 py-2 font-medium text-muted-foreground">Budgeted</th>
                <th className="text-right px-4 py-2 font-medium text-muted-foreground">Actual</th>
                <th className="text-right px-4 py-2 font-medium text-muted-foreground">Projected</th>
                <th
                  className="text-right px-4 py-2 font-medium text-muted-foreground cursor-pointer select-none hover:text-foreground transition-colors"
                  onClick={() => toggleSort('variance')}
                >
                  Variance {sortBy === 'variance' ? (sortDir === 'asc' ? '↑' : '↓') : ''}
                </th>
                <th className="text-left px-4 py-2 font-medium text-muted-foreground">Type</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredLines.map((line) => {
                const v = line.actual - line.budgeted;
                return (
                  <tr key={line.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-2 font-medium">{line.category}</td>
                    <td className="px-4 py-2 text-muted-foreground">{line.period}</td>
                    <td className="px-4 py-2 text-right tabular-nums">{formatCurrency(line.budgeted)}</td>
                    <td className="px-4 py-2 text-right tabular-nums">{formatCurrency(line.actual)}</td>
                    <td className="px-4 py-2 text-right tabular-nums">{formatCurrency(line.projected)}</td>
                    <td className="px-4 py-2 text-right">
                      <VarianceBadge variance={v} />
                    </td>
                    <td className="px-4 py-2">
                      <Badge variant="outline" className="text-xs capitalize">{line.type}</Badge>
                    </td>
                  </tr>
                );
              })}
              {filteredLines.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                    <AlertCircle className="h-5 w-5 mx-auto mb-2" />
                    No budget lines match the current filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
