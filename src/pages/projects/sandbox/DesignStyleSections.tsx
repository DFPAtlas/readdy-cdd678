import { useState } from 'react';
import { MousePointerClick, FormInput, Image as ImageIcon, Zap, LayoutGrid, MoveHorizontal } from 'lucide-react';
import {
  BUTTON_SIZE_KEYS, BUTTON_VARIANT_KEYS, type ButtonSizeKey, type ButtonVariantKey, type ThemeDefinition,
} from './sandboxTheme';
import { ColorField, Grid, NumberField, Section, SelectField, SliderField, TextField, ToggleField, Hint } from './ThemeControls';

type SectionProps = { theme: ThemeDefinition; onChange: (next: ThemeDefinition) => void };

/* ── Buttons ── */

export function ButtonsSection({ theme, onChange }: SectionProps) {
  const [variant, setVariant] = useState<ButtonVariantKey>('primary');
  const v = theme.buttons.variants[variant];
  const patchVariant = (key: ButtonVariantKey, patch: Partial<ThemeDefinition['buttons']['variants'][ButtonVariantKey]>) => {
    onChange({ ...theme, buttons: { ...theme.buttons, variants: { ...theme.buttons.variants, [key]: { ...theme.buttons.variants[key], ...patch } } } });
  };
  const patchSize = (key: ButtonSizeKey, patch: Partial<ThemeDefinition['buttons']['sizes'][ButtonSizeKey]>) => {
    onChange({ ...theme, buttons: { ...theme.buttons, sizes: { ...theme.buttons.sizes, [key]: { ...theme.buttons.sizes[key], ...patch } } } });
  };

  return (
    <Section title="Buttons" icon={<MousePointerClick size={14} />} defaultOpen>
      <div className="ds-chip-row">
        {BUTTON_VARIANT_KEYS.map((key) => (
          <button key={key} className={variant === key ? 'active' : ''} onClick={() => setVariant(key)}>{key}</button>
        ))}
      </div>
      <div className="ds-button-preview">
        <span style={{ background: v.background, color: v.textColor, borderColor: v.borderColor, borderRadius: v.radius, padding: `${theme.buttons.sizes.medium.paddingY}px ${v.paddingX}px`, borderWidth: v.borderColor === 'transparent' ? 0 : 1 }}>Button</span>
      </div>
      <ColorField label="Background" value={v.background} onChange={(value) => patchVariant(variant, { background: value })} />
      <ColorField label="Text colour" value={v.textColor} onChange={(value) => patchVariant(variant, { textColor: value })} contrastAgainst={v.background} />
      <ColorField label="Border" value={v.borderColor} onChange={(value) => patchVariant(variant, { borderColor: value })} />
      <TextField label="Radius" value={v.radius} onChange={(value) => patchVariant(variant, { radius: value })} />
      <Grid columns={2}>
        <NumberField label="Padding X" value={v.paddingX} onChange={(value) => patchVariant(variant, { paddingX: value })} min={0} suffix="px" />
        <NumberField label="Icon gap" value={v.iconGap} onChange={(value) => patchVariant(variant, { iconGap: value })} min={0} suffix="px" />
      </Grid>

      <span className="ds-subheading">Sizes</span>
      <div className="ds-button-sizes">
        {BUTTON_SIZE_KEYS.map((key) => {
          const s = theme.buttons.sizes[key];
          return (
            <div key={key} className="ds-button-size-row">
              <span>{key}</span>
              <div className="ds-button-preview mini"><span style={{ background: theme.buttons.variants.primary.background, color: theme.buttons.variants.primary.textColor, borderRadius: theme.buttons.variants.primary.radius, height: s.height, padding: `0 ${s.paddingX}px`, fontSize: s.fontSize }}>{key}</span></div>
              <div className="ds-size-inputs">
                <NumberField label="Height" value={s.height} onChange={(value) => patchSize(key, { height: value })} min={20} suffix="px" />
                <NumberField label="Padding" value={s.paddingX} onChange={(value) => patchSize(key, { paddingX: value })} min={0} suffix="px" />
                <TextField label="Font" value={s.fontSize} onChange={(value) => patchSize(key, { fontSize: value })} />
              </div>
            </div>
          );
        })}
      </div>
      <Hint>Existing buttons use the Primary variant unless they already have an explicit style.</Hint>
    </Section>
  );
}

/* ── Forms ── */

export function FormsSection({ theme, onChange }: SectionProps) {
  const f = theme.forms;
  const patch = (patchObj: Partial<ThemeDefinition['forms']>) => onChange({ ...theme, forms: { ...theme.forms, ...patchObj } });
  return (
    <Section title="Forms" icon={<FormInput size={14} />}>
      <div className="ds-form-preview">
        <span className="ds-form-label" style={{ color: f.labelColor }}>Field label</span>
        <input disabled style={{ borderRadius: f.inputRadius, padding: `${f.inputPaddingY}px ${f.inputPaddingX}px`, background: f.inputBackground, borderColor: f.inputBorderColor }} placeholder="Input" />
        <span className="ds-form-help" style={{ color: f.helpColor }}>Help text</span>
      </div>
      <ColorField label="Input background" value={f.inputBackground} onChange={(value) => patch({ inputBackground: value })} />
      <ColorField label="Border" value={f.inputBorderColor} onChange={(value) => patch({ inputBorderColor: value })} />
      <ColorField label="Focus border" value={f.focusBorderColor} onChange={(value) => patch({ focusBorderColor: value })} />
      <ColorField label="Error border" value={f.errorBorderColor} onChange={(value) => patch({ errorBorderColor: value })} />
      <ColorField label="Label" value={f.labelColor} onChange={(value) => patch({ labelColor: value })} />
      <ColorField label="Help text" value={f.helpColor} onChange={(value) => patch({ helpColor: value })} />
      <TextField label="Radius" value={f.inputRadius} onChange={(value) => patch({ inputRadius: value })} />
      <Grid columns={2}>
        <NumberField label="Padding X" value={f.inputPaddingX} onChange={(value) => patch({ inputPaddingX: value })} min={0} suffix="px" />
        <NumberField label="Padding Y" value={f.inputPaddingY} onChange={(value) => patch({ inputPaddingY: value })} min={0} suffix="px" />
      </Grid>
    </Section>
  );
}

/* ── Images & media ── */

export function ImagesSection({ theme, onChange }: SectionProps) {
  const i = theme.images;
  const patch = (patchObj: Partial<ThemeDefinition['images']>) => onChange({ ...theme, images: { ...theme.images, ...patchObj } });
  return (
    <Section title="Images & Media" icon={<ImageIcon size={14} />}>
      <div className="ds-image-preview">
        <span style={{ borderRadius: i.radius, aspectRatio: i.aspectRatio, boxShadow: i.shadow, background: i.placeholderColor }} />
      </div>
      <TextField label="Radius" value={i.radius} onChange={(value) => patch({ radius: value })} />
      <SelectField label="Object fit" value={i.objectFit} onChange={(value) => patch({ objectFit: value as never })} options={[{ value: 'cover', label: 'Cover' }, { value: 'contain', label: 'Contain' }, { value: 'fill', label: 'Fill' }]} />
      <TextField label="Aspect ratio" value={i.aspectRatio} onChange={(value) => patch({ aspectRatio: value })} placeholder="4 / 3" />
      <TextField label="Shadow" value={i.shadow} onChange={(value) => patch({ shadow: value })} />
      <TextField label="Video radius" value={i.videoRadius} onChange={(value) => patch({ videoRadius: value })} />
      <ColorField label="Placeholder colour" value={i.placeholderColor} onChange={(value) => patch({ placeholderColor: value })} />
      <ToggleField label="Lazy load images" value={i.lazyLoad} onChange={(value) => patch({ lazyLoad: value })} />
      <Hint>Changing object-fit never permanently crops media — the source stays intact.</Hint>
    </Section>
  );
}

/* ── Motion ── */

export function MotionSection({ theme, onChange }: SectionProps) {
  const m = theme.motion;
  const patch = (patchObj: Partial<ThemeDefinition['motion']>) => onChange({ ...theme, motion: { ...theme.motion, ...patchObj } });
  return (
    <Section title="Motion" icon={<Zap size={14} />}>
      <Grid columns={2}>
        <TextField label="Fast" value={m.fast} onChange={(value) => patch({ fast: value })} />
        <TextField label="Normal" value={m.normal} onChange={(value) => patch({ normal: value })} />
        <TextField label="Slow" value={m.slow} onChange={(value) => patch({ slow: value })} />
        <TextField label="Instant" value={m.instant} onChange={(value) => patch({ instant: value })} />
      </Grid>
      <TextField label="Standard easing" value={m.standardEasing} onChange={(value) => patch({ standardEasing: value })} />
      <TextField label="Entrance easing" value={m.entranceEasing} onChange={(value) => patch({ entranceEasing: value })} />
      <ToggleField label="Hover transitions" value={m.hoverTransition} onChange={(value) => patch({ hoverTransition: value })} />
      <ToggleField label="Button feedback" value={m.buttonFeedback} onChange={(value) => patch({ buttonFeedback: value })} />
      <ToggleField label="Modal motion" value={m.modalMotion} onChange={(value) => patch({ modalMotion: value })} />
      <ToggleField label="Scroll reveal" value={m.scrollReveal} onChange={(value) => patch({ scrollReveal: value })} />
      <ToggleField label="Reduced motion (prefers)" value={m.reducedMotion} onChange={(value) => patch({ reducedMotion: value })} />
      <Hint>When reduced motion is enabled, non-essential movement is removed without hiding content.</Hint>
    </Section>
  );
}

/* ── Container & grid ── */

export function ContainerSection({ theme, onChange }: SectionProps) {
  const c = theme.container;
  const patch = (patchObj: Partial<ThemeDefinition['container']>) => onChange({ ...theme, container: { ...theme.container, ...patchObj } });
  return (
    <Section title="Containers & Grid" icon={<LayoutGrid size={14} />}>
      <Grid columns={2}>
        <NumberField label="Max width" value={c.maxWidth} onChange={(value) => patch({ maxWidth: Math.max(320, value) })} min={320} suffix="px" />
        <NumberField label="Wide width" value={c.wideWidth} onChange={(value) => patch({ wideWidth: Math.max(320, value) })} min={320} suffix="px" />
        <NumberField label="Page gutter" value={c.gutter} onChange={(value) => patch({ gutter: Math.max(0, value) })} min={0} suffix="px" />
        <NumberField label="Section vertical" value={c.sectionVertical} onChange={(value) => patch({ sectionVertical: Math.max(0, value) })} min={0} suffix="px" />
        <NumberField label="Grid columns" value={c.gridColumns} onChange={(value) => patch({ gridColumns: Math.max(1, value) })} min={1} max={12} />
        <NumberField label="Grid gap" value={c.gridGap} onChange={(value) => patch({ gridGap: Math.max(0, value) })} min={0} suffix="px" />
      </Grid>
      <SelectField label="Content alignment" value={c.alignment} onChange={(value) => patch({ alignment: value as never })} options={[{ value: 'center', label: 'Center' }, { value: 'left', label: 'Left' }]} />
      <ToggleField label="Full-width sections" value={c.fullWidth} onChange={(value) => patch({ fullWidth: value })} />
      <Hint>Desktop is the base; tablet and mobile inherit values unless explicitly overridden.</Hint>
    </Section>
  );
}

/* ── Breakpoints ── */

export function BreakpointsSection({ theme, onChange }: SectionProps) {
  return (
    <Section title="Breakpoints" icon={<MoveHorizontal size={14} />}>
      <Grid columns={2}>
        <SliderField label="Tablet" value={theme.breakpoints.tablet} onChange={(value) => onChange({ ...theme, breakpoints: { ...theme.breakpoints, tablet: value } })} min={600} max={1024} suffix="px" />
        <SliderField label="Mobile" value={theme.breakpoints.mobile} onChange={(value) => onChange({ ...theme, breakpoints: { ...theme.breakpoints, mobile: value } })} min={320} max={600} suffix="px" />
      </Grid>
      <Hint>Mobile overrides tablet, tablet overrides desktop. Missing values inherit upward.</Hint>
    </Section>
  );
}