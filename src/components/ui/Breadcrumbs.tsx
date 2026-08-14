import { ReactNode } from 'react';
import { Link } from 'react-router-dom';

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  className?: string;
}

export function Breadcrumbs({ items, className = '' }: BreadcrumbsProps) {
  return (
    <nav aria-label="Breadcrumb" className={`flex items-center gap-1 text-sm ${className}`}>
      {items.map((item, i) => (
        <span key={i} className="flex items-center gap-1">
          {i > 0 && <span className="text-forge-text-muted">/</span>}
          {item.href ? (
            <Link to={item.href} className="text-forge-text-muted hover:text-forge-text-primary transition-colors whitespace-nowrap">
              {item.label}
            </Link>
          ) : (
            <span className="text-forge-text-primary whitespace-nowrap">{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}