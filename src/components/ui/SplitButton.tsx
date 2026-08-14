import { useState, useRef, useEffect, forwardRef } from 'react';
import { Button } from './Button';

interface SplitButtonProps {
  label: string;
  variant?: 'primary' | 'secondary';
  size?: 'sm' | 'md';
  items: { label: string; onClick: () => void }[];
  onMainClick: () => void;
  disabled?: boolean;
}

export const SplitButton = forwardRef<HTMLDivElement, SplitButtonProps>(
  ({ label, variant = 'primary', size = 'md', items, onMainClick, disabled }, ref) => {
    const [open, setOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
      function handleClickOutside(e: MouseEvent) {
        if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false);
      }
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
      <div ref={ref || menuRef} className="relative inline-flex">
        <Button variant={variant} size={size} onClick={onMainClick} disabled={disabled} className="rounded-r-none border-r border-forge-text-inverse/20">
          {label}
        </Button>
        <Button variant={variant} size={size} onClick={() => setOpen(!open)} disabled={disabled} className="rounded-l-none !px-2">
          <svg className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M6 9l6 6 6-6" /></svg>
        </Button>
        {open && (
          <div className="absolute top-full right-0 mt-1 w-44 bg-forge-panel-elevated border border-forge-border rounded-md shadow-lg z-50 py-1">
            {items.map((item) => (
              <button
                key={item.label}
                onClick={() => { item.onClick(); setOpen(false); }}
                className="w-full text-left px-3 py-1.5 text-sm text-forge-text-primary hover:bg-forge-hover transition-colors whitespace-nowrap"
              >
                {item.label}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }
);

SplitButton.displayName = 'SplitButton';