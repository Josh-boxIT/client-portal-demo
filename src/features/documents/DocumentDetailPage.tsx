import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useServices } from '@/services/context';
import { useSessionStore } from '@/store/session';
import type { Document } from '@/services/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, CalendarDays, User, FolderOpen } from 'lucide-react';
import { formatDate } from '@/lib/format';
import { MarkdownRenderer } from './MarkdownRenderer';

export function DocumentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { documents } = useServices();
  const { activeTenantId } = useSessionStore();
  const [doc, setDoc] = useState<Document | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    documents.get(activeTenantId, id).then(setDoc).finally(() => setLoading(false));
  }, [id, activeTenantId, documents]);

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

  if (!doc) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <p className="text-lg font-medium">Document not found</p>
        <p className="text-sm text-muted-foreground mt-1">
          It may have been moved or deleted.
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate('/documents')}
          className="mt-4 gap-1"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to documents
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => navigate('/documents')}
        className="gap-1 mb-6 -ml-2"
        aria-label="Back to documents"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back to documents
      </Button>

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">{doc.title}</h1>

        <div className="flex flex-wrap items-center gap-4 mt-3 text-sm text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <FolderOpen className="h-4 w-4" aria-hidden="true" />
            {doc.folder}
          </span>
          <span className="flex items-center gap-1.5">
            <User className="h-4 w-4" aria-hidden="true" />
            {doc.author}
          </span>
          <span className="flex items-center gap-1.5">
            <CalendarDays className="h-4 w-4" aria-hidden="true" />
            Updated {formatDate(doc.updatedAt)}
          </span>
        </div>

        {doc.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3" aria-label="Tags">
            {doc.tags.map((tag) => (
              <Badge key={tag} variant="secondary" className="text-xs">
                {tag}
              </Badge>
            ))}
          </div>
        )}
      </div>

      <Separator className="mb-6" />

      {/* Body */}
      <MarkdownRenderer body={doc.body} className="text-foreground" />
    </div>
  );
}
