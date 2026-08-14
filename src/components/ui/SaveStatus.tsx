import { Check, Loader, Save } from 'lucide-react';

type SaveState = 'idle' | 'saving' | 'saved' | 'error' | 'unsaved';

interface SaveStatusProps {
  state: SaveState;
  className?: string;
}

export function SaveStatus({ state, className = '' }: SaveStatusProps) {
  return (
    <div className={`flex items-center gap-1 text-xs ${className}`}>
      {state === 'saving' && (
        <>
          <Loader className="h-3 w-3 text-forge-accent animate-spin" />
          <span className="text-forge-text-muted">Saving</span>
        </>
      )}
      {state === 'saved' && (
        <>
          <Check className="h-3 w-3 text-forge-success" />
          <span className="text-forge-success">Saved</span>
        </>
      )}
      {state === 'unsaved' && (
        <>
          <Save className="h-3 w-3 text-forge-warning" />
          <span className="text-forge-warning">Unsaved</span>
        </>
      )}
      {state === 'error' && (
        <>
          <Save className="h-3 w-3 text-forge-error" />
          <span className="text-forge-error">Save failed</span>
        </>
      )}
      {state === 'idle' && (
        <>
          <Check className="h-3 w-3 text-forge-text-muted" />
          <span className="text-forge-text-muted">Synced</span>
        </>
      )}
    </div>
  );
}