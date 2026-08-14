import { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
  hoverable?: boolean;
  onClick?: () => void;
}

export function Card({ children, className = '', hoverable, onClick }: CardProps) {
  return (
    <div
      onClick={onClick}
      className={`bg-forge-panel border border-forge-border-subtle rounded-lg p-4 ${
        hoverable || onClick ? 'cursor-pointer hover:border-forge-border transition-colors' : ''
      } ${className}`}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => { if (e.key === 'Enter') onClick(); } : undefined}
    >
      {children}
    </div>
  );
}