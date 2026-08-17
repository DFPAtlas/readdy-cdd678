import { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useProjectFiles } from '@/hooks/useProjectFiles';
import { ProjectSectionHeader } from '@/pages/projects/components/ProjectSectionHeader';
import { SearchInput } from '@/components/ui/SearchInput';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { ErrorState } from '@/components/ui/ErrorState';
import { EmptyState } from '@/components/ui/EmptyState';
import { LinkButton } from '@/pages/dashboard/components/LinkButton';
import { StructureList } from './components/StructureList';
import { FileDetailsPanel } from './components/FileDetailsPanel';
import { Files, FolderSearch, Lock, AlertTriangle, RefreshCw } from 'lucide-react';

type FilterKind = 'all' | 'page' | 'component' | 'section' | 'theme';

const filters: { value: FilterKind; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'page', label: 'Pages' },
  { value: 'component', label: 'Components' },
  { value: 'section', label: 'Sections' },
  { value: 'theme', label: 'Theme' },
];

function FilesSkeleton() {
  return (
    <div>
      <div className="mb-6">
        <Skeleton className="h-3 w-40 mb-3" />
        <Skeleton className="h-6 w-48 mb-2" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </div>
      <div className="flex items-center gap-2 mb-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-8 w-48" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Skeleton className="h-80" />
        <Skeleton className="h-80 lg:col-span-2" />
      </div>
    </div>
  );
}

export default function FilesPage() {
  const { projectId } = useParams();
  const { data, loading, error, retry } = useProjectFiles(projectId);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterKind>('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const query = search.trim().toLowerCase();

  const visibleGroups = useMemo(() => {
    return data.groups
      .map((g) => ({
        ...g,
        children: g.children.filter((n) => {
          if (filter !== 'all' && n.kind !== filter) return false;
          if (
            query &&
            !(
              n.name.toLowerCase().includes(query) ||
              n.detail.toLowerCase().includes(query) ||
              n.summary.toLowerCase().includes(query)
            )
          ) {
            return false;
          }
          return true;
        }),
      }))
      .filter((g) => g.children.length > 0);
  }, [data.groups, filter, query]);

  const allNodes = useMemo(() => data.groups.flatMap((g) => g.children), [data.groups]);
  const selectedNode =
    allNodes.find((n) => n.id === selectedId) ?? allNodes[0] ?? null;

  if (loading) return <FilesSkeleton />;

  if (error) {
    return (
      <ErrorState
        title="Unable to load project files"
        message="Something went wrong while loading this project's structure. Please try again."
        onRetry={retry}
      />
    );
  }

  if (!data.authenticated) {
    return (
      <EmptyState
        icon={<Lock className="h-8 w-8" />}
        title="Sign in to view this project"
        description="You need to be signed in to see your Forge project structure."
        action={
          <LinkButton variant="secondary" to="/login">
            Sign in
          </LinkButton>
        }
      />
    );
  }

  if (!data.found || !data.project) {
    return (
      <EmptyState
        icon={<AlertTriangle className="h-8 w-8" />}
        title="Project not found"
        description="The project you're looking for doesn't exist or has been removed."
        action={
          <LinkButton variant="secondary" to="/projects">
            Back to Projects
          </LinkButton>
        }
      />
    );
  }

  const isFiltering = query.length > 0 || filter !== 'all';

  return (
    <>
      <ProjectSectionHeader
        eyebrow="Project"
        title="Files"
        description="Browse the structure that makes up this Forge project. Forge stores your project as pages, components and theme settings rather than a traditional file system."
        projectId={data.project.id}
        projectName={data.project.name}
        actions={
          <Button variant="secondary" size="sm" onClick={retry} icon={<RefreshCw className="h-3.5 w-3.5" />}>
            Refresh
          </Button>
        }
      />

      {/* Search + filters */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search files..."
          className="w-64"
          ariaLabel="Search files"
        />
        <div className="flex items-center gap-1 flex-wrap">
          {filters.map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={`px-3 py-1 text-xs rounded-full transition-colors whitespace-nowrap ${
                filter === f.value
                  ? 'bg-forge-amber text-forge-text-inverse'
                  : 'bg-forge-panel text-forge-text-secondary hover:bg-forge-hover border border-forge-border-subtle'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        {isFiltering && (
          <button
            onClick={() => {
              setSearch('');
              setFilter('all');
            }}
            className="text-xs text-forge-amber hover:text-forge-amber-dim whitespace-nowrap ml-auto"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Empty states */}
      {data.totalNodes === 0 ? (
        <EmptyState
          icon={<FolderSearch className="h-8 w-8" />}
          title="This project doesn't contain files yet"
          description="Open the Sandbox to start planning pages and building your project structure."
          action={
            <LinkButton to={`/projects/${data.project.id}/sandbox`}>
              <Files className="h-3.5 w-3.5" />
              Open Sandbox
            </LinkButton>
          }
        />
      ) : visibleGroups.length === 0 ? (
        <EmptyState
          icon={<FolderSearch className="h-8 w-8" />}
          title="No files match your search"
          description="Try a different search term or clear your filters."
          action={
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setSearch('');
                setFilter('all');
              }}
            >
              Clear search
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Structure tree */}
          <div className="rounded-lg border border-forge-border-subtle bg-forge-panel overflow-y-auto max-h-[calc(100vh-16rem)]">
            <div className="px-3 py-2 border-b border-forge-border-subtle">
              <p className="text-[11px] font-semibold text-forge-text-muted uppercase tracking-wider">
                Project structure
              </p>
            </div>
            <StructureList
              groups={visibleGroups}
              selectedId={selectedNode?.id ?? null}
              onSelect={(n) => setSelectedId(n.id)}
              defaultExpanded={isFiltering}
            />
          </div>

          {/* Details */}
          <div className="lg:col-span-2 rounded-lg border border-forge-border-subtle bg-forge-panel min-h-[24rem]">
            <FileDetailsPanel node={selectedNode} />
          </div>
        </div>
      )}
    </>
  );
}