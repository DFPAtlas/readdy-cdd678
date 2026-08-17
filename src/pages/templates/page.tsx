import { useCallback, useEffect, useMemo, useState } from 'react';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { Button } from '@/components/ui/Button';
import { SearchInput } from '@/components/ui/SearchInput';
import { LinkButton } from '@/pages/dashboard/components/LinkButton';
import { TemplatesHeader } from './components/TemplatesHeader';
import { BlankProjectCard } from './components/BlankProjectCard';
import { StarterCard } from './components/StarterCard';
import { StarterPreviewModal } from './components/StarterPreviewModal';
import { TemplatesFooterCta } from './components/TemplatesFooterCta';
import {
  ALL_CATEGORY,
  deriveCategories,
  fetchStarters,
  type StarterCategory,
  type StarterDisplay,
} from './templatesData';
import { LayoutGrid } from 'lucide-react';

function TemplatesSkeleton() {
  return (
    <div>
      <div className="mb-6">
        <Skeleton className="h-3 w-24 mb-2" />
        <Skeleton className="h-6 w-48 mb-1" />
        <Skeleton className="h-4 w-96" />
      </div>
      <Skeleton className="h-20 w-full mb-4" />
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-56 w-full" />
        ))}
      </div>
    </div>
  );
}

export default function TemplatesPage() {
  const [starters, setStarters] = useState<StarterDisplay[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  const [search, setSearch] = useState('');
  const [category, setCategory] = useState(ALL_CATEGORY);
  const [preview, setPreview] = useState<StarterDisplay | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setFailed(false);
    try {
      setStarters(await fetchStarters());
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const categories: StarterCategory[] = useMemo(() => deriveCategories(starters), [starters]);

  const filtered = useMemo(() => {
    const query = search.toLowerCase().trim();
    return starters.filter((starter) => {
      if (category !== ALL_CATEGORY && starter.typeKey !== category) return false;
      if (query) {
        const hay = `${starter.name} ${starter.description} ${starter.tags.join(' ')}`.toLowerCase();
        if (!hay.includes(query)) return false;
      }
      return true;
    });
  }, [starters, search, category]);

  const clearFilters = () => {
    setSearch('');
    setCategory(ALL_CATEGORY);
  };

  if (loading) {
    return <TemplatesSkeleton />;
  }

  if (failed) {
    return (
      <EmptyState
        title="Unable to load the starter library"
        description="Please try again."
        action={
          <Button variant="secondary" size="sm" onClick={() => void load()}>
            Retry
          </Button>
        }
      />
    );
  }

  const hasStarters = starters.length > 0;

  return (
    <>
      <TemplatesHeader />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
        <div className="flex flex-wrap items-center gap-1.5">
          {categories.map((cat) => (
            <button
              key={cat.value}
              type="button"
              onClick={() => setCategory(cat.value)}
              aria-pressed={category === cat.value}
              className={`px-3 py-1 text-xs rounded-full transition-colors whitespace-nowrap ${
                category === cat.value
                  ? 'bg-forge-amber text-forge-text-inverse'
                  : 'bg-forge-border text-forge-text-secondary hover:bg-forge-hover hover:text-forge-text-primary'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search templates..."
          ariaLabel="Search templates"
          className="w-full sm:w-64"
        />
      </div>

      <BlankProjectCard />

      {hasStarters && (
        <p className="mt-3 text-xs text-forge-text-muted">
          These first-party starters install from any project&apos;s Templates panel. Direct
          project creation from a starter is being prepared — create a blank project to begin
          today.
        </p>
      )}

      {!hasStarters ? (
        <EmptyState
          title="Starter library is being prepared."
          description="You can still create a blank Forge project today."
          action={
            <LinkButton to="/projects/new" variant="primary" size="sm">
              Create Blank Project
            </LinkButton>
          }
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<LayoutGrid className="h-10 w-10" />}
          title="No starters match your search"
          description="Try a different term or category."
          action={
            <Button variant="secondary" size="sm" onClick={clearFilters}>
              Clear filters
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-3 mt-4">
          {filtered.map((starter) => (
            <StarterCard key={starter.id} starter={starter} onPreview={setPreview} />
          ))}
        </div>
      )}

      <TemplatesFooterCta />

      <StarterPreviewModal starter={preview} onClose={() => setPreview(null)} />
    </>
  );
}