import { ReactNode } from 'react';
import { Button } from './Button';

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  children?: ReactNode;
}

export function ErrorState({ title = 'Something went wrong', message, onRetry, children }: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div className="mb-4 h-12 w-12 rounded-full bg-forge-error/10 flex items-center justify-center">
        <svg className="h-6 w-6 text-forge-error" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      </div>
      <h3 className="text-sm font-medium text-forge-text-primary">{title}</h3>
      {message && <p className="mt-1 text-sm text-forge-text-muted max-w-sm">{message}</p>}
      {onRetry && (
        <Button variant="secondary" size="sm" onClick={onRetry} className="mt-4">
          Try again
        </Button>
      )}
      {children}
    </div>
  );
}