import { Sparkles, StopCircle, RefreshCw, WifiOff, Zap } from 'lucide-react';
import type { AiMode, AiTaskClass, AiUsage } from './sandboxAiGateway';

const TASK_LABELS: Record<AiTaskClass, string> = {
  fast_edit: 'Fast edit',
  standard: 'Website generation',
  complex: 'Multi-page planning',
  copywriting: 'Copywriting',
  seo: 'SEO assistance',
  accessibility: 'Accessibility review',
  image_alt: 'Image alt text',
  local: 'Local mode',
};

export default function AiGenerationStatus({
  mode,
  taskClass,
  usage,
  busy,
  errorMessage,
  onStop,
  onRetry,
}: {
  mode: AiMode;
  taskClass: AiTaskClass;
  usage: AiUsage;
  busy: boolean;
  errorMessage: string | null;
  onStop: () => void;
  onRetry: () => void;
}) {
  const isLive = mode === 'live';
  const label = isLive ? 'Live AI' : 'Smart local mode';

  return (
    <div className="ai-status">
      <div className="ai-status-top">
        <span className={`ai-mode-badge ${isLive ? 'live' : 'local'}`}>
          {isLive ? <Zap size={12} /> : mode === 'offline' ? <WifiOff size={12} /> : <Sparkles size={12} />}
          {label}
        </span>
        <span className="ai-task-badge">{TASK_LABELS[taskClass] ?? taskClass}</span>
      </div>

      {busy && (
        <div className="ai-generating">
          <div className="ai-generating-track"><i /></div>
          <span>Generating proposal…</span>
          <button onClick={onStop} title="Stop generating"><StopCircle size={15} />Stop</button>
        </div>
      )}

      {errorMessage && !busy && (
        <div className="ai-error">
          <span>{errorMessage}</span>
          <button onClick={onRetry}><RefreshCw size={13} />Retry</button>
        </div>
      )}

      {!busy && !errorMessage && usage.mode === 'fallback' && (
        <div className="ai-notice">Live AI is unavailable — this proposal came from smart local mode.</div>
      )}
    </div>
  );
}