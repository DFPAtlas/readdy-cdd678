import { forwardRef } from 'react';
import { Search } from 'lucide-react';

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
}

export const SearchInput = forwardRef<HTMLInputElement, SearchInputProps>(
  ({ value, onChange, placeholder = 'Search...', className = '', autoFocus }, ref) => {
    return (
      <div className={`relative ${className}`}>
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-forge-text-muted pointer-events-none" />
        <input
          ref={ref}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoFocus={autoFocus}
          className="h-8 w-full pl-8 pr-3 rounded-md bg-forge-bg border border-forge-border text-forge-text-primary text-sm placeholder:text-forge-text-muted focus:outline-none focus:border-forge-amber focus:ring-1 focus:ring-forge-amber/30 transition-colors"
        />
      </div>
    );
  }
);

SearchInput.displayName = 'SearchInput';