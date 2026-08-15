import { useMemo, useState } from 'react';
import { X, Monitor, Tablet, Smartphone, Sun, Moon, Maximize, Minimize, ChevronLeft, ChevronRight } from 'lucide-react';
import type { TemplateManifest } from './sandboxTemplates';
import type { SandboxDocument, CanvasElement } from './sandboxPersistence';

type Device = 'desktop' | 'tablet' | 'mobile';

const DEVICE_WIDTHS: Record<Device, string> = { desktop: '100%', tablet: '760px', mobile: '390px' };

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderElement(element: CanvasElement, dark: boolean): string {
  const textColor = dark ? '#e6ebef' : (element.color || '#424a52');
  const headingColor = dark ? '#f2f6fa' : (element.color || '#111820');
  const bg = element.background === 'transparent' || !element.background ? 'transparent' : element.background;
  const content = escapeHtml(element.content || '');

  switch (element.type) {
    case 'Heading':
      return `<h2 style="margin:0;color:${headingColor};font-size:28px;font-weight:700;line-height:1.25;">${content}</h2>`;
    case 'Text':
      return `<p style="margin:0;color:${textColor};font-size:15px;line-height:1.55;">${content}</p>`;
    case 'Button':
      return `<button disabled style="padding:12px 22px;border:0;border-radius:6px;background:${bg || '#f5a400'};color:${element.color || '#101820'};font-weight:700;font-size:14px;cursor:default;">${content}</button>`;
    case 'Image':
      if (element.asset?.url) {
        return `<img src="${escapeHtml(element.asset.url)}" alt="${escapeHtml(element.asset.altText || '')}" style="max-width:100%;border-radius:6px;" />`;
      }
      return `<div style="padding:24px;border:1px dashed #444;border-radius:6px;color:#888;text-align:center;">${content || 'Image'}</div>`;
    case 'Columns':
      return `<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:14px;">${[1, 2, 3].map((n) => `<div style="padding:18px;border:1px solid ${dark ? '#2a3440' : '#e2e6ea'};border-radius:8px;min-height:70px;"><b style="color:${headingColor};font-size:13px;">Column ${n}</b></div>`).join('')}</div>`;
    case 'Form':
      return `<div style="padding:20px;border:1px solid ${dark ? '#2a3440' : '#e2e6ea'};border-radius:8px;"><b style="color:${headingColor};font-size:15px;">${content}</b><div style="display:grid;gap:10px;margin-top:12px;">${[0, 1].map((n) => `<div style="height:34px;border:1px solid ${dark ? '#2a3440' : '#d5dae0'};border-radius:5px;background:${dark ? '#111a22' : '#fff'};"></div>`).join('')}<div style="height:34px;border-radius:5px;background:#f5a400;"></div></div></div>`;
    default:
      return `<p style="margin:0;color:${textColor};font-size:15px;">${content}</p>`;
  }
}

function buildPreviewHtml(doc: SandboxDocument, pageIndex: number, dark: boolean): string {
  const page = doc.pages[Math.max(0, pageIndex)] ?? doc.pages[0];
  const elements = (page?.elements ?? [])
    .filter((element) => !element.parentId)
    .map((element) => renderElement(element, dark))
    .join('\n');
  const pageBg = dark ? '#0b121a' : '#ffffff';
  const bodyText = dark ? '#e6ebef' : '#111820';

  return `<!doctype html><html><head><meta charset="utf-8"><style>
    body { margin:0; font-family:Inter,sans-serif; background:${pageBg}; color:${bodyText}; }
    .wrap { max-width:900px; margin:0 auto; padding:40px 32px; display:grid; gap:22px; align-content:start; min-height:100vh; }
    .nav { display:flex; gap:18px; padding-bottom:14px; border-bottom:1px solid ${dark ? '#26313c' : '#e2e6ea'}; font-size:14px; font-weight:600; }
  </style></head><body><div class="wrap">
    <div class="nav">${(doc.globalSections.navigation.map((item) => `<span>${escapeHtml(item.label)}</span>`).join('') || '<span>Home</span><span>About</span><span>Contact</span>')}</div>
    ${elements || '<p style="color:#888">This page has no elements yet.</p>'}
  </div></body></html>`;
}

export default function TemplatePreviewModal({ manifest, onClose }: { manifest: TemplateManifest; onClose: () => void }) {
  const [device, setDevice] = useState<Device>('desktop');
  const [dark, setDark] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [pageIndex, setPageIndex] = useState(0);

  const doc = manifest.document;
  const pageCount = doc.pages.length;
  const currentPage = doc.pages[pageIndex] ?? doc.pages[0];

  const html = useMemo(() => buildPreviewHtml(doc, pageIndex, dark), [doc, pageIndex, dark]);

  return (
    <div className={`tpl-preview-overlay ${fullscreen ? 'fullscreen' : ''}`} onClick={onClose}>
      <div className="tpl-preview" onClick={(event) => event.stopPropagation()}>
        <div className="tpl-preview-header">
          <div className="tpl-preview-title">
            <h3>{manifest.name}</h3>
            <span>v1.0.0 · {manifest.author.name} · isolated preview</span>
          </div>
          <div className="tpl-preview-tools">
            <div className="tpl-device-switch">
              <button className={device === 'desktop' ? 'active' : ''} onClick={() => setDevice('desktop')} title="Desktop"><Monitor size={15} /></button>
              <button className={device === 'tablet' ? 'active' : ''} onClick={() => setDevice('tablet')} title="Tablet"><Tablet size={15} /></button>
              <button className={device === 'mobile' ? 'active' : ''} onClick={() => setDevice('mobile')} title="Mobile"><Smartphone size={15} /></button>
            </div>
            <button onClick={() => setDark((v) => !v)} title="Toggle light/dark">{dark ? <Sun size={15} /> : <Moon size={15} />}</button>
            <button onClick={() => setFullscreen((v) => !v)} title="Fullscreen">{fullscreen ? <Minimize size={15} /> : <Maximize size={15} />}</button>
            <button onClick={onClose} title="Close"><X size={16} /></button>
          </div>
        </div>

        {pageCount > 1 && (
          <div className="tpl-preview-pages">
            {doc.pages.map((page, index) => (
              <button key={page.id} className={index === pageIndex ? 'active' : ''} onClick={() => setPageIndex(index)}>{page.name}</button>
            ))}
          </div>
        )}

        <div className="tpl-preview-stage">
          <div className="tpl-preview-frame" style={{ width: DEVICE_WIDTHS[device] }}>
            <div className="tpl-preview-pagerow">
              <button disabled={pageIndex === 0} onClick={() => setPageIndex((i) => Math.max(0, i - 1))}><ChevronLeft size={14} /></button>
              <span>{currentPage?.name ?? 'Preview'}{currentPage?.slug && currentPage.slug !== '/' ? ` · ${currentPage.slug}` : ''}</span>
              <button disabled={pageIndex >= pageCount - 1} onClick={() => setPageIndex((i) => Math.min(pageCount - 1, i + 1))}><ChevronRight size={14} /></button>
            </div>
            <iframe
              title={`${manifest.name} preview`}
              srcDoc={html}
              sandbox="allow-same-origin"
              className="tpl-preview-iframe"
            />
          </div>
        </div>
      </div>
    </div>
  );
}