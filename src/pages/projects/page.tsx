import { useMemo, useState } from 'react';
import { useProjects } from '@/hooks/useProjects';
import { ErrorState } from '@/components/ui/ErrorState';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { Button } from '@/components/ui/Button';
import { LinkButton } from '@/pages/dashboard/components/LinkButton';
import { ProjectsHeader } from './components/ProjectsHeader';
import {
  ProjectsToolbar,
  type ProjectsViewMode,
  type ProjectsSort,
} from './components/ProjectsToolbar';
import { ProjectCard } from './components/ProjectCard';
import { ProjectListView } from './components/ProjectListView';
import { FolderPlus, Search } from 'lucide-react';
import type { ProjectStatusValue } from '@/services/projectsService';

const VIEW_STORAGE_KEY = 'forge:projects:view';

function readStoredView(): ProjectsViewMode {
  try {
    return window.localStorage.getItem(VIEW_STORAGE_KEY) === 'list' ? 'list' : 'grid';
  } catch {
    return 'grid';
  }
}

function ProjectsSkeleton() {
  return (
    <div>
      <div className="mb-6">
        <Skeleton className="h-3 w-16 mb-2" />
        <Skeleton className="h-6 w-40 mb-1" />
        <Skeleton className="h-4 w-72" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="h-36 w-full" />
        ))}
      </div>
    </div>
  );
}

export default function ProjectsPage() {
  const { projects, loading, error, retry } = useProjects();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<ProjectStatusValue | 'all'>('all');
  const [sort, setSort] = useState<ProjectsSort>('updated');
  const [viewMode, setViewMode] = useState<ProjectsViewMode>(readStoredView);

  const handleViewMode = (mode: ProjectsViewMode) => {
    setViewMode(mode);
    try {
      window.localStorage.setItem(VIEW_STORAGE_KEY, mode);
    } catch {
      // Ignore storage failures — preference is non-critical.
    }
  };

  const filtered = useMemo(() => {
    const query = search.toLowerCase().trim();

    const result = projects
      .filter((p) => {
        if (statusFilter !== 'all' && p.status !== statusFilter) return false;
        if (query) {
          const name = p.name.toLowerCase();
          const description = (p.description ?? '').toLowerCase();
          if (!name.includes(query) && !description.includes(query)) return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (sort === 'name') return a.name.localeCompare(b.name);
        if (sort === 'created') {
          return new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime();
        }
        return new Date(b.updatedAt ?? 0).getTime() - new Date(a.updatedAt ?? 0).getTime();
      });

    return result;
  }, [projects, search, statusFilter, sort]);

  if (error) {
    return <ErrorState title="Unable to load projects" onRetry={retry} />;
  }

  if (loading) {
    return <ProjectsSkeleton />;
  }

  const hasProjects = projects.length > 0;

  const clearSearch = () => {
    setSearch('');
    setStatusFilter('all');
  };

  return (
    <>
      <ProjectsHeader />

      <ProjectsToolbar
        search={search}
        onSearch={setSearch}
        statusFilter={statusFilter}
        onStatusFilter={setStatusFilter}
        sort={sort}
        onSort={setSort}
        viewMode={viewMode}
        onViewMode={handleViewMode}
      />

      {!hasProjects ? (
        <EmptyState
          icon={<FolderPlus className="h-10 w-10" />}
          title="No projects yet"
          description="Create your first Forge project and start turning the idea into a structured build."
          action={
            <div className="flex flex-wrap items-center justify-center gap-2">
              <LinkButton to="/projects/new" variant="primary">
                Create a project
              </LinkButton>
              <LinkButton to="/templates" variant="secondary">
                Browse Templates
              </LinkButton>
            </div>
          }
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Search className="h-10 w-10" />}
          title="No matching projects"
          description="No projects match your search or filters."
          action={
            <Button variant="secondary" size="sm" onClick={clearSearch}>
              Clear search
            </Button>
          }
        />
      ) : (
        <>
          <div
            className={`grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-3 ${
              viewMode === 'list' ? 'lg:hidden' : ''
            }`}
          >
            {filtered.map((p) => (
              <ProjectCard key={p.id} project={p} />
            ))}
          </div>

          {viewMode === 'list' && <ProjectListView projects={filtered} />}
        </>
      )}
    </>
  );
}