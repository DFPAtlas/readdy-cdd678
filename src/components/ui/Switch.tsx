import { InputHTMLAttributes, forwardRef } from 'react';

interface SwitchProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
}

export const Switch = forwardRef<HTMLInputElement, SwitchProps>(
  ({ label, className = '', id, ...props }, ref) => {
    const switchId = id || props.name;
    return (
      <label htmlFor={switchId} className={`flex items-center gap-2 cursor-pointer ${className}`}>
        <div className="relative">
          <input ref={ref} type="checkbox" id={switchId} className="sr-only peer" {...props} />
          <div className="h-5 w-9 rounded-full bg-forge-border transition-colors peer-checked:bg-forge-amber peer-focus-visible:ring-2 peer-focus-visible:ring-forge-amber/30 peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-forge-bg" />
          <div className="absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white transition-transform peer-checked:translate-x-4" />
        </div>
        {label && <span className="text-sm text-forge-text-primary">{label}</span>}
      </label>
    );
  }
);

Switch.displayName = 'Switch';