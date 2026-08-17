import { Link, type LinkProps } from 'react-router-dom';
import type { ReactNode } from 'react';

type LinkButtonVariant = 'primary' | 'secondary' | 'ghost';
type LinkButtonSize = 'sm' | 'md';

interface LinkButtonProps extends Omit<LinkProps, 'children'> {
  children: ReactNode;
  variant?: LinkButtonVariant;
  size?: LinkButtonSize;
  className?: string;
}

const variantClasses: Record<LinkButtonVariant, string> = {
  primary: 'bg-forge-amber text-forge-text-inverse hover:bg-forge-amber-dim focus-visible:ring-forge-amber',
  secondary: 'bg-forge-border text-forge-text-primary hover:bg-forge-hover border border-forge-border-subtle focus-visible:ring-forge-accent',
  ghost: 'text-forge-text-secondary hover:bg-forge-hover hover:text-forge-text-primary focus-visible:ring-forge-amber',
};

const sizeClasses: Record<LinkButtonSize, string> = {
  sm: 'h-7 px-2.5 text-xs gap-1',
  md: 'h-8 px-3 text-sm gap-1.5',
};

/**
 * A link styled as a Forge button, so route navigation keeps correct
 * <a>/<Link> semantics instead of nesting a <button> inside an anchor.
 */
export function LinkButton({
  children,
  variant = 'primary',
  size = 'sm',
  className = '',
  ...props
}: LinkButtonProps) {
  return (
    <Link
      className={`inline-flex items-center justify-center rounded-md font-medium whitespace-nowrap transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-forge-bg ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      {...props}
    >
      {children}
    </Link>
  );
}