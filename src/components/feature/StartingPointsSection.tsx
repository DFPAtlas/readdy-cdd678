import { Link } from 'react-router-dom';
import {
  ArrowRight,
  ArrowDown,
  ArrowUpRight,
  FolderGit2,
  LayoutTemplate,
  Lightbulb,
  Search,
  Sparkles,
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/* Content config                                                      */
/* ------------------------------------------------------------------ */

const SHOWCASE_STARTING_POINTS: {
  name: string;
  label: string;
  tags: string[];
  preview: React.ReactNode;
}[] = [
  {
    name: 'SaaS Starter',
    label: 'Dashboard',
    tags: ['Dashboard', 'Accounts', 'Billing'],
    preview: <SaaSPreview />,
  },
  {
    name: 'Business Pro',
    label: 'Business',
    tags: ['Business', 'Services', 'Lead Gen'],
    preview: <BusinessPreview />,
  },
  {
    name: 'Client Portal',
    label: 'Portal',
    tags: ['Portal', 'Projects', 'Documents'],
    preview: <PortalPreview />,
  },
  {
    name: 'Marketplace',
    label: 'Marketplace',
    tags: ['Listings', 'Search', 'Profiles'],
    preview: <MarketplacePreview />,
  },
  {
    name: 'Admin Console',
    label: 'Admin',
    tags: ['Admin', 'Data', 'Operations'],
    preview: <AdminPreview />,
  },
  {
    name: 'Blank Project',
    label: 'Blank',
    tags: ['Flexible', 'Custom', 'Start Fresh'],
    preview: <BlankPreview />,
  },
];

/* ------------------------------------------------------------------ */
/* Miniature previews (illustrative only)                              */
/* ------------------------------------------------------------------ */

function SaaSPreview() {
  const bars = [35, 60, 45, 80, 55, 90, 70];
  return (
    <div className="flex h-full">
      <div className="hidden sm:flex flex-col w-9 shrink-0 border-r border-forge-border-subtle bg-forge-panel p-1.5 gap-1" aria-hidden="true">
        <div className="w-full h-3.5 rounded-sm bg-forge-amber/25" />
        <div className="w-full h-1 rounded-sm bg-forge-border/40" />
        <div className="w-full h-1 rounded-sm bg-forge-border/40" />
        <div className="w-full h-1 rounded-sm bg-forge-border/40" />
        <div className="w-full h-1 rounded-sm bg-forge-border/40" />
      </div>
      <div className="flex-1 p-2 space-y-1.5">
        <div className="grid grid-cols-3 gap-1.5">
          <div className="rounded-sm bg-forge-panel border border-forge-border-subtle p-1">
            <div className="h-1 w-6 rounded bg-forge-border/50 mb-1" />
            <div className="h-1.5 w-8 rounded bg-forge-amber/70" />
          </div>
          <div className="rounded-sm bg-forge-panel border border-forge-border-subtle p-1">
            <div className="h-1 w-6 rounded bg-forge-border/50 mb-1" />
            <div className="h-1.5 w-8 rounded bg-forge-amber/70" />
          </div>
          <div className="rounded-sm bg-forge-panel border border-forge-border-subtle p-1">
            <div className="h-1 w-6 rounded bg-forge-border/50 mb-1" />
            <div className="h-1.5 w-8 rounded bg-forge-amber/70" />
          </div>
        </div>
        <div className="flex items-end gap-0.5 h-10 rounded-sm bg-forge-panel border border-forge-border-subtle p-1" aria-hidden="true">
          {bars.map((h, i) => (
            <div key={i} className="flex-1 rounded-sm bg-forge-amber/50" style={{ height: `${h}%` }} />
          ))}
        </div>
      </div>
    </div>
  );
}

function BusinessPreview() {
  return (
    <div className="flex flex-col h-full p-2 gap-1.5">
      <div className="h-6 rounded-sm bg-forge-amber/15 border border-forge-amber/20 flex items-center justify-center">
        <div className="h-1.5 w-14 rounded bg-forge-amber/60" />
      </div>
      <div className="grid grid-cols-3 gap-1.5">
        <div className="h-7 rounded-sm bg-forge-panel border border-forge-border-subtle" />
        <div className="h-7 rounded-sm bg-forge-panel border border-forge-border-subtle" />
        <div className="h-7 rounded-sm bg-forge-panel border border-forge-border-subtle" />
      </div>
      <div className="mt-auto h-4 rounded-sm bg-forge-amber/70 flex items-center justify-center">
        <div className="h-1 w-10 rounded bg-forge-text-inverse/70" />
      </div>
    </div>
  );
}

function PortalPreview() {
  const items = ['Overview', 'Projects', 'Documents'];
  return (
    <div className="flex h-full">
      <div className="flex flex-col w-14 shrink-0 border-r border-forge-border-subtle bg-forge-panel p-1.5 gap-1" aria-hidden="true">
        {items.map((item, i) => (
          <div
            key={item}
            className={`px-1.5 py-0.5 rounded-sm text-[8px] leading-tight ${
              i === 0 ? 'bg-forge-amber/15 text-forge-amber' : 'text-forge-text-muted'
            }`}
          >
            {item}
          </div>
        ))}
      </div>
      <div className="flex-1 p-2 space-y-1.5">
        <div className="flex items-center gap-1.5">
          <div className="h-1.5 w-1.5 rounded-full bg-forge-success" />
          <div className="h-1 w-12 rounded bg-forge-border/50" />
        </div>
        <div className="h-6 rounded-sm bg-forge-panel border border-forge-border-subtle" />
        <div className="h-6 rounded-sm bg-forge-panel border border-forge-border-subtle" />
        <div className="h-6 rounded-sm bg-forge-panel border border-forge-amber/25" />
      </div>
    </div>
  );
}

function MarketplacePreview() {
  return (
    <div className="flex flex-col h-full p-2 gap-1.5">
      <div className="flex items-center gap-1 rounded-sm bg-forge-panel border border-forge-border-subtle px-1.5 py-1">
        <Search className="h-2.5 w-2.5 text-forge-text-muted" aria-hidden="true" />
        <div className="h-1 w-12 rounded bg-forge-border/50" />
      </div>
      <div className="grid grid-cols-2 gap-1.5 flex-1">
        <div className="rounded-sm bg-forge-panel border border-forge-border-subtle p-1">
          <div className="h-6 rounded-sm bg-forge-border/20 mb-1" />
          <div className="h-1 w-8 rounded bg-forge-border/50 mb-0.5" />
          <div className="h-1 w-6 rounded bg-forge-amber/70" />
        </div>
        <div className="rounded-sm bg-forge-panel border border-forge-border-subtle p-1">
          <div className="h-6 rounded-sm bg-forge-border/20 mb-1" />
          <div className="h-1 w-8 rounded bg-forge-border/50 mb-0.5" />
          <div className="h-1 w-6 rounded bg-forge-amber/70" />
        </div>
        <div className="rounded-sm bg-forge-panel border border-forge-border-subtle p-1">
          <div className="h-6 rounded-sm bg-forge-border/20 mb-1" />
          <div className="h-1 w-8 rounded bg-forge-border/50 mb-0.5" />
          <div className="h-1 w-6 rounded bg-forge-amber/70" />
        </div>
        <div className="rounded-sm bg-forge-panel border border-forge-border-subtle p-1">
          <div className="h-6 rounded-sm bg-forge-border/20 mb-1" />
          <div className="h-1 w-8 rounded bg-forge-border/50 mb-0.5" />
          <div className="h-1 w-6 rounded bg-forge-amber/70" />
        </div>
      </div>
    </div>
  );
}

function AdminPreview() {
  const rows = [true, false, true, false];
  return (
    <div className="flex h-full">
      <div className="hidden sm:flex flex-col w-9 shrink-0 border-r border-forge-border-subtle bg-forge-panel p-1.5 gap-1" aria-hidden="true">
        <div className="w-full h-1 rounded-sm bg-forge-border/40" />
        <div className="w-full h-1 rounded-sm bg-forge-border/40" />
        <div className="w-full h-1 rounded-sm bg-forge-border/40" />
        <div className="w-full h-1 rounded-sm bg-forge-border/40" />
      </div>
      <div className="flex-1 p-2 space-y-1">
        <div className="grid grid-cols-3 gap-1 border-b border-forge-border-subtle pb-1" aria-hidden="true">
          <div className="h-1 w-6 rounded bg-forge-border/50" />
          <div className="h-1 w-6 rounded bg-forge-border/50" />
          <div className="h-1 w-6 rounded bg-forge-border/50" />
        </div>
        {rows.map((ok, i) => (
          <div key={i} className="grid grid-cols-3 gap-1 items-center">
            <div className="h-1 w-10 rounded bg-forge-border/50" />
            <div className={`h-1.5 w-8 rounded ${ok ? 'bg-forge-success/60' : 'bg-forge-warning/60'}`} />
            <div className="h-1 w-6 rounded bg-forge-border/50" />
          </div>
        ))}
      </div>
    </div>
  );
}

function BlankPreview() {
  return (
    <div className="flex flex-col h-full p-2">
      <div className="flex-1 rounded-sm border border-dashed border-forge-border flex items-center justify-center">
        <Sparkles className="h-4 w-4 text-forge-amber/40" aria-hidden="true" />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Miniature browser frame                                             */
/* ------------------------------------------------------------------ */

function BrowserFrame({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    <div className="rounded-md border border-forge-border-subtle bg-forge-bg overflow-hidden">
      <div className="flex items-center gap-1.5 px-2 py-1.5 border-b border-forge-border-subtle bg-forge-panel" aria-hidden="true">
        <span className="w-2 h-2 rounded-full bg-forge-border/60" />
        <span className="w-2 h-2 rounded-full bg-forge-border/60" />
        <span className="w-2 h-2 rounded-full bg-forge-border/60" />
        <span className="ml-2 text-[9px] uppercase tracking-wider text-forge-text-muted">{label}</span>
      </div>
      <div className="h-28">{children}</div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Starting method cards                                               */
/* ------------------------------------------------------------------ */

function IdeaCard() {
  const planItems = ['Pages', 'Features', 'Tasks', 'Components'];
  return (
    <div className="group relative flex flex-col rounded-lg border border-forge-border-subtle bg-forge-panel p-5 md:p-6 transition-all duration-300 hover:-translate-y-0.5 hover:border-forge-amber/30">
      <div className="flex items-center justify-between mb-4">
        <span className="flex items-center justify-center w-9 h-9 rounded-md bg-forge-amber/10 text-forge-amber transition-colors group-hover:bg-forge-amber/20">
          <Lightbulb className="h-5 w-5" aria-hidden="true" />
        </span>
        <span className="px-2.5 py-1 rounded-full border border-forge-amber/25 bg-forge-amber/8 text-[11px] font-medium text-forge-amber">
          Most flexible
        </span>
      </div>
      <h3 className="text-base md:text-lg font-semibold text-forge-text-primary">
        Start from an idea
      </h3>
      <p className="mt-1 text-[11px] font-medium uppercase tracking-wider text-forge-amber/80">
        Describe what you want to build
      </p>
      <p className="mt-3 text-sm text-forge-text-secondary leading-relaxed">
        Start with the goal, audience and features. Forge can help turn that direction into an
        organised project plan.
      </p>

      {/* Visual: idea → plan */}
      <div className="mt-auto pt-5">
        <div className="rounded-md border border-forge-border-subtle bg-forge-bg p-3">
          <div className="text-[9px] uppercase tracking-widest text-forge-text-muted mb-1.5">Idea</div>
          <div className="rounded-sm bg-forge-panel border border-forge-border-subtle px-2.5 py-2 text-[11px] text-forge-text-primary">
            &ldquo;Build a client portal for a small construction company.&rdquo;
          </div>
          <div className="flex justify-center py-1.5 text-forge-amber/70" aria-hidden="true">
            <ArrowDown className="h-3.5 w-3.5" />
          </div>
          <div className="text-[9px] uppercase tracking-widest text-forge-text-muted mb-1.5">Project Plan</div>
          <div className="flex flex-wrap gap-1.5">
            {planItems.map((item) => (
              <span
                key={item}
                className="px-2 py-1 rounded-sm border border-forge-border-subtle bg-forge-panel text-[10px] text-forge-text-secondary"
              >
                {item}
              </span>
            ))}
          </div>
        </div>
        <div
          className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-forge-amber"
          aria-hidden="true"
        >
          Start from idea
        </div>
      </div>
    </div>
  );
}

function TemplateCard() {
  const thumbs = [
    { label: 'SaaS', tag: 'SaaS Dashboard' },
    { label: 'Business', tag: 'Business Website' },
    { label: 'Portal', tag: 'Client Portal' },
  ];
  return (
    <div className="group relative flex flex-col rounded-lg border border-forge-border-subtle bg-forge-panel p-5 md:p-6 transition-all duration-300 hover:-translate-y-0.5 hover:border-forge-amber/30">
      <div className="flex items-center justify-between mb-4">
        <span className="flex items-center justify-center w-9 h-9 rounded-md bg-forge-amber/10 text-forge-amber transition-colors group-hover:bg-forge-amber/20">
          <LayoutTemplate className="h-5 w-5" aria-hidden="true" />
        </span>
      </div>
      <h3 className="text-base md:text-lg font-semibold text-forge-text-primary">
        Start from a template
      </h3>
      <p className="mt-1 text-[11px] font-medium uppercase tracking-wider text-forge-amber/80">
        Skip the empty screen
      </p>
      <p className="mt-3 text-sm text-forge-text-secondary leading-relaxed">
        Use a structured starting point when you already know the type of experience you want to
        create.
      </p>

      {/* Visual: template thumbnails */}
      <div className="mt-auto pt-5">
        <div className="grid grid-cols-3 gap-2">
          {thumbs.map((t) => (
            <div key={t.label} className="flex flex-col gap-1.5">
              <div className="h-16 rounded-md border border-forge-border-subtle bg-forge-bg overflow-hidden">
                <div className="flex h-full flex-col p-1.5 gap-1" aria-hidden="true">
                  <div className="h-1.5 w-8 rounded bg-forge-amber/50" />
                  <div className="h-1 w-full rounded bg-forge-border/40" />
                  <div className="h-1 w-3/4 rounded bg-forge-border/40" />
                  <div className="mt-auto h-2.5 w-10 rounded bg-forge-amber/60" />
                </div>
              </div>
              <span className="text-center text-[9px] uppercase tracking-wider text-forge-text-muted">
                {t.label}
              </span>
            </div>
          ))}
        </div>
        <Link
          to="/templates"
          className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-forge-amber hover:text-forge-amber-dim transition-colors cursor-pointer"
        >
          View templates
          <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
        </Link>
      </div>
    </div>
  );
}

function StructureCard() {
  const tree: [number, string][] = [
    [0, 'src'],
    [1, 'components'],
    [1, 'pages'],
    [1, 'assets'],
    [1, 'config'],
  ];
  return (
    <div className="group relative flex flex-col rounded-lg border border-forge-border-subtle bg-forge-panel p-5 md:p-6 transition-all duration-300 hover:-translate-y-0.5 hover:border-forge-amber/30">
      <div className="flex items-center justify-between mb-4">
        <span className="flex items-center justify-center w-9 h-9 rounded-md bg-forge-amber/10 text-forge-amber transition-colors group-hover:bg-forge-amber/20">
          <FolderGit2 className="h-5 w-5" aria-hidden="true" />
        </span>
      </div>
      <h3 className="text-base md:text-lg font-semibold text-forge-text-primary">
        Start with your structure
      </h3>
      <p className="mt-1 text-[11px] font-medium uppercase tracking-wider text-forge-amber/80">
        Build around the way your project works
      </p>
      <p className="mt-3 text-sm text-forge-text-secondary leading-relaxed">
        Organise pages, components, files and project structure inside Forge while keeping the
        development workflow visible.
      </p>

      {/* Visual: file tree */}
      <div className="mt-auto pt-5">
        <div className="rounded-md border border-forge-border-subtle bg-forge-bg p-3 font-mono">
          <div className="text-[9px] uppercase tracking-widest text-forge-text-muted mb-2">Project</div>
          <div className="space-y-1">
            {tree.map(([depth, name]) => (
              <div
                key={name}
                className="flex items-center gap-1.5 text-[11px] text-forge-text-secondary"
                style={{ paddingLeft: `${depth * 14}px` }}
              >
                <FolderGit2 className="h-3 w-3 text-forge-amber/60" aria-hidden="true" />
                <span className="font-mono">{name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Section                                                             */
/* ------------------------------------------------------------------ */

export function StartingPointsSection() {
  return (
    <section id="start-your-way" className="relative py-20 md:py-28 bg-forge-bg scroll-mt-16">
      <div className="max-w-6xl mx-auto px-5 md:px-6">
        {/* Header */}
        <div className="max-w-3xl mx-auto text-center mb-14 md:mb-20">
          <span className="inline-block text-xs font-semibold uppercase tracking-[0.2em] text-forge-amber mb-4">
            Start Your Way
          </span>
          <h2 className="text-2xl md:text-4xl font-bold text-forge-text-primary tracking-tight">
            Blank canvas or head start. You choose.
          </h2>
          <p className="mt-4 text-forge-text-secondary text-sm md:text-base leading-relaxed">
            Forge is designed to work around the project, not force the project into one rigid
            starting point. Begin from scratch, use a structured starting point, or adapt an
            existing direction.
          </p>
        </div>

        {/* Three starting method cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <IdeaCard />
          <TemplateCard />
          <StructureCard />
        </div>

        {/* Template showcase strip */}
        <div className="mt-16 md:mt-20">
          <div className="text-center mb-4">
            <span className="text-[11px] font-semibold uppercase tracking-widest text-forge-text-muted">
              Popular Starting Points
            </span>
            <p className="mt-2 text-xs text-forge-text-muted">
              Illustrative starting point concepts — pick one that fits, then shape it to your project.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {SHOWCASE_STARTING_POINTS.map((point) => (
              <div
                key={point.name}
                className="group flex flex-col rounded-lg border border-forge-border-subtle bg-forge-panel p-3.5 transition-all duration-300 hover:-translate-y-0.5 hover:border-forge-amber/30"
              >
                <BrowserFrame label={point.label}>{point.preview}</BrowserFrame>
                <div className="mt-3 flex items-center justify-between gap-2">
                  <h4 className="text-sm font-semibold text-forge-text-primary">{point.name}</h4>
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {point.tags.map((tag) => (
                    <span
                      key={tag}
                      className="px-2 py-0.5 rounded-full border border-forge-border-subtle bg-forge-bg text-[10px] text-forge-text-muted"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="mt-14 md:mt-16 text-center">
          <h3 className="text-xl md:text-2xl font-bold text-forge-text-primary">
            Start with momentum.
          </h3>
          <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              to="/projects/new"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-md bg-forge-amber text-forge-text-inverse font-medium text-sm hover:bg-forge-amber-dim transition-colors whitespace-nowrap cursor-pointer"
            >
              Create a project
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <Link
              to="/templates"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-md border border-forge-border-subtle text-forge-text-primary font-medium text-sm hover:border-forge-amber/25 hover:text-white transition-colors whitespace-nowrap cursor-pointer"
            >
              Browse templates
            </Link>
          </div>
          <p className="mt-5 text-sm text-forge-amber/80 font-medium">
            Every Forge project can grow beyond its starting point.
          </p>
        </div>
      </div>
    </section>
  );
}