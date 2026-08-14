import { ButtonHTMLAttributes, forwardRef } from 'react';
import { Button } from './Button';

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  size?: 'sm' | 'md' | 'lg';
  variant?: 'ghost' | 'secondary' | 'primary';
  label: string;
  loading?: boolean;
}

const iconSizeClasses = {
  sm: 'h-7 w-7',
  md: 'h-8 w-8',
  lg: 'h-9 w-9',
};

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ size = 'md', variant = 'ghost', label, loading, children, className = '', ...props }, ref) => {
    return (
      <Button
        ref={ref}
        variant={variant}
        size={size}
        loading={loading}
        className={`!p-0 ${iconSizeClasses[size]} ${className}`}
        aria-label={label}
        title={label}
        {...props}
      >
        {!loading && children}
      </Button>
    );
  }
);

IconButton.displayName = 'IconButton';