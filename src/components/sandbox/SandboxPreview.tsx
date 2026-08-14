import { useRef, useEffect, useState } from 'react';
import { useSandboxStore } from '@/stores/sandboxStore';
import { PreviewSite } from './PreviewSite';

const DEVICES = [
  { id: 'desktop', label: 'Desktop', icon: 'ri-computer-line' },
  { id: 'tablet', label: 'Tablet', icon: 'ri-tablet-line' },
  { id: 'mobile', label: 'Mobile', icon: 'ri-smartphone-line' },
];

const ZOOM_PRESETS = [50, 75, 100, 125, 150];

export function SandboxPreview() {
  const {
    previewViewport, previewZoom, inspectMode, selectedElementId,
    setSelectedElement, setPreviewViewport, setPreviewZoom,
  } = useSandboxStore();

  const [activeDevice, setActiveDevice] = useState('desktop');
  const [viewportMenuOpen, setViewportMenuOpen] = useState(false);
  const [zoomMenuOpen, setZoomMenuOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const zoomMenuRef = useRef<HTMLDivElement>(null);

  const getViewportWidth = () => {
    switch (activeDevice) {
      case 'mobile': return '375px';
      case 'tablet': return '768px';
      default: return '100%';
    }
  };

  const zoomOut = () => setPreviewZoom(Math.max(25, previewZoom - 10));
  const zoomIn = () => setPreviewZoom(Math.min(200, previewZoom + 10));

  const activeDeviceLabel = DEVICES.find((d) => d.id === activeDevice)?.label || 'Desktop';

  // Close viewport dropdown on outside click
  useEffect(() => {
    if (!viewportMenuOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setViewportMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [viewportMenuOpen]);

  // Close zoom dropdown on outside click
  useEffect(() => {
    if (!zoomMenuOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (zoomMenuRef.current && !zoomMenuRef.current.contains(e.target as Node)) {
        setZoomMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [zoomMenuOpen]);

  useEffect(() => {
    if (!inspectMode) {
      setSelectedElement(null);
      return;
    }
    const container = containerRef.current;
    if (!container) return;

    const handleClick = (e: MouseEvent) => {
      const target = (e.target as HTMLElement).closest('[data-section]') as HTMLElement | null;
      if (target) {
        setSelectedElement(target.dataset.section || null);
        e.stopPropagation();
      }
    };

    container.addEventListener('click', handleClick);
    return () => container.removeEventListener('click', handleClick);
  }, [inspectMode, setSelectedElement]);

  return (
    <div className="flex flex-col h-full bg-forge-bg overflow-hidden"
    >
      {/* Preview Toolbar */}
      <div className="flex items-center px-3 h-[50px] border-b border-forge-border-subtle bg-[rgba(6,12,26,0.95)] flex-shrink-0"
      >
        {/* URL bar */}
        <div className="flex-1 flex items-center gap-2 min-w-0"
        >
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[rgba(10,20,42,0.8)] border border-forge-border-subtle flex-1 min-w-0"
          >
            <i className="ri-lock-line text-[11px] text-forge-success flex-shrink-0" />
            <span className="text-xs text-forge-text-muted truncate">localhost:3000</span>
          </div>
        </div>

        {/* Zoom controls */}
        <div className="flex items-center flex-shrink-0 ml-3" ref={zoomMenuRef}
        >
          <button
            onClick={zoomOut}
            disabled={previewZoom <= 25}
            className="flex items-center justify-center w-7 h-7 rounded-l-lg border border-forge-border-subtle text-forge-text-muted hover:text-white hover:border-white/10 transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed bg-[rgba(10,20,42,0.6)]"
          >
            <i className="ri-subtract-line text-xs" />
          </button>

          <button
            onClick={() => setZoomMenuOpen(!zoomMenuOpen)}
            className={`flex items-center gap-1 px-2 h-7 border-y border-forge-border-subtle text-xs font-medium transition-colors cursor-pointer bg-[rgba(10,20,42,0.6)] min-w-[52px] justify-center ${
              zoomMenuOpen
                ? 'text-white border-forge-border-subtle bg-forge-amber/10'
                : 'text-forge-text-muted hover:text-white'
            }`}
          >
            <span className="tabular-nums">{previewZoom}%</span>
            <i className={`ri-arrow-down-s-line text-[9px] transition-transform ${zoomMenuOpen ? 'rotate-180' : ''}`} />
          </button>

          <button
            onClick={zoomIn}
            disabled={previewZoom >= 200}
            className="flex items-center justify-center w-7 h-7 rounded-r-lg border border-forge-border-subtle text-forge-text-muted hover:text-white hover:border-white/10 transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed bg-[rgba(10,20,42,0.6)]"
          >
            <i className="ri-add-line text-xs" />
          </button>

          {zoomMenuOpen && (
            <div className="absolute right-[140px] top-full mt-1.5 w-28 py-1.5 rounded-xl border border-forge-border-subtle bg-[linear-gradient(160deg,rgba(17,23,36,0.98),rgba(9,12,18,0.98))] shadow-[0_20px_50px_rgba(0,0,0,0.45)] z-50 backdrop-blur-xl"
            >
              {ZOOM_PRESETS.map((z) => (
                <button
                  key={z}
                  onClick={() => {
                    setPreviewZoom(z);
                    setZoomMenuOpen(false);
                  }}
                  className={`w-full flex items-center gap-2 px-4 py-1.5 text-xs transition-colors cursor-pointer whitespace-nowrap ${
                    previewZoom === z
                      ? 'text-forge-amber bg-forge-amber/10'
                      : 'text-forge-text-secondary hover:text-white hover:bg-white/5'
                  }`}
                >
                  <span className="tabular-nums">{z}%</span>
                  {previewZoom === z && (
                    <i className="ri-check-line text-forge-amber ml-auto text-[10px]" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Viewport switcher — eye icon + dropdown */}
        <div className="relative flex-shrink-0 ml-1.5" ref={menuRef}
        >
          <button
            onClick={() => setViewportMenuOpen(!viewportMenuOpen)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs transition-all whitespace-nowrap cursor-pointer ${
              viewportMenuOpen
                ? 'text-white border border-forge-amber/40 bg-forge-amber/15'
                : 'text-forge-text-muted border border-transparent hover:text-white hover:border-white/10'
            }`}
            title="Switch viewport"
          >
            <i className="ri-eye-line text-sm" />
            <span>{activeDeviceLabel}</span>
            <i className={`ri-arrow-down-s-line text-[10px] transition-transform ${viewportMenuOpen ? 'rotate-180' : ''}`} />
          </button>

          {viewportMenuOpen && (
            <div className="absolute right-0 top-full mt-1.5 w-40 py-1.5 rounded-xl border border-forge-border-subtle bg-[linear-gradient(160deg,rgba(17,23,36,0.98),rgba(9,12,18,0.98))] shadow-[0_20px_50px_rgba(0,0,0,0.45)] z-50 backdrop-blur-xl"
            >
              {DEVICES.map((d) => (
                <button
                  key={d.id}
                  onClick={() => {
                    setActiveDevice(d.id);
                    setPreviewViewport(d.id as typeof previewViewport);
                    setViewportMenuOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-2 text-xs transition-colors cursor-pointer whitespace-nowrap ${
                    activeDevice === d.id
                      ? 'text-forge-amber bg-forge-amber/10'
                      : 'text-forge-text-secondary hover:text-white hover:bg-white/5'
                  }`}
                >
                  <i className={`${d.icon} text-sm w-4 text-center`} />
                  <span>{d.label}</span>
                  {activeDevice === d.id && (
                    <i className="ri-check-line text-forge-amber ml-auto" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Canvas */}
      <div
        className="flex-1 overflow-auto p-6 relative"
        style={{
          background: `
            linear-gradient(rgba(255,255,255,0.015) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.015) 1px, transparent 1px),
            #080C11
          `,
          backgroundSize: '28px 28px',
        }}
      >
        <div
          ref={containerRef}
          className={`mx-auto transition-all duration-200 ${
            inspectMode ? 'cursor-crosshair' : ''
          }`}
          style={{
            width: getViewportWidth(),
            maxWidth: '100%',
            transform: `scale(${previewZoom / 100})`,
            transformOrigin: 'top center',
          }}
        >
          <div
            className={`rounded-[18px] border overflow-hidden shadow-[0_32px_90px_rgba(0,0,0,0.35)] transition-colors ${
              selectedElementId
                ? 'border-forge-amber'
                : inspectMode
                ? 'border-white/10'
                : 'border-[rgba(106,135,210,0.22)]'
            }`}
          >
            <PreviewSite />
          </div>
        </div>
      </div>

      {selectedElementId && (
        <div className="absolute bottom-3 left-3 z-10 px-3 py-1.5 rounded-md bg-forge-panel-elevated border border-forge-amber/30 text-xs text-forge-amber shadow-lg"
        >
          Selected: <span className="font-medium">{selectedElementId}</span>
          <button
            onClick={() => setSelectedElement(null)}
            className="ml-2 text-forge-text-muted hover:text-forge-text-primary"
          >
            Clear
          </button>
        </div>
      )}
    </div>
  );
}