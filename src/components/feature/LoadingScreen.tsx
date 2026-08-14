import { useState, useEffect } from 'react';
import { Zap, RefreshCw } from 'lucide-react';
import { LOADING_STATUSES } from '@/config/hero';

interface LoadingScreenProps {
  visible: boolean;
}

export function LoadingScreen({ visible }: LoadingScreenProps) {
  const [rendered, setRendered] = useState(visible);
  const [statusIndex, setStatusIndex] = useState(0);
  const [phase, setPhase] = useState<'loading' | 'delayed' | 'warning'>('loading');

  // Mount / unmount with fade transition
  useEffect(() => {
    if (visible) {
      setRendered(true);
      setPhase('loading');
    } else {
      const t = setTimeout(() => setRendered(false), 600);
      return () => clearTimeout(t);
    }
  }, [visible]);

  // Rotate status text
  useEffect(() => {
    if (!visible || !rendered) return;
    const interval = setInterval(() => {
      setStatusIndex((i) => (i + 1) % LOADING_STATUSES.length);
    }, 700);
    return () => clearInterval(interval);
  }, [visible, rendered]);

  // Phase escalation based on time
  useEffect(() => {
    if (!visible || !rendered) return;
    const delayedTimer = setTimeout(() => setPhase('delayed'), 5000);
    const warningTimer = setTimeout(() => setPhase('warning'), 12000);
    return () => {
      clearTimeout(delayedTimer);
      clearTimeout(warningTimer);
    };
  }, [visible, rendered]);

  if (!rendered) return null;

  return (
    <div
      className={`fixed inset-0 z-[300] flex flex-col items-center justify-center transition-opacity duration-500 ${
        visible ? 'opacity-100' : 'opacity-0 pointer-events-none'
      }`}
      style={{ backgroundColor: '#0B0D10' }}
      role="status"
      aria-live="polite"
      aria-busy={visible}
    >
      {/* Ambient amber glow behind logo */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-56 h-56 rounded-full bg-forge-amber/8 animate-forge-glow"
        aria-hidden="true"
      />

      <div className="relative z-10 flex flex-col items-center">
        {/* Logo with forging pulse */}
        <div className="animate-forge-pulse mb-8">
          <div className="flex items-center gap-3">
            <Zap className="h-10 w-10 text-forge-amber" aria-hidden="true" />
            <span className="text-3xl font-bold text-white tracking-tight">Forge</span>
          </div>
        </div>

        {/* Progress line */}
        <div className="w-52 h-0.5 bg-white/10 rounded-full overflow-hidden mb-6" aria-hidden="true">
          <div
            className={`h-full rounded-full ${
              phase === 'warning' ? 'bg-forge-warning' : 'bg-forge-amber'
            } animate-progress-pulse`}
          />
        </div>

        {/* Status text */}
        <p
          className={`text-sm font-medium transition-colors duration-300 ${
            phase === 'warning' ? 'text-forge-warning' : 'text-forge-text-secondary'
          }`}
        >
          {LOADING_STATUSES[statusIndex]}
        </p>

        {/* Warning / retry action */}
        {phase === 'warning' && (
          <div className="mt-6 flex flex-col items-center gap-3">
            <p className="text-xs text-forge-text-muted max-w-xs text-center">
              Some Forge services are taking longer than expected to respond.
            </p>
            <button
              onClick={() => {
                setPhase('loading');
                setStatusIndex(0);
              }}
              className="inline-flex items-center gap-1.5 text-xs text-forge-text-secondary hover:text-forge-text-primary transition-colors"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Retry connection
            </button>
            <span className="text-[11px] text-forge-text-muted">or</span>
            <button
              onClick={() => {
                /* App.tsx handles hiding via timeout or user action */
              }}
              className="text-xs text-forge-text-muted hover:text-forge-text-secondary transition-colors"
            >
              Continue in limited demo mode
            </button>
          </div>
        )}
      </div>
    </div>
  );
}