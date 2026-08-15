import { useState } from 'react';
import { Palette, Type, Ruler, Square, Sun, Moon } from 'lucide-react';
import {
  COLOR_KEYS, COLOR_LABELS, FONT_LIBRARY, RADIUS_KEYS, SHADOW_KEYS,
  SPACING_KEYS, SPACING_LABELS, TYPOGRAPHY_ROLE_KEYS, TYPOGRAPHY_ROLE_LABELS,
  generateScale, type ColorKey, type ColorScale, type ThemeDefinition, type TypographyRoleKey,
} from './sandboxTheme';
import { ColorField, Grid, NumberField, Section, SelectField, TextField, Hint } from './ThemeControls';

type SectionProps = { theme: ThemeDefinition; onChange: (next: ThemeDefinition) => void };

/* ── Colours ── */

export function ColorsSection({ theme, onChange }: SectionProps) {
  const [mode, setMode] = useState<'light' | 'dark'>('light');
  const scale: ColorScale = theme.colors[mode];
  const patch = (key: ColorKey, value: string) => {
    onChange({ ...theme, colors: { ...theme.colors, [mode]: { ...theme.colors[mode], [key]: value } } });
  };

  const primaryScale = generateScale(scale.primary);

  return (
    <Section title="Colours" icon={<Palette size={14} />} defaultOpen badge={`${mode}`}>
      <div className="ds-segmented">
        <button className={mode === 'light' ? 'active' : ''} onClick={() => setMode('light')}><Sun size={13} /> Light</button>
        <button className={mode === 'dark' ? 'active' : ''} onClick={() => setMode('dark')}><Moon size={13} /> Dark</button>
      </div>
      <div className="ds-colors">
        {COLOR_KEYS.map((key) => (
          <ColorField
            key={key}
            label={COLOR_LABELS[key]}
            value={scale[key]}
            onChange={(value) => patch(key, value)}
            contrastAgainst={key.startsWith('primary') || key === 'body' || key === 'heading' || key === 'muted' ? scale.background : key === 'secondary' ? scale.background : undefined}
          />
        ))}
      </div>
      <div className="ds-tonal">
        <span className="ds-subheading">Primary tonal scale</span>
        <div className="ds-tonal-row">
          {[50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950].map((step) => (
            <div key={step} className="ds-swatch" style={{ background: primaryScale[step] }} title={`${step} — ${primaryScale[step]}`}>
              <span>{step}</span>
            </div>
          ))}
        </div>
      </div>
    </Section>
  );
}

/* ── Typography ── */

export function TypographySection({ theme, onChange }: SectionProps) {
  const [editing, setEditing] = useState<TypographyRoleKey | null>(null);

  const setHeadingFont = (id: string) => {
    const family = FONT_LIBRARY.find((f) => f.id === id)?.family ?? FONT_LIBRARY[0].family;
    const typography = { ...theme.typography };
    ['display', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'].forEach((key) => {
      typography[key as TypographyRoleKey] = { ...typography[key as TypographyRoleKey], fontFamily: family };
    });
    onChange({ ...theme, headingFontId: id, typography });
  };

  const setBodyFont = (id: string) => {
    const family = FONT_LIBRARY.find((f) => f.id === id)?.family ?? FONT_LIBRARY[0].family;
    const typography = { ...theme.typography };
    ['bodyLarge', 'body', 'bodySmall', 'caption', 'label', 'button'].forEach((key) => {
      typography[key as TypographyRoleKey] = { ...typography[key as TypographyRoleKey], fontFamily: family };
    });
    onChange({ ...theme, bodyFontId: id, typography });
  };

  const patchRole = (key: TypographyRoleKey, patch: Partial<ThemeDefinition['typography'][TypographyRoleKey]>) => {
    onChange({ ...theme, typography: { ...theme.typography, [key]: { ...theme.typography[key], ...patch } } });
  };

  const role = editing ? theme.typography[editing] : null;

  return (
    <Section title="Typography" icon={<Type size={14} />} defaultOpen>
      <Grid columns={2}>
        <SelectField label="Heading font" value={theme.headingFontId} onChange={setHeadingFont} options={FONT_LIBRARY.map((f) => ({ value: f.id, label: f.name }))} />
        <SelectField label="Body font" value={theme.bodyFontId} onChange={setBodyFont} options={FONT_LIBRARY.map((f) => ({ value: f.id, label: f.name }))} />
      </Grid>
      <Hint>Only the weights actually used across your roles are loaded.</Hint>

      <div className="ds-role-list">
        {TYPOGRAPHY_ROLE_KEYS.map((key) => {
          const r = theme.typography[key];
          return (
            <button key={key} className={`ds-role-row ${editing === key ? 'active' : ''}`} onClick={() => setEditing(editing === key ? null : key)}>
              <span className="ds-role-name" style={{ fontFamily: r.fontFamily, fontWeight: r.fontWeight, fontSize: Math.min(18, Math.max(11, parseInt(r.fontSize, 10) || 14)) }}>{TYPOGRAPHY_ROLE_LABELS[key]}</span>
              <em>{r.fontSize} · {r.fontWeight}</em>
            </button>
          );
        })}
      </div>

      {role && editing && (
        <div className="ds-role-editor">
          <span className="ds-subheading">Editing {TYPOGRAPHY_ROLE_LABELS[editing]}</span>
          <TextField label="Font size" value={role.fontSize} onChange={(value) => patchRole(editing, { fontSize: value })} hint="px or clamp()" />
          <Grid columns={2}>
            <NumberField label="Weight" value={role.fontWeight} onChange={(value) => patchRole(editing, { fontWeight: value })} min={100} max={900} step={100} />
            <NumberField label="Line height" value={role.lineHeight} onChange={(value) => patchRole(editing, { lineHeight: value })} min={0.8} max={2.5} step={0.05} />
          </Grid>
          <TextField label="Letter spacing" value={role.letterSpacing} onChange={(value) => patchRole(editing, { letterSpacing: value })} placeholder="0em" />
          <SelectField label="Transform" value={role.textTransform} onChange={(value) => patchRole(editing, { textTransform: value as never })} options={[{ value: 'none', label: 'None' }, { value: 'uppercase', label: 'Uppercase' }, { value: 'lowercase', label: 'Lowercase' }, { value: 'capitalize', label: 'Capitalize' }]} />
        </div>
      )}

      <div className="ds-font-library">
        <span className="ds-subheading">Font library</span>
        {FONT_LIBRARY.map((font) => (
          <div key={font.id} className="ds-font-row">
            <span style={{ fontFamily: font.family }}>{font.name}</span>
            <em>{font.weights.map((w) => w).join(' / ')}</em>
          </div>
        ))}
        <Hint>Uploaded fonts are kept private until used in a published build. Verify you hold a valid licence before using any custom font.</Hint>
      </div>
    </Section>
  );
}

/* ── Spacing ── */

export function SpacingSection({ theme, onChange }: SectionProps) {
  const setBase = (base: number) => {
    const safe = Math.max(1, base);
    const scale = { '2xs': safe, xs: safe * 2, sm: safe * 3, md: safe * 4, lg: safe * 6, xl: safe * 8, '2xl': safe * 12, '3xl': safe * 16, '4xl': safe * 24 };
    onChange({ ...theme, spacing: { base: safe, scale } });
  };
  const setScale = (key: keyof ThemeDefinition['spacing']['scale'], value: number) => {
    onChange({ ...theme, spacing: { ...theme.spacing, scale: { ...theme.spacing.scale, [key]: Math.max(0, value) } } });
  };

  return (
    <Section title="Spacing" icon={<Ruler size={14} />} defaultOpen>
      <NumberField label="Base unit" value={theme.spacing.base} onChange={setBase} min={1} max={16} suffix="px" hint="Drives the whole scale" />
      <div className="ds-spacing-scale">
        {SPACING_KEYS.map((key) => (
          <div key={key} className="ds-spacing-row">
            <span>{SPACING_LABELS[key]}</span>
            <div className="ds-spacing-bar" style={{ width: Math.min(120, theme.spacing.scale[key] * 3) }} />
            <input type="number" value={theme.spacing.scale[key]} onChange={(event) => setScale(key, Number(event.target.value))} />
            <em>px</em>
          </div>
        ))}
      </div>
      <Hint>Changing the base unit updates linked elements; explicit per-element overrides stay unchanged.</Hint>
    </Section>
  );
}

/* ── Radius, border & shadow ── */

export function RadiusShadowSection({ theme, onChange }: SectionProps) {
  return (
    <Section title="Borders & Shadows" icon={<Square size={14} />}>
      <span className="ds-subheading">Radius</span>
      <div className="ds-radius-list">
        {RADIUS_KEYS.map((key) => (
          <div key={key} className="ds-radius-row">
            <span>{key}</span>
            <div className="ds-radius-preview"><i style={{ borderRadius: theme.radius[key] }} /></div>
            <input value={theme.radius[key]} onChange={(event) => onChange({ ...theme, radius: { ...theme.radius, [key]: event.target.value } })} />
          </div>
        ))}
      </div>

      <span className="ds-subheading">Border</span>
      <Grid columns={2}>
        <NumberField label="Default width" value={theme.border.defaultWidth} onChange={(value) => onChange({ ...theme, border: { ...theme.border, defaultWidth: Math.max(0, value) } })} min={0} max={8} suffix="px" />
        <NumberField label="Strong width" value={theme.border.strongWidth} onChange={(value) => onChange({ ...theme, border: { ...theme.border, strongWidth: Math.max(0, value) } })} min={0} max={8} suffix="px" />
      </Grid>
      <ColorField label="Default colour" value={theme.border.defaultColor} onChange={(value) => onChange({ ...theme, border: { ...theme.border, defaultColor: value } })} />
      <ColorField label="Focus border" value={theme.border.focusBorder} onChange={(value) => onChange({ ...theme, border: { ...theme.border, focusBorder: value } })} />

      <span className="ds-subheading">Shadow</span>
      <div className="ds-radius-list">
        {SHADOW_KEYS.map((key) => (
          <div key={key} className="ds-shadow-row">
            <span>{key}</span>
            <div className="ds-shadow-preview" style={{ boxShadow: theme.shadow[key] }} />
            <input value={theme.shadow[key]} onChange={(event) => onChange({ ...theme, shadow: { ...theme.shadow, [key]: event.target.value } })} />
          </div>
        ))}
      </div>
      <Hint>Keep shadows subtle by default — they should guide the eye, not dominate.</Hint>
    </Section>
  );
}