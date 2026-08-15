import { useMemo, useState } from 'react';
import { Building2, Sparkles, Eye, Search, Save, Upload, Download, Trash2, Check, RotateCcw } from 'lucide-react';
import {
  applyPreset, scanTheme, THEME_PRESETS, type PresetScope, type ThemeDefinition, type ThemeMode, type ThemePreset,
} from './sandboxTheme';
import { Grid, NumberField, Section, SelectField, TextField, ToggleField, Hint } from './ThemeControls';
import { ThemePreview, ScanResults } from './DesignPreview';
import { ColorsSection, TypographySection, SpacingSection, RadiusShadowSection } from './DesignTokenSections';
import { ButtonsSection, FormsSection, ImagesSection, MotionSection, ContainerSection, BreakpointsSection } from './DesignStyleSections';
import type { AssetRecord } from './sandboxAssets';

const CUSTOM_PRESETS_KEY = 'forge:sandbox:custom-themes:v1';

type CustomPreset = { id: string; name: string; description: string; theme: ThemeDefinition };

type DesignSystemPanelProps = {
  theme: ThemeDefinition;
  assets: AssetRecord[];
  onApply: (next: ThemeDefinition) => void;
  onNotify: (message: string) => void;
};

function loadCustomPresets(): CustomPreset[] {
  try {
    const raw = window.localStorage.getItem(CUSTOM_PRESETS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item) => item && typeof item === 'object' && (item as CustomPreset).theme && (item as CustomPreset).name);
  } catch {
    return [];
  }
}

export default function DesignSystemPanel({ theme, assets, onApply, onNotify }: DesignSystemPanelProps) {
  const [draft, setDraft] = useState<ThemeDefinition>(theme);
  const [customPresets, setCustomPresets] = useState<CustomPreset[]>(loadCustomPresets);
  const [newPresetName, setNewPresetName] = useState('');
  const [activePreset, setActivePreset] = useState<ThemePreset | null>(null);
  const [scanOpen, setScanOpen] = useState(false);

  const dirty = useMemo(() => JSON.stringify(draft) !== JSON.stringify(theme), [draft, theme]);
  const findings = useMemo(() => scanTheme(draft), [draft]);

  const change = (next: ThemeDefinition) => setDraft(next);

  const commit = () => {
    onApply(draft);
    onNotify('Theme applied');
  };

  const reset = () => {
    setDraft(theme);
    onNotify('Reverted unapplied changes');
  };

  const saveCustomPreset = () => {
    const name = newPresetName.trim() || draft.name;
    const preset: CustomPreset = { id: crypto.randomUUID(), name, description: '', theme: JSON.parse(JSON.stringify(draft)) };
    const next = [...customPresets, preset];
    setCustomPresets(next);
    window.localStorage.setItem(CUSTOM_PRESETS_KEY, JSON.stringify(next));
    setNewPresetName('');
    onNotify(`Saved preset “${name}”`);
  };

  const deleteCustomPreset = (id: string) => {
    const next = customPresets.filter((preset) => preset.id !== id);
    setCustomPresets(next);
    window.localStorage.setItem(CUSTOM_PRESETS_KEY, JSON.stringify(next));
    onNotify('Preset deleted');
  };

  const exportPreset = (preset: CustomPreset) => {
    const blob = new Blob([JSON.stringify(preset.theme, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${preset.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.forge-theme.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    onNotify('Preset exported');
  };

  const importPreset = (file: File | undefined) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result)) as unknown;
        if (!parsed || typeof parsed !== 'object' || !(parsed as ThemeDefinition).colors || !(parsed as ThemeDefinition).typography) {
          onNotify('Invalid theme file');
          return;
        }
        const imported = parsed as ThemeDefinition;
        setDraft(imported);
        onNotify(`Imported theme “${imported.name}”`);
      } catch {
        onNotify('Invalid theme file');
      }
    };
    reader.readAsText(file);
  };

  const imageAssets = assets.filter((asset) => asset.type === 'image');

  return (
    <div className="ds-panel">
      <div className="ds-toolbar">
        <div className="ds-toolbar-left">
          <input className="ds-theme-name" value={draft.name} onChange={(event) => change({ ...draft, name: event.target.value })} aria-label="Theme name" />
          <SelectField label="Mode" value={draft.mode} onChange={(value) => change({ ...draft, mode: value as ThemeMode })} options={[
            { value: 'light', label: 'Light only' }, { value: 'dark', label: 'Dark only' },
            { value: 'system', label: 'Follow device' }, { value: 'user', label: 'User-selectable' },
          ]} />
        </div>
        <div className="ds-toolbar-actions">
          <span className={`ds-dirty ${dirty ? 'on' : ''}`}>{dirty ? 'Unsaved changes' : 'Applied'}</span>
          <button className="ds-reset" onClick={reset} disabled={!dirty}><RotateCcw size={13} /> Reset</button>
          <button className="ds-apply" onClick={commit} disabled={!dirty}><Check size={13} /> Apply</button>
        </div>
      </div>

      <div className="ds-body">
        <BrandSection draft={draft} onChange={change} imageAssets={imageAssets} />

        <PresetsSection
          draft={draft}
          onChange={change}
          customPresets={customPresets}
          activePreset={activePreset}
          setActivePreset={setActivePreset}
          newPresetName={newPresetName}
          setNewPresetName={setNewPresetName}
          onSaveCustom={saveCustomPreset}
          onDeleteCustom={deleteCustomPreset}
          onExportCustom={exportPreset}
          onImportCustom={importPreset}
          onNotify={onNotify}
        />

        <ColorsSection theme={draft} onChange={change} />
        <TypographySection theme={draft} onChange={change} />
        <SpacingSection theme={draft} onChange={change} />
        <RadiusShadowSection theme={draft} onChange={change} />
        <ButtonsSection theme={draft} onChange={change} />
        <FormsSection theme={draft} onChange={change} />
        <ImagesSection theme={draft} onChange={change} />
        <MotionSection theme={draft} onChange={change} />
        <ContainerSection theme={draft} onChange={change} />
        <BreakpointsSection theme={draft} onChange={change} />

        <Section title="Theme preview" icon={<Eye size={14} />}>
          <ThemePreview theme={draft} />
        </Section>

        <Section title="Scan design" icon={<Search size={14} />} badge={findings.length ? `${findings.length}` : undefined}>
          <p className="ds-scan-intro">Find unlinked colours, low-contrast combinations, excessive font families and other design problems.</p>
          {!scanOpen ? (
            <button className="ds-scan-run" onClick={() => setScanOpen(true)}><Search size={13} /> Scan now</button>
          ) : (
            <>
              <ScanResults findings={findings} />
              <button className="ds-scan-run secondary" onClick={() => setScanOpen(false)}>Hide results</button>
            </>
          )}
        </Section>
      </div>
    </div>
  );
}

/* ── Brand ── */

function BrandSection({ draft, onChange, imageAssets }: {
  draft: ThemeDefinition; onChange: (next: ThemeDefinition) => void; imageAssets: AssetRecord[];
}) {
  const b = draft.brand;
  const patch = (patchObj: Partial<ThemeDefinition['brand']>) => onChange({ ...draft, brand: { ...draft.brand, ...patchObj } });
  const logo = imageAssets.find((asset) => asset.id === b.logoAssetId);

  return (
    <Section title="Brand" icon={<Building2 size={14} />} defaultOpen>
      <Grid columns={2}>
        <TextField label="Brand name" value={b.name} onChange={(value) => patch({ name: value })} />
        <TextField label="Short name" value={b.shortName} onChange={(value) => patch({ shortName: value })} />
      </Grid>
      <TextField label="Tagline" value={b.tagline} onChange={(value) => patch({ tagline: value })} />
      <TextField label="Description" value={b.description} onChange={(value) => patch({ description: value })} />
      <SelectField label="Primary logo" value={b.logoAssetId} onChange={(value) => patch({ logoAssetId: value })} options={[{ value: '', label: 'None — use text fallback' }, ...imageAssets.map((asset) => ({ value: asset.id, label: asset.name }))]} />

      <div className="ds-brand-preview">
        <div className="ds-brand-preview-light">
          {logo ? <img src={logo.url} alt={b.name} style={{ maxWidth: b.logoWidth }} /> : <span style={{ fontSize: 18, fontWeight: 800 }}>{b.textFallback || b.name}</span>}
        </div>
        <div className="ds-brand-preview-dark">
          {logo ? <img src={logo.url} alt={b.name} style={{ maxWidth: b.logoWidth }} /> : <span style={{ fontSize: 18, fontWeight: 800, color: '#fff' }}>{b.textFallback || b.name}</span>}
        </div>
      </div>
      <Hint>Logos keep their aspect ratio — they are never stretched.</Hint>

      <Grid columns={2}>
        <NumberField label="Logo width" value={b.logoWidth} onChange={(value) => patch({ logoWidth: Math.max(24, value) })} min={24} suffix="px" />
        <NumberField label="Clear space" value={b.logoClearSpace} onChange={(value) => patch({ logoClearSpace: Math.max(0, value) })} min={0} suffix="px" />
      </Grid>
      <SelectField label="Alignment" value={b.logoAlignment} onChange={(value) => patch({ logoAlignment: value as never })} options={[{ value: 'left', label: 'Left' }, { value: 'center', label: 'Center' }]} />
      <TextField label="Text fallback" value={b.textFallback} onChange={(value) => patch({ textFallback: value })} />
      <Grid columns={2}>
        <ToggleField label="Show in header" value={b.headerLogo} onChange={(value) => patch({ headerLogo: value })} />
        <ToggleField label="Show in footer" value={b.footerLogo} onChange={(value) => patch({ footerLogo: value })} />
      </Grid>
    </Section>
  );
}

/* ── Presets ── */

function PresetsSection({ draft, onChange, customPresets, activePreset, setActivePreset, newPresetName, setNewPresetName, onSaveCustom, onDeleteCustom, onExportCustom, onImportCustom, onNotify }: {
  draft: ThemeDefinition;
  onChange: (next: ThemeDefinition) => void;
  customPresets: CustomPreset[];
  activePreset: ThemePreset | null;
  setActivePreset: (preset: ThemePreset | null) => void;
  newPresetName: string;
  setNewPresetName: (value: string) => void;
  onSaveCustom: () => void;
  onDeleteCustom: (id: string) => void;
  onExportCustom: (preset: CustomPreset) => void;
  onImportCustom: (file: File | undefined) => void;
  onNotify: (message: string) => void;
}) {
  const applyScope = (scope: PresetScope) => {
    if (!activePreset) return;
    onChange(applyPreset(draft, activePreset, scope));
    onNotify(`Applied ${activePreset.name} — ${scope}`);
    setActivePreset(null);
  };

  return (
    <Section title="Theme presets" icon={<Sparkles size={14} />}>
      <div className="ds-preset-grid">
        {THEME_PRESETS.map((preset) => (
          <button key={preset.id} className={`ds-preset-card ${draft.id === preset.id ? 'active' : ''}`} onClick={() => setActivePreset(activePreset?.id === preset.id ? null : preset)}>
            <span className="ds-preset-swatches">
              <i style={{ background: preset.palette.primary }} />
              <i style={{ background: preset.palette.background }} />
              <i style={{ background: preset.palette.heading }} />
              <i style={{ background: preset.palette.accent }} />
            </span>
            <b>{preset.name}</b>
            <em>{preset.description}</em>
          </button>
        ))}
      </div>

      {activePreset && (
        <div className="ds-preset-confirm">
          <span className="ds-subheading">{activePreset.name}</span>
          <p>This preset changes {Object.keys(activePreset.palette).length} colour tokens{activePreset.headingFontId ? ', heading typography' : ''}{activePreset.bodyFontId ? ', body typography' : ''}{activePreset.radius ? ', radii' : ''}.</p>
          <div className="ds-preset-actions">
            <button onClick={() => applyScope('all')}>Apply all</button>
            <button onClick={() => applyScope('colors')}>Colours only</button>
            <button onClick={() => applyScope('typography')}>Typography only</button>
            <button onClick={() => applyScope('spacing')}>Spacing only</button>
            <button onClick={() => setActivePreset(null)}>Cancel</button>
          </div>
        </div>
      )}

      <div className="ds-custom-presets">
        <span className="ds-subheading">Your presets</span>
        <div className="ds-custom-save">
          <input value={newPresetName} onChange={(event) => setNewPresetName(event.target.value)} placeholder="Preset name (defaults to theme name)" />
          <button onClick={onSaveCustom}><Save size={13} /> Save current</button>
        </div>
        <label className="ds-import">
          <Upload size={13} /> Import .forge-theme.json
          <input type="file" accept=".json,application/json" onChange={(event) => onImportCustom(event.target.files?.[0])} />
        </label>
        {customPresets.length === 0 && <Hint>Save the current theme as a reusable preset, or import one.</Hint>}
        {customPresets.map((preset) => (
          <div key={preset.id} className="ds-custom-preset-row">
            <button onClick={() => { onChange(preset.theme); onNotify(`Loaded preset “${preset.name}”`); }}>
              <span className="ds-preset-swatches sm">
                <i style={{ background: preset.theme.colors.light.primary }} />
                <i style={{ background: preset.theme.colors.light.background }} />
              </span>
              <b>{preset.name}</b>
            </button>
            <button title="Export" onClick={() => onExportCustom(preset)}><Download size={13} /></button>
            <button title="Delete" className="danger" onClick={() => onDeleteCustom(preset.id)}><Trash2 size={13} /></button>
          </div>
        ))}
      </div>

      <Hint>Applying a preset creates an undoable change and a version-history entry. Explicit element overrides are never overwritten.</Hint>
    </Section>
  );
}