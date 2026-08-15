import { AlertTriangle, CheckCircle2, Info, Search, Sun, Moon } from 'lucide-react';
import { useState } from 'react';
import type { DesignFinding, ThemeDefinition, ThemeMode } from './sandboxTheme';

/* Interactive theme preview — reflects the draft theme, not the live canvas. */

export function ThemePreview({ theme }: { theme: ThemeDefinition }) {
  const [mode, setMode] = useState<'light' | 'dark'>(theme.mode === 'dark' ? 'dark' : 'light');
  const c = mode === 'dark' ? theme.colors.dark : theme.colors.light;
  const t = theme.typography;
  const btn = theme.buttons.variants.primary;
  const container = { maxWidth: theme.container.maxWidth, padding: theme.container.gutter };

  const head = { fontFamily: t.h2.fontFamily, fontWeight: t.h2.fontWeight };
  const body = { fontFamily: t.body.fontFamily };

  return (
    <div className="ds-theme-preview" style={{ background: c.background, color: c.body, fontFamily: t.body.fontFamily }}>
      <div className="ds-preview-toolbar">
        <div className="ds-segmented">
          <button className={mode === 'light' ? 'active' : ''} onClick={() => setMode('light')}><Sun size={13} /> Light</button>
          <button className={mode === 'dark' ? 'active' : ''} onClick={() => setMode('dark')}><Moon size={13} /> Dark</button>
        </div>
        <span className="ds-preview-hint">Preview only — the canvas updates when you apply.</span>
      </div>

      <div className="ds-preview-stage" style={{ background: c.background }}>
        <div className="ds-preview-nav" style={{ background: c.surface, borderColor: c.border, maxWidth: container.maxWidth }}>
          <b style={{ color: c.heading, fontFamily: t.h6.fontFamily }}>{theme.brand.name}</b>
          <div className="ds-preview-links">
            {['Home', 'Features', 'Pricing'].map((label) => <span key={label} style={{ color: c.muted, fontFamily: t.label.fontFamily }}>{label}</span>)}
          </div>
          <button style={{ background: btn.background, color: btn.textColor, borderRadius: btn.radius, fontFamily: t.button.fontFamily, fontWeight: t.button.fontWeight }}>Get started</button>
        </div>

        <div className="ds-preview-hero" style={{ maxWidth: container.maxWidth }}>
          <h1 style={{ color: c.heading, ...head, fontSize: t.h1.fontSize, lineHeight: t.h1.lineHeight }}>Build something<br />worth shipping.</h1>
          <p style={{ color: c.body, fontSize: t.bodyLarge.fontSize, lineHeight: t.bodyLarge.lineHeight }}>A clear, confident headline with supporting copy that respects your theme.</p>
          <div className="ds-preview-actions">
            <button style={{ background: btn.background, color: btn.textColor, borderRadius: btn.radius, fontFamily: t.button.fontFamily, fontWeight: t.button.fontWeight, padding: `0 ${btn.paddingX}px` }}>Primary action</button>
            <button style={{ background: 'transparent', color: c.heading, border: `1px solid ${c.border}`, borderRadius: theme.radius.medium, fontFamily: t.button.fontFamily }}>Secondary</button>
          </div>
        </div>

        <div className="ds-preview-cards" style={{ maxWidth: container.maxWidth }}>
          <div className="ds-preview-card" style={{ background: c.surface, borderColor: c.border, borderRadius: theme.radius.medium }}>
            <h3 style={{ color: c.heading, fontFamily: t.h4.fontFamily }}>Card title</h3>
            <p style={{ color: c.body, fontFamily: body.fontFamily, fontSize: t.bodySmall.fontSize }}>A surface card with body copy and a quiet link.</p>
            <a style={{ color: c.primary, fontFamily: t.label.fontFamily }}>Learn more</a>
          </div>
          <div className="ds-preview-card" style={{ background: c.elevatedSurface, borderColor: c.border, borderRadius: theme.radius.medium }}>
            <h3 style={{ color: c.heading, fontFamily: t.h4.fontFamily }}>Elevated</h3>
            <p style={{ color: c.body, fontFamily: body.fontFamily, fontSize: t.bodySmall.fontSize }}>The elevated surface sits slightly above the base.</p>
          </div>
        </div>

        <div className="ds-preview-form" style={{ maxWidth: container.maxWidth, background: c.surface, borderColor: c.border, borderRadius: theme.radius.medium }}>
          <label style={{ color: c.heading, fontFamily: t.label.fontFamily }}>Email address</label>
          <input disabled placeholder="you@example.com" style={{ borderRadius: theme.forms.inputRadius, borderColor: c.border, background: c.background, color: c.body }} />
          <button style={{ background: btn.background, color: btn.textColor, borderRadius: btn.radius, fontFamily: t.button.fontFamily, fontWeight: t.button.fontWeight }}>Subscribe</button>
        </div>

        <div className="ds-preview-alerts" style={{ maxWidth: container.maxWidth }}>
          <div style={{ background: withAlpha(c.success, 0.12), color: c.success, borderColor: withAlpha(c.success, 0.3) }}>Success — everything looks good.</div>
          <div style={{ background: withAlpha(c.warning, 0.12), color: c.warning, borderColor: withAlpha(c.warning, 0.3) }}>Warning — review before publishing.</div>
          <div style={{ background: withAlpha(c.error, 0.12), color: c.error, borderColor: withAlpha(c.error, 0.3) }}>Error — an issue needs attention.</div>
        </div>

        <div className="ds-preview-footer" style={{ background: c.heading, color: c.background }}>
          <span style={{ fontFamily: t.caption.fontFamily }}>© {new Date().getFullYear()} {theme.brand.name}</span>
          <span style={{ color: withAlpha(c.background, 0.6) }}>Footer</span>
        </div>
      </div>
    </div>
  );
}

function withAlpha(hex: string, alpha: number): string {
  const m = hex.replace('#', '');
  if (!/^[0-9a-fA-F]{6}$/.test(m)) return hex;
  const num = parseInt(m, 16);
  const r = (num >> 16) & 255, g = (num >> 8) & 255, b = num & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/* ── Consistency scan results ── */

const SEVERITY_META: Record<DesignFinding['severity'], { label: string; icon: typeof CheckCircle2; cls: string }> = {
  critical: { label: 'Critical', icon: AlertTriangle, cls: 'critical' },
  warning: { label: 'Warning', icon: AlertTriangle, cls: 'warning' },
  suggestion: { label: 'Suggestion', icon: Info, cls: 'suggestion' },
};

export function ScanResults({ findings }: { findings: DesignFinding[] }) {
  if (!findings.length) {
    return (
      <div className="ds-scan-empty">
        <CheckCircle2 size={22} />
        <span>No design problems found.</span>
      </div>
    );
  }
  const grouped = new Map<string, DesignFinding[]>();
  findings.forEach((finding) => {
    const list = grouped.get(finding.group) ?? [];
    list.push(finding);
    grouped.set(finding.group, list);
  });
  return (
    <div className="ds-scan-results">
      <div className="ds-scan-summary">
        <Search size={13} /> {findings.length} finding{findings.length === 1 ? '' : 's'} across {grouped.size} group{grouped.size === 1 ? '' : 's'}
      </div>
      {[...grouped.entries()].map(([group, list]) => (
        <div key={group} className="ds-scan-group">
          <span className="ds-scan-group-name">{group}</span>
          {list.map((finding, index) => {
            const meta = SEVERITY_META[finding.severity];
            const Icon = meta.icon;
            return (
              <div key={index} className={`ds-scan-item ${meta.cls}`}>
                <Icon size={14} />
                <div>
                  <span>{finding.message}</span>
                  <em>{finding.detail}</em>
                </div>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

export function scanLabel(theme: ThemeDefinition): string {
  const m: ThemeMode = theme.mode;
  return m === 'system' ? 'Follow device' : m === 'user' ? 'User-selectable' : m === 'dark' ? 'Dark only' : 'Light only';
}