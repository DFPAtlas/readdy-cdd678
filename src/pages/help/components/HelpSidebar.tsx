import { Link } from 'react-router-dom';
import { HELP_CATEGORIES, getArticlesByCategory } from '../helpData';
import { CategoryIcon } from './CategoryIcon';

interface HelpSidebarProps {
  activeSlug: string | null;
}

export function HelpSidebar({ activeSlug }: HelpSidebarProps) {
  return (
    <nav aria-label="Help topics" className="space-y-6">
      {HELP_CATEGORIES.map((category) => {
        const articles = getArticlesByCategory(category.id);
        if (articles.length === 0) return null;
        return (
          <div key={category.id}>
            <div className="mb-2 flex items-center gap-2">
              <span className="flex h-4 w-4 items-center justify-center">
                <CategoryIcon name={category.icon} className="h-3.5 w-3.5 text-forge-text-muted" />
              </span>
              <span className="text-xs font-semibold uppercase tracking-wide text-forge-text-muted">
                {category.label}
              </span>
            </div>
            <ul className="space-y-0.5 border-l border-forge-border-subtle">
              {articles.map((article) => {
                const active = article.slug === activeSlug;
                return (
                  <li key={article.slug}>
                    <Link
                      to={`/help?topic=${article.slug}`}
                      aria-current={active ? 'page' : undefined}
                      className={`-ml-px block border-l-2 py-1.5 pl-4 text-[13px] leading-snug transition-colors ${
                        active
                          ? 'border-forge-amber font-medium text-forge-amber'
                          : 'border-transparent text-forge-text-secondary hover:border-forge-border hover:text-forge-text-primary'
                      }`}
                    >
                      {article.title}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </nav>
  );
}