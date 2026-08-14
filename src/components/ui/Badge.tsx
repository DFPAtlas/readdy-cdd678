import { ReactNode } from 'react';

type BadgeVariant = 'default' | 'amber' | 'accent' | 'success' | 'warning' | 'error' | 'agent';
type BadgeSize = 'sm' | 'md';

interface BadgeProps {
  children: ReactNode;
  variant?: BadgeVariant;
  size?: BadgeSize;
  className?: string;
}

const variantClasses: Record<BadgeVariant, string> = {
  default: 'bg-forge-border text-forge-text-secondary',
  amber: 'bg-forge-amber/10 text-forge-amber',
  accent: 'bg-forge-accent/10 text-forge-accent',
  success: 'bg-forge-success/10 text-forge-success',
  warning: 'bg-forge-warning/10 text-forge-warning',
  error: 'bg-forge-error/10 text-forge-error',
  agent: 'bg-forge-agent/10 text-forge-agent',
};

const sizeClasses: Record<BadgeSize, string> = {
  sm: 'px-1.5 py-0 text-[10px]',
  md: 'px-2 py-0.5 text-xs',
};

export function Badge({ children, variant = 'default', size = 'md', className = '' }: BadgeProps) {
  return (
    <span className={`inline-flex items-center rounded font-medium ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}>
      {children}
    </span>
  );
}