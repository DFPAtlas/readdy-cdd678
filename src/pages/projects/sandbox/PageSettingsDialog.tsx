import { useEffect, useMemo, useState } from 'react';
import { X } from 'lucide-react';
import type { SandboxPage } from './sandboxPersistence';
import { validateSlug } from './sandboxPages';

type PageSettingsDialogProps = {
  open: boolean;
  page: SandboxPage | null;
  existingSlugs: string[];
  onClose: () => void;
  onSave: (updates: Partial<SandboxPage>) => void;
};

type Tab = 'general' | 'seo' | 'advanced';

export default function PageSettingsDialog({ open, page, existingSlugs, onClose, onSave }: PageSettingsDialogProps) {
  const [tab, setTab] = useState<Tab>('general');
  const [draft, setDraft] = useState<SandboxPage | null>(null);

  useEffect(() => {
    if (open && page) {
      setDraft(JSON.parse(JSON.stringify(page)) as SandboxPage);
      setTab('general');
    }
  }, [open, page]);

  const slugCheck = useMemo(() => {
    if (!draft) return { ok: true as boolean, error: undefined as string | undefined, suggestion: undefined as string | undefined };
    return validateSlug(draft.slug, existingSlugs, draft.isHome ? undefined : page?.slug);
  }, [draft, existingSlugs, page]);

  if (!open || !draft || !page) return null;

  const patch = (partial: Partial<SandboxPage>) => setDraft((current) => (current ? { ...current, ...partial } : current));
  const patchSeo = (partial: Partial<SandboxPage['seo']>) => setDraft((current) => (current ? { ...current, seo: { ...current.seo, ...partial } } : current));
  const patchAdvanced = (partial: Partial<SandboxPage['advanced']>) => setDraft((current) => (current ? { ...current, advanced: { ...current.advanced, ...partial } } : current));

  const save = () => {
    onSave({
      name: draft.name,
      slug: draft.slug,
      status: draft.status,
      navigationLabel: draft.navigationLabel,
      showInNavigation: draft.showInNavigation,
      seo: draft.seo,
      advanced: draft.advanced,
    });
    onClose();
  };

  const titleLen = draft.seo.title.length;
  const descLen = draft.seo.metaDescription.length;

  return (
    <div className="asset-dialog-overlay" onClick={onClose}>
      <div className="asset-dialog page-settings-dialog" onClick={(event) => event.stopPropagation()}>
        <div className="asset-dialog-header">
          <h3>Page settings — {page.name}</h3>
          <button onClick={onClose} aria-label="Close"><X size={15} /></button>
        </div>
        <div className="page-settings-tabs">
          <button className={tab === 'general' ? 'active' : ''} onClick={() => setTab('general')}>General</button>
          <button className={tab === 'seo' ? 'active' : ''} onClick={() => setTab('seo')}>SEO</button>
          <button className={tab === 'advanced' ? 'active' : ''} onClick={() => setTab('advanced')}>Advanced</button>
        </div>

        <div className="page-settings-body">
          {tab === 'general' && (
            <>
              <label className="page-dialog-label">Page name
                <input className="asset-dialog-input" value={draft.name} onChange={(event) => patch({ name: event.target.value })} />
              </label>
              <label className="page-dialog-label">Slug
                <input className="asset-dialog-input" value={draft.slug} disabled={draft.isHome} onChange={(event) => patch({ slug: event.target.value })} />
              </label>
              {!slugCheck.ok && <div className="slug-feedback"><span>{slugCheck.error}</span>{slugCheck.suggestion && <button onClick={() => patch({ slug: slugCheck.suggestion as string })}>Use {slugCheck.suggestion}</button>}</div>}
              <label className="page-dialog-label">Status
                <select className="asset-dialog-input" value={draft.status} onChange={(event) => patch({ status: event.target.value as SandboxPage['status'] })}>
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                </select>
              </label>
              <label className="page-dialog-label">Navigation label
                <input className="asset-dialog-input" value={draft.navigationLabel} onChange={(event) => patch({ navigationLabel: event.target.value })} />
              </label>
              <label className="asset-check page-dialog-check">
                <input type="checkbox" checked={draft.showInNavigation} onChange={(event) => patch({ showInNavigation: event.target.checked })} />
                Show in navigation
              </label>
              {draft.isHome && <p className="page-dialog-hint">This page is the homepage. Its slug is always “/”.</p>}
            </>
          )}

          {tab === 'seo' && (
            <>
              <label className="page-dialog-label">Page title <small>{titleLen}/60</small>
                <input className="asset-dialog-input" value={draft.seo.title} onChange={(event) => patchSeo({ title: event.target.value })} />
              </label>
              {titleLen > 0 && (titleLen < 50 || titleLen > 60) && <p className="page-dialog-hint warn">Recommended length is 50–60 characters.</p>}
              <label className="page-dialog-label">Meta description <small>{descLen}/160</small>
                <textarea className="asset-dialog-input textarea" value={draft.seo.metaDescription} onChange={(event) => patchSeo({ metaDescription: event.target.value })} />
              </label>
              {descLen > 0 && (descLen < 140 || descLen > 160) && <p className="page-dialog-hint warn">Recommended length is 140–160 characters.</p>}
              <div className="seo-preview">
                <span className="seo-preview-title">{draft.seo.title || 'Untitled'}</span>
                <span className="seo-preview-url">https://yoursite.com{draft.slug === '/' ? '' : draft.slug}</span>
                <span className="seo-preview-desc">{draft.seo.metaDescription || 'Add a meta description to preview it here.'}</span>
              </div>
              <label className="page-dialog-label">Social title
                <input className="asset-dialog-input" value={draft.seo.socialTitle} onChange={(event) => patchSeo({ socialTitle: event.target.value })} />
              </label>
              <label className="page-dialog-label">Social description
                <textarea className="asset-dialog-input textarea" value={draft.seo.socialDescription} onChange={(event) => patchSeo({ socialDescription: event.target.value })} />
              </label>
              <label className="page-dialog-label">Social image asset ID
                <input className="asset-dialog-input" value={draft.seo.socialImageAssetId} onChange={(event) => patchSeo({ socialImageAssetId: event.target.value })} placeholder="Optional" />
              </label>
              <label className="page-dialog-label">Canonical URL
                <input className="asset-dialog-input" value={draft.seo.canonicalUrl} onChange={(event) => patchSeo({ canonicalUrl: event.target.value })} placeholder="https://…" />
              </label>
              <label className="asset-check page-dialog-check">
                <input type="checkbox" checked={draft.seo.index} onChange={(event) => patchSeo({ index: event.target.checked })} />
                Allow search engines to index this page
              </label>
            </>
          )}

          {tab === 'advanced' && (
            <>
              <label className="page-dialog-label">Page background colour
                <input type="color" className="asset-dialog-input colour-input" value={draft.advanced.backgroundColor} onChange={(event) => patchAdvanced({ backgroundColor: event.target.value })} />
              </label>
              <label className="page-dialog-label">Body class
                <input className="asset-dialog-input" value={draft.advanced.bodyClass} onChange={(event) => patchAdvanced({ bodyClass: event.target.value })} placeholder="e.g. landing-page" />
              </label>
              <label className="asset-check page-dialog-check">
                <input type="checkbox" checked={draft.advanced.hideGlobalHeader} onChange={(event) => patchAdvanced({ hideGlobalHeader: event.target.checked })} />
                Hide global header on this page
              </label>
              <label className="asset-check page-dialog-check">
                <input type="checkbox" checked={draft.advanced.hideGlobalFooter} onChange={(event) => patchAdvanced({ hideGlobalFooter: event.target.checked })} />
                Hide global footer on this page
              </label>
              <label className="asset-check page-dialog-check">
                <input type="checkbox" checked={draft.advanced.passwordProtected} onChange={(event) => patchAdvanced({ passwordProtected: event.target.checked })} />
                Password-protected (placeholder)
              </label>
              <label className="page-dialog-label">Page notes
                <textarea className="asset-dialog-input textarea" value={draft.advanced.notes} onChange={(event) => patchAdvanced({ notes: event.target.value })} placeholder="Internal notes for this page" />
              </label>
            </>
          )}
        </div>

        <div className="asset-dialog-actions">
          <button onClick={onClose}>Cancel</button>
          <button className="primary" disabled={!slugCheck.ok} onClick={save}>Save settings</button>
        </div>
      </div>
    </div>
  );
}