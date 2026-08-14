import { ReactNode } from 'react';
import { AlertTriangle, XCircle, CheckCircle, Info } from 'lucide-react';

type AlertVariant = 'info' | 'success' | 'warning' | 'error';

interface InlineAlertProps {
  variant?: AlertVariant;
  title?: string;
  children: ReactNode;
  onDismiss?: () => void;
}

const variantStyles: Record<AlertVariant, { bg: string; border: string; text: string; icon: ReactNode }> = {
  info: {
    bg: 'bg-forge-accent/5',
    border: 'border-forge-accent/20',
    text: 'text-forge-accent',
    icon: <Info className="h-4 w-4" />,
  },
  success: {
    bg: 'bg-forge-success/5',
    border: 'border-forge-success/20',
    text: 'text-forge-success',
    icon: <CheckCircle className="h-4 w-4" />,
  },
  warning: {
    bg: 'bg-forge-warning/5',
    border: 'border-forge-warning/20',
    text: 'text-forge-warning',
    icon: <AlertTriangle className="h-4 w-4" />,
  },
  error: {
    bg: 'bg-forge-error/5',
    border: 'border-forge-error/20',
    text: 'text-forge-error',
    icon: <XCircle className="h-4 w-4" />,
  },
};

export function InlineAlert({ variant = 'info', title, children, onDismiss }: InlineAlertProps) {
  const style = variantStyles[variant];
  return (
    <div className={`flex gap-3 px-3 py-2.5 rounded-lg border ${style.bg} ${style.border}`}>
      <span className={`flex-shrink-0 mt-0.5 ${style.text}`}>{style.icon}</span>
      <div className="flex-1 min-w-0">
        {title && <p className="text-sm font-medium text-forge-text-primary">{title}</p>}
        <div className="text-sm text-forge-text-secondary">{children}</div>
      </div>
      {onDismiss && (
        <button onClick={onDismiss} className="flex-shrink-0 text-forge-text-muted hover:text-forge-text-primary">
          <XCircle className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}