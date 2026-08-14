import { TextareaHTMLAttributes, forwardRef, useState } from 'react';

interface TextAreaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  maxLength?: number;
  showCount?: boolean;
}

export const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(
  ({ maxLength, showCount, className = '', onChange, ...props }, ref) => {
    const [count, setCount] = useState(0);

    return (
      <div className="relative">
        <textarea
          ref={ref}
          maxLength={maxLength}
          onChange={(e) => {
            setCount(e.target.value.length);
            onChange?.(e);
          }}
          className={`w-full min-h-[80px] px-3 py-2 rounded-md bg-forge-bg border border-forge-border text-forge-text-primary text-sm placeholder:text-forge-text-muted focus:outline-none focus:border-forge-amber focus:ring-1 focus:ring-forge-amber/30 transition-colors resize-y disabled:opacity-40 ${className}`}
          {...props}
        />
        {showCount && maxLength && (
          <span className={`absolute bottom-2 right-2 text-xs ${count > maxLength * 0.9 ? 'text-forge-error' : 'text-forge-text-muted'}`}>
            {count}/{maxLength}
          </span>
        )}
      </div>
    );
  }
);

TextArea.displayName = 'TextArea';