import { ReactNode, useEffect } from 'react';
import { X } from 'lucide-react';

interface DrawerProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  position?: 'left' | 'right' | 'bottom';
  width?: string;
}

export function Drawer({ open, onClose, title, children, position = 'right', width = 'w-80' }: DrawerProps) {
  useEffect(() => {
    if (open) {
      const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
      document.addEventListener('keydown', handler);
      return () => document.removeEventListener('keydown', handler);
    }
  }, [open, onClose]);

  const positionClasses = {
    left: `left-0 top-0 h-full ${width} translate-x-[-100%]`,
    right: `right-0 top-0 h-full ${width} translate-x-[100%]`,
    bottom: 'bottom-0 left-0 w-full h-64 translate-y-[100%]',
  };

  const openClasses = {
    left: 'translate-x-0',
    right: 'translate-x-0',
    bottom: 'translate-y-0',
  };

  return (
    <>
      {open && <div className="fixed inset-0 z-40 bg-black/40" onClick={onClose} />}
      <div
        className={`fixed z-50 bg-forge-panel border-forge-border transition-transform duration-200 ${
          position === 'bottom' ? 'border-t rounded-t-xl' : position === 'left' ? 'border-r' : 'border-l'
        } ${positionClasses[position]} ${open ? openClasses[position] : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-forge-border-subtle">
          {title && <h3 className="text-sm font-semibold text-forge-text-primary">{title}</h3>}
          <button onClick={onClose} className="h-6 w-6 flex items-center justify-center rounded text-forge-text-muted hover:text-forge-text-primary ml-auto">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
        <div className="overflow-y-auto" style={{ height: 'calc(100% - 45px)' }}>
          {children}
        </div>
      </div>
    </>
  );
}