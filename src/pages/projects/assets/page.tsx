import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { SearchInput } from '@/components/ui/SearchInput';
import { demoProjects, demoProjectAssets } from '@/services/mock/demoData';
import type { Asset } from '@/types';
import { Image, FileText, Video, Archive, Search, Plus, Grid3X3, List, Download, Trash2, X, Info, Sparkles, Loader2, Check } from 'lucide-react';

const typeIcons: Record<string, React.ReactNode> = {
  image: <Image className="h-4 w-4 text-sky-500" />,
  video: <Video className="h-4 w-4 text-rose-500" />,
  document: <FileText className="h-4 w-4 text-amber-500" />,
  other: <Archive className="h-4 w-4 text-foreground-400" />,
};

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

export default function AssetsPage() {
  const { projectId } = useParams();
  const project = demoProjects.find((p) => p.id === projectId);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [showGenerate, setShowGenerate] = useState(false);
  const [localAssets, setLocalAssets] = useState(demoProjectAssets);

  if (!project) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Image className="h-10 w-10 text-foreground-300 mb-3" />
        <p className="text-sm font-medium text-foreground-950">Project not found</p>
        <Link to="/projects" className="mt-4"><Button variant="ghost" size="sm">Back to Projects</Button></Link>
      </div>
    );
  }

  const filtered = localAssets.filter((a) => {
    if (typeFilter !== 'all' && a.type !== typeFilter) return false;
    if (search && !a.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const handleDelete = (id: string) => {
    setLocalAssets((prev) => prev.filter((a) => a.id !== id));
    setSelectedAsset(null);
  };

  return (
    <>
      <PageHeader
        title="Assets"
        description={`${localAssets.length} assets in ${project.name}`}
        actions={
          <div className="flex items-center gap-2">
            <Button size="sm" variant="ghost" onClick={() => setShowGenerate(true)} icon={<Sparkles className="h-3.5 w-3.5" />}>
              Generate
            </Button>
            <Button size="sm" icon={<Plus className="h-3.5 w-3.5" />}>Upload</Button>
          </div>
        }
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Projects', href: '/projects' },
          { label: project.name, href: `/projects/${project.id}/overview` },
          { label: 'Assets' },
        ]}
      />

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <SearchInput value={search} onChange={setSearch} placeholder="Search assets..." className="w-48" />
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="h-8 px-2.5 text-xs rounded-lg border border-background-200 bg-white text-foreground-950 focus:outline-none focus:ring-1 focus:ring-amber-500"
        >
          <option value="all">All Types</option>
          <option value="image">Images</option>
          <option value="video">Videos</option>
          <option value="document">Documents</option>
          <option value="other">Other</option>
        </select>
        <div className="flex-1" />
        <div className="flex items-center gap-1 bg-background-100 rounded-lg p-0.5">
          <button onClick={() => setViewMode('grid')} className={`px-2 py-1 rounded-md transition-colors ${viewMode === 'grid' ? 'bg-white text-foreground-950' : 'text-foreground-500'}`}>
            <Grid3X3 className="h-3.5 w-3.5" />
          </button>
          <button onClick={() => setViewMode('list')} className={`px-2 py-1 rounded-md transition-colors ${viewMode === 'list' ? 'bg-white text-foreground-950' : 'text-foreground-500'}`}>
            <List className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Empty state */}
      {filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Image className="h-10 w-10 text-foreground-300 mb-3" />
          <p className="text-sm font-medium text-foreground-950">No assets found</p>
          <p className="text-xs text-foreground-500 mt-1">Upload or generate assets to get started</p>
        </div>
      )}

      {/* Grid view */}
      {viewMode === 'grid' && filtered.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {filtered.map((asset) => (
            <Card key={asset.id} className="group overflow-hidden cursor-pointer" onClick={() => setSelectedAsset(asset)}>
              <div className="aspect-square bg-background-100 flex items-center justify-center overflow-hidden">
                {asset.type === 'image' ? (
                  <div className="w-full h-full bg-gradient-to-br from-background-100 to-background-200 flex items-center justify-center">
                    <Image className="h-10 w-10 text-foreground-300" />
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-1">
                    {typeIcons[asset.type]}
                    <span className="text-xs text-foreground-400 uppercase">{asset.type}</span>
                  </div>
                )}
              </div>
              <div className="p-2">
                <p className="text-xs font-medium text-foreground-950 truncate">{asset.name}</p>
                <p className="text-xs text-foreground-400">{formatSize(asset.size)}</p>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* List view */}
      {viewMode === 'list' && filtered.length > 0 && (
        <Card className="overflow-hidden">
          <div className="divide-y divide-background-100">
            {filtered.map((asset) => (
              <div key={asset.id} className="flex items-center px-4 py-2.5 hover:bg-background-50 transition-colors cursor-pointer" onClick={() => setSelectedAsset(asset)}>
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="h-8 w-8 rounded-md bg-background-100 flex items-center justify-center flex-shrink-0">
                    {typeIcons[asset.type]}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm text-foreground-950 truncate">{asset.name}</p>
                    <p className="text-xs text-foreground-400">{asset.type} · {formatSize(asset.size)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <Badge size="sm">{asset.type}</Badge>
                  <Button variant="ghost" size="sm" className="text-xs" onClick={(e) => { e.stopPropagation(); /* download */ }}>
                    <Download className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Detail drawer */}
      {selectedAsset && (
        <div className="fixed inset-0 z-50 flex" onClick={() => setSelectedAsset(null)}>
          <div className="absolute inset-0 bg-black/40" />
          <div className="relative ml-auto w-full max-w-md bg-white h-full overflow-y-auto shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 bg-white border-b border-background-100 px-4 py-3 flex items-center justify-between z-10">
              <h3 className="text-sm font-semibold text-foreground-950 truncate">{selectedAsset.name}</h3>
              <button onClick={() => setSelectedAsset(null)} className="p-1 rounded-md hover:bg-background-100 transition-colors">
                <X className="h-4 w-4 text-foreground-500" />
              </button>
            </div>
            <div className="p-4">
              {/* Preview */}
              <div className="aspect-video rounded-lg bg-background-100 flex items-center justify-center mb-4">
                {typeIcons[selectedAsset.type]}
                <span className="ml-2 text-sm text-foreground-400 capitalize">{selectedAsset.type} preview</span>
              </div>

              {/* Metadata */}
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-foreground-500">Name</p>
                  <p className="text-sm font-medium text-foreground-950">{selectedAsset.name}</p>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <p className="text-xs text-foreground-500">Type</p>
                    <Badge size="sm">{selectedAsset.type}</Badge>
                  </div>
                  <div>
                    <p className="text-xs text-foreground-500">Size</p>
                    <p className="text-sm text-foreground-950">{formatSize(selectedAsset.size)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-foreground-500">MIME Type</p>
                    <p className="text-sm font-mono text-foreground-950 text-xs">{selectedAsset.mimeType}</p>
                  </div>
                  <div>
                    <p className="text-xs text-foreground-500">Created</p>
                    <p className="text-sm text-foreground-950">{new Date(selectedAsset.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>
                {selectedAsset.altText && (
                  <div>
                    <p className="text-xs text-foreground-500">Alt Text</p>
                    <p className="text-sm text-foreground-950">{selectedAsset.altText}</p>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-2 mt-6 pt-4 border-t border-background-100">
                <Button variant="ghost" size="sm" className="flex-1 text-xs">Replace</Button>
                <Button variant="ghost" size="sm" className="flex-1 text-xs">Download</Button>
                <Button variant="danger" size="sm" className="flex-1 text-xs" onClick={() => handleDelete(selectedAsset.id)}>Delete</Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* AI Generate Modal */}
      {showGenerate && <AIGenerateModal onClose={() => setShowGenerate(false)} />}
    </>
  );
}

function AIGenerateModal({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState<'form' | 'generating' | 'results'>('form');
  const [prompt, setPrompt] = useState('');
  const [purpose, setPurpose] = useState('hero');
  const [dimensions, setDimensions] = useState('1920x1080');
  const [style, setStyle] = useState('modern-minimal');
  const [selectedResult, setSelectedResult] = useState<number | null>(null);

  const handleGenerate = () => {
    setStep('generating');
    setTimeout(() => setStep('results'), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={onClose}>
      <div className="bg-white rounded-xl max-w-lg w-full mx-4 shadow-xl max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-background-100">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-amber-500" />
            <h3 className="text-sm font-semibold text-foreground-950">Generate Asset</h3>
          </div>
          <button onClick={onClose} className="p-1 rounded-md hover:bg-background-100 transition-colors">
            <X className="h-4 w-4 text-foreground-500" />
          </button>
        </div>

        {step === 'form' && (
          <div className="p-5 space-y-4">
            <div>
              <label className="text-xs font-medium text-foreground-700 mb-1.5 block">Prompt</label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Describe the image you want to generate..."
                className="w-full h-20 px-3 py-2 text-sm border border-background-200 rounded-lg resize-none focus:outline-none focus:ring-1 focus:ring-amber-500 text-foreground-950 placeholder:text-foreground-300"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-foreground-700 mb-1.5 block">Purpose</label>
                <select value={purpose} onChange={(e) => setPurpose(e.target.value)} className="w-full h-8 px-2.5 text-xs border border-background-200 rounded-lg bg-white text-foreground-950 focus:outline-none focus:ring-1 focus:ring-amber-500">
                  <option value="hero">Hero Image</option>
                  <option value="section">Section Background</option>
                  <option value="product">Product Image</option>
                  <option value="illustration">Illustration</option>
                  <option value="icon">Icon / SVG</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-foreground-700 mb-1.5 block">Dimensions</label>
                <select value={dimensions} onChange={(e) => setDimensions(e.target.value)} className="w-full h-8 px-2.5 text-xs border border-background-200 rounded-lg bg-white text-foreground-950 focus:outline-none focus:ring-1 focus:ring-amber-500">
                  <option value="1920x1080">1920 × 1080</option>
                  <option value="1200x630">1200 × 630</option>
                  <option value="800x800">800 × 800</option>
                  <option value="400x400">400 × 400</option>
                </select>
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-foreground-700 mb-1.5 block">Style</label>
              <div className="flex flex-wrap gap-1.5">
                {['modern-minimal', 'dark-theme', 'gradient', 'photorealistic', 'abstract'].map((s) => (
                  <button
                    key={s}
                    onClick={() => setStyle(s)}
                    className={`px-3 py-1 text-xs rounded-full transition-colors whitespace-nowrap ${
                      style === s ? 'bg-amber-500 text-white' : 'bg-background-100 text-foreground-600 hover:bg-background-200'
                    }`}
                  >
                    {s.replace('-', ' ')}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs text-foreground-400 bg-background-50 rounded-lg p-2.5">
              <Info className="h-3.5 w-3.5 flex-shrink-0" />
              <span>Local generation via Ollama · Estimated cost: free · Privacy: local only</span>
            </div>
            <Button className="w-full" onClick={handleGenerate} disabled={!prompt.trim()}>
              <Sparkles className="h-3.5 w-3.5 mr-1.5" /> Generate
            </Button>
          </div>
        )}

        {step === 'generating' && (
          <div className="p-5 flex flex-col items-center justify-center py-12">
            <Loader2 className="h-8 w-8 text-amber-500 animate-spin mb-4" />
            <p className="text-sm font-medium text-foreground-950">Generating assets...</p>
            <p className="text-xs text-foreground-400 mt-1">This may take a few moments on local hardware</p>
            <div className="w-full max-w-xs h-1.5 rounded-full bg-background-100 mt-4 overflow-hidden">
              <div className="h-full bg-amber-500 rounded-full animate-pulse" style={{ width: '60%' }} />
            </div>
          </div>
        )}

        {step === 'results' && (
          <div className="p-5">
            <p className="text-xs font-medium text-foreground-700 mb-3">4 variations generated — select one to save</p>
            <div className="grid grid-cols-2 gap-2 mb-4">
              {[0, 1, 2, 3].map((i) => (
                <button
                  key={i}
                  onClick={() => setSelectedResult(i)}
                  className={`aspect-video rounded-lg border-2 transition-colors flex items-center justify-center bg-background-100 ${
                    selectedResult === i ? 'border-amber-500' : 'border-background-200 hover:border-foreground-300'
                  }`}
                >
                  {selectedResult === i && (
                    <div className="h-6 w-6 rounded-full bg-amber-500 flex items-center justify-center">
                      <Check className="h-3.5 w-3.5 text-white" />
                    </div>
                  )}
                  {selectedResult !== i && <span className="text-xs text-foreground-400">Variation {i + 1}</span>}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" className="flex-1" onClick={() => setStep('form')}>Regenerate</Button>
              <Button size="sm" className="flex-1" disabled={selectedResult === null} onClick={onClose}>
                <Check className="h-3.5 w-3.5 mr-1" /> Approve & Save
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}