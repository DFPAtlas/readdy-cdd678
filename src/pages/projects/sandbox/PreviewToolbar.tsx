import { ArrowLeft, ArrowRight, ExternalLink, Monitor, RotateCcw, Smartphone, Tablet, X, ZoomIn, ZoomOut } from 'lucide-react';
import type { SandboxPage } from './sandboxPersistence';

export type PreviewDevice = 'mobile' | 'large-mobile' | 'tablet' | 'laptop' | 'desktop' | 'custom';

export const DEVICE_PRESETS: Array<{ id: PreviewDevice; label: string; width: number; height: number }> = [
  { id: 'mobile', label: 'Mobile', width: 390, height: 844 },
  { id: 'large-mobile', label: 'Large mobile', width: 430, height: 932 },
  { id: 'tablet', label: 'Tablet', width: 768, height: 1024 },
  { id: 'laptop', label: 'Laptop', width: 1280, height: 800 },
  { id: 'desktop', label: 'Desktop', width: 1440, height: 900 },
  { id: 'custom', label: 'Custom', width: 0, height: 0 },
];

const DEVICE_ICONS: Record<string, typeof Monitor> = {
  mobile: Smartphone, 'large-mobile': Smartphone, tablet: Tablet, laptop: Monitor, desktop: Monitor, custom: Monitor,
};

export type PreviewToolbarProps = {
  canBack: boolean;
  canForward: boolean;
  onBack: () => void;
  onForward: () => void;
  pages: SandboxPage[];
  currentPageId: string;
  onSelectPage: (id: string) => void;
  device: PreviewDevice;
  onDevice: (device: PreviewDevice) => void;
  width: number;
  height: number;
  onWidth: (width: number) => void;
  onHeight: (height: number) => void;
  zoom: number;
  onZoom: (zoom: number) => void;
  onToggleOrientation: () => void;
  onRefresh: () => void;
  onOpenInNewTab: () => void;
  onExit: () => void;
};

export default function PreviewToolbar(props: PreviewToolbarProps) {
  const {
    canBack, canForward, onBack, onForward, pages, currentPageId, onSelectPage,
    device, onDevice, width, height, onWidth, onHeight, zoom, onZoom,
    onToggleOrientation, onRefresh, onOpenInNewTab, onExit,
  } = props;

  const currentPage = pages.find((page) => page.id === currentPageId);

  return (
    <div className="preview-toolbar">
      <div className="preview-toolbar-group">
        <button onClick={onBack} disabled={!canBack} aria-label="Back" title="Back"><ArrowLeft size={16} /></button>
        <button onClick={onForward} disabled={!canForward} aria-label="Forward" title="Forward"><ArrowRight size={16} /></button>
        <button onClick={onRefresh} aria-label="Refresh preview" title="Refresh"><RotateCcw size={15} /></button>
      </div>

      <div className="preview-toolbar-group preview-page-select">
        <select value={currentPageId} onChange={(event) => onSelectPage(event.target.value)} aria-label="Select page">
          {pages.map((page) => <option key={page.id} value={page.id}>{page.name}{page.slug === '/' ? '' : ` (${page.slug})`}</option>)}
        </select>
        <span className="preview-slug">{currentPage?.slug ?? '/'}</span>
      </div>

      <div className="preview-toolbar-group">
        {DEVICE_PRESETS.map((preset) => {
          const Icon = DEVICE_ICONS[preset.id];
          return (
            <button
              key={preset.id}
              className={device === preset.id ? 'active' : ''}
              onClick={() => onDevice(preset.id)}
              title={preset.label}
              aria-label={preset.label}
            >
              <Icon size={16} />
            </button>
          );
        })}
      </div>

      <div className="preview-toolbar-group preview-size-inputs">
        <input type="number" value={width} onChange={(event) => onWidth(Number(event.target.value))} aria-label="Preview width" />
        <span>×</span>
        <input type="number" value={height} onChange={(event) => onHeight(Number(event.target.value))} aria-label="Preview height" />
        <button onClick={onToggleOrientation} title="Rotate portrait / landscape" aria-label="Rotate orientation">↻</button>
      </div>

      <div className="preview-toolbar-group">
        <button onClick={() => onZoom(Math.max(25, zoom - 10))} aria-label="Zoom out"><ZoomOut size={15} /></button>
        <span className="preview-zoom-value">{zoom}%</span>
        <button onClick={() => onZoom(Math.min(200, zoom + 10))} aria-label="Zoom in"><ZoomIn size={15} /></button>
      </div>

      <div className="preview-toolbar-spacer" />

      <div className="preview-toolbar-group">
        <button onClick={onOpenInNewTab} title="Open preview in a new tab" aria-label="Open in new tab"><ExternalLink size={15} /><span>New tab</span></button>
        <button className="preview-exit" onClick={onExit}><X size={15} /><span>Exit</span></button>
      </div>
    </div>
  );
}