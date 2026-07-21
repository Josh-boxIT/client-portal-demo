import { useEffect, useState } from 'react';
import { useServices } from '@/services/context';
import { useSessionStore } from '@/store/session';
import { useAuthStore } from '@/store/auth';
import { getSeed } from '@/data/index';
import type { DashboardKPIs, ActivityItem } from '@/services/types';
import { StatCard } from '@/components/common/StatCard';
import { CardSkeletonGrid } from '@/components/common/CardSkeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { PersonStatusBadge } from '@/components/common/StatusBadge';
import {
  Ticket,
  Shield,
  Key,
  Monitor,
  Zap,
  UserPlus,
  ArrowRight,
  X,
} from 'lucide-react';
import { formatCurrency, formatRelative } from '@/lib/format';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { getDashboardGreetingName } from './greeting';

const QUICK_ACTIONS = [
  { label: 'Onboard a new employee', key: 'onboard-employee', icon: UserPlus },
  { label: 'Reset a password', key: 'reset-password', icon: Key },
  { label: 'Request software or a license', key: 'request-software', icon: Monitor },
  { label: 'Report a security concern', key: 'report-security-concern', icon: Shield },
];

const BANNER_ID = 'welcome-banner-v1';

export function DashboardPage() {
  const { metrics, activity } = useServices();
  const { activeTenantId, dismissedBanners, dismissBanner, activityFeed } =
    useSessionStore();
  const identity = useAuthStore((state) => state.identity);
  const navigate = useNavigate();

  const [kpis, setKpis] = useState<DashboardKPIs | null>(null);
  const [kpiLoading, setKpiLoading] = useState(true);
  const [serviceActivity, setServiceActivity] = useState<ActivityItem[]>([]);

  let people: {
    id: string;
    name: string;
    title: string;
    status: string;
    avatarInitials: string;
  }[] = [];

  try {
    const seed = getSeed(activeTenantId);
    people = seed.people.slice(0, 6);
  } catch {
    /* ignore */
  }

  useEffect(() => {
    setKpiLoading(true);
    metrics.getDashboard(activeTenantId).then(setKpis).finally(() => setKpiLoading(false));
  }, [activeTenantId, metrics]);

  useEffect(() => {
    activity.list(activeTenantId, { pageSize: 6 }).then((r) => setServiceActivity(r.data));
  }, [activeTenantId, activity]);

  // Merge store feed on top of service activity, deduplicate by id
  const mergedActivity: ActivityItem[] = [
    ...activityFeed.filter((a) => a.tenantId === activeTenantId),
    ...serviceActivity,
  ]
    .filter((item, idx, arr) => arr.findIndex((a) => a.id === item.id) === idx)
    .slice(0, 5);

  const firstName = getDashboardGreetingName(identity);
  const isBannerDismissed = dismissedBanners.includes(BANNER_ID);

  return (
    <div className="space-y-6">
      {/* Dismissible announcement banner */}
      {!isBannerDismissed && (
        <div
          role="banner"
          className="flex items-center justify-between rounded-lg border border-primary/30 bg-primary/5 px-4 py-3"
        >
          <div className="flex items-center gap-3">
            <Shield className="h-5 w-5 text-primary shrink-0" aria-hidden="true" />
            <p className="text-sm">
              <strong>Security reminder:</strong> Enable MFA on all your accounts to protect
              company data.{' '}
              <button
                className="underline text-primary hover:opacity-80 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
                onClick={() => navigate('/news')}
              >
                Learn more
              </button>
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 shrink-0"
            onClick={() => dismissBanner(BANNER_ID)}
            aria-label="Dismiss banner"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Greeting + primary CTA */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Good morning, {firstName}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Handle common IT tasks yourself — no helpdesk call needed.
          </p>
        </div>
        <Button onClick={() => navigate('/actions')} className="gap-2 shrink-0 self-start sm:self-auto">
          <UserPlus className="h-4 w-4" aria-hidden="true" />
          Onboard employee
        </Button>
      </div>

      {/* KPI cards */}
      {kpiLoading ? (
        <CardSkeletonGrid count={4} />
      ) : kpis ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Open Tickets"
            value={kpis.openTickets}
            icon={<Ticket className="h-5 w-5" />}
            subtitle="Across all active statuses"
          />
          <StatCard
            title="Security Score"
            value={`${kpis.securityScore}/100`}
            icon={<Shield className="h-5 w-5" />}
            subtitle={
              kpis.securityTrend === 'up'
                ? 'Trending up'
                : kpis.securityTrend === 'down'
                  ? 'Trending down'
                  : 'Trend stable'
            }
            trend={kpis.securityTrend}
          />
          <StatCard
            title="Licenses in Use"
            value={`${kpis.licensesUsed}/${kpis.licensesTotal}`}
            icon={<Key className="h-5 w-5" />}
            subtitle={`${formatCurrency(kpis.unusedMonthlyCost)}/mo unused`}
          />
          <StatCard
            title="Devices Compliant"
            value={`${Math.round(kpis.devicesCompliantPct)}%`}
            icon={<Monitor className="h-5 w-5" />}
            subtitle={`${kpis.devicesHealthy} of ${kpis.devicesTotal} healthy`}
          />
        </div>
      ) : null}

      {/* Main content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Your people */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-base">Your people</CardTitle>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate('/actions')}
                  className="gap-1 text-xs h-8"
                >
                  <UserPlus className="h-3.5 w-3.5" aria-hidden="true" />
                  Add
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate('/people')}
                  className="gap-1 text-xs h-8"
                >
                  Manage all <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              {people.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">No people found.</p>
              ) : (
                <ul className="divide-y" aria-label="Team members">
                  {people.map((p) => (
                    <li key={p.id} className="flex items-center gap-3 py-3">
                      <Avatar className="h-9 w-9 shrink-0">
                        <AvatarFallback className="text-xs bg-primary/10 text-primary font-semibold">
                          {p.avatarInitials}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">{p.name}</div>
                        <div className="text-xs text-muted-foreground truncate">{p.title}</div>
                      </div>
                      <PersonStatusBadge
                        status={
                          p.status as 'active' | 'onboarding' | 'offboarding' | 'suspended'
                        }
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs shrink-0 h-7"
                        onClick={() => navigate(`/people/${p.id}`)}
                        aria-label={`Manage ${p.name}`}
                      >
                        Manage
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right column */}
        <div className="space-y-4">
          {/* Quick actions */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Quick actions</CardTitle>
            </CardHeader>
            <CardContent className="pt-0 space-y-1.5">
              {QUICK_ACTIONS.map(({ label, icon: Icon }) => (
                <Button
                  key={label}
                  variant="outline"
                  className="w-full justify-start gap-2 h-auto py-2.5 text-left"
                  onClick={() => navigate('/actions')}
                >
                  <Icon className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                  <span className="text-sm">{label}</span>
                </Button>
              ))}
              <Button
                variant="ghost"
                className="w-full gap-1 text-sm text-muted-foreground"
                onClick={() => navigate('/actions')}
              >
                See all actions <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </Button>
            </CardContent>
          </Card>

          {/* Recent activity */}
          <Card>
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-base">Recent activity</CardTitle>
              <Button
                variant="ghost"
                size="sm"
                className="gap-1 text-xs h-7"
                onClick={() => navigate('/reports')}
              >
                View all <ArrowRight className="h-3 w-3" aria-hidden="true" />
              </Button>
            </CardHeader>
            <CardContent className="pt-0">
              {mergedActivity.length === 0 ? (
                <p className="text-sm text-muted-foreground py-2">No recent activity.</p>
              ) : (
                <ul className="space-y-3" aria-label="Recent activity">
                  {mergedActivity.map((item) => (
                    <li key={item.id} className="flex gap-2.5">
                      <div
                        className={cn(
                          'mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full',
                          item.type === 'security'
                            ? 'bg-red-100'
                            : item.type === 'onboarding'
                              ? 'bg-green-100'
                              : 'bg-primary/10',
                        )}
                        aria-hidden="true"
                      >
                        <Zap
                          className={cn(
                            'h-3.5 w-3.5',
                            item.type === 'security'
                              ? 'text-red-600'
                              : item.type === 'onboarding'
                                ? 'text-green-700'
                                : 'text-primary',
                          )}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium leading-snug">{item.title}</div>
                        <div className="text-xs text-muted-foreground truncate">{item.detail}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {formatRelative(item.at)}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
