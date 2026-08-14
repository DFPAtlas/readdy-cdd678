import { ReactNode } from 'react';

interface PanelProps {
  children: ReactNode;
  className?: string;
}

export function Panel({ children, className = '' }: PanelProps) {
  return (
    <div className={`bg-forge-panel border border-forge-border-subtle rounded-lg ${className}`}>
      {children}
    </div>
  );
}

export function PanelHeader({ title, actions }: { title: string; actions?: ReactNode }) {
  return (
    <div className="flex items-center justify-between px-4 py-2.5 border-b border-forge-border-subtle">
      <h3 className="text-sm font-semibold text-forge-text-primary">{title}</h3>
      {actions && <div className="flex items-center gap-1">{actions}</div>}
    </div>
  );
}