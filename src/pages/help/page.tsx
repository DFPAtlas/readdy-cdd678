import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Search, X, ArrowRight, Menu, LifeBuoy, BookOpen, ChevronRight,
} from 'lucide-react';
import {
  HELP_CATEGORIES,
  getArticleBySlug,
  getArticlesByCategory,
  getCategoryById,
  searchArticles,
  type SearchResult,
} from './helpData';
import { ArticleBody } from './components/ArticleBody';
import { HelpSidebar } from './components/HelpSidebar';
import { CategoryIcon } from './components/CategoryIcon';
import { ForgeLogoFallback } from '@/config/hero';
import { useAuthStore } from '@/stores/authStore';

/* ── Starter articles shown in the "Start here" section ── */
const START_HERE_SLUGS = [
  'what-is-forge',
  'create-first-project',
  'configure-ai-provider',
  'open-the-sandbox',
  'understand-builds',
  'export-project',
];

function HeaderBar() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return (
    <header className="sticky top-0 z-40 border-b border-forge-border-subtle bg-forge-bg/95 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 md:px-6">
        <Link to="/" aria-label="Forge home" className="flex shrink-0 items-center gap-2">
          <ForgeLogoFallback size="sm" />
        </Link>

        <nav className="hidden items-center gap-1 md:flex" aria-label="Help navigation">
          <Link
            to="/dashboard"
            className="rounded-md px-3 py-1.5 text-sm text-forge-text-secondary transition-colors hover:bg-forge-hover hover:text-forge-text-primary"
          >
            Workspace
          </Link>
          <Link
            to="/projects"
            className="rounded-md px-3 py-1.5 text-sm text-forge-text-secondary transition-colors hover:bg-forge-hover hover:text-forge-text-primary"
          >
            Projects
          </Link>
          <Link
            to="/templates"
            className="rounded-md px-3 py-1.5 text-sm text-forge-text-secondary transition-colors hover:bg-forge-hover hover:text-forge-text-primary"
          >
            Templates
          </Link>
          <Link
            to="/pricing"
            className="rounded-md px-3 py-1.5 text-sm text-forge-text-secondary transition-colors hover:bg-forge-hover hover:text-forge-text-primary"
          >
            Pricing
          </Link>
          <Link
            to="/help"
            aria-current="page"
            className="rounded-md px-3 py-1.5 text-sm font-medium text-forge-amber"
          >
            Documentation
          </Link>
        </nav>

        <div className="flex items-center gap-2">
          <Link
            to={isAuthenticated ? '/dashboard' : '/login'}
            className="hidden rounded-md px-3 py-1.5 text-sm text-forge-text-secondary transition-colors hover:bg-forge-hover hover:text-forge-text-primary sm:inline-flex"
          >
            {isAuthenticated ? 'Open workspace' : 'Sign in'}
          </Link>
          <Link
            to="/projects/new"
            className="inline-flex items-center rounded-md bg-forge-amber px-3 py-1.5 text-sm font-semibold text-forge-text-inverse whitespace-nowrap transition-colors hover:bg-forge-amber-dim"
          >
            Start building
          </Link>
        </div>
      </div>
    </header>
  );
}

/* ── Search box ── */

function SearchBox({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-4 top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center text-forge-text-muted">
        <Search className="h-4 w-4" />
      </span>
      <input
        ref={inputRef}
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search Forge help…"
        aria-label="Search Forge help"
        className="h-12 w-full rounded-lg border border-forge-border bg-forge-panel pl-11 pr-10 text-sm text-forge-text-primary placeholder:text-forge-text-muted focus:border-forge-amber focus:outline-none focus:ring-2 focus:ring-forge-amber/30"
      />
      {value && (
        <button
          type="button"
          onClick={() => {
            onChange('');
            inputRef.current?.focus();
          }}
          aria-label="Clear search"
          className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-forge-text-muted transition-colors hover:bg-forge-hover hover:text-forge-text-primary"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

/* ── Search results ── */

function SearchResults({ results, onClear }: { results: SearchResult[]; onClear: () => void }) {
  if (results.length === 0) {
    return (
      <div className="mt-6 rounded-lg border border-forge-border-subtle bg-forge-panel p-8 text-center">
        <p className="text-sm text-forge-text-secondary">No help articles match your search.</p>
        <button
          type="button"
          onClick={onClear}
          className="mt-3 inline-flex items-center gap-1.5 rounded-md border border-forge-border px-3 py-1.5 text-sm text-forge-text-secondary transition-colors hover:bg-forge-hover hover:text-forge-text-primary"
        >
          Clear search
        </button>
      </div>
    );
  }

  return (
    <ul className="mt-6 space-y-2">
      {results.map(({ article, excerpt }) => {
        const category = getCategoryById(article.category);
        return (
          <li key={article.slug}>
            <Link
              to={`/help?topic=${article.slug}`}
              className="block rounded-lg border border-forge-border-subtle bg-forge-panel p-4 transition-colors hover:border-forge-border"
            >
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-forge-text-primary">{article.title}</span>
                {category && (
                  <span className="rounded-full bg-forge-border/60 px-2 py-0.5 text-[11px] text-forge-text-muted">
                    {category.label}
                  </span>
                )}
              </div>
              <p className="mt-1.5 text-[13px] leading-relaxed text-forge-text-muted">{excerpt}</p>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

/* ── Category grid ── */

function CategoryGrid() {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {HELP_CATEGORIES.map((category) => {
        const firstArticle = getArticlesByCategory(category.id)[0];
        const target = firstArticle ? `/help?topic=${firstArticle.slug}` : '/help';
        return (
          <Link
            key={category.id}
            to={target}
            className="group flex flex-col rounded-lg border border-forge-border-subtle bg-forge-panel p-5 transition-colors hover:border-forge-border"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-md bg-forge-border/50 text-forge-amber">
              <CategoryIcon name={category.icon} className="h-[18px] w-[18px]" />
            </span>
            <span className="mt-3 text-sm font-semibold text-forge-text-primary group-hover:text-forge-amber">
              {category.label}
            </span>
            <span className="mt-1 text-[13px] leading-relaxed text-forge-text-muted">
              {category.description}
            </span>
          </Link>
        );
      })}
    </div>
  );
}

/* ── Start here ── */

function StartHere() {
  const articles = START_HERE_SLUGS.map(getArticleBySlug).filter(
    (a): a is NonNullable<typeof a> => Boolean(a),
  );
  return (
    <section className="mt-12">
      <div className="mb-4 flex items-center gap-2">
        <BookOpen className="h-4 w-4 text-forge-text-muted" />
        <h2 className="text-sm font-semibold uppercase tracking-wide text-forge-text-muted">Start here</h2>
      </div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {articles.map((article) => (
          <Link
            key={article.slug}
            to={`/help?topic=${article.slug}`}
            className="group flex items-center justify-between gap-3 rounded-lg border border-forge-border-subtle bg-forge-panel px-4 py-3 transition-colors hover:border-forge-border"
          >
            <span className="text-sm text-forge-text-secondary group-hover:text-forge-text-primary">
              {article.title}
            </span>
            <ArrowRight className="h-4 w-4 shrink-0 text-forge-text-muted transition-transform group-hover:translate-x-0.5 group-hover:text-forge-amber" />
          </Link>
        ))}
      </div>
    </section>
  );
}

/* ── Still stuck ── */

function StillStuck() {
  return (
    <section className="mt-14 rounded-lg border border-forge-border-subtle bg-forge-panel p-6">
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-md bg-forge-border/50 text-forge-amber">
          <LifeBuoy className="h-4 w-4" />
        </span>
        <div>
          <h2 className="text-sm font-semibold text-forge-text-primary">Still stuck?</h2>
          <p className="mt-1 text-[13px] leading-relaxed text-forge-text-muted">
            Review the troubleshooting guidance, or return to the relevant Forge settings or project area.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link
              to="/help?topic=ai-provider-not-configured"
              className="inline-flex items-center gap-1.5 rounded-md border border-forge-border px-3 py-1.5 text-[13px] text-forge-text-secondary transition-colors hover:bg-forge-hover hover:text-forge-text-primary"
            >
              Troubleshooting <ChevronRight className="h-3.5 w-3.5" />
            </Link>
            <Link
              to="/system/status"
              className="inline-flex items-center gap-1.5 rounded-md border border-forge-border px-3 py-1.5 text-[13px] text-forge-text-secondary transition-colors hover:bg-forge-hover hover:text-forge-text-primary"
            >
              System status
            </Link>
            <Link
              to="/settings/providers"
              className="inline-flex items-center gap-1.5 rounded-md border border-forge-border px-3 py-1.5 text-[13px] text-forge-text-secondary transition-colors hover:bg-forge-hover hover:text-forge-text-primary"
            >
              AI Providers
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ── Home view ── */

function HomeView({ query, setQuery }: { query: string; setQuery: (v: string) => void }) {
  const results = useMemo(() => searchArticles(query), [query]);
  const searching = query.trim().length > 0;

  return (
    <main className="mx-auto max-w-7xl px-4 pb-20 md:px-6">
      <div className="max-w-2xl pt-14 md:pt-20">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-forge-amber">
          Help &amp; Documentation
        </p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight text-forge-text-primary md:text-4xl">
          How can we help?
        </h1>
        <p className="mt-3 text-[15px] leading-relaxed text-forge-text-muted">
          Find setup guidance, product documentation and troubleshooting information for Forge.
        </p>
      </div>

      <div className="mt-8 max-w-2xl">
        <SearchBox value={query} onChange={setQuery} />
      </div>

      {searching ? (
        <div className="mt-2">
          <SearchResults results={results} onClear={() => setQuery('')} />
        </div>
      ) : (
        <>
          <StartHere />
          <section className="mt-12">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-forge-text-muted">
              Browse by topic
            </h2>
            <CategoryGrid />
          </section>
          <StillStuck />
        </>
      )}
    </main>
  );
}

/* ── Article view ── */

function ArticleView({ slug }: { slug: string }) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const article = getArticleBySlug(slug);
  const category = article ? getCategoryById(article.category) : undefined;
  const related = useMemo(
    () => (article ? article.related.map(getArticleBySlug).filter((a): a is NonNullable<typeof a> => Boolean(a)) : []),
    [article],
  );

  // Close the mobile drawer when the slug changes
  useEffect(() => {
    setDrawerOpen(false);
  }, [slug]);

  if (!article) {
    return (
      <main className="mx-auto max-w-7xl px-4 pb-20 md:px-6">
        <div className="mt-16 max-w-lg">
          <h1 className="text-2xl font-bold text-forge-text-primary">Article not found</h1>
          <p className="mt-2 text-sm text-forge-text-muted">
            We could not find that help article. It may have moved or the link is incorrect.
          </p>
          <Link
            to="/help"
            className="mt-4 inline-flex items-center gap-1.5 rounded-md bg-forge-amber px-3 py-1.5 text-sm font-semibold text-forge-text-inverse transition-colors hover:bg-forge-amber-dim"
          >
            Back to help centre
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-7xl px-4 pb-20 md:px-6">
      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="mt-6 flex items-center gap-1.5 text-[13px] text-forge-text-muted">
        <Link to="/help" className="transition-colors hover:text-forge-text-primary">
          Help
        </Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span>{category ? category.label : 'Documentation'}</span>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="text-forge-text-secondary">{article.title}</span>
      </nav>

      <div className="mt-6 flex flex-col gap-8 lg:flex-row">
        {/* Mobile topic selector */}
        <div className="lg:hidden">
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            className="inline-flex items-center gap-2 rounded-md border border-forge-border px-3 py-2 text-sm text-forge-text-secondary transition-colors hover:bg-forge-hover"
            aria-expanded={drawerOpen}
            aria-controls="help-mobile-drawer"
          >
            <Menu className="h-4 w-4" />
            Browse topics
          </button>
        </div>

        {/* Sidebar (desktop) */}
        <aside className="hidden w-60 shrink-0 lg:block">
          <div className="sticky top-20 max-h-[calc(100vh-6rem)] overflow-y-auto pr-4">
            <HelpSidebar activeSlug={slug} />
          </div>
        </aside>

        {/* Article */}
        <article className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold tracking-tight text-forge-text-primary md:text-3xl">
            {article.title}
          </h1>
          {category && (
            <p className="mt-2 text-[13px] text-forge-text-muted">{category.label}</p>
          )}
          <div className="mt-6 border-t border-forge-border-subtle pt-6">
            <ArticleBody article={article} />
          </div>

          {related.length > 0 && (
            <section className="mt-10 border-t border-forge-border-subtle pt-6">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-forge-text-muted">
                Related articles
              </h2>
              <ul className="mt-3 space-y-1">
                {related.map((rel) => (
                  <li key={rel.slug}>
                    <Link
                      to={`/help?topic=${rel.slug}`}
                      className="inline-flex items-center gap-1.5 text-sm text-forge-text-secondary transition-colors hover:text-forge-amber"
                    >
                      {rel.title}
                      <ArrowRight className="h-3.5 w-3.5 text-forge-text-muted" />
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <StillStuck />
        </article>
      </div>

      {/* Mobile drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setDrawerOpen(false)} aria-hidden="true" />
          <div
            id="help-mobile-drawer"
            role="dialog"
            aria-modal="true"
            aria-label="Help topics"
            className="absolute left-0 top-0 bottom-0 w-[300px] max-w-[85vw] overflow-y-auto border-r border-forge-border-subtle bg-forge-bg p-5"
          >
            <div className="mb-4 flex items-center justify-between">
              <span className="text-sm font-semibold text-forge-text-primary">Browse topics</span>
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                aria-label="Close topics"
                className="flex h-8 w-8 items-center justify-center rounded-md text-forge-text-muted transition-colors hover:bg-forge-hover hover:text-forge-text-primary"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <HelpSidebar activeSlug={slug} />
          </div>
        </div>
      )}
    </main>
  );
}

/* ── Page ── */

export default function HelpPage() {
  const [searchParams] = useSearchParams();
  const [query, setQuery] = useState('');
  const topic = searchParams.get('topic');

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [topic]);

  return (
    <div className="min-h-screen bg-forge-bg">
      <HeaderBar />
      {topic ? (
        <ArticleView slug={topic} />
      ) : (
        <HomeView query={query} setQuery={setQuery} />
      )}
    </div>
  );
}