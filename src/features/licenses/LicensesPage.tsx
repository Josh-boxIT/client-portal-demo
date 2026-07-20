import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useServices } from '@/services/context';
import { useSessionStore } from '@/store/session';
import type { License, LicenseStatus } from '@/services/types';
import { PageHeader } from '@/components/common/PageHeader';
import { TableSkeleton } from '@/components/common/TableSkeleton';
import { EmptyState } from '@/components/common/EmptyState';
import { StatCard } from '@/components/common/StatCard';
import { LicenseStatusBadge } from '@/components/common/StatusBadge';
import { CardSkeletonGrid } from '@/components/common/CardSkeleton';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Key, Search, ShieldCheck, PackageOpen } from 'lucide-react';

/**
 * Licenses, modeled per-SKU with seat counts (e.g. "Microsoft 365 E3 —
 * 42/50 assigned") — mirrors CIPP's `/api/ListLicenses` shape. There is no
 * per-person assignment info here (a person's real M365 licenses come from
 * person enrichment, see PersonDetailPage); this page is purely a per-tenant
 * seat-utilization view.
 */

function sortLicenses(data: License[]): License[] {
  return [...data].sort((a, b) => a.product.localeCompare(b.product));
}

export function LicensesPage() {
  const { licenses } = useServices();
  const { activeTenantId } = useSessionStore();
  const navigate = useNavigate();

  const [allData, setAllData] = useState<License[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<LicenseStatus | 'all'>('all');
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    setLoading(true);
    setError(null);
    licenses
      .list(activeTenantId, { pageSize: 500 })
      .then((r) => setAllData(r.data))
      .catch(() => setError('We couldn’t load licenses. Please try again.'))
      .finally(() => setLoading(false));
  }, [activeTenantId, licenses, reloadKey]);

  const stats = useMemo(() => {
    const totalSeats = allData.reduce((sum, l) => sum + l.totalUnits, 0);
    const assignedSeats = allData.reduce((sum, l) => sum + l.consumedUnits, 0);
    const unusedSeats = totalSeats - assignedSeats;
    return { totalSeats, assignedSeats, unusedSeats };
  }, [allData]);

  const filtered = useMemo(() => {
    let result = allData;
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (l) => l.product.toLowerCase().includes(q) || l.sku.toLowerCase().includes(q)
      );
    }
    if (filterStatus !== 'all') result = result.filter((l) => l.status === filterStatus);
    return sortLicenses(result);
  }, [allData, search, filterStatus]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Licenses"
        subtitle="Per-SKU seat utilization across Microsoft 365 and SaaS licenses"
      />

      {/* ── Stat cards ──────────────────────────────────────────────────── */}
      {loading ? (
        <CardSkeletonGrid count={3} />
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          <StatCard title="Total seats" value={stats.totalSeats} icon={<Key className="h-5 w-5" />} />
          <StatCard
            title="Assigned"
            value={stats.assignedSeats}
            subtitle="Seats currently in use"
            icon={<ShieldCheck className="h-5 w-5 text-green-500" />}
          />
          <StatCard
            title="Unused"
            value={stats.unusedSeats}
            subtitle="Available headroom"
            icon={<PackageOpen className="h-5 w-5 text-muted-foreground" />}
          />
        </div>
      )}

      {/* ── License table ───────────────────────────────────────────────── */}
      <div>
        {/* Filter bar */}
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" aria-hidden />
            <Input
              className="pl-9"
              placeholder="Search licenses..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search licenses"
            />
          </div>

          <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v as LicenseStatus | 'all')}>
            <SelectTrigger className="w-[150px]" aria-label="Filter by status">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="in_use">In use</SelectItem>
              <SelectItem value="unused">Unused</SelectItem>
            </SelectContent>
          </Select>

          <span className="text-xs text-muted-foreground ml-auto">
            {filtered.length} {filtered.length === 1 ? 'license' : 'licenses'}
          </span>
        </div>

        {/* Table */}
        {error ? (
          <EmptyState
            icon={<Key className="h-10 w-10" />}
            title="Couldn’t load licenses"
            description={error}
            action={
              <Button size="sm" variant="outline" onClick={() => setReloadKey((k) => k + 1)}>
                Retry
              </Button>
            }
          />
        ) : loading ? (
          <TableSkeleton rows={6} cols={4} />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<Key className="h-10 w-10" />}
            title="No licenses found"
            description="Try adjusting your filters or search query."
          />
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>Assigned</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((l) => (
                  <TableRow
                    key={l.id}
                    className="cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => navigate(`/licenses/${encodeURIComponent(l.id)}`)}
                    tabIndex={0}
                    role="button"
                    aria-label={`View ${l.product}`}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        navigate(`/licenses/${encodeURIComponent(l.id)}`);
                      }
                    }}
                  >
                    <TableCell>
                      <div className="font-medium text-sm">{l.product}</div>
                    </TableCell>
                    <TableCell className="text-sm tabular-nums">
                      {l.consumedUnits}/{l.totalUnits}
                    </TableCell>
                    <TableCell>
                      <LicenseStatusBadge status={l.status} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
}
