import { useState } from 'react';
import { Link } from 'react-router-dom';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { SearchInput } from '@/components/ui/SearchInput';
import { demoTemplates, demoTemplateCategories } from '@/services/mock/demoData';
import type { DemoTemplate } from '@/services/mock/demoData';
import { Sparkles, Eye, Heart, X, Check, Monitor, Smartphone, Tablet } from 'lucide-react';

export default function TemplatesPage() {
  const [activeCategory, setActiveCategory] = useState('All');
  const [search, setSearch] = useState('');
  const [favorites, setFavorites] = useState<string[]>(['tpl-forge-launch']);
  const [selectedTemplate, setSelectedTemplate] = useState<DemoTemplate | null>(null);
  const [useModal, setUseModal] = useState<DemoTemplate | null>(null);

  const filtered = demoTemplates.filter((t) => {
    if (activeCategory !== 'All' && t.category !== activeCategory) return false;
    if (search && !t.name.toLowerCase().includes(search.toLowerCase()) && !t.description.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const handleFavorite = (id: string) => {
    setFavorites((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  };

  const handleUseTemplate = (tpl: DemoTemplate) => {
    setUseModal(tpl);
  };

  return (
    <>
      <PageHeader
        title="Template Gallery"
        description="Start your project with a professionally designed template"
        actions={
          <Link to="/projects/new">
            <Button variant="ghost" size="sm">Start from scratch</Button>
          </Link>
        }
        breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Templates' }]}
      />

      {/* Category tabs */}
      <div className="flex flex-wrap items-center gap-1.5 mb-4">
        {demoTemplateCategories.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-3 py-1.5 text-xs rounded-full transition-colors whitespace-nowrap ${
              activeCategory === cat
                ? 'bg-amber-500 text-white'
                : 'bg-background-100 text-foreground-600 hover:bg-background-200'
            }`}
          >
            {cat}
          </button>
        ))}
        <div className="flex-1" />
        <SearchInput value={search} onChange={setSearch} placeholder="Search templates..." className="w-48" />
      </div>

      {/* Empty state */}
      {filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Sparkles className="h-10 w-10 text-foreground-300 mb-3" />
          <p className="text-sm font-medium text-foreground-950">No templates found</p>
          <p className="text-xs text-foreground-500 mt-1">Try a different category or search term</p>
        </div>
      )}

      {/* Template grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {filtered.map((tpl) => {
          const isFavorite = favorites.includes(tpl.id);
          return (
            <Card key={tpl.id} className="group overflow-hidden">
              {/* Thumbnail */}
              <div className="relative aspect-[3/2] bg-background-100 overflow-hidden">
                <img
                  src={tpl.thumbnail}
                  alt={tpl.name}
                  className="w-full h-full object-cover object-top"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                  <button
                    onClick={() => setSelectedTemplate(tpl)}
                    className="h-8 w-8 rounded-full bg-white/90 flex items-center justify-center hover:bg-white transition-colors"
                    title="Preview"
                  >
                    <Eye className="h-4 w-4 text-foreground-950" />
                  </button>
                  <button
                    onClick={() => handleFavorite(tpl.id)}
                    className={`h-8 w-8 rounded-full flex items-center justify-center transition-colors ${
                      isFavorite ? 'bg-rose-500 text-white' : 'bg-white/90 hover:bg-white text-foreground-600'
                    }`}
                    title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                  >
                    <Heart className={`h-4 w-4 ${isFavorite ? 'fill-current' : ''}`} />
                  </button>
                </div>
                {isFavorite && (
                  <div className="absolute top-2 right-2 h-6 w-6 rounded-full bg-rose-500 flex items-center justify-center">
                    <Heart className="h-3 w-3 text-white fill-current" />
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="p-3">
                <div className="flex items-start justify-between mb-1">
                  <h3 className="text-sm font-medium text-foreground-950">{tpl.name}</h3>
                  <Badge size="sm" variant="amber">{tpl.category}</Badge>
                </div>
                <p className="text-xs text-foreground-500 mb-2 line-clamp-2">{tpl.description}</p>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xs text-foreground-400 bg-background-100 px-1.5 py-0.5 rounded">{tpl.stack}</span>
                  <span className="text-xs text-foreground-400">{tpl.pages} pages</span>
                </div>
                <div className="flex items-center gap-1.5">
                  {tpl.responsive && (
                    <span className="flex items-center gap-0.5 text-xs text-emerald-600" title="Responsive">
                      <Monitor className="h-3 w-3" /> <Smartphone className="h-3 w-3" />
                    </span>
                  )}
                  {tpl.accessible && (
                    <span className="text-xs text-sky-600" title="Accessible">WCAG AA</span>
                  )}
                  <div className="flex-1" />
                  <Button size="sm" className="text-xs" onClick={() => handleUseTemplate(tpl)}>Use Template</Button>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Preview drawer */}
      {selectedTemplate && (
        <div className="fixed inset-0 z-50 flex" onClick={() => setSelectedTemplate(null)}>
          <div className="absolute inset-0 bg-black/40" />
          <div className="relative ml-auto w-full max-w-lg bg-white h-full overflow-y-auto shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 bg-white border-b border-background-100 px-4 py-3 flex items-center justify-between z-10">
              <h3 className="text-sm font-semibold text-foreground-950">{selectedTemplate.name}</h3>
              <button onClick={() => setSelectedTemplate(null)} className="p-1 rounded-md hover:bg-background-100 transition-colors">
                <X className="h-4 w-4 text-foreground-500" />
              </button>
            </div>
            <div className="p-4">
              <img src={selectedTemplate.thumbnail} alt={selectedTemplate.name} className="w-full rounded-lg mb-4" />
              <Badge variant="amber" className="mb-2">{selectedTemplate.category}</Badge>
              <p className="text-sm text-foreground-700 mb-3">{selectedTemplate.description}</p>
              <div className="grid grid-cols-2 gap-2 mb-4">
                <div className="bg-background-50 rounded-lg p-2.5">
                  <p className="text-xs text-foreground-500">Stack</p>
                  <p className="text-sm font-medium text-foreground-950">{selectedTemplate.stack}</p>
                </div>
                <div className="bg-background-50 rounded-lg p-2.5">
                  <p className="text-xs text-foreground-500">Pages</p>
                  <p className="text-sm font-medium text-foreground-950">{selectedTemplate.pages}</p>
                </div>
                <div className="bg-background-50 rounded-lg p-2.5">
                  <p className="text-xs text-foreground-500">Responsive</p>
                  <p className="text-sm font-medium text-foreground-950">{selectedTemplate.responsive ? 'Yes' : 'No'}</p>
                </div>
                <div className="bg-background-50 rounded-lg p-2.5">
                  <p className="text-xs text-foreground-500">Accessibility</p>
                  <p className="text-sm font-medium text-foreground-950">{selectedTemplate.accessible ? 'WCAG AA' : 'Basic'}</p>
                </div>
              </div>
              <Button className="w-full" onClick={() => { setSelectedTemplate(null); handleUseTemplate(selectedTemplate); }}>
                Use This Template
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Use Template confirmation modal */}
      {useModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={() => setUseModal(null)}>
          <div className="bg-white rounded-xl p-6 max-w-sm mx-4 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="h-10 w-10 rounded-full bg-emerald-500/10 flex items-center justify-center mb-3">
              <Check className="h-5 w-5 text-emerald-500" />
            </div>
            <h3 className="text-sm font-semibold text-foreground-950 mb-2">Create from Template</h3>
            <p className="text-xs text-foreground-500 mb-4">
              A new project will be created from <strong>{useModal.name}</strong>. You can customise everything after creation.
            </p>
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" size="sm" onClick={() => setUseModal(null)}>Cancel</Button>
              <Link to="/projects/new">
                <Button size="sm" onClick={() => setUseModal(null)}>Create Project</Button>
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  );
}