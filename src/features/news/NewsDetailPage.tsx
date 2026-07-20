import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useServices } from '@/services/context';
import { useSessionStore } from '@/store/session';
import type { NewsItem } from '@/services/types';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, CalendarDays, User, Pin } from 'lucide-react';
import { formatDate } from '@/lib/format';
import { MarkdownRenderer } from '@/features/documents/MarkdownRenderer';

const CATEGORY_VARIANT: Record<string, string> = {
  security: 'bg-red-100 text-red-800 border-red-200',
  maintenance: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  announcement: 'bg-blue-100 text-blue-800 border-blue-200',
};

function CategoryBadge({ category }: { category: string }) {
  const cls = CATEGORY_VARIANT[category.toLowerCase()] ?? 'bg-muted text-muted-foreground';
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold capitalize ${cls}`}
    >
      {category}
    </span>
  );
}

export function NewsDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { news } = useServices();
  const { activeTenantId } = useSessionStore();
  const [item, setItem] = useState<NewsItem | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    news.get(activeTenantId, id).then(setItem).finally(() => setLoading(false));
  }, [id, activeTenantId, news]);

  if (loading) {
    return (
      <div className="max-w-3xl space-y-4">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!item) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <p className="text-lg font-medium">Article not found</p>
        <p className="text-sm text-muted-foreground mt-1">
          It may have been removed or moved.
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate('/news')}
          className="mt-4 gap-1"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to news
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => navigate('/news')}
        className="gap-1 mb-6 -ml-2"
        aria-label="Back to news"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back to news
      </Button>

      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-3">
          <CategoryBadge category={item.category} />
          {item.pinned && (
            <span className="inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold bg-muted text-muted-foreground">
              <Pin className="h-3 w-3" aria-hidden="true" />
              Pinned
            </span>
          )}
        </div>

        <h1 className="text-2xl font-semibold tracking-tight">{item.title}</h1>

        <div className="flex flex-wrap items-center gap-4 mt-3 text-sm text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <User className="h-4 w-4" aria-hidden="true" />
            {item.author}
          </span>
          <span className="flex items-center gap-1.5">
            <CalendarDays className="h-4 w-4" aria-hidden="true" />
            {formatDate(item.publishedAt)}
          </span>
        </div>
      </div>

      <Separator className="mb-6" />

      {/* Body */}
      <MarkdownRenderer body={item.body} className="text-foreground" />
    </div>
  );
}
