import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useServices } from '@/services/context';
import { useSessionStore } from '@/store/session';
import type { NewsItem } from '@/services/types';
import { PageHeader } from '@/components/common/PageHeader';
import { TableSkeleton } from '@/components/common/TableSkeleton';
import { EmptyState } from '@/components/common/EmptyState';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Newspaper, Pin } from 'lucide-react';
import { formatRelative } from '@/lib/format';
import { cn } from '@/lib/utils';

const CATEGORY_STYLES: Record<string, string> = {
  security: 'bg-red-100 text-red-800 border-red-200',
  maintenance: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  announcement: 'bg-blue-100 text-blue-800 border-blue-200',
};

function CategoryBadge({ category }: { category: string }) {
  const cls = CATEGORY_STYLES[category.toLowerCase()] ?? 'bg-muted text-muted-foreground border-border';
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold capitalize ${cls}`}
    >
      {category}
    </span>
  );
}

export function NewsPage() {
  const { news } = useServices();
  const { activeTenantId } = useSessionStore();
  const navigate = useNavigate();
  const [data, setData] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  useEffect(() => {
    setLoading(true);
    news
      .list(activeTenantId, { pageSize: 50 })
      .then((r) => setData(r.data))
      .finally(() => setLoading(false));
  }, [activeTenantId, news]);

  const categories = useMemo(() => {
    const cats = new Set(data.map((d) => d.category));
    return ['All', ...Array.from(cats).sort()];
  }, [data]);

  // Pinned first, then filtered by category
  const filtered = useMemo(() => {
    const byCategory =
      selectedCategory === 'All'
        ? data
        : data.filter((d) => d.category === selectedCategory);
    return [...byCategory].sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
    });
  }, [data, selectedCategory]);

  return (
    <div>
      <PageHeader
        title="News & updates"
        subtitle="Latest IT announcements and security advisories"
      />

      {/* Category filter chips */}
      {!loading && categories.length > 1 && (
        <div
          className="flex flex-wrap gap-2 mb-5"
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

      {loading ? (
        <TableSkeleton rows={4} cols={2} />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Newspaper className="h-10 w-10" />}
          title="No articles found"
          description={
            selectedCategory !== 'All'
              ? `No articles in the "${selectedCategory}" category.`
              : 'No news yet.'
          }
          action={
            selectedCategory !== 'All' ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedCategory('All')}
              >
                Show all categories
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="space-y-4" role="feed" aria-label="News articles">
          {filtered.map((item) => (
            <Card
              key={item.id}
              className={cn(
                'cursor-pointer transition-shadow hover:shadow-md',
                item.pinned && 'ring-1 ring-primary/30 bg-primary/[0.02]',
              )}
              onClick={() => navigate(`/news/${item.id}`)}
              role="article"
              aria-label={item.title}
            >
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1 flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      {item.pinned && (
                        <Pin
                          className="h-3.5 w-3.5 text-primary shrink-0"
                          aria-label="Pinned"
                        />
                      )}
                      <h2 className="font-semibold text-sm leading-snug">{item.title}</h2>
                    </div>
                  </div>
                  <CategoryBadge category={item.category} />
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-sm text-muted-foreground line-clamp-2">{item.excerpt}</p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground mt-2">
                  <span>{item.author}</span>
                  <span aria-hidden="true">·</span>
                  <time dateTime={item.publishedAt}>{formatRelative(item.publishedAt)}</time>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
