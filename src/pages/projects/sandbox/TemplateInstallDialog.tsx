import { useState } from 'react';
import { X, Check, AlertTriangle, ArrowRight, ArrowLeft, FileText, Layers, Palette, Plus, RefreshCw } from 'lucide-react';
import {
  TEMPLATE_LICENCES, TEMPLATE_TYPE_LABELS, INSTALL_MODE_LABELS, PLACEHOLDER_LABELS,
  type TemplateManifest, type InstallMode, type TemplateType,
} from './sandboxTemplates';

const MODES_BY_TYPE: Record<TemplateType, InstallMode[]> = {
  website: ['replace_draft', 'add_pages', 'design_system', 'new_project'],
  page: ['new_page', 'replace_page'],
  section: ['insert_sections'],
  component: ['insert_sections'],
  design_system: ['design_system'],
};

const MODE_ICONS: Record<InstallMode, typeof FileText> = {
  new_project: FileText,
  replace_draft: RefreshCw,
  add_pages: Plus,
  design_system: Palette,
  new_page: Plus,
  replace_page: RefreshCw,
  insert_sections: Layers,
  insert_component: Layers,
};

type Props = {
  manifest: TemplateManifest;
  currentProjectName: string;
  currentPageCount: number;
  onConfirm: (mode: InstallMode, placeholders: Record<string, string>) => void;
  onClose: () => void;
};

export default function TemplateInstallDialog({ manifest, currentProjectName, currentPageCount, onConfirm, onClose }: Props) {
  const modes = MODES_BY_TYPE[manifest.templateType] ?? ['replace_draft'];
  const [mode, setMode] = useState<InstallMode>(modes[0]);
  const [licenceAccepted, setLicenceAccepted] = useState(false);
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(manifest.placeholders.map((p) => [p.kind, p.defaultValue ?? ''])),
  );

  const templatePageCount = manifest.document.pages.length;
  const licence = TEMPLATE_LICENCES[manifest.licence];

  const impact = (() => {
    switch (mode) {
      case 'replace_draft':
        return `Your current draft (${currentPageCount} page${currentPageCount === 1 ? '' : 's'}) will be replaced by this template's ${templatePageCount} page${templatePageCount === 1 ? '' : 's'}. A recovery checkpoint is created first.`;
      case 'add_pages':
        return `${templatePageCount} page${templatePageCount === 1 ? '' : 's'} will be added to “${currentProjectName}” (${currentPageCount} existing page${currentPageCount === 1 ? '' : 's'} are preserved).`;
      case 'design_system':
        return `Only the design tokens (colours, typography) will be imported. Your pages and content are untouched.`;
      case 'new_page':
        return `A new page will be created from this template. Existing pages are preserved.`;
      case 'replace_page':
        return `The selected page's content will be replaced by this template. A recovery checkpoint is created first.`;
      case 'insert_sections':
        return `This template's sections will be inserted into the current canvas.`;
      default:
        return '';
    }
  })();

  const requiresReplaceConfirm = mode === 'replace_draft' || mode === 'replace_page';

  return (
    <div className="tpl-overlay" onClick={onClose}>
      <div className="tpl-dialog" onClick={(event) => event.stopPropagation()}>
        <div className="tpl-dialog-header">
          <h3>Install template</h3>
          <button onClick={onClose} aria-label="Close"><X size={16} /></button>
        </div>

        <div className="tpl-dialog-body">
          <div className="tpl-install-title">
            <span className="tpl-type-badge">{TEMPLATE_TYPE_LABELS[manifest.templateType]}</span>
            <h4>{manifest.name}</h4>
            <p>by {manifest.author.name}</p>
          </div>

          <div className="tpl-section">
            <h5>Installation method</h5>
            <div className="tpl-mode-grid">
              {modes.map((m) => {
                const Icon = MODE_ICONS[m];
                return (
                  <button key={m} className={mode === m ? 'active' : ''} onClick={() => setMode(m)}>
                    <Icon size={16} />{INSTALL_MODE_LABELS[m]}
                  </button>
                );
              })}
            </div>
            <div className="tpl-impact">
              <AlertTriangle size={14} />
              <span>{impact}</span>
            </div>
          </div>

          <div className="tpl-section">
            <h5>Licence — {licence.name}</h5>
            <ul className="tpl-licence">
              <li><b>Use:</b> {licence.permittedUse}</li>
              <li><b>Modify:</b> {licence.modification}</li>
              <li><b>Redistribute:</b> {licence.redistribution}</li>
              <li><b>Attribution:</b> {licence.attribution}</li>
            </ul>
            <label className="tpl-check">
              <input type="checkbox" checked={licenceAccepted} onChange={(event) => setLicenceAccepted(event.target.checked)} />
              I accept the licence terms for this template.
            </label>
          </div>

          {manifest.placeholders.length > 0 && (
            <div className="tpl-section">
              <h5>Content setup</h5>
              <p className="tpl-hint">Map your project information to the template's placeholders. Leave blank to keep the placeholder text.</p>
              <div className="tpl-placeholders">
                {manifest.placeholders.map((placeholder) => (
                  <label key={placeholder.kind} className="fb-label">
                    {PLACEHOLDER_LABELS[placeholder.kind] ?? placeholder.label}
                    {placeholder.required && <em> *</em>}
                    <input
                      value={values[placeholder.kind] ?? ''}
                      placeholder={placeholder.label}
                      onChange={(event) => setValues((v) => ({ ...v, [placeholder.kind]: event.target.value }))}
                    />
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="tpl-dialog-footer">
          <button onClick={onClose}><ArrowLeft size={14} /> Cancel</button>
          <button
            className="tpl-primary"
            disabled={!licenceAccepted}
            onClick={() => onConfirm(mode, values)}
          >
            <Check size={14} /> Install{requiresReplaceConfirm ? ' (replaces draft)' : ''}
          </button>
        </div>
      </div>
    </div>
  );
}