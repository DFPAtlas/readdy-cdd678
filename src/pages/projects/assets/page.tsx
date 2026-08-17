import { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useProjectAssets } from '@/hooks/useProjectAssets';
import { ProjectSectionHeader } from '@/pages/projects/components/ProjectSectionHeader';
import { SearchInput } from '@/components/ui/SearchInput';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { ErrorState } from '@/components/ui/ErrorState';
import { EmptyState } from '@/components/ui/EmptyState';
import { LinkButton } from '@/pages/dashboard/components/LinkButton';
import { AssetGrid } from './components/AssetGrid';
import { AssetListView } from './components/AssetListView';
import { AssetDetailsPanel } from './components/AssetDetailsPanel';
import { UploadButton } from './components/UploadButton';
import { Image as ImageIcon, Lock, AlertTriangle, RefreshCw, Grid3X3, List } from 'lucide-react';

type TypeFilter = 'all' | 'image' | 'video' | 'document' | 'other';

const typeFilters: { value: TypeFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'image', label: 'Images' },
  { value: 'video', label: 'Video' },
  { value: 'document', label: 'Documents' },
  { value: 'other', label: 'Other' },
];

function assetBucket(type: string): 'image' | 'video' | 'document' | 'other' {
  if (type === 'image' || type === 'svg') return 'image';
  if (type === 'video') return 'video';
  if (type === 'document') return 'document';
  return 'other';
}

function AssetsSkeleton() {
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
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="aspect-square" />
        ))}
      </div>
    </div>
  );
}

export default function AssetsPage() {
  const { projectId } = useParams();
  const { data, loading, error, retry, upload, remove, rename } = useProjectAssets(projectId);

  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selected = data.assets.find((a) => a.id === selectedId) ?? null;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return data.assets.filter((a) => {
      if (typeFilter !== 'all' && assetBucket(a.type) !== typeFilter) return false;
      if (q && !a.name.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [data.assets, typeFilter, search]);

  if (loading) return <AssetsSkeleton />;

  if (error) {
    return (
      <ErrorState
        title="Unable to load project assets"
        message="Something went wrong while loading this project's assets. Please try again."
        onRetry={retry}
      />
    );
  }

  if (!data.authenticated) {
    return (
      <EmptyState
        icon={<Lock className="h-8 w-8" />}
        title="Sign in to view this project"
        description="You need to be signed in to manage your Forge project assets."
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

  const isFiltering = search.trim().length > 0 || typeFilter !== 'all';

  return (
    <>
      <ProjectSectionHeader
        eyebrow="Project"
        title="Assets"
        description="Manage the images and media used throughout this Forge project."
        projectId={data.project.id}
        projectName={data.project.name}
        actions={
          <Button
            variant="secondary"
            size="sm"
            onClick={retry}
            icon={<RefreshCw className="h-3.5 w-3.5" />}
          >
            Refresh
          </Button>
        }
      />

      {/* Search + filters + view controls */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search assets..."
          className="w-64"
          ariaLabel="Search assets"
        />
        <div className="flex items-center gap-1 flex-wrap">
          {typeFilters.map((f) => (
            <button
              key={f.value}
              onClick={() => setTypeFilter(f.value)}
              className={`px-3 py-1 text-xs rounded-full transition-colors whitespace-nowrap ${
                typeFilter === f.value
                  ? 'bg-forge-amber text-forge-text-inverse'
                  : 'bg-forge-panel text-forge-text-secondary hover:bg-forge-hover border border-forge-border-subtle'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-1 bg-forge-panel border border-forge-border-subtle rounded-md p-0.5">
          <button
            onClick={() => setViewMode('grid')}
            className={`px-2 py-1 rounded transition-colors ${
              viewMode === 'grid' ? 'bg-forge-border text-forge-text-primary' : 'text-forge-text-muted'
            }`}
            aria-label="Grid view"
            aria-pressed={viewMode === 'grid'}
          >
            <Grid3X3 className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`px-2 py-1 rounded transition-colors ${
              viewMode === 'list' ? 'bg-forge-border text-forge-text-primary' : 'text-forge-text-muted'
            }`}
            aria-label="List view"
            aria-pressed={viewMode === 'list'}
          >
            <List className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Upload */}
      <div className="mb-5">
        <UploadButton onUpload={upload} />
      </div>

      {/* Content */}
      {data.assets.length === 0 ? (
        <EmptyState
          icon={<ImageIcon className="h-8 w-8" />}
          title="No assets yet"
          description="Upload your first image, video or document to use it throughout your project."
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<ImageIcon className="h-8 w-8" />}
          title="No assets match your search"
          description="Try a different search term or clear your filters."
          action={
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setSearch('');
                setTypeFilter('all');
              }}
            >
              Clear filters
            </Button>
          }
        />
      ) : viewMode === 'grid' ? (
        <AssetGrid
          assets={filtered}
          selectedId={selectedId}
          onSelect={(a) => setSelectedId(a.id)}
        />
      ) : (
        <AssetListView
          assets={filtered}
          selectedId={selectedId}
          onSelect={(a) => setSelectedId(a.id)}
        />
      )}

      {isFiltering && (
        <p className="mt-3 text-xs text-forge-text-muted">
          {filtered.length} of {data.assets.length} assets shown
        </p>
      )}

      <AssetDetailsPanel
        asset={selected}
        onClose={() => setSelectedId(null)}
        onDelete={remove}
        onRename={rename}
      />
    </>
  );
}