import { useEffect, useMemo, useState } from 'react';
import { Bookmark, ChevronDown, Save, Trash2, X, Zap } from 'lucide-react';
import { fetchModelRegistry, type AiModelInfo, type AiScope, type AgentType, AGENT_LABELS } from './sandboxAiOrchestration';
import { estimateAiCredits } from './sandboxBilling';

export type PromptBuilderResult = {
  prompt: string;
  scope: AiScope;
  agent: AgentType;
  preferredModel: string;
  localOnly: boolean;
};

type PromptTemplate = {
  id: string;
  name: string;
  goal: string;
  audience: string;
  style: string;
  scope: AiScope;
  agent: AgentType;
};

const TEMPLATE_STORAGE_KEY = 'forge:prompt:templates:v1';

const DEFAULT_FIELDS = {
  goal: 'generate more enquiries',
  targetPage: '',
  audience: 'small business owners',
  style: 'modern and confident',
  sections: '',
  functionality: '',
  brandRules: '',
  facts: '',
  exclusions: '',
  responsive: true,
  accessibility: true,
  seo: true,
};

const SCOPE_OPTIONS: { value: AiScope; label: string; note: string }[] = [
  { value: 'element', label: 'Current element', note: 'Only the selected element' },
  { value: 'section', label: 'Current section', note: 'The section around the selection' },
  { value: 'page', label: 'Current page', note: 'Everything on this page' },
  { value: 'pages', label: 'Selected pages', note: 'Multiple chosen pages' },
  { value: 'project', label: 'Whole project', note: 'Sends the full project — larger cost' },
];

export default function PromptBuilder({
  pages,
  activePageId,
  taskClass,
  onApply,
  onNotify,
  onClose,
}: {
  pages: Array<{ id: string; name: string; slug: string }>;
  activePageId: string;
  taskClass: string;
  onApply: (result: PromptBuilderResult) => void;
  onNotify: (message: string) => void;
  onClose: () => void;
}) {
  const [fields, setFields] = useState(DEFAULT_FIELDS);
  const [scope, setScope] = useState<AiScope>('page');
  const [agent, setAgent] = useState<AgentType>('master');
  const [preferredModel, setPreferredModel] = useState('');
  const [localOnly, setLocalOnly] = useState(false);
  const [models, setModels] = useState<AiModelInfo[]>([]);
  const [templates, setTemplates] = useState<PromptTemplate[]>([]);
  const [templateName, setTemplateName] = useState('');
  const [showTemplates, setShowTemplates] = useState(false);
  const [creditEstimate, setCreditEstimate] = useState<number | null>(null);

  const set = (key: keyof typeof DEFAULT_FIELDS, value: string | boolean) => setFields((current) => ({ ...current, [key]: value }));

  useEffect(() => {
    void fetchModelRegistry().then(({ models: rows }) => {
      setModels(rows.filter((m) => m.enabled));
    });
  }, []);

  useEffect(() => {
    let active = true;
    void estimateAiCredits(taskClass).then((estimate) => {
      if (active && estimate) setCreditEstimate(estimate.estimatedCredits);
    });
    return () => { active = false; };
  }, [taskClass]);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(TEMPLATE_STORAGE_KEY);
      if (raw) setTemplates(JSON.parse(raw) as PromptTemplate[]);
    } catch { /* ignore */ }
  }, []);

  const persistTemplates = (next: PromptTemplate[]) => {
    setTemplates(next);
    try { window.localStorage.setItem(TEMPLATE_STORAGE_KEY, JSON.stringify(next)); } catch { /* ignore */ }
  };

  const scopeMultiplier = useMemo(() => {
    const map: Record<AiScope, number> = { element: 0.5, section: 0.75, page: 1, pages: 2, project: 4 };
    return map[scope] ?? 1;
  }, [scope]);

  const estimatedRange = creditEstimate == null
    ? null
    : { low: Math.max(1, Math.round(creditEstimate * scopeMultiplier * 0.75)), high: Math.max(2, Math.round(creditEstimate * scopeMultiplier * 1.5)) };

  const buildPrompt = (): string => {
    const parts: string[] = [];
    if (fields.goal.trim()) parts.push(`Goal: ${fields.goal.trim()}`);
    if (fields.audience.trim()) parts.push(`Audience: ${fields.audience.trim()}`);
    if (fields.style.trim()) parts.push(`Style: ${fields.style.trim()}`);
    if (fields.targetPage) {
      const page = pages.find((p) => p.id === fields.targetPage);
      if (page) parts.push(`Target page: ${page.name}`);
    }
    if (fields.sections.trim()) parts.push(`Required sections: ${fields.sections.trim()}`);
    if (fields.functionality.trim()) parts.push(`Required functionality: ${fields.functionality.trim()}`);
    if (fields.brandRules.trim()) parts.push(`Brand rules: ${fields.brandRules.trim()}`);
    if (fields.facts.trim()) parts.push(`Content facts: ${fields.facts.trim()}`);
    if (fields.exclusions.trim()) parts.push(`Exclusions: ${fields.exclusions.trim()}`);
    const requirements: string[] = [];
    if (fields.responsive) requirements.push('responsive');
    if (fields.accessibility) requirements.push('accessible');
    if (fields.seo) requirements.push('SEO-optimised');
    if (requirements.length) parts.push(`Requirements: ${requirements.join(', ')}`);
    return parts.join('. ');
  };

  const apply = () => {
    if (!buildPrompt().trim()) { onNotify('Add a goal before using this prompt'); return; }
    onApply({ prompt: buildPrompt(), scope, agent, preferredModel, localOnly });
    onClose();
  };

  const saveTemplate = () => {
    const name = templateName.trim() || 'Untitled template';
    const next: PromptTemplate = {
      id: crypto.randomUUID(),
      name,
      goal: fields.goal,
      audience: fields.audience,
      style: fields.style,
      scope,
      agent,
    };
    persistTemplates([...templates, next]);
    setTemplateName('');
    onNotify(`Prompt template “${name}” saved`);
  };

  const loadTemplate = (template: PromptTemplate) => {
    setFields((current) => ({ ...current, goal: template.goal, audience: template.audience, style: template.style }));
    setScope(template.scope);
    setAgent(template.agent);
    setShowTemplates(false);
    onNotify(`Loaded template “${template.name}”`);
  };

  const deleteTemplate = (id: string) => persistTemplates(templates.filter((t) => t.id !== id));

  return (
    <div className="prompt-builder pb-upgraded">
      <div className="prompt-builder-heading">
        <strong>Build a better instruction</strong>
        <button onClick={onClose} aria-label="Close"><X size={14} /></button>
      </div>

      <div className="pb-toolbar">
        <button className="pb-template-toggle" onClick={() => setShowTemplates((v) => !v)}><Bookmark size={13} /> Templates {templates.length > 0 && <b>{templates.length}</b>}</button>
        <span className="pb-estimate">
          <Zap size={12} />
          {estimatedRange ? `≈ ${estimatedRange.low}–${estimatedRange.high} credits` : 'estimating…'}
        </span>
      </div>

      {showTemplates && (
        <div className="pb-templates">
          {templates.length === 0 && <p className="pb-templates-empty">No saved templates yet.</p>}
          {templates.map((template) => (
            <div key={template.id} className="pb-template-row">
              <button onClick={() => loadTemplate(template)}>{template.name}<em>{AGENT_LABELS[template.agent]} · {template.scope}</em></button>
              <button className="pb-template-delete" onClick={() => deleteTemplate(template.id)} aria-label="Delete template"><Trash2 size={13} /></button>
            </div>
          ))}
        </div>
      )}

      <div className="pb-fields">
        <label>Goal<textarea rows={2} value={fields.goal} onChange={(e) => set('goal', e.target.value)} placeholder="e.g. generate more enquiries" /></label>
        <label>Target page
          <select className="ai-select" value={fields.targetPage} onChange={(e) => set('targetPage', e.target.value)}>
            <option value="">Current page</option>
            {pages.map((page) => <option key={page.id} value={page.id}>{page.name}</option>)}
          </select>
        </label>
        <label>Audience<input value={fields.audience} onChange={(e) => set('audience', e.target.value)} /></label>
        <label>Style<input value={fields.style} onChange={(e) => set('style', e.target.value)} /></label>
        <label>Required sections<input value={fields.sections} onChange={(e) => set('sections', e.target.value)} placeholder="hero, features, pricing" /></label>
        <label>Required functionality<input value={fields.functionality} onChange={(e) => set('functionality', e.target.value)} placeholder="contact form, booking button" /></label>
        <label>Brand rules<input value={fields.brandRules} onChange={(e) => set('brandRules', e.target.value)} placeholder="use brand colours, avoid jargon" /></label>
        <label>Content facts<textarea rows={2} value={fields.facts} onChange={(e) => set('facts', e.target.value)} placeholder="verified facts to write from" /></label>
        <label>Exclusions<input value={fields.exclusions} onChange={(e) => set('exclusions', e.target.value)} placeholder="don't add pricing, no testimonials" /></label>
      </div>

      <div className="pb-scope">
        <span className="pb-label">Output scope</span>
        <div className="pb-scope-options">
          {SCOPE_OPTIONS.map((option) => (
            <button key={option.value} className={scope === option.value ? 'active' : ''} onClick={() => setScope(option.value)} title={option.note}>
              {option.label}
            </button>
          ))}
        </div>
        {scope === 'project' && <p className="pb-scope-warning">Whole-project context will be sent — this uses more credits and includes every page.</p>}
        {scope === 'element' && <p className="pb-scope-note">Requires a selected element on the canvas.</p>}
      </div>

      <div className="pb-agent-model">
        <label>Agent
          <select className="ai-select" value={agent} onChange={(e) => setAgent(e.target.value as AgentType)}>
            {Object.entries(AGENT_LABELS).map(([key, label]) => <option key={key} value={key}>{label} Agent</option>)}
          </select>
        </label>
        <label>Model preference
          <select className="ai-select" value={preferredModel} onChange={(e) => setPreferredModel(e.target.value)}>
            <option value="">Auto (router decides)</option>
            {models.map((model) => <option key={model.id} value={model.model_key}>{model.display_name} — {model.provider_key ?? ''}</option>)}
          </select>
        </label>
      </div>

      <label className="pb-check"><input type="checkbox" checked={fields.responsive} onChange={(e) => set('responsive', e.target.checked)} /> Responsive across breakpoints</label>
      <label className="pb-check"><input type="checkbox" checked={fields.accessibility} onChange={(e) => set('accessibility', e.target.checked)} /> Accessibility requirements</label>
      <label className="pb-check"><input type="checkbox" checked={fields.seo} onChange={(e) => set('seo', e.target.checked)} /> SEO requirements</label>
      <label className="pb-check"><input type="checkbox" checked={localOnly} onChange={(e) => setLocalOnly(e.target.checked)} /> Local-only (never route to cloud)</label>

      <div className="pb-actions">
        <div className="pb-save-template">
          <input value={templateName} onChange={(e) => setTemplateName(e.target.value)} placeholder="Template name" />
          <button onClick={saveTemplate} disabled={!templateName.trim()} aria-label="Save template"><Save size={14} /></button>
        </div>
        <button className="build-prompt-button" onClick={apply}>Use this prompt</button>
      </div>
    </div>
  );
}