interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'circle' | 'rect';
}

export function Skeleton({ className = '', variant = 'rect' }: SkeletonProps) {
  const variantClasses = {
    text: 'h-4 w-full rounded',
    circle: 'rounded-full',
    rect: 'rounded-md',
  };

  return (
    <div
      className={`animate-pulse bg-forge-border ${variantClasses[variant]} ${className}`}
      aria-hidden="true"
    />
  );
}