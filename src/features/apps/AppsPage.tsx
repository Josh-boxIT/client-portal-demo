import { useEffect, useState, useMemo } from 'react';
import { useServices } from '@/services/context';
import { useSessionStore } from '@/store/session';
import type { AppTile } from '@/services/types';
import { PageHeader } from '@/components/common/PageHeader';
import { CardSkeleton } from '@/components/common/CardSkeleton';
import { EmptyState } from '@/components/common/EmptyState';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Mail,
  MessageSquare,
  FolderOpen,
  BarChart3,
  Cloud,
  Truck,
  Users,
  FileText,
  Server,
  Headphones,
  LayoutGrid,
  Search,
  ExternalLink,
  Globe,
  ShoppingCart,
  Calendar,
  Lock,
  Database,
  Settings,
  Video,
  Zap,
  BookOpen,
  CreditCard,
  HardDrive,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

// ─── Icon resolver ────────────────────────────────────────────────────────────

const ICON_MAP: Record<string, LucideIcon> = {
  Mail,
  MessageSquare,
  FolderOpen,
  BarChart3,
  Cloud,
  Truck,
  Users,
  FileText,
  Server,
  Headphones,
  LayoutGrid,
  Globe,
  ShoppingCart,
  Calendar,
  Lock,
  Database,
  Settings,
  Video,
  Zap,
  BookOpen,
  CreditCard,
  HardDrive,
  Search,
  ExternalLink,
};

function resolveIcon(key: string): LucideIcon {
  return ICON_MAP[key] ?? Globe;
}

// ─── Launch dialog ────────────────────────────────────────────────────────────

interface LaunchDialogProps {
  app: AppTile | null;
  onClose: () => void;
}

function LaunchDialog({ app, onClose }: LaunchDialogProps) {
  if (!app) return null;

  const Icon = resolveIcon(app.icon);

  return (
    <Dialog open={!!app} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <div className="flex justify-center mb-3">
            <div
              className="h-16 w-16 rounded-2xl flex items-center justify-center text-white shadow-md"
              style={{ backgroundColor: app.color || '#6366f1' }}
              aria-hidden="true"
            >
              <Icon className="h-8 w-8" />
            </div>
          </div>
          <DialogTitle className="text-center">Launching {app.name}</DialogTitle>
          <DialogDescription className="text-center">
            {app.description}
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-md bg-muted/60 border border-border p-4 text-center my-2">
          <p className="text-sm text-muted-foreground">
            This is a demo launchpad. In production, this would open your SSO session for{' '}
            <strong className="text-foreground">{app.name}</strong>.
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button
            className="flex-1 gap-2"
            onClick={onClose}
            aria-label={`Launch ${app.name} (demo)`}
          >
            <ExternalLink className="h-4 w-4" aria-hidden="true" />
            Launch (demo)
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── App tile ─────────────────────────────────────────────────────────────────

interface AppTileCardProps {
  app: AppTile;
  onClick: () => void;
}

function AppTileCard({ app, onClick }: AppTileCardProps) {
  const Icon = resolveIcon(app.icon);

  return (
    <Card
      className="cursor-pointer hover:shadow-md transition-all hover:-translate-y-0.5 group focus-within:ring-2 focus-within:ring-ring"
      role="listitem"
    >
      <CardContent className="p-5 flex flex-col items-center text-center gap-3">
        <button
          className="flex flex-col items-center gap-3 w-full focus:outline-none"
          onClick={onClick}
          aria-label={`Launch ${app.name}`}
        >
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-sm group-hover:shadow-md transition-shadow"
            style={{ backgroundColor: app.color || '#6366f1' }}
            aria-hidden="true"
          >
            <Icon className="h-7 w-7" />
          </div>
          <div className="font-medium text-sm leading-tight">{app.name}</div>
        </button>
        {app.category && (
          <Badge variant="outline" className="text-xs">
            {app.category}
          </Badge>
        )}
        {app.description && (
          <p className="text-xs text-muted-foreground line-clamp-2">{app.description}</p>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export function AppsPage() {
  const { apps } = useServices();
  const { activeTenantId } = useSessionStore();
  const [data, setData] = useState<AppTile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [launchApp, setLaunchApp] = useState<AppTile | null>(null);

  useEffect(() => {
    setLoading(true);
    apps
      .list(activeTenantId, { pageSize: 50 })
      .then((r) => setData(r.data))
      .finally(() => setLoading(false));
  }, [activeTenantId, apps]);

  const categories = useMemo(() => {
    const cats = new Set(data.map((a) => a.category));
    return ['All', ...Array.from(cats).sort()];
  }, [data]);

  const filtered = useMemo(() => {
    return data.filter((app) => {
      const matchCat = selectedCategory === 'All' || app.category === selectedCategory;
      const q = search.toLowerCase();
      const matchSearch =
        !q ||
        app.name.toLowerCase().includes(q) ||
        app.category.toLowerCase().includes(q) ||
        app.description.toLowerCase().includes(q);
      return matchCat && matchSearch;
    });
  }, [data, search, selectedCategory]);

  return (
    <div>
      <PageHeader
        title="App launchpad"
        subtitle="Quick access to your business applications"
      />

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            className="pl-9"
            placeholder="Search apps…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search applications"
          />
        </div>

        {!loading && categories.length > 1 && (
          <div
            className="flex flex-wrap gap-2"
            role="group"
            aria-label="Filter by category"
          >
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                aria-pressed={cat === selectedCategory}
                className={cn(
                  'rounded-full border px-3 py-1 text-xs font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  cat === selectedCategory
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-background text-muted-foreground border-border hover:bg-muted hover:text-foreground',
                )}
              >
                {cat}
              </button>
            ))}
          </div>
        )}
      </div>

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<LayoutGrid className="h-10 w-10" />}
          title={search || selectedCategory !== 'All' ? 'No apps match your filter' : 'No apps configured'}
          description={
            search
              ? `No results for "${search}".`
              : selectedCategory !== 'All'
                ? `No apps in the "${selectedCategory}" category.`
                : 'Applications will appear here when configured.'
          }
          action={
            (search || selectedCategory !== 'All') ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearch('');
                  setSelectedCategory('All');
                }}
              >
                Clear filters
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div
          className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4"
          role="list"
          aria-label="Applications"
        >
          {filtered.map((app) => (
            <AppTileCard
              key={app.id}
              app={app}
              onClick={() => setLaunchApp(app)}
            />
          ))}
        </div>
      )}

      <LaunchDialog app={launchApp} onClose={() => setLaunchApp(null)} />
    </div>
  );
}
