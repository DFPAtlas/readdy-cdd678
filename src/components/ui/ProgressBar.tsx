interface ProgressBarProps {
  value: number;
  max?: number;
  size?: 'sm' | 'md';
  variant?: 'amber' | 'accent' | 'success' | 'error';
  showLabel?: boolean;
  className?: string;
}

const variantColors = {
  amber: 'bg-forge-amber',
  accent: 'bg-forge-accent',
  success: 'bg-forge-success',
  error: 'bg-forge-error',
};

export function ProgressBar({ value, max = 100, size = 'sm', variant = 'amber', showLabel, className = '' }: ProgressBarProps) {
  const pct = Math.min(Math.max((value / max) * 100, 0), 100);
  const height = size === 'sm' ? 'h-1' : 'h-1.5';

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className={`flex-1 ${height} rounded-full bg-forge-border overflow-hidden`}>
        <div
          className={`h-full rounded-full transition-all duration-300 ${variantColors[variant]}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      {showLabel && <span className="text-xs text-forge-text-muted">{Math.round(pct)}%</span>}
    </div>
  );
}