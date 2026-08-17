import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Layers, RefreshCw, Lock, AlertTriangle, Plus, Settings } from 'lucide-react';
import { useProjectCms } from '@/hooks/useProjectCms';
import { ProjectSectionHeader } from '@/pages/projects/components/ProjectSectionHeader';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { ErrorState } from '@/components/ui/ErrorState';
import { EmptyState } from '@/components/ui/EmptyState';
import { LinkButton } from '@/pages/dashboard/components/LinkButton';
import { listItems, createCollection, deleteCollection } from './cmsData';
import type { CmsItem } from './cmsTypes';
import { CmsOverview } from './components/CmsOverview';
import { CmsNavRail } from './components/CmsNavRail';
import { CreateCollectionModal, type CreateCollectionInput } from './components/CreateCollectionModal';
import { ContentSection } from './components/ContentSection';
import { CollectionBuilder } from './components/CollectionBuilder';
import { CmsIcon } from './components/CmsIcon';

function CmsSkeleton() {
  return (
    <div>
      <div className="mb-6">
        <Skeleton className="h-3 w-40 mb-3" />
        <Skeleton className="h-6 w-32 mb-2" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-20" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-4">
        <Skeleton className="h-72" />
        <Skeleton className="h-72" />
      </div>
    </div>
  );
}

export default function CmsPage() {
  const { projectId } = useParams();
  const { data, loading, error, retry, refresh, refreshing } = useProjectCms(projectId);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [view, setView] = useState<'content' | 'settings'>('content');
  const [showCreate, setShowCreate] = useState(false);

  const [items, setItems] = useState<CmsItem[]>([]);
  const [itemsLoading, setItemsLoading] = useState(false);
  const [itemsError, setItemsError] = useState('');

  const selectedCollection = data.collections.find((c) => c.id === selectedId) ?? null;

  const canManage = data.role === 'owner' || data.role === 'admin';

  // Keep a valid collection selected as the list changes.
  useEffect(() => {
    if (data.collections.length === 0) {
      if (selectedId) setSelectedId(null);
      return;
    }
    if (!selectedId || !data.collections.some((c) => c.id === selectedId)) {
      setSelectedId(data.collections[0].id);
    }
  }, [data.collections, selectedId]);

  const refreshItems = useCallback(async () => {
    if (!projectId || !selectedId) return;
    setItemsLoading(true);
    setItemsError('');
    const list = await listItems(projectId, selectedId);
    setItems(list);
    setItemsLoading(false);
  }, [projectId, selectedId]);

  useEffect(() => {
    if (selectedId) {
      setView('content');
      void refreshItems();
    }
  }, [selectedId, refreshItems]);

  const handleCreate = async (input: CreateCollectionInput) => {
    if (!projectId) return { ok: false, message: 'Project not found.' };
    const res = await createCollection(projectId, input);
    await refresh();
    return res;
  };

  const handleDelete = async (id: string) => {
    const res = await deleteCollection(id);
    if (id === selectedId) {
      setSelectedId(null);
      setView('content');
    }
    await refresh();
    return res;
  };

  if (loading) return <CmsSkeleton />;

  if (error) {
    return (
      <ErrorState
        title="Unable to load project content"
        message="Something went wrong while loading this project's CMS content. Please try again."
        onRetry={retry}
      />
    );
  }

  if (!data.authenticated) {
    return (
      <EmptyState
        icon={<Lock className="h-8 w-8" />}
        title="Sign in to view this project"
        description="You need to be signed in to manage your Forge project content."
        action={<LinkButton variant="secondary" to="/login">Sign in</LinkButton>}
      />
    );
  }

  if (!data.found || !data.project) {
    return (
      <EmptyState
        icon={<AlertTriangle className="h-8 w-8" />}
        title="Project not found"
        description="The project you're looking for doesn't exist or has been removed."
        action={<LinkButton variant="secondary" to="/projects">Back to Projects</LinkButton>}
      />
    );
  }

  const project = data.project;

  return (
    <>
      <ProjectSectionHeader
        eyebrow="Project content"
        title="CMS"
        description="Manage the structured content used throughout this Forge project."
        projectId={project.id}
        projectName={project.name}
        actions={
          <>
            <Button variant="secondary" size="sm" onClick={refresh} loading={refreshing} icon={<RefreshCw className="h-3.5 w-3.5" />}>
              Refresh
            </Button>
            {canManage && (
              <Button size="sm" icon={<Plus className="h-3.5 w-3.5" />} onClick={() => setShowCreate(true)}>
                New collection
              </Button>
            )}
          </>
        }
      />

      <div className="mb-4">
        <CmsOverview data={data} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-4 items-start">
        <CmsNavRail
          collections={data.collections}
          selectedId={selectedId}
          canManage={canManage}
          onSelect={(id) => setSelectedId(id)}
          onNewCollection={() => setShowCreate(true)}
          onDelete={handleDelete}
        />

        <div className="min-w-0">
          {data.collections.length === 0 ? (
            <div className="rounded-lg border border-forge-border-subtle bg-forge-panel">
              <EmptyState
                icon={<Layers className="h-8 w-8" />}
                title="No content yet"
                description="Content lives inside collections — blog posts, services, team members, products and more. Create a content type, then add items to it."
                action={
                  canManage ? (
                    <Button size="sm" icon={<Plus className="h-3.5 w-3.5" />} onClick={() => setShowCreate(true)}>
                      New collection
                    </Button>
                  ) : undefined
                }
              />
            </div>
          ) : selectedCollection && view === 'settings' ? (
            <CollectionBuilder
              collection={selectedCollection}
              role={data.role}
              onBack={() => setView('content')}
              onRefresh={refresh}
              onDelete={handleDelete}
            />
          ) : selectedCollection ? (
            <div>
              <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
                <div className="flex items-center gap-2 min-w-0">
                  <CmsIcon name={selectedCollection.icon} className="h-4 w-4 text-forge-amber shrink-0" />
                  <h2 className="text-sm font-semibold text-forge-text-primary truncate">{selectedCollection.name}</h2>
                  <span className="text-xs text-forge-text-muted whitespace-nowrap">{items.length} item{items.length === 1 ? '' : 's'}</span>
                </div>
                {canManage && (
                  <Button variant="secondary" size="sm" icon={<Settings className="h-3.5 w-3.5" />} onClick={() => setView('settings')}>
                    Settings
                  </Button>
                )}
              </div>
              <ContentSection
                collection={selectedCollection}
                items={items}
                role={data.role}
                loading={itemsLoading}
                error={itemsError}
                onRefresh={refreshItems}
              />
            </div>
          ) : null}
        </div>
      </div>

      {showCreate && (
        <CreateCollectionModal
          onClose={() => setShowCreate(false)}
          onCreate={async (input) => {
            const res = await handleCreate(input);
            if (res.ok) setShowCreate(false);
            return res;
          }}
        />
      )}
    </>
  );
}