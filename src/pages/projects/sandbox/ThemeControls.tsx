import { useState } from 'react';
import type { ReactNode } from 'react';
import { ChevronDown, ChevronRight, RotateCcw } from 'lucide-react';
import { contrastCheck, normalizeColor, type ContrastResult } from './sandboxTheme';

/* Shared compact controls for the Design System panel (Forge chrome styling). */

export function Section({ title, icon, children, defaultOpen = false, badge }: {
  title: string; icon?: ReactNode; children: ReactNode; defaultOpen?: boolean; badge?: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="ds-section">
      <button className="ds-section-head" onClick={() => setOpen((value) => !value)}>
        {icon && <span className="ds-section-icon">{icon}</span>}
        <span>{title}</span>
        {badge && <span className="ds-section-badge">{badge}</span>}
        {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
      </button>
      {open && <div className="ds-section-body">{children}</div>}
    </div>
  );
}

export function FieldLabel({ label, hint, onReset }: { label: string; hint?: string; onReset?: () => void }) {
  return (
    <div className="ds-field-label">
      <span>{label}</span>
      {hint && <em>{hint}</em>}
      {onReset && <button type="button" onClick={onReset} title="Reset to default" aria-label={`Reset ${label}`}><RotateCcw size={11} /></button>}
    </div>
  );
}

export function TextField({ label, value, onChange, placeholder, hint, onReset }: {
  label: string; value: string; onChange: (value: string) => void; placeholder?: string; hint?: string; onReset?: () => void;
}) {
  return (
    <label className="ds-field">
      <FieldLabel label={label} hint={hint} onReset={onReset} />
      <input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} />
    </label>
  );
}

export function NumberField({ label, value, onChange, min, max, step = 1, suffix, hint }: {
  label: string; value: number; onChange: (value: number) => void; min?: number; max?: number; step?: number; suffix?: string; hint?: string;
}) {
  return (
    <label className="ds-field">
      <FieldLabel label={label} hint={hint} />
      <div className="ds-number">
        <input type="number" value={value} min={min} max={max} step={step} onChange={(event) => onChange(Number(event.target.value))} />
        {suffix && <span>{suffix}</span>}
      </div>
    </label>
  );
}

export function SelectField({ label, value, onChange, options, hint }: {
  label: string; value: string; onChange: (value: string) => void; options: Array<{ value: string; label: string }>; hint?: string;
}) {
  return (
    <label className="ds-field">
      <FieldLabel label={label} hint={hint} />
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
    </label>
  );
}

export function ToggleField({ label, value, onChange }: { label: string; value: boolean; onChange: (value: boolean) => void }) {
  return (
    <label className="ds-toggle">
      <span>{label}</span>
      <input type="checkbox" checked={value} onChange={(event) => onChange(event.target.checked)} />
    </label>
  );
}

export function SliderField({ label, value, onChange, min, max, step = 1, suffix }: {
  label: string; value: number; onChange: (value: number) => void; min: number; max: number; step?: number; suffix?: string;
}) {
  return (
    <label className="ds-field">
      <FieldLabel label={label} />
      <div className="ds-slider">
        <input type="range" min={min} max={max} step={step} value={value} onChange={(event) => onChange(Number(event.target.value))} />
        <b>{value}{suffix}</b>
      </div>
    </label>
  );
}

export function ColorField({ label, value, onChange, contrastAgainst, hint }: {
  label: string; value: string; onChange: (value: string) => void; contrastAgainst?: string; hint?: string;
}) {
  const [text, setText] = useState(value);
  const commit = (raw: string) => {
    const normalized = normalizeColor(raw);
    if (normalized) { onChange(normalized); setText(normalized); }
    else setText(value);
  };
  return (
    <label className="ds-field ds-color-field">
      <FieldLabel label={label} hint={hint} />
      <div className="ds-color-row">
        <input type="color" value={/^#([0-9a-f]{6})$/i.test(value) ? value : '#000000'} onChange={(event) => { onChange(event.target.value); setText(event.target.value); }} />
        <input className="ds-hex" value={text} onChange={(event) => setText(event.target.value)} onBlur={(event) => commit(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') commit((event.target as HTMLInputElement).value); }} spellCheck={false} />
        {contrastAgainst && <ContrastBadge fg={value} bg={contrastAgainst} />}
      </div>
    </label>
  );
}

export function ContrastBadge({ fg, bg }: { fg: string; bg: string }) {
  const result: ContrastResult = contrastCheck(fg, bg);
  if (result.ratio === null) return <span className="ds-contrast unknown" title="Contrast">—</span>;
  const cls = result.normal === 'fail' ? 'fail' : result.normal === 'aaa' ? 'aaa' : 'pass';
  const label = result.normal === 'fail' ? 'AA fail' : result.normal === 'aaa' ? 'AAA' : 'AA';
  return (
    <span className={`ds-contrast ${cls}`} title={`Contrast ${result.ratio.toFixed(2)}:1 — ${label}`}>
      {result.ratio.toFixed(1)}:1
    </span>
  );
}

export function Grid({ children, columns = 2 }: { children: ReactNode; columns?: number }) {
  return <div className="ds-grid" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>{children}</div>;
}

export function Hint({ children }: { children: ReactNode }) {
  return <p className="ds-hint">{children}</p>;
}