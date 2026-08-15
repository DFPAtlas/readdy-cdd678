import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Search, Plus, Upload, Download, Eye, Globe, LayoutGrid, FileText,
  ShieldCheck, Monitor, Boxes, Sparkles, RefreshCw, Check, X, Flag, FolderOpen,
} from 'lucide-react';
import {
  listCommunityTemplates, listMyTemplates, getTemplateVersion, createTemplate,
  submitTemplateForReview, setTemplateVisibility, deleteTemplate, exportPackageFile,
  readPackageFile, buildManifest, scanManifest, currentAuthor, moderateTemplate,
  listPendingSubmissions, isForgeAdmin, recordInstallation,
  TEMPLATE_TYPE_LABELS, TEMPLATE_VISIBILITY_LABELS, MODERATION_STATUS_LABELS, PLACEHOLDER_KINDS,
  type TemplateManifest, type TemplateRecord, type TemplateType, type TemplateVisibility,
  type LicenceKey, type InstallMode, type ModerationStatus,
} from './sandboxTemplates';
import { getStarterKits } from './starterKits';
import { resolveSandboxProject, type SandboxDocument } from './sandboxPersistence';
import TemplatePreviewModal from './TemplatePreviewModal';
import TemplateInstallDialog from './TemplateInstallDialog';

type LibrarySource = 'starter' | 'community' | 'mine';

type LibraryItem = {
  key: string;
  source: LibrarySource;
  manifest: TemplateManifest;
  record?: TemplateRecord;
  versionId?: string;
};

type TemplatesPanelProps = {
  document: SandboxDocument;
  currentPageCount: number;
  onNotify: (message: string) => void;
  onInstall: (manifest: TemplateManifest, mode: InstallMode, placeholders: Record<string, string>) => Promise<{ ok: boolean; message: string }>;
};

const TYPE_OPTIONS: { value: TemplateType | 'all'; label: string }[] = [
  { value: 'all', label: 'All types' },
  { value: 'website', label: 'Complete websites' },
  { value: 'page', label: 'Pages' },
  { value: 'section', label: 'Sections' },
  { value: 'component', label: 'Components' },
  { value: 'design_system', label: 'Design systems' },
];

const SORT_OPTIONS = [
  { value: 'recent', label: 'Recently updated' },
  { value: 'popular', label: 'Most installed' },
  { value: 'name', label: 'Name A–Z' },
];

function itemName(item: LibraryItem): string { return item.manifest.name; }
function itemDescription(item: LibraryItem): string { return item.manifest.description; }
function itemAuthor(item: LibraryItem): string { return item.manifest.author.name; }
function itemPageCount(item: LibraryItem): number { return item.manifest.document.pages.length; }
function itemInstallCount(item: LibraryItem): number { return item.record?.installCount ?? 0; }
function itemUpdatedAt(item: LibraryItem): string { return item.record?.updatedAt ?? new Date().toISOString(); }
function itemTags(item: LibraryItem): string[] {
  const tags = [TEMPLATE_TYPE_LABELS[item.manifest.templateType]];
  if (item.manifest.requiredFeatures.includes('forms')) tags.push('Forms');
  if (item.manifest.requiredFeatures.includes('video')) tags.push('Video');
  if (item.manifest.requiredFeatures.includes('multi_page')) tags.push('Multi-page');
  return tags;
}

export default function TemplatesPanel({ document, currentPageCount, onNotify, onInstall }: TemplatesPanelProps) {
  const [tab, setTab] = useState<'library' | 'mine'>('library');
  const [starter, setStarter] = useState<LibraryItem[]>([]);
  const [community, setCommunity] = useState<LibraryItem[]>([]);
  const [mine, setMine] = useState<LibraryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<TemplateType | 'all'>('all');
  const [sort, setSort] = useState('recent');

  const [previewItem, setPreviewItem] = useState<LibraryItem | null>(null);
  const [installItem, setInstallItem] = useState<LibraryItem | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [moderationOpen, setModerationOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [pending, setPending] = useState<TemplateRecord[]>([]);
  const importRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [kits, commTemplates, myTemplates, adminFlag] = await Promise.all([
      getStarterKits(),
      listCommunityTemplates(),
      listMyTemplates(),
      isForgeAdmin(),
    ]);

    const toItems = async (records: TemplateRecord[], source: LibrarySource): Promise<LibraryItem[]> => {
      const items: LibraryItem[] = [];
      for (const record of records) {
        const version = await getTemplateVersion(record.id);
        if (version?.manifest) items.push({ key: record.id, source, manifest: version.manifest, record: { ...record, installCount: record.installCount }, versionId: version.id });
      }
      return items;
    };

    setStarter(kits.map((manifest) => ({ key: `starter:${manifest.templateId}`, source: 'starter' as const, manifest })));
    setCommunity(await toItems(commTemplates, 'community'));
    setMine(await toItems(myTemplates, 'mine'));
    setIsAdmin(adminFlag);
    if (adminFlag) setPending(await listPendingSubmissions());
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  const libraryItems = useMemo(() => {
    const source = tab === 'library' ? [...starter, ...community] : mine;
    let filtered = source.filter((item) => {
      if (typeFilter !== 'all' && item.manifest.templateType !== typeFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        const hay = `${itemName(item)} ${itemDescription(item)} ${itemAuthor(item)} ${itemTags(item).join(' ')}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
    filtered = [...filtered].sort((a, b) => {
      if (sort === 'name') return itemName(a).localeCompare(itemName(b));
      if (sort === 'popular') return itemInstallCount(b) - itemInstallCount(a);
      return Date.parse(itemUpdatedAt(b)) - Date.parse(itemUpdatedAt(a));
    });
    return filtered;
  }, [starter, community, mine, tab, search, typeFilter, sort]);

  const install = async (mode: InstallMode, placeholders: Record<string, string>) => {
    if (!installItem) return;
    const manifest = installItem.manifest;
    setInstallItem(null);
    const result = await onInstall(manifest, mode, placeholders);
    onNotify(result.message);
    // Record the installation against the source template for licence
    // traceability and honest install counts (community templates only).
    if (result.ok && installItem.record && installItem.versionId) {
      const resolved = await resolveSandboxProject().catch(() => null);
      if (resolved) {
        await recordInstallation({
          templateId: installItem.record.id,
          templateVersionId: installItem.versionId,
          projectId: resolved.projectId,
          licence: manifest.licence,
          installationMode: mode,
        });
      }
    }
    if (result.ok) void load();
  };

  const exportTemplate = async (item: LibraryItem) => {
    const result = await exportPackageFile(item.manifest);
    onNotify(result.message);
  };

  const handleImportFile = async (file: File | undefined) => {
    if (!file) return;
    const result = await readPackageFile(file);
    if (!result.ok || !result.manifest) { onNotify(result.message); return; }
    setPreviewItem({ key: `import:${result.manifest.templateId}`, source: 'community', manifest: result.manifest });
    onNotify('Template imported — review it before installing.');
  };

  const submitMine = async (record: TemplateRecord) => {
    const result = await submitTemplateForReview(record.id);
    onNotify(result.message);
    void load();
  };

  const changeVisibility = async (record: TemplateRecord, visibility: TemplateVisibility) => {
    const result = await setTemplateVisibility(record.id, visibility);
    onNotify(result.message);
    void load();
  };

  const removeMine = async (record: TemplateRecord) => {
    const result = await deleteTemplate(record.id);
    onNotify(result.message);
    void load();
  };

  const moderate = async (record: TemplateRecord, decision: 'approve' | 'changes_requested' | 'reject' | 'suspend', reason: string) => {
    const result = await moderateTemplate({ templateId: record.id, decision, reason });
    onNotify(result.message);
    setPending(await listPendingSubmissions());
  };

  if (loading) {
    return <div className="tpl-empty"><RefreshCw className="spin" size={20} /><p>Loading templates…</p></div>;
  }

  return (
    <div className="tpl-panel">
      <div className="tpl-tabs">
        <button className={tab === 'library' ? 'active' : ''} onClick={() => setTab('library')}><Globe size={13} /> Library</button>
        <button className={tab === 'mine' ? 'active' : ''} onClick={() => setTab('mine')}><FolderOpen size={13} /> My templates</button>
        <div className="tpl-tabs-spacer" />
        <button className="tpl-action" onClick={() => setCreateOpen(true)}><Plus size={13} /> Create</button>
        <button className="tpl-action" onClick={() => importRef.current?.click()}><Upload size={13} /> Import</button>
        {isAdmin && <button className="tpl-action" onClick={() => setModerationOpen((v) => !v)}><ShieldCheck size={13} /> Moderation{pending.length ? ` (${pending.length})` : ''}</button>}
      </div>

      <div className="tpl-filters">
        <label className="tpl-search"><Search size={14} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search templates…" /></label>
        <select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value as TemplateType | 'all')}>
          {TYPE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
        <select value={sort} onChange={(event) => setSort(event.target.value)}>
          {SORT_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
      </div>

      {moderationOpen && isAdmin && (
        <div className="tpl-moderation">
          <h5>Pending community submissions</h5>
          {pending.length === 0 && <p className="tpl-hint">No templates awaiting review.</p>}
          {pending.map((record) => (
            <ModerationRow key={record.id} record={record} onDecide={moderate} />
          ))}
        </div>
      )}

      {libraryItems.length === 0 ? (
        <div className="tpl-empty"><LayoutGrid size={24} /><p>{tab === 'library' ? 'No templates match your filters.' : 'You have not created any templates yet.'}</p>{tab === 'mine' && <button className="tpl-action" onClick={() => setCreateOpen(true)}><Plus size={13} /> Create your first template</button>}</div>
      ) : (
        <div className="tpl-grid">
          {libraryItems.map((item) => (
            <TemplateCard
              key={item.key}
              item={item}
              isMine={tab === 'mine'}
              onPreview={() => setPreviewItem(item)}
              onInstall={() => setInstallItem(item)}
              onExport={() => void exportTemplate(item)}
              onSubmit={item.record ? () => void submitMine(item.record!) : undefined}
              onChangeVisibility={item.record ? (v) => void changeVisibility(item.record!, v) : undefined}
              onDelete={item.record ? () => void removeMine(item.record!) : undefined}
            />
          ))}
        </div>
      )}

      <input
        ref={importRef}
        type="file"
        className="tpl-file-input"
        accept=".forge-template,.json,application/json"
        onChange={(event) => void handleImportFile(event.target.files?.[0])}
      />

      {previewItem && <TemplatePreviewModal manifest={previewItem.manifest} onClose={() => setPreviewItem(null)} />}
      {installItem && (
        <TemplateInstallDialog
          manifest={installItem.manifest}
          currentProjectName={document.projectName}
          currentPageCount={currentPageCount}
          onConfirm={(mode, placeholders) => void install(mode, placeholders)}
          onClose={() => setInstallItem(null)}
        />
      )}

      {createOpen && <CreateTemplateDialog document={document} onClose={() => setCreateOpen(false)} onCreated={() => { setCreateOpen(false); void load(); }} onNotify={onNotify} />}
    </div>
  );
}

/* ── Card ── */

function TemplateCard({ item, isMine, onPreview, onInstall, onExport, onSubmit, onChangeVisibility, onDelete }: {
  item: LibraryItem;
  isMine: boolean;
  onPreview: () => void;
  onInstall: () => void;
  onExport: () => void;
  onSubmit?: () => void;
  onChangeVisibility?: (v: TemplateVisibility) => void;
  onDelete?: () => void;
}) {
  const record = item.record;
  const verified = item.source === 'starter';
  return (
    <div className="tpl-card">
      <div className="tpl-card-thumb" onClick={onPreview}>
        <MiniPreview manifest={item.manifest} />
        <div className="tpl-card-actions">
          <button onClick={(e) => { e.stopPropagation(); onPreview(); }} title="Preview"><Eye size={14} /></button>
          <button onClick={(e) => { e.stopPropagation(); onInstall(); }} title="Install"><Download size={14} /></button>
        </div>
      </div>
      <div className="tpl-card-body">
        <div className="tpl-card-title">
          <h4>{itemName(item)}</h4>
          {verified && <span className="tpl-verified" title="First-party Forge starter kit"><Check size={10} /> Forge</span>}
        </div>
        <p className="tpl-card-desc">{itemDescription(item)}</p>
        <div className="tpl-card-meta">
          <span className="tpl-type-badge">{TEMPLATE_TYPE_LABELS[item.manifest.templateType]}</span>
          <span>{itemPageCount(item)} page{itemPageCount(item) === 1 ? '' : 's'}</span>
          <span><Monitor size={11} /> Responsive</span>
        </div>
        <div className="tpl-card-tags">{itemTags(item).map((tag) => <em key={tag}>{tag}</em>)}</div>
        <div className="tpl-card-foot">
          <span>{itemAuthor(item)}</span>
          <span>· v1.0.0</span>
          <span>· {itemInstallCount(item)} install{itemInstallCount(item) === 1 ? '' : 's'}</span>
        </div>

        {isMine && record && (
          <div className="tpl-card-admin">
            <span className={`tpl-status tpl-status-${record.moderationStatus}`}>{MODERATION_STATUS_LABELS[record.moderationStatus]}</span>
            {record.visibility !== 'community' && <button onClick={onSubmit} title="Submit for community review"><Sparkles size={12} /> Submit</button>}
            <select value={record.visibility} onChange={(e) => onChangeVisibility?.(e.target.value as TemplateVisibility)} title="Visibility">
              {(['private', 'workspace', 'unlisted', 'community'] as TemplateVisibility[]).map((v) => <option key={v} value={v}>{TEMPLATE_VISIBILITY_LABELS[v]}</option>)}
            </select>
            <button onClick={onExport} title="Export package"><Download size={12} /></button>
            <button onClick={onDelete} title="Delete" className="tpl-danger"><X size={12} /></button>
          </div>
        )}
      </div>
    </div>
  );
}

function MiniPreview({ manifest }: { manifest: TemplateManifest }) {
  const page = manifest.document.pages[0];
  const heading = page?.elements.find((e) => e.type === 'Heading')?.content ?? manifest.name;
  const text = page?.elements.find((e) => e.type === 'Text')?.content ?? manifest.description;
  const cta = page?.elements.find((e) => e.type === 'Button')?.content;
  return (
    <div className="tpl-mini">
      <div className="tpl-mini-nav"><span>●</span><span>●</span><span>●</span></div>
      <div className="tpl-mini-heading">{heading}</div>
      <div className="tpl-mini-text">{text}</div>
      {cta && <div className="tpl-mini-cta">{cta}</div>}
    </div>
  );
}

/* ── Moderation row ── */

function ModerationRow({ record, onDecide }: { record: TemplateRecord; onDecide: (record: TemplateRecord, decision: 'approve' | 'changes_requested' | 'reject' | 'suspend', reason: string) => void }) {
  const [reason, setReason] = useState('');
  const [open, setOpen] = useState(false);
  return (
    <div className="tpl-mod-row">
      <div className="tpl-mod-row-head">
        <span>{record.name}</span>
        <em>{MODERATION_STATUS_LABELS[record.moderationStatus]}</em>
        <button onClick={() => setOpen((v) => !v)}><Flag size={12} /> Review</button>
      </div>
      {open && (
        <div className="tpl-mod-row-body">
          <label className="fb-label">Reason (required for reject/suspend)<input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Why this decision?" /></label>
          <div className="tpl-mod-actions">
            <button className="tpl-approve" onClick={() => onDecide(record, 'approve', reason)}><Check size={12} /> Approve</button>
            <button onClick={() => onDecide(record, 'changes_requested', reason)}>Request changes</button>
            <button className="tpl-danger" onClick={() => onDecide(record, 'reject', reason)}>Reject</button>
            <button className="tpl-danger" onClick={() => onDecide(record, 'suspend', reason)}>Suspend</button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Create template dialog ── */

function CreateTemplateDialog({ document, onClose, onCreated, onNotify }: {
  document: SandboxDocument;
  onClose: () => void;
  onCreated: () => void;
  onNotify: (message: string) => void;
}) {
  const [name, setName] = useState(document.projectName);
  const [description, setDescription] = useState('');
  const [templateType, setTemplateType] = useState<TemplateType>('website');
  const [visibility, setVisibility] = useState<TemplateVisibility>('private');
  const [licence, setLicence] = useState<LicenceKey>('forge-community');
  const [scope, setScope] = useState<'project' | 'page'>('project');
  const [busy, setBusy] = useState(false);

  const create = async () => {
    if (!name.trim()) return onNotify('Give your template a name.');
    setBusy(true);
    const author = await currentAuthor();
    const sourceDoc = scope === 'page'
      ? { ...document, pages: [document.pages[0] ?? document.pages[0]] }
      : document;

    const manifest = await buildManifest({
      templateId: crypto.randomUUID(),
      templateType,
      name: name.trim(),
      description: description.trim(),
      author,
      licence,
      document: sourceDoc,
    });

    // Scan for secrets/PII before saving — never ship private data.
    const findings = scanManifest(manifest);
    const blocking = findings.filter((f) => f.severity === 'error');
    if (blocking.length) {
      setBusy(false);
      onNotify(`Template blocked: ${blocking.map((f) => f.message).join(' ')}`);
      return;
    }
    if (findings.length) {
      onNotify(`${findings.length} item${findings.length === 1 ? '' : 's'} flagged for review (warnings only).`);
    }

    const result = await createTemplate({
      name: name.trim(),
      description: description.trim(),
      templateType,
      visibility,
      licence,
      manifest,
    });
    setBusy(false);
    onNotify(result.message);
    if (result.ok) onCreated();
  };

  return (
    <div className="tpl-overlay" onClick={onClose}>
      <div className="tpl-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="tpl-dialog-header"><h3>Create template</h3><button onClick={onClose}><X size={16} /></button></div>
        <div className="tpl-dialog-body">
          <div className="tpl-section">
            <p className="tpl-hint">Your template is scanned for secrets and personal information before saving. Project-specific values (API keys, private asset URLs, form submissions) are never included.</p>
          </div>
          <label className="fb-label">Name<input value={name} onChange={(e) => setName(e.target.value)} placeholder="Template name" /></label>
          <label className="fb-label">Description<textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What is this template for?" /></label>
          <div className="fb-row">
            <label className="fb-label">Scope
              <select value={scope} onChange={(e) => setScope(e.target.value as 'project' | 'page')}>
                <option value="project">Entire project</option>
                <option value="page">Current page only</option>
              </select>
            </label>
            <label className="fb-label">Type
              <select value={templateType} onChange={(e) => setTemplateType(e.target.value as TemplateType)}>
                {(['website', 'page', 'section', 'component', 'design_system'] as TemplateType[]).map((t) => <option key={t} value={t}>{TEMPLATE_TYPE_LABELS[t]}</option>)}
              </select>
            </label>
          </div>
          <div className="fb-row">
            <label className="fb-label">Visibility
              <select value={visibility} onChange={(e) => setVisibility(e.target.value as TemplateVisibility)}>
                {(['private', 'workspace', 'unlisted', 'community'] as TemplateVisibility[]).map((v) => <option key={v} value={v}>{TEMPLATE_VISIBILITY_LABELS[v]}</option>)}
              </select>
            </label>
            <label className="fb-label">Licence
              <select value={licence} onChange={(e) => setLicence(e.target.value as LicenceKey)}>
                {(['forge-community', 'cc0', 'cc-by', 'cc-by-sa'] as LicenceKey[]).map((l) => <option key={l} value={l}>{l === 'forge-community' ? 'Forge Community' : l.toUpperCase()}</option>)}
              </select>
            </label>
          </div>
          {visibility === 'community' && <p className="tpl-hint">Community templates require moderation before they are publicly visible.</p>}
        </div>
        <div className="tpl-dialog-footer">
          <button onClick={onClose}>Cancel</button>
          <button className="tpl-primary" disabled={busy} onClick={() => void create()}>{busy ? <RefreshCw className="spin" size={14} /> : <Check size={14} />} Save template</button>
        </div>
      </div>
    </div>
  );
}

// Referenced to keep placeholder kinds imported for future typed placeholder UI.
void PLACEHOLDER_KINDS;