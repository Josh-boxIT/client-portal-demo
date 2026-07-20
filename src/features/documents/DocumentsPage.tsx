import { useEffect, useState, useMemo } from 'react';
import { useServices } from '@/services/context';
import { useSessionStore } from '@/store/session';
import type { Document } from '@/services/types';
import { PageHeader } from '@/components/common/PageHeader';
import { EmptyState } from '@/components/common/EmptyState';
import { TableSkeleton } from '@/components/common/TableSkeleton';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FileText, Search, FolderOpen, Folder } from 'lucide-react';
import { formatRelative } from '@/lib/format';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

export function DocumentsPage() {
  const { documents } = useServices();
  const { activeTenantId } = useSessionStore();
  const navigate = useNavigate();
  const [data, setData] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedFolder, setSelectedFolder] = useState<string>('All');

  useEffect(() => {
    setLoading(true);
    documents
      .list(activeTenantId, { pageSize: 100 })
      .then((r) => setData(r.data))
      .finally(() => setLoading(false));
  }, [activeTenantId, documents]);

  const folders = useMemo(() => {
    const folderSet = new Set(data.map((d) => d.folder));
    return ['All', ...Array.from(folderSet).sort()];
  }, [data]);

  const filtered = useMemo(() => {
    return data.filter((doc) => {
      const matchFolder = selectedFolder === 'All' || doc.folder === selectedFolder;
      const q = search.toLowerCase();
      const matchSearch =
        !q ||
        doc.title.toLowerCase().includes(q) ||
        doc.excerpt.toLowerCase().includes(q) ||
        doc.tags.some((t) => t.toLowerCase().includes(q));
      return matchFolder && matchSearch;
    });
  }, [data, search, selectedFolder]);

  return (
    <div>
      <PageHeader title="Documents" subtitle="Knowledge base and IT documentation" />

      <div className="flex flex-col md:flex-row gap-6">
        {/* Folder sidebar */}
        <nav
          className="md:w-48 shrink-0"
          aria-label="Document folders"
        >
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 px-2">
            Folders
          </p>
          <ul className="space-y-0.5">
            {folders.map((folder) => {
              const isActive = folder === selectedFolder;
              const count =
                folder === 'All'
                  ? data.length
                  : data.filter((d) => d.folder === folder).length;
              return (
                <li key={folder}>
                  <button
                    className={cn(
                      'w-full flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-left transition-colors',
                      isActive
                        ? 'bg-primary/10 text-primary font-medium'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                    )}
                    onClick={() => setSelectedFolder(folder)}
                    aria-current={isActive ? 'page' : undefined}
                  >
                    {folder === 'All' ? (
                      <FolderOpen className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                    ) : (
                      <Folder className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                    )}
                    <span className="flex-1 truncate">{folder}</span>
                    <span className="text-xs tabular-nums">{count}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Document list */}
        <div className="flex-1 min-w-0">
          {/* Search */}
          <div className="relative mb-4 max-w-sm">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              className="pl-9"
              placeholder="Search documents…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search documents"
            />
          </div>

          {loading ? (
            <TableSkeleton rows={4} cols={3} />
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={<FileText className="h-10 w-10" />}
              title="No documents found"
              description={
                search
                  ? `No results for "${search}".`
                  : 'This folder is empty.'
              }
              action={
                (search || selectedFolder !== 'All') ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSearch('');
                      setSelectedFolder('All');
                    }}
                  >
                    Clear filters
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filtered.map((doc) => (
                <Card
                  key={doc.id}
                  className="cursor-pointer hover:shadow-md transition-shadow group"
                  onClick={() => navigate(`/documents/${doc.id}`)}
                  role="article"
                  aria-label={doc.title}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 h-8 w-8 shrink-0 rounded-md bg-primary/10 flex items-center justify-center">
                        <FileText
                          className="h-4 w-4 text-primary"
                          aria-hidden="true"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm group-hover:text-primary transition-colors">
                          {doc.title}
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                          {doc.excerpt}
                        </div>
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          <Badge variant="outline" className="text-xs">
                            {doc.folder}
                          </Badge>
                          {doc.tags.slice(0, 2).map((tag) => (
                            <Badge
                              key={tag}
                              variant="secondary"
                              className="text-xs"
                            >
                              {tag}
                            </Badge>
                          ))}
                          <span className="text-xs text-muted-foreground ml-auto">
                            {formatRelative(doc.updatedAt)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
