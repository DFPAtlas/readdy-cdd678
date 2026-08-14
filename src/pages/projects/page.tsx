import { useState } from 'react';
import { Link } from 'react-router-dom';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { SearchInput } from '@/components/ui/SearchInput';
import { demoProjects } from '@/services/mock/demoData';
import { useProjectStore } from '@/stores/index';
import { FolderKanban, Plus, ArrowRight, Search, SlidersHorizontal, Grid3X3, List, Archive, MoreHorizontal } from 'lucide-react';

const statusColorMap: Record<string, 'success' | 'warning' | 'amber' | 'default'> = {
  active: 'success',
  building: 'amber',
  draft: 'warning',
  archived: 'default',
};

export default function ProjectsPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showArchived, setShowArchived] = useState(false);
  const [sortBy, setSortBy] = useState('updated');
  const [confirmAction, setConfirmAction] = useState<{ projectId: string; action: string } | null>(null);
  const setActiveProject = useProjectStore((s) => s.setActiveProject);

  // Local state for pinning/archiving (demo persistence)
  const [pinnedIds, setPinnedIds] = useState<string[]>(['proj-001']);
  const [archivedIds, setArchivedIds] = useState<string[]>(['proj-005']);
  const [renamedProjects, setRenamedProjects] = useState<Record<string, string>>({});

  const allProjects = demoProjects.map((p) => ({
    ...p,
    name: renamedProjects[p.id] || p.name,
  }));

  let filtered = allProjects.filter((p) => {
    const isArchived = archivedIds.includes(p.id) || p.status === 'archived';
    if (!showArchived && isArchived) return false;
    if (statusFilter !== 'all' && p.status !== statusFilter) return false;
    if (typeFilter !== 'all') {
      const pt = p.blueprint?.type || 'other';
      if (pt !== typeFilter) return false;
    }
    if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  // Sort
  filtered.sort((a, b) => {
    if (sortBy === 'name') return a.name.localeCompare(b.name);
    if (sortBy === 'version') return b.stats.versionCount - a.stats.versionCount;
    // updated — pinned first, then by updatedAt
    const aPin = pinnedIds.includes(a.id) ? -1 : 0;
    const bPin = pinnedIds.includes(b.id) ? -1 : 0;
    if (aPin !== bPin) return aPin - bPin;
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });

  const handlePin = (id: string) => {
    setPinnedIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  };

  const handleRename = (id: string) => {
    const name = prompt('New project name:');
    if (name) setRenamedProjects((prev) => ({ ...prev, [id]: name }));
  };

  const handleArchive = (id: string) => {
    setArchivedIds((prev) => [...prev, id]);
    setConfirmAction(null);
  };

  const handleRestore = (id: string) => {
    setArchivedIds((prev) => prev.filter((x) => x !== id));
  };

  const handleDuplicate = (id: string) => {
    // Demo: just show a toast-like feedback via alert for now
    alert(`Project duplicated (demo)`);
  };

  return (
    <>
      <PageHeader
        title="Projects"
        description="Manage all your Forge website projects"
        actions={
          <Link to="/projects/new">
            <Button size="sm" icon={<Plus className="h-3.5 w-3.5" />}>New Project</Button>
          </Link>
        }
        breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Projects' }]}
      />

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <SearchInput value={search} onChange={setSearch} placeholder="Search projects..." className="w-56" />

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="h-8 px-2.5 text-xs rounded-lg border border-background-200 bg-white text-foreground-950 focus:outline-none focus:ring-1 focus:ring-amber-500"
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="building">Building</option>
          <option value="draft">Draft</option>
          <option value="archived">Archived</option>
        </select>

        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="h-8 px-2.5 text-xs rounded-lg border border-background-200 bg-white text-foreground-950 focus:outline-none focus:ring-1 focus:ring-amber-500"
        >
          <option value="all">All Types</option>
          <option value="saas">SaaS</option>
          <option value="ecommerce">Marketplace</option>
          <option value="portfolio">Portfolio</option>
        </select>

        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="h-8 px-2.5 text-xs rounded-lg border border-background-200 bg-white text-foreground-950 focus:outline-none focus:ring-1 focus:ring-amber-500"
        >
          <option value="updated">Last Updated</option>
          <option value="name">Name</option>
          <option value="version">Version</option>
        </select>

        <div className="flex-1" />

        <div className="flex items-center gap-1 bg-background-100 rounded-lg p-0.5">
          <button
            onClick={() => setViewMode('grid')}
            className={`px-2 py-1 rounded-md transition-colors ${viewMode === 'grid' ? 'bg-white text-foreground-950' : 'text-foreground-500 hover:text-foreground-700'}`}
            title="Grid view"
          >
            <Grid3X3 className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`px-2 py-1 rounded-md transition-colors ${viewMode === 'list' ? 'bg-white text-foreground-950' : 'text-foreground-500 hover:text-foreground-700'}`}
            title="List view"
          >
            <List className="h-3.5 w-3.5" />
          </button>
        </div>

        <button
          onClick={() => setShowArchived(!showArchived)}
          className={`flex items-center gap-1.5 h-8 px-2.5 text-xs rounded-lg border transition-colors whitespace-nowrap ${showArchived ? 'bg-foreground-100 border-foreground-300 text-foreground-950' : 'border-background-200 text-foreground-500 hover:text-foreground-700'}`}
        >
          <Archive className="h-3 w-3" />
          Archived
        </button>
      </div>

      {/* Empty state */}
      {filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <FolderKanban className="h-10 w-10 text-foreground-300 mb-3" />
          <p className="text-sm font-medium text-foreground-950">No projects found</p>
          <p className="text-xs text-foreground-500 mt-1">Try adjusting your search or filters</p>
        </div>
      )}

      {/* Grid view */}
      {viewMode === 'grid' && filtered.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((project) => {
            const isPinned = pinnedIds.includes(project.id);
            const isArchived = archivedIds.includes(project.id);

            return (
              <Card key={project.id} className="group relative">
                {isPinned && (
                  <div className="absolute top-2 right-2">
                    <span className="text-xs text-amber-500" title="Pinned">📌</span>
                  </div>
                )}
                <Link
                  to={`/projects/${project.id}/overview`}
                  onClick={() => setActiveProject(project)}
                  className="block p-3 -m-3"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="h-8 w-8 rounded-md bg-amber-500/10 flex items-center justify-center flex-shrink-0">
                        <FolderKanban className="h-4 w-4 text-amber-500" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-sm font-medium text-foreground-950 truncate">{project.name}</h3>
                        <p className="text-xs text-foreground-500">{project.blueprint?.type ? project.blueprint.type.charAt(0).toUpperCase() + project.blueprint.type.slice(1) : 'Project'} · v{project.stats.versionCount}</p>
                      </div>
                    </div>
                    <Badge variant={statusColorMap[project.status] || 'default'} size="sm" className="flex-shrink-0">
                      {project.status}
                    </Badge>
                  </div>
                  {project.description && (
                    <p className="text-xs text-foreground-500 mb-3 line-clamp-2">{project.description}</p>
                  )}
                  <div className="flex items-center gap-3 text-xs text-foreground-400">
                    <span>{project.stats.fileCount} files</span>
                    <span>{project.stats.buildCount} builds</span>
                    {project.stats.lastBuiltAt && (
                      <span>Built {new Date(project.stats.lastBuiltAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                    )}
                  </div>
                </Link>
                {/* Action buttons */}
                <div className="flex items-center gap-1 mt-3 pt-3 border-t border-background-100">
                  <Link to={`/projects/${project.id}/sandbox`} className="flex-1">
                    <Button variant="ghost" size="sm" className="w-full justify-center text-xs">Open</Button>
                  </Link>
                  <button onClick={() => handlePin(project.id)} className="p-1.5 rounded-md hover:bg-background-100 transition-colors" title={isPinned ? 'Unpin' : 'Pin'}>
                    {isPinned ? <i className="ri-bookmark-fill text-xs text-amber-500" /> : <i className="ri-bookmark-line text-xs text-foreground-400" />}
                  </button>
                  <div className="relative group/actions">
                    <button className="p-1.5 rounded-md hover:bg-background-100 transition-colors">
                      <MoreHorizontal className="h-3.5 w-3.5 text-foreground-400" />
                    </button>
                    <div className="absolute right-0 top-full mt-1 w-36 bg-white border border-background-200 rounded-lg shadow-lg py-1 z-20 opacity-0 invisible group-hover/actions:opacity-100 group-hover/actions:visible transition-all">
                      <button onClick={() => handleRename(project.id)} className="block w-full text-left px-3 py-1.5 text-xs text-foreground-700 hover:bg-background-50 whitespace-nowrap">Rename</button>
                      <button onClick={() => handleDuplicate(project.id)} className="block w-full text-left px-3 py-1.5 text-xs text-foreground-700 hover:bg-background-50 whitespace-nowrap">Duplicate</button>
                      <Link to={`/projects/${project.id}/exports`} className="block px-3 py-1.5 text-xs text-foreground-700 hover:bg-background-50 whitespace-nowrap">Export</Link>
                      {isArchived ? (
                        <button onClick={() => handleRestore(project.id)} className="block w-full text-left px-3 py-1.5 text-xs text-emerald-600 hover:bg-background-50 whitespace-nowrap">Restore</button>
                      ) : (
                        <button onClick={() => setConfirmAction({ projectId: project.id, action: 'archive' })} className="block w-full text-left px-3 py-1.5 text-xs text-rose-500 hover:bg-background-50 whitespace-nowrap">Archive</button>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* List view */}
      {viewMode === 'list' && filtered.length > 0 && (
        <Card className="overflow-hidden">
          <div className="divide-y divide-background-100">
            {filtered.map((project) => {
              const isPinned = pinnedIds.includes(project.id);
              const isArchived = archivedIds.includes(project.id);

              return (
                <div key={project.id} className="flex items-center px-4 py-2.5 hover:bg-background-50 transition-colors group">
                  <Link
                    to={`/projects/${project.id}/overview`}
                    onClick={() => setActiveProject(project)}
                    className="flex items-center gap-3 flex-1 min-w-0"
                  >
                    <div className="h-8 w-8 rounded-md bg-amber-500/10 flex items-center justify-center flex-shrink-0">
                      <FolderKanban className="h-4 w-4 text-amber-500" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-foreground-950 truncate">{project.name}</p>
                        {isPinned && <span className="text-xs text-amber-500 flex-shrink-0">📌</span>}
                      </div>
                      <p className="text-xs text-foreground-500">{project.blueprint?.type || 'Project'} · {project.stats.fileCount} files · {project.stats.buildCount} builds · v{project.stats.versionCount}</p>
                    </div>
                    <Badge variant={statusColorMap[project.status] || 'default'} size="sm" className="flex-shrink-0">{project.status}</Badge>
                    <span className="text-xs text-foreground-400 flex-shrink-0 ml-3">
                      {new Date(project.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                  </Link>
                  <div className="flex items-center gap-1 ml-3 flex-shrink-0">
                    <Link to={`/projects/${project.id}/sandbox`}>
                      <Button variant="ghost" size="sm" className="text-xs">Open</Button>
                    </Link>
                    <button onClick={() => handlePin(project.id)} className="p-1 rounded hover:bg-background-100 transition-colors" title={isPinned ? 'Unpin' : 'Pin'}>
                      {isPinned ? <i className="ri-bookmark-fill text-xs text-amber-500" /> : <i className="ri-bookmark-line text-xs text-foreground-400" />}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Confirmation modal */}
      {confirmAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={() => setConfirmAction(null)}>
          <div className="bg-white rounded-xl p-6 max-w-sm mx-4 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-sm font-semibold text-foreground-950 mb-2">
              {confirmAction.action === 'archive' ? 'Archive Project' : 'Delete Project'}
            </h3>
            <p className="text-xs text-foreground-500 mb-4">
              {confirmAction.action === 'archive'
                ? 'Archived projects are hidden from the main view but can be restored later.'
                : 'This action cannot be undone. All files and builds will be permanently deleted.'}
            </p>
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" size="sm" onClick={() => setConfirmAction(null)}>Cancel</Button>
              <Button
                size="sm"
                variant="danger"
                onClick={() => {
                  if (confirmAction.action === 'archive') handleArchive(confirmAction.projectId);
                  setConfirmAction(null);
                }}
              >
                {confirmAction.action === 'archive' ? 'Archive' : 'Delete'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}