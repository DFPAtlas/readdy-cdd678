import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Layers, FileText, LayoutTemplate, Link2, Upload, Download, Settings } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Select } from '@/components/ui/Select';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/Button';
import type { CmsCollection, CmsItem } from './cmsTypes';
import { listCollections, listItems, createCollection, deleteCollection, currentProjectRole } from './cmsData';
import { CollectionsSection, type CreateCollectionInput } from './components/CollectionsSection';
import { CollectionBuilder } from './components/CollectionBuilder';
import { ContentSection } from './components/ContentSection';
import { PlaceholderSection } from './components/PlaceholderSection';

type SectionKey = 'collections' | 'content' | 'dynamic-pages' | 'relationships' | 'imports' | 'exports' | 'settings';

const SECTIONS: { key: SectionKey; label: string; icon: React.ReactNode }[] = [
  { key: 'collections', label: 'Collections', icon: <Layers className="h-3.5 w-3.5" /> },
  { key: 'content', label: 'Content', icon: <FileText className="h-3.5 w-3.5" /> },
  { key: 'dynamic-pages', label: 'Dynamic pages', icon: <LayoutTemplate className="h-3.5 w-3.5" /> },
  { key: 'relationships', label: 'Relationships', icon: <Link2 className="h-3.5 w-3.5" /> },
  { key: 'imports', label: 'Imports', icon: <Upload className="h-3.5 w-3.5" /> },
  { key: 'exports', label: 'Exports', icon: <Download className="h-3.5 w-3.5" /> },
  { key: 'settings', label: 'Settings', icon: <Settings className="h-3.5 w-3.5" /> },
];

export default function CmsPage() {
  const { projectId } = useParams();
  const [section, setSection] = useState<SectionKey>('collections');
  const [collections, setCollections] = useState<CmsCollection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [role, setRole] = useState<string | null>(null);
  const [openCollectionId, setOpenCollectionId] = useState<string | null>(null);
  const [contentCollectionId, setContentCollectionId] = useState<string | null>(null);
  const [items, setItems] = useState<CmsItem[]>([]);
  const [itemsLoading, setItemsLoading] = useState(false);
  const [itemsError, setItemsError] = useState('');

  const refresh = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    setError('');
    const [cols, r] = await Promise.all([listCollections(projectId), currentProjectRole(projectId)]);
    setCollections(cols);
    setRole(r);
    setLoading(false);
  }, [projectId]);

  useEffect(() => { void refresh(); }, [refresh]);

  // Keep the selected content collection valid as collections change.
  useEffect(() => {
    if (collections.length === 0) {
      if (contentCollectionId) setContentCollectionId(null);
      return;
    }
    if (!contentCollectionId || !collections.some((c) => c.id === contentCollectionId)) {
      setContentCollectionId(collections[0].id);
    }
  }, [collections, contentCollectionId]);

  const refreshItems = useCallback(async () => {
    if (!projectId || !contentCollectionId) return;
    setItemsLoading(true);
    setItemsError('');
    const data = await listItems(projectId, contentCollectionId);
    setItems(data);
    setItemsLoading(false);
  }, [projectId, contentCollectionId]);

  useEffect(() => {
    if (section === 'content' && contentCollectionId) void refreshItems();
  }, [section, contentCollectionId, refreshItems]);

  const openCollection = collections.find((c) => c.id === openCollectionId) ?? null;
  const contentCollection = collections.find((c) => c.id === contentCollectionId) ?? null;

  const handleCreate = async (input: CreateCollectionInput) => {
    if (!projectId) return { ok: false, message: 'Project not found.' };
    return createCollection(projectId, input);
  };

  const handleDelete = async (id: string) => {
    const res = await deleteCollection(id);
    if (id === openCollectionId) setOpenCollectionId(null);
    if (id === contentCollectionId) setContentCollectionId(null);
    await refresh();
    return res;
  };

  return (
    <div>
      <PageHeader
        title="CMS"
        description="Structured content collections that power dynamic pages, lists and reusable canvas elements."
        breadcrumbs={[
          { label: 'Projects', href: '/projects' },
          { label: 'CMS' },
        ]}
      />

      {/* Section navigation */}
      <nav className="flex flex-wrap items-center gap-1 mb-5 border-b border-forge-border-subtle" role="navigation" aria-label="CMS sections">
        {SECTIONS.map((s) => (
          <button
            key={s.key}
            onClick={() => { setSection(s.key); setOpenCollectionId(null); }}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium whitespace-nowrap border-b-2 -mb-px transition-colors ${
              section === s.key
                ? 'border-forge-amber text-forge-amber'
                : 'border-transparent text-forge-text-muted hover:text-forge-text-primary'
            }`}
            aria-current={section === s.key ? 'page' : undefined}
          >
            {s.icon}
            {s.label}
          </button>
        ))}
      </nav>

      {section === 'collections' && !openCollection && (
        <CollectionsSection
          collections={collections}
          role={role}
          loading={loading}
          error={error}
          onRetry={refresh}
          onOpen={(id) => setOpenCollectionId(id)}
          onCreate={handleCreate}
          onDelete={handleDelete}
        />
      )}

      {section === 'collections' && openCollection && (
        <CollectionBuilder
          collection={openCollection}
          role={role}
          onBack={() => setOpenCollectionId(null)}
          onRefresh={refresh}
          onDelete={handleDelete}
        />
      )}

      {section === 'content' && !contentCollection && (
        <div className="rounded-lg border border-forge-border-subtle bg-forge-panel">
          <EmptyState
            title="Create a collection first"
            description="Content lives inside collections. Create a collection, then add items here."
            action={<Button size="sm" onClick={() => setSection('collections')}>Go to Collections</Button>}
          />
        </div>
      )}

      {section === 'content' && contentCollection && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <span className="text-xs text-forge-text-muted">Collection</span>
            <Select
              options={collections.map((c) => ({ value: c.id, label: c.name }))}
              value={contentCollection.id}
              onChange={(e) => setContentCollectionId(e.target.value)}
              className="w-56"
            />
            <span className="text-xs text-forge-text-muted">{items.length} item{items.length === 1 ? '' : 's'}</span>
          </div>
          <ContentSection
            collection={contentCollection}
            items={items}
            role={role}
            loading={itemsLoading}
            error={itemsError}
            onRefresh={refreshItems}
          />
        </div>
      )}

      {(section === 'dynamic-pages' || section === 'relationships' || section === 'imports' || section === 'exports' || section === 'settings') && (
        <PlaceholderSection section={section} />
      )}
    </div>
  );
}