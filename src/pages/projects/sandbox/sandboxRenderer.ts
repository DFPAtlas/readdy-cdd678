import type {
  CanvasElement,
  ElementLink,
  FormField,
  SandboxDocument,
  SandboxPage,
} from './sandboxPersistence';
import { defaultFormDefinition } from './sandboxPersistence';
import { applyInstanceOverrides, resolveComponent } from './sandboxComponents';
import { defaultTheme, themeCssVariables, themeFontImports, type ThemeDefinition } from './sandboxTheme';

/* ──────────────────────────────────────────────────────────────
   Deterministic website renderer (shared by Preview and Export)
   ────────────────────────────────────────────────────────────── */

export type RenderOptions = {
  interactive?: boolean;
  siteUrl?: string;
  basePath?: string;
};

const UNSAFE_SCHEME = /^(javascript|vbscript|data|file):/i;

export function escapeHtml(value: string | undefined | null): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function sanitizeUrl(raw: string | undefined | null): string {
  if (!raw) return '';
  const trimmed = raw.trim();
  if (UNSAFE_SCHEME.test(trimmed)) return '';
  return trimmed;
}

function pageHref(page: SandboxPage, opts: RenderOptions): string {
  const base = (opts.basePath || '').replace(/\/+$/, '');
  const slug = page.slug === '/' ? '/' : page.slug;
  return `${base}${slug}`;
}

/* ──────────────────────────────────────────────────────────────
   Shared CSS (Preview and Export render identically)
   ────────────────────────────────────────────────────────────── */

const BASE_CSS = `
*{box-sizing:border-box;margin:0;padding:0}
html,body{min-height:100%}
body{font-family:var(--font-body);color:var(--color-heading);background:var(--color-background);line-height:1.5;-webkit-font-smoothing:antialiased}
img,video{max-width:100%;display:block}
a{color:inherit;text-decoration:none}
.forge-site{display:flex;flex-direction:column;min-height:100vh}
.forge-header{position:sticky;top:0;z-index:20;display:flex;align-items:center;gap:28px;padding:16px 32px;background:var(--color-surface);color:var(--color-heading);border-bottom:1px solid var(--color-border)}
.forge-brand{display:flex;align-items:center;gap:9px;font-family:var(--font-heading);font-weight:780;font-size:18px;letter-spacing:.03em}
.forge-brand-dot{width:14px;height:14px;border-radius:3px;background:var(--color-primary)}
.forge-nav{display:flex;align-items:center;gap:22px;flex:1;flex-wrap:wrap}
.forge-nav a{font-size:14px;color:var(--color-muted);transition:color .15s}
.forge-nav a:hover{color:var(--color-accent)}
.forge-nav a.is-cta{padding:8px 16px;border-radius:var(--btn-primary-radius);background:var(--btn-primary-bg);color:var(--btn-primary-color);font-weight:700}
.forge-main{flex:1;padding:0 32px 56px}
.forge-page-title{font-family:var(--font-heading);font-size:34px;line-height:1.15;font-weight:800;letter-spacing:-.01em;margin:40px 0 8px;color:var(--color-heading)}
.forge-page-canvas{position:relative;margin-top:8px}
.f-el{position:absolute}
.f-heading{font-family:var(--font-heading);font-size:26px;line-height:1.15;font-weight:760;color:var(--color-heading)}
.f-text{font-size:16px;color:var(--color-body)}
.f-button{display:inline-flex;align-items:center;justify-content:center;padding:0 20px;height:46px;border-radius:var(--btn-primary-radius);background:var(--btn-primary-bg);color:var(--btn-primary-color);font-family:var(--font-body);font-weight:700;font-size:15px;white-space:nowrap;cursor:pointer}
.f-container{border-radius:var(--radius-medium);overflow:hidden}
.f-columns{display:flex;gap:16px;border-radius:var(--radius-medium)}
.f-columns>div{flex:1;padding:20px;border-radius:var(--radius-medium);background:var(--color-surface);color:var(--color-muted);font-size:14px}
.f-doc{display:flex;align-items:center;gap:12px;padding:16px;border:1px solid var(--color-border);border-radius:var(--radius-medium);background:var(--color-surface);color:var(--color-muted)}
.f-doc a{color:var(--color-primary);font-weight:600}
.f-form{display:grid;gap:10px;padding:22px;border:1px solid var(--color-border);border-radius:var(--radius-medium);background:var(--color-elevated-surface)}
.f-form b{font-size:16px}
.f-form input,.f-form textarea,.f-form select{padding:var(--input-py) var(--input-px);border:1px solid var(--input-border);border-radius:var(--input-radius);font-size:14px;font-family:inherit;background:var(--input-bg);color:var(--color-body)}
.f-form input:focus,.f-form textarea:focus,.f-form select:focus{outline:2px solid var(--input-focus-border);outline-offset:1px}
.f-form button{height:40px;border:0;border-radius:var(--btn-primary-radius);background:var(--btn-primary-bg);color:var(--btn-primary-color);font-weight:700;cursor:pointer}
.f-field{display:flex;flex-direction:column;gap:4px}
.f-field>label{font-size:12px;font-weight:600;color:var(--input-label)}
.f-req{color:var(--color-error)}
.f-help{font-size:11px;color:var(--input-help)}
.f-options{display:flex;flex-direction:column;gap:6px}
.f-opt{display:flex;align-items:center;gap:7px;font-size:13px;color:var(--color-body);cursor:pointer}
.forge-consent{position:absolute!important;left:-9999px!important;top:-9999px!important;height:1px;width:1px;opacity:0;overflow:hidden}
.forge-form-note{font-size:12px;color:var(--color-muted);margin-top:4px}
.forge-footer{padding:28px 32px;background:var(--color-surface);color:var(--color-muted);font-size:13px;border-top:1px solid var(--color-border)}
.forge-footer-inner{display:flex;flex-wrap:wrap;gap:14px;align-items:center}
.forge-footer-badge{font-size:11px;padding:3px 8px;border-radius:5px;background:var(--color-surface);color:var(--color-muted)}
.forge-component{position:relative}
.forge-component-frame{position:relative;width:100%;height:100%}
.forge-missing{display:flex;align-items:center;gap:8px;padding:14px;border:1px dashed var(--color-border);border-radius:var(--radius-medium);color:var(--color-muted);font-size:13px}
.forge-404{display:flex;flex-direction:column;align-items:flex-start;gap:14px;padding:60px 32px}
.forge-404 h1{font-size:34px}
.forge-404 p{color:var(--color-muted)}
`;

/* Build the full shared stylesheet for a given theme: font imports + variables + base CSS. */
export function buildSharedCss(theme: ThemeDefinition = defaultTheme()): string {
  const imports = themeFontImports(theme);
  const vars = themeCssVariables(theme);
  return [imports, vars, BASE_CSS].filter(Boolean).join('\n');
}

/* Kept for any legacy callers that expect a plain stylesheet string. */
export const SHARED_CSS = buildSharedCss();

/* ──────────────────────────────────────────────────────────────
   Element rendering
   ────────────────────────────────────────────────────────────── */

function elementPositionStyle(el: CanvasElement): string {
  return `left:${Math.max(0, Math.round(el.x))}px;top:${Math.max(0, Math.round(el.y))}px;width:${Math.max(0, Math.round(el.width))}px;min-height:${Math.max(0, Math.round(el.height))}px;background:${el.background === 'transparent' ? 'transparent' : el.background};color:${el.color};`;
}

function renderFormField(field: FormField): string {
  const id = `forge-f-${escapeHtml(field.id)}`;
  const name = `name="${escapeHtml(field.key)}"`;
  const required = field.required ? ' required' : '';
  const label = field.label ? `<label for="${id}">${escapeHtml(field.label)}${field.required ? ' <span class="f-req">*</span>' : ''}</label>` : '';
  const help = field.helpText ? `<span class="f-help">${escapeHtml(field.helpText)}</span>` : '';
  const placeholder = field.placeholder ? ` placeholder="${escapeHtml(field.placeholder)}"` : '';
  const autocomplete = field.autocomplete ? ` autocomplete="${escapeHtml(field.autocomplete)}"` : '';

  if (field.type === 'submit') return '';

  if (field.type === 'textarea') {
    return `<div class="f-field">${label}<textarea id="${id}" ${name} rows="3"${placeholder}${required}>${escapeHtml(field.defaultValue)}</textarea>${help}</div>`;
  }
  if (field.type === 'select') {
    const options = field.options.map((opt) => `<option value="${escapeHtml(opt)}">${escapeHtml(opt)}</option>`).join('');
    return `<div class="f-field">${label}<select id="${id}" ${name}${required}><option value="">Choose…</option>${options}</select>${help}</div>`;
  }
  if (field.type === 'radio') {
    const radios = field.options.map((opt) => `<label class="f-opt"><input type="radio" name="${escapeHtml(field.key)}" value="${escapeHtml(opt)}"${required} /> ${escapeHtml(opt)}</label>`).join('');
    return `<div class="f-field">${label}<div class="f-options">${radios}</div>${help}</div>`;
  }
  if (field.type === 'checkbox') {
    const checks = field.options.map((opt) => `<label class="f-opt"><input type="checkbox" name="${escapeHtml(field.key)}" value="${escapeHtml(opt)}" /> ${escapeHtml(opt)}</label>`).join('');
    return `<div class="f-field">${label}<div class="f-options">${checks}</div>${help}</div>`;
  }
  if (field.type === 'consent') {
    return `<div class="f-field">${label}<label class="f-opt"><input type="checkbox" id="${id}" name="${escapeHtml(field.key)}"${required} /> ${escapeHtml(field.helpText || field.label)}</label></div>`;
  }
  if (field.type === 'hidden') {
    return `<input type="hidden" name="${escapeHtml(field.key)}" value="${escapeHtml(field.defaultValue)}" />`;
  }
  if (field.type === 'file') {
    return `<div class="f-field">${label}<input type="file" id="${id}" ${name}${required} />${help}</div>`;
  }
  const inputType = field.type === 'email' ? 'email' : field.type === 'tel' ? 'tel' : field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : field.type === 'time' ? 'time' : 'text';
  return `<div class="f-field">${label}<input type="${inputType}" id="${id}" ${name}${placeholder}${required}${autocomplete} value="${escapeHtml(field.defaultValue)}" />${help}</div>`;
}

function linkAttributes(link: ElementLink, doc: SandboxDocument, opts: RenderOptions): { attrs: string; wraps: boolean } {
  const interactive = Boolean(opts.interactive);
  if (link.type === 'none') return { attrs: '', wraps: false };

  if (link.type === 'page') {
    const target = doc.pages.find((page) => page.id === link.pageId);
    const href = target ? pageHref(target, opts) : '#';
    const data = interactive ? ` data-forge-link="page" data-forge-page="${escapeHtml(link.pageId)}"` : '';
    return { attrs: `href="${escapeHtml(href)}"${data}`, wraps: true };
  }
  if (link.type === 'section') {
    return { attrs: `href="#${escapeHtml(link.sectionId)}"`, wraps: true };
  }
  if (link.type === 'external') {
    const url = sanitizeUrl(link.url);
    if (!url) return { attrs: '', wraps: false };
    const target = link.newTab ? ' target="_blank" rel="noopener nofollow"' : '';
    const data = interactive ? ` data-forge-link="external"` : '';
    return { attrs: `href="${escapeHtml(url)}"${target}${data}`, wraps: true };
  }
  if (link.type === 'email') {
    const email = link.url.trim();
    const data = interactive ? ` data-forge-link="email"` : '';
    return { attrs: `href="mailto:${escapeHtml(email)}"${data}`, wraps: true };
  }
  if (link.type === 'tel') {
    const data = interactive ? ` data-forge-link="tel"` : '';
    return { attrs: `href="tel:${escapeHtml(link.url.trim())}"${data}`, wraps: true };
  }
  if (link.type === 'file') {
    const url = sanitizeUrl(link.url);
    const data = interactive ? ` data-forge-link="file"` : '';
    return { attrs: `href="${escapeHtml(url)}" download${data}`, wraps: true };
  }
  return { attrs: '', wraps: false };
}

function renderElementInner(el: CanvasElement, doc: SandboxDocument, opts: RenderOptions, childrenHtml: string): string {
  const style = elementPositionStyle(el);

  if (el.component) {
    const definition = resolveComponent(el.component.componentId, doc.components);
    if (!definition) {
      return `<div class="f-el forge-component forge-missing" style="${style}"><span>Missing component: ${escapeHtml(el.component.componentId)}</span></div>`;
    }
    const resolved = applyInstanceOverrides(definition, el.component);
    const inner = resolved.map((child) => {
      const childStyle = `left:${Math.max(0, Math.round(child.x))}px;top:${Math.max(0, Math.round(child.y))}px;width:${Math.max(0, Math.round(child.width))}px;min-height:${Math.max(0, Math.round(child.height))}px;background:${child.background === 'transparent' ? 'transparent' : child.background};color:${child.color};`;
      return renderLeafElement(child, childStyle, doc, opts);
    }).join('');
    return `<div class="f-el forge-component" style="${style}"><div class="forge-component-frame">${inner}</div></div>`;
  }

  return renderLeafElement(el, style, doc, opts, childrenHtml);
}

function renderLeafElement(el: CanvasElement, style: string, doc: SandboxDocument, opts: RenderOptions, childrenHtml = ''): string {
  const content = escapeHtml(el.content);
  const link = el.link ? linkAttributes(el.link, doc, opts) : { attrs: '', wraps: false };
  const open = link.wraps ? `<a class="f-el-link" ${link.attrs} style="position:absolute;${style}">` : '';
  const close = link.wraps ? `</a>` : '';

  switch (el.type) {
    case 'Heading':
      return `${open}<h2 class="f-el f-heading" style="${style}">${content}</h2>${close}`;
    case 'Text':
      return `${open}<p class="f-el f-text" style="${style}">${content}</p>${close}`;
    case 'Button':
      if (link.wraps) return `<a class="f-el f-button" ${link.attrs} style="${style}">${content}</a>`;
      return `<button type="button" class="f-el f-button" style="${style}">${content}</button>`;
    case 'Image': {
      const asset = el.asset;
      if (asset?.url) {
        const src = sanitizeUrl(asset.url);
        const alt = asset.decorative ? '' : (asset.altText || el.content);
        const mediaAttrs = `class="f-el f-image" src="${escapeHtml(src)}" alt="${escapeHtml(alt)}"${asset.decorative ? ' aria-hidden="true"' : ''} style="${style}object-fit:${asset.objectFit};object-position:${asset.focalX}% ${asset.focalY}%;border-radius:${asset.borderRadius}px;opacity:${asset.opacity / 100};"`;
        if (asset.linkUrl && sanitizeUrl(asset.linkUrl)) {
          const target = asset.linkNewTab ? ' target="_blank" rel="noopener nofollow"' : '';
          return `<a class="f-el-link" href="${escapeHtml(sanitizeUrl(asset.linkUrl))}"${target} style="position:absolute;${style}"><img ${mediaAttrs} style="width:100%;height:100%;object-fit:${asset.objectFit};object-position:${asset.focalX}% ${asset.focalY}%;border-radius:${asset.borderRadius}px;opacity:${asset.opacity / 100};" /></a>`;
        }
        return `<img ${mediaAttrs} />`;
      }
      return `<div class="f-el forge-missing" style="${style}"><span>Image</span></div>`;
    }
    case 'Video': {
      const asset = el.asset;
      if (asset?.url) {
        const src = sanitizeUrl(asset.url);
        return `<video class="f-el f-video" src="${escapeHtml(src)}"${asset.poster ? ` poster="${escapeHtml(sanitizeUrl(asset.poster))}"` : ''}${asset.controls ? ' controls' : ''}${asset.muted || asset.autoplay ? ' muted' : ''}${asset.loop ? ' loop' : ''}${asset.autoplay ? ' autoplay' : ''}${asset.accessibleTitle ? ` title="${escapeHtml(asset.accessibleTitle)}"` : ''} style="${style}object-fit:cover;"></video>`;
      }
      return `<div class="f-el forge-missing" style="${style}"><span>Video</span></div>`;
    }
    case 'Document': {
      const asset = el.asset;
      const url = asset?.url ? sanitizeUrl(asset.url) : '';
      const download = asset?.name ? ` download="${escapeHtml(asset.name)}"` : '';
      return `<div class="f-el f-doc" style="${style}"><span>📄</span><span>${content}</span>${url ? `<a href="${escapeHtml(url)}"${download}>Download</a>` : ''}</div>`;
    }
    case 'Columns':
      return `<div class="f-el f-columns" style="${style}"><div>Column one</div><div>Column two</div></div>`;
    case 'Form': {
      const formDef = el.form ?? defaultFormDefinition(el.content || el.name);
      const fieldsHtml = formDef.fields.filter((field) => field.type !== 'submit').map(renderFormField).join('');
      const submitField = formDef.fields.find((field) => field.type === 'submit');
      const submitLabel = submitField?.label || formDef.submitLabel || 'Submit';
      const honeypot = formDef.honeypot ? `<input type="text" name="website_alt" tabindex="-1" autocomplete="off" aria-hidden="true" class="forge-consent" />` : '';
      const note = opts.interactive ? '<span class="forge-form-note">Preview submission — no data is sent</span>' : '';
      return `<form class="f-el f-form" style="${style}" data-forge-form data-forge-name="${escapeHtml(el.name)}" data-forge-formid="${escapeHtml(el.id)}"><b>${escapeHtml(formDef.name || content)}</b>${honeypot}${fieldsHtml}<button type="submit">${escapeHtml(submitLabel)}</button>${note}</form>`;
    }
    case 'Container':
    default:
      return `<div class="f-el f-container" style="${style}">${childrenHtml}</div>`;
  }
}

function renderElementTree(elements: CanvasElement[], parentId: string | undefined, doc: SandboxDocument, opts: RenderOptions, px: number, py: number): string {
  return elements
    .filter((el) => (el.parentId ?? undefined) === parentId && !el.hidden)
    .map((el) => {
      const offsetEl = parentId ? { ...el, x: el.x - px, y: el.y - py } : el;
      const children = renderElementTree(elements, el.id, doc, opts, el.x, el.y);
      return renderElementInner(offsetEl, doc, opts, children);
    })
    .join('');
}

/* ──────────────────────────────────────────────────────────────
   Header, navigation, footer
   ────────────────────────────────────────────────────────────── */

function renderNavigation(doc: SandboxDocument, opts: RenderOptions): string {
  const items = doc.globalSections.navigation;
  if (!items.length) return '';
  return items.map((item) => {
    if (item.type === 'page') {
      const target = doc.pages.find((page) => page.id === item.pageId);
      const href = target ? pageHref(target, opts) : '#';
      const data = opts.interactive ? ` data-forge-link="page" data-forge-page="${escapeHtml(item.pageId ?? '')}"` : '';
      const broken = !target ? ' style="opacity:.5"' : '';
      return `<a class="${item.isButton ? 'is-cta' : ''}" href="${escapeHtml(href)}"${data}${item.newTab ? ' target="_blank" rel="noopener nofollow"' : ''}${broken}>${escapeHtml(item.label)}</a>`;
    }
    if (item.type === 'external') {
      const url = sanitizeUrl(item.url);
      const data = opts.interactive ? ` data-forge-link="external"` : '';
      return `<a href="${escapeHtml(url)}"${data}${item.newTab ? ' target="_blank" rel="noopener nofollow"' : ''}>${escapeHtml(item.label)}</a>`;
    }
    if (item.type === 'anchor') {
      return `<a href="#${escapeHtml(item.anchor)}">${escapeHtml(item.label)}</a>`;
    }
    return `<a href="#">${escapeHtml(item.label)}</a>`;
  }).join('');
}

function renderHeader(doc: SandboxDocument, opts: RenderOptions): string {
  return `<header class="forge-header"><div class="forge-brand"><span class="forge-brand-dot"></span><span>${escapeHtml(doc.projectName)}</span></div><nav class="forge-nav">${renderNavigation(doc, opts)}</nav></header>`;
}

function renderFooter(doc: SandboxDocument): string {
  const footer = doc.globalSections.footer;
  const items = footer.map((el) => `<span>${escapeHtml(el.content)}</span>`).join('');
  return `<footer class="forge-footer"><div class="forge-footer-inner">${items || `<span class="forge-footer-badge">Global footer</span><span>© ${new Date().getFullYear()} ${escapeHtml(doc.projectName)}. All rights reserved.</span>`}</div></footer>`;
}

/* ──────────────────────────────────────────────────────────────
   Page head (SEO)
   ────────────────────────────────────────────────────────────── */

function pageHead(doc: SandboxDocument, page: SandboxPage, opts: RenderOptions): string {
  const seo = page.seo;
  const title = seo.title || page.name;
  const description = seo.metaDescription || '';
  const canonical = seo.canonicalUrl ? sanitizeUrl(seo.canonicalUrl) : '';
  const robots = seo.index ? 'index, follow' : 'noindex, nofollow';

  const meta = [
    `<meta charset="utf-8" />`,
    `<meta name="viewport" content="width=device-width, initial-scale=1" />`,
    `<title>${escapeHtml(title)}</title>`,
    description ? `<meta name="description" content="${escapeHtml(description)}" />` : '',
    canonical ? `<link rel="canonical" href="${escapeHtml(canonical)}" />` : '',
    `<meta name="robots" content="${robots}" />`,
    `<meta property="og:type" content="website" />`,
    `<meta property="og:title" content="${escapeHtml(seo.socialTitle || title)}" />`,
    seo.socialDescription || description ? `<meta property="og:description" content="${escapeHtml(seo.socialDescription || description)}" />` : '',
    `<meta name="twitter:card" content="summary_large_image" />`,
  ].filter(Boolean).join('\n  ');

  return `<head>\n  ${meta}\n  <style>\n${buildSharedCss(doc.theme)}\n  </style>\n</head>`;
}

/* ──────────────────────────────────────────────────────────────
   Trusted preview script (interactive mode only)
   ────────────────────────────────────────────────────────────── */

const PREVIEW_SCRIPT = `
(function(){
  function post(type, payload){ try { window.parent.postMessage({ __forge: true, type: type, payload: payload }, '*'); } catch(e) }
  document.addEventListener('click', function(e){
    var el = e.target && e.target.closest ? e.target.closest('a[data-forge-link]') : null;
    if(!el) return;
    var kind = el.getAttribute('data-forge-link');
    if(kind === 'page'){ e.preventDefault(); post('navigate', { pageId: el.getAttribute('data-forge-page') }); }
    else if(kind === 'external'){ e.preventDefault(); post('external', { url: el.getAttribute('href') }); }
    else if(kind === 'email' || kind === 'tel' || kind === 'file'){ e.preventDefault(); post('scheme', { kind: kind, url: el.getAttribute('href') }); }
  });
  document.addEventListener('submit', function(e){
    var f = e.target && e.target.closest ? e.target.closest('form[data-forge-form]') : null;
    if(!f) return;
    e.preventDefault();
    post('form-submit', { name: f.getAttribute('data-forge-name') || 'form' });
  });
})();
`;

/* ──────────────────────────────────────────────────────────────
   Page document assembly
   ────────────────────────────────────────────────────────────── */

function pageCanvasHeight(page: SandboxPage): number {
  const maxBottom = page.elements.reduce((max, el) => {
    const bottom = el.y + el.height;
    return Math.max(max, bottom);
  }, 0);
  return Math.max(400, Math.round(maxBottom) + 120);
}

export function renderPageBody(doc: SandboxDocument, page: SandboxPage, opts: RenderOptions): string {
  const header = page.advanced.hideGlobalHeader ? '' : renderHeader(doc, opts);
  const footer = page.advanced.hideGlobalFooter ? '' : renderFooter(doc);
  const bodyClass = page.advanced.bodyClass ? ` class="${escapeHtml(page.advanced.bodyClass)}"` : '';
  const bg = page.advanced.backgroundColor && page.advanced.backgroundColor !== '#ffffff' ? ` style="background:${page.advanced.backgroundColor}"` : '';
  const height = pageCanvasHeight(page);
  const elements = renderElementTree(page.elements, undefined, doc, opts, 0, 0);
  const themeMode = doc.theme?.mode ?? 'light';
  const themeAttr = themeMode === 'dark' ? ' data-theme="dark"' : '';

  return `<body${bodyClass}${bg}>\n  <div class="forge-site"${themeAttr}>\n    ${header}\n    <main class="forge-main">\n      <h1 class="forge-page-title">${escapeHtml(page.seo.title || page.name)}</h1>\n      <div class="forge-page-canvas" style="min-height:${height}px">\n        ${elements}\n      </div>\n    </main>\n    ${footer}\n  </div>\n  ${opts.interactive ? `<script>\n${PREVIEW_SCRIPT}\n  </script>` : ''}\n</body>`;
}

export function renderPageDocument(doc: SandboxDocument, page: SandboxPage, opts: RenderOptions): string {
  const lang = 'en';
  return `<!DOCTYPE html>\n<html lang="${lang}">\n${pageHead(doc, page, opts)}\n${renderPageBody(doc, page, opts)}\n</html>`;
}

export function renderNotFoundDocument(doc: SandboxDocument, opts: RenderOptions): string {
  const notFound = doc.pages.find((page) => page.slug === '/404') ?? doc.pages.find((page) => page.name.toLowerCase().includes('404'));
  if (notFound) return renderPageDocument(doc, notFound, opts);
  return `<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="utf-8" />\n  <title>404 — Page not found</title>\n  <style>\n${buildSharedCss(doc.theme)}\n  </style>\n</head>\n<body><main class="forge-404"><h1>404 — Page not found</h1><p>The page you are looking for does not exist or has been moved.</p><a class="f-button" style="position:static;height:46px;display:inline-flex" href="${opts.basePath || ''}/">Back to home</a></main></body>\n</html>`;
}

/* ──────────────────────────────────────────────────────────────
   Static site generation (export)
   ────────────────────────────────────────────────────────────── */

export type StaticSitePage = {
  slug: string;
  filename: string;
  html: string;
};

export type StaticSite = {
  pages: StaticSitePage[];
  css: string;
  sitemap: string;
  robots: string;
  manifest: Record<string, unknown>;
  readme: string;
  notFoundHtml: string;
  assetUrls: string[];
};

export function generateStaticSite(doc: SandboxDocument, opts: RenderOptions = {}): StaticSite {
  const siteUrl = (opts.siteUrl || '').replace(/\/+$/, '');
  const pages: StaticSitePage[] = doc.pages.map((page) => {
    const filename = page.slug === '/' ? 'index.html' : `${page.slug.replace(/^\/+/, '')}/index.html`;
    return { slug: page.slug, filename, html: renderPageDocument(doc, page, opts) };
  });

  const sitemapUrls = pages
    .map((page) => `<url><loc>${escapeHtml(`${siteUrl}${page.slug === '/' ? '/' : page.slug}`)}</loc></url>`)
    .join('\n');
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${sitemapUrls}\n</urlset>`;

  const robots = `User-agent: *\nAllow: /\n\nSitemap: ${siteUrl}/sitemap.xml\n`;

  const assetUrls = collectAssetUrls(doc);

  const manifest = {
    project: doc.projectName,
    schemaVersion: doc.schemaVersion,
    pageCount: doc.pages.length,
    componentCount: doc.components.length,
    assetCount: assetUrls.length,
    generatedAt: new Date().toISOString(),
    generator: 'forge-static-export',
  };

  const readme = `# ${doc.projectName}\n\nExported from Forge. This is a static website that runs without the editor.\n\n## Viewing locally\n\nOpen any \`index.html\` file directly in a browser, or serve the folder with:\n\n\`\`\`\nnpx serve .\n\`\`\`\n\n## Structure\n\n- \`index.html\` — homepage\n- \`<page>/index.html\` — one entry per page\n- \`css/style.css\` — shared styles\n- \`assets/\` — referenced media files\n- \`sitemap.xml\`, \`robots.txt\` — SEO files\n- \`404.html\` — not-found page\n- \`manifest.json\` — build manifest\n`;

  return {
    pages,
    css: buildSharedCss(doc.theme),
    sitemap,
    robots,
    manifest,
    readme,
    notFoundHtml: renderNotFoundDocument(doc, opts),
    assetUrls,
  };
}

function collectAssetUrls(doc: SandboxDocument): string[] {
  const urls = new Set<string>();
  const visit = (elements: CanvasElement[]) => {
    elements.forEach((el) => {
      if (el.asset?.url) urls.add(el.asset.url);
      if (el.asset?.poster) urls.add(el.asset.poster);
      if (el.component) {
        const definition = resolveComponent(el.component.componentId, doc.components);
        if (definition) visit(definition.elements);
      }
    });
  };
  doc.pages.forEach((page) => visit(page.elements));
  doc.globalSections.header.forEach((el) => { if (el.asset?.url) urls.add(el.asset.url); });
  doc.globalSections.footer.forEach((el) => { if (el.asset?.url) urls.add(el.asset.url); });
  return [...urls].filter((url) => url && !url.startsWith('data:'));
}

export function resolvePageBySlug(doc: SandboxDocument, slug: string): SandboxPage | undefined {
  return doc.pages.find((page) => page.slug === slug);
}

export function resolvePageById(doc: SandboxDocument, pageId: string): SandboxPage | undefined {
  return doc.pages.find((page) => page.id === pageId);
}