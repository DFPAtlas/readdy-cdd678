import { useMemo, useState } from 'react';
import { AlertOctagon, AlertTriangle, CheckCircle2, Info, RefreshCw, Sparkles, Target } from 'lucide-react';
import {
  CATEGORY_LABELS, SEVERITY_LABELS, SEVERITY_ORDER,
  type Severity, type ValidationCategory, type ValidationIssue, type ValidationResult,
} from './sandboxValidation';

export type ValidationPanelProps = {
  result: ValidationResult | null;
  loading: boolean;
  onRunValidation: () => void;
  onSelectElement: (elementId?: string) => void;
  onAskAiToFix: (issue: ValidationIssue) => void;
};

const SEVERITY_META: Record<Severity, { icon: typeof AlertOctagon; className: string }> = {
  blocker: { icon: AlertOctagon, className: 'blocker' },
  error: { icon: AlertOctagon, className: 'error' },
  warning: { icon: AlertTriangle, className: 'warning' },
  recommendation: { icon: Info, className: 'recommendation' },
  passed: { icon: CheckCircle2, className: 'passed' },
};

export default function ValidationPanel({ result, loading, onRunValidation, onSelectElement, onAskAiToFix }: ValidationPanelProps) {
  const [severityFilter, setSeverityFilter] = useState<Severity | 'all'>('all');
  const [categoryFilter, setCategoryFilter] = useState<ValidationCategory | 'all'>('all');

  const categories = useMemo(() => {
    if (!result) return [];
    return [...new Set(result.issues.map((issue) => issue.category))];
  }, [result]);

  const filtered = useMemo(() => {
    if (!result) return [];
    return result.issues
      .filter((issue) => severityFilter === 'all' || issue.severity === severityFilter)
      .filter((issue) => categoryFilter === 'all' || issue.category === categoryFilter)
      .sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]);
  }, [result, severityFilter, categoryFilter]);

  if (loading) {
    return <div className="validation-panel"><p className="validation-loading">Running checks…</p></div>;
  }

  if (!result) {
    return (
      <div className="validation-panel">
        <div className="validation-empty">
          <CheckCircle2 size={26} />
          <p>No validation has been run yet.</p>
          <button className="validation-run" onClick={onRunValidation}><RefreshCw size={14} /> Run checks</button>
        </div>
      </div>
    );
  }

  const hasIssues = result.issues.length > 0;

  return (
    <div className="validation-panel">
      <div className="validation-header">
        <div className="validation-summary">
          {result.blockers > 0 && <span className="sev-chip blocker">{result.blockers} blocker{result.blockers === 1 ? '' : 's'}</span>}
          {result.errors > 0 && <span className="sev-chip error">{result.errors} error{result.errors === 1 ? '' : 's'}</span>}
          {result.warnings > 0 && <span className="sev-chip warning">{result.warnings} warning{result.warnings === 1 ? '' : 's'}</span>}
          {result.recommendations > 0 && <span className="sev-chip recommendation">{result.recommendations} suggestion{result.recommendations === 1 ? '' : 's'}</span>}
          {!hasIssues && <span className="sev-chip passed">All checks passed</span>}
        </div>
        <button className="validation-run" onClick={onRunValidation}><RefreshCw size={14} /> Re-run</button>
      </div>

      {hasIssues && (
        <div className="validation-filters">
          <select value={severityFilter} onChange={(event) => setSeverityFilter(event.target.value as Severity | 'all')} aria-label="Filter by severity">
            <option value="all">All severities</option>
            <option value="blocker">Blockers</option>
            <option value="error">Errors</option>
            <option value="warning">Warnings</option>
            <option value="recommendation">Suggestions</option>
          </select>
          <select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value as ValidationCategory | 'all')} aria-label="Filter by category">
            <option value="all">All categories</option>
            {categories.map((category) => <option key={category} value={category}>{CATEGORY_LABELS[category]}</option>)}
          </select>
        </div>
      )}

      <div className="validation-list">
        {filtered.length === 0 && hasIssues && <p className="validation-loading">No issues match these filters.</p>}
        {filtered.map((issue, index) => {
          const meta = SEVERITY_META[issue.severity];
          const Icon = meta.icon;
          return (
            <div key={`${issue.category}-${issue.element}-${index}`} className={`validation-item ${meta.className}`}>
              <div className="validation-item-head">
                <span className={`validation-sev ${meta.className}`}><Icon size={13} />{SEVERITY_LABELS[issue.severity]}</span>
                <span className="validation-cat">{CATEGORY_LABELS[issue.category]}</span>
                {issue.page && issue.page !== '—' && <span className="validation-page">{issue.page}</span>}
                {issue.element && issue.element !== '—' && <span className="validation-element">{issue.element}</span>}
              </div>
              <p className="validation-message">{issue.message}</p>
              <p className="validation-fix"><strong>Fix:</strong> {issue.fix}</p>
              <div className="validation-actions">
                {issue.elementId && (
                  <button onClick={() => onSelectElement(issue.elementId)}><Target size={13} /> Select element</button>
                )}
                <button onClick={() => onAskAiToFix(issue)}><Sparkles size={13} /> Ask AI to fix</button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}