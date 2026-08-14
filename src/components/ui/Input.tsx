import { InputHTMLAttributes, forwardRef } from 'react';

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className = '', ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={`h-8 px-3 rounded-md bg-forge-bg border border-forge-border text-forge-text-primary text-sm placeholder:text-forge-text-muted focus:outline-none focus:border-forge-amber focus:ring-1 focus:ring-forge-amber/30 transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${className}`}
        {...props}
      />
    );
  }
);

Input.displayName = 'Input';