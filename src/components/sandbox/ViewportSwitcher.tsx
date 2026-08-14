import {
  Monitor, Tablet, Smartphone, RotateCcw, ExternalLink,
  ChevronDown, ZoomIn, ZoomOut, Inspect,
} from 'lucide-react';
import { useSandboxStore } from '@/stores/sandboxStore';
import { Tooltip } from '@/components/ui/Tooltip';

const VIEWPORT_WIDTHS: Record<string, string> = {
  desktop: '1280 px',
  tablet: '768 px',
  mobile: '375 px',
  custom: '1024 px',
};

export function ViewportSwitcher() {
  const {
    previewViewport, previewZoom, previewUrl, inspectMode,
    setPreviewViewport, setPreviewZoom, setInspectMode,
  } = useSandboxStore();

  const width = VIEWPORT_WIDTHS[previewViewport];

  return (
    <div className="flex items-center h-9 px-3 gap-2 flex-shrink-0 select-none">
      <span className="text-xs font-semibold text-forge-text-primary mr-2">Sandbox</span>

      <div className="flex items-center bg-forge-bg rounded-md border border-forge-border-subtle">
        <ViewportBtn
          active={previewViewport === 'desktop'}
          onClick={() => setPreviewViewport('desktop')}
          icon={<Monitor className="h-3.5 w-3.5" />}
          label="Desktop"
        />
        <ViewportBtn
          active={previewViewport === 'tablet'}
          onClick={() => setPreviewViewport('tablet')}
          icon={<Tablet className="h-3.5 w-3.5" />}
          label="Tablet"
        />
        <ViewportBtn
          active={previewViewport === 'mobile'}
          onClick={() => setPreviewViewport('mobile')}
          icon={<Smartphone className="h-3.5 w-3.5" />}
          label="Mobile"
        />
      </div>

      <span className="text-[11px] text-forge-text-muted tabular-nums min-w-[52px] text-center">
        {width}
      </span>

      <div className="flex items-center gap-0.5">
        <Tooltip content="Zoom out">
          <button
            onClick={() => setPreviewZoom(Math.max(25, previewZoom - 25))}
            className="h-6 w-6 flex items-center justify-center rounded text-forge-text-muted hover:text-forge-text-primary hover:bg-forge-hover transition-colors"
          >
            <ZoomOut className="h-3 w-3" />
          </button>
        </Tooltip>
        <span className="text-[11px] text-forge-text-muted tabular-nums min-w-[40px] text-center">
          {previewZoom}%
        </span>
        <Tooltip content="Zoom in">
          <button
            onClick={() => setPreviewZoom(Math.min(200, previewZoom + 25))}
            className="h-6 w-6 flex items-center justify-center rounded text-forge-text-muted hover:text-forge-text-primary hover:bg-forge-hover transition-colors"
          >
            <ZoomIn className="h-3 w-3" />
          </button>
        </Tooltip>
      </div>

      <div className="flex-1" />

      {/* URL bar */}
      <div className="hidden md:flex items-center gap-1.5 h-7 px-2.5 rounded bg-forge-bg border border-forge-border-subtle text-[11px] text-forge-text-muted"
      >
        <span className="text-forge-accent">/</span>
        {previewUrl}
      </div>

      <Tooltip content={inspectMode ? 'Disable inspect' : 'Enable inspect mode'}>
        <button
          onClick={() => setInspectMode(!inspectMode)}
          className={`h-6 w-6 flex items-center justify-center rounded transition-colors ${
            inspectMode
              ? 'text-forge-amber bg-forge-amber/10'
              : 'text-forge-text-muted hover:text-forge-text-primary hover:bg-forge-hover'
          }`}
        >
          <Inspect className="h-3.5 w-3.5" />
        </button>
      </Tooltip>

      <Tooltip content="Refresh preview">
        <button className="h-6 w-6 flex items-center justify-center rounded text-forge-text-muted hover:text-forge-text-primary hover:bg-forge-hover transition-colors">
          <RotateCcw className="h-3.5 w-3.5" />
        </button>
      </Tooltip>

      <Tooltip content="Open in new window">
        <button className="h-6 w-6 flex items-center justify-center rounded text-forge-text-muted hover:text-forge-text-primary hover:bg-forge-hover transition-colors">
          <ExternalLink className="h-3.5 w-3.5" />
        </button>
      </Tooltip>
    </div>
  );
}

function ViewportBtn({
  active, onClick, icon, label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className={`h-6 w-6 flex items-center justify-center rounded transition-colors ${
        active
          ? 'text-forge-text-primary bg-forge-panel-elevated'
          : 'text-forge-text-muted hover:text-forge-text-primary hover:bg-forge-hover'
      }`}
    >
      {icon}
    </button>
  );
}