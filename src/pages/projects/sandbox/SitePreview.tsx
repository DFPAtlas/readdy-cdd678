import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, ExternalLink, Mail, Phone, X } from 'lucide-react';
import type { SandboxDocument } from './sandboxPersistence';
import { renderPageDocument } from './sandboxRenderer';
import PreviewToolbar, { DEVICE_PRESETS, type PreviewDevice } from './PreviewToolbar';

export type SitePreviewProps = {
  document: SandboxDocument;
  initialPageId: string;
  onClose: () => void;
  onNotify: (message: string) => void;
};

export default function SitePreview({ document, initialPageId, onClose, onNotify }: SitePreviewProps) {
  const [device, setDevice] = useState<PreviewDevice>('desktop');
  const [width, setWidth] = useState(1440);
  const [height, setHeight] = useState(900);
  const [zoom, setZoom] = useState(100);
  const [refreshKey, setRefreshKey] = useState(0);
  const [externalPrompt, setExternalPrompt] = useState<string | null>(null);
  const [schemePrompt, setSchemePrompt] = useState<{ kind: string; url: string } | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const stackRef = useRef<string[]>([initialPageId]);
  const cursorRef = useRef(0);
  const [cursor, setCursor] = useState(0);

  const currentPageId = stackRef.current[cursor] ?? initialPageId;
  const currentPage = document.pages.find((page) => page.id === currentPageId) ?? document.pages[0];

  const navigate = useCallback((pageId: string) => {
    const next = [...stackRef.current.slice(0, cursorRef.current + 1), pageId];
    stackRef.current = next;
    cursorRef.current = next.length - 1;
    setCursor(next.length - 1);
  }, []);

  const back = useCallback(() => {
    if (cursorRef.current <= 0) return;
    cursorRef.current -= 1;
    setCursor(cursorRef.current);
  }, []);

  const forward = useCallback(() => {
    if (cursorRef.current >= stackRef.current.length - 1) return;
    cursorRef.current += 1;
    setCursor(cursorRef.current);
  }, []);

  useEffect(() => {
    const handler = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      const data = event.data as { __forge?: boolean; type?: string; payload?: Record<string, unknown> } | null;
      if (!data || data.__forge !== true) return;

      if (data.type === 'navigate') {
        const pageId = data.payload?.pageId;
        if (typeof pageId === 'string' && document.pages.some((page) => page.id === pageId)) navigate(pageId);
      } else if (data.type === 'external') {
        setExternalPrompt(typeof data.payload?.url === 'string' ? (data.payload.url as string) : null);
      } else if (data.type === 'scheme') {
        const kind = data.payload?.kind;
        const url = data.payload?.url;
        if (typeof kind === 'string' && typeof url === 'string') setSchemePrompt({ kind, url });
      } else if (data.type === 'form-submit') {
        setToast('Preview submission — no data was sent');
        window.setTimeout(() => setToast(null), 2600);
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [document, navigate]);

  const srcdoc = useMemo(() => {
    if (!currentPage) return '';
    return renderPageDocument(document, currentPage, { interactive: true });
  }, [document, currentPage, refreshKey]);

  const selectDevice = (id: PreviewDevice) => {
    setDevice(id);
    if (id !== 'custom') {
      const preset = DEVICE_PRESETS.find((entry) => entry.id === id);
      if (preset) {
        setWidth(preset.width);
        setHeight(preset.height);
      }
    }
  };

  const editWidth = (value: number) => { setDevice('custom'); setWidth(value); };
  const editHeight = (value: number) => { setDevice('custom'); setHeight(value); };

  const openInNewTab = () => {
    if (!currentPage) return;
    const html = renderPageDocument(document, currentPage, { interactive: false });
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank', 'noopener');
    window.setTimeout(() => URL.revokeObjectURL(url), 60000);
  };

  const overflow = currentPage?.elements.some((element) => element.x + element.width > width) ?? false;

  const confirmExternal = () => {
    const url = externalPrompt;
    setExternalPrompt(null);
    if (url) window.open(url, '_blank', 'noopener');
  };

  const confirmScheme = () => {
    const prompt = schemePrompt;
    setSchemePrompt(null);
    if (!prompt) return;
    if (prompt.kind === 'email') window.location.href = `mailto:${prompt.url.replace(/^mailto:/, '')}`;
    else if (prompt.kind === 'tel') window.location.href = `tel:${prompt.url.replace(/^tel:/, '')}`;
    else window.open(prompt.url, '_blank', 'noopener');
  };

  if (!currentPage) {
    return (
      <div className="site-preview-overlay">
        <div className="site-preview-empty">
          <p>No page to preview.</p>
          <button className="preview-exit" onClick={onClose}>Exit</button>
        </div>
      </div>
    );
  }

  return (
    <div className="site-preview-overlay">
      <PreviewToolbar
        canBack={cursor > 0}
        canForward={cursor < stackRef.current.length - 1}
        onBack={back}
        onForward={forward}
        pages={document.pages}
        currentPageId={currentPageId}
        onSelectPage={(id) => navigate(id)}
        device={device}
        onDevice={selectDevice}
        width={width}
        height={height}
        onWidth={editWidth}
        onHeight={editHeight}
        zoom={zoom}
        onZoom={setZoom}
        onToggleOrientation={() => { const currentWidth = width; setWidth(height); setHeight(currentWidth); }}
        onRefresh={() => setRefreshKey((key) => key + 1)}
        onOpenInNewTab={openInNewTab}
        onExit={onClose}
      />

      <div className="site-preview-stage">
        {overflow && (
          <div className="preview-overflow-warning">
            <AlertTriangle size={14} /> Some content overflows this viewport width — check the responsive layout.
          </div>
        )}
        <div
          className="site-preview-frame"
          style={{ width, height, transform: `scale(${zoom / 100})`, transformOrigin: 'top left' }}
        >
          <iframe
            key={refreshKey}
            title="Website preview"
            srcDoc={srcdoc}
            sandbox="allow-same-origin allow-scripts allow-forms"
            className="site-preview-iframe"
          />
        </div>
      </div>

      {externalPrompt && (
        <div className="preview-dialog-overlay" onClick={() => setExternalPrompt(null)}>
          <div className="preview-dialog" onClick={(event) => event.stopPropagation()}>
            <div className="preview-dialog-header"><ExternalLink size={15} />Open external link</div>
            <p className="preview-dialog-copy">This link leaves your preview. Open it in a new browser tab?</p>
            <p className="preview-dialog-url">{externalPrompt}</p>
            <div className="preview-dialog-actions">
              <button className="primary" onClick={confirmExternal}>Open in new tab</button>
              <button onClick={() => setExternalPrompt(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {schemePrompt && (
        <div className="preview-dialog-overlay" onClick={() => setSchemePrompt(null)}>
          <div className="preview-dialog" onClick={(event) => event.stopPropagation()}>
            <div className="preview-dialog-header">
              {schemePrompt.kind === 'email' ? <Mail size={15} /> : schemePrompt.kind === 'tel' ? <Phone size={15} /> : <ExternalLink size={15} />}
              {schemePrompt.kind === 'email' ? 'Open email link' : schemePrompt.kind === 'tel' ? 'Open phone link' : 'Open file link'}
            </div>
            <p className="preview-dialog-copy">This action opens outside the preview.</p>
            <p className="preview-dialog-url">{schemePrompt.url}</p>
            <div className="preview-dialog-actions">
              <button className="primary" onClick={confirmScheme}>Continue</button>
              <button onClick={() => setSchemePrompt(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {toast && <div className="forge-toast"><span />{toast}</div>}
      <button className="preview-close-fab" onClick={onClose} aria-label="Close preview"><X size={18} /></button>
    </div>
  );
}