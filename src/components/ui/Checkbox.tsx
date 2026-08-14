import { InputHTMLAttributes, forwardRef } from 'react';

interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
  description?: string;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ label, description, className = '', id, ...props }, ref) => {
    const checkboxId = id || props.name;
    return (
      <label htmlFor={checkboxId} className={`flex items-start gap-2 cursor-pointer ${className}`}>
        <input
          ref={ref}
          type="checkbox"
          id={checkboxId}
          className="mt-0.5 h-4 w-4 rounded border-forge-border bg-forge-bg text-forge-amber focus:ring-forge-amber/30 focus:ring-1 focus:outline-none cursor-pointer"
          {...props}
        />
        {(label || description) && (
          <div className="flex flex-col">
            {label && <span className="text-sm text-forge-text-primary">{label}</span>}
            {description && <span className="text-xs text-forge-text-muted">{description}</span>}
          </div>
        )}
      </label>
    );
  }
);

Checkbox.displayName = 'Checkbox';