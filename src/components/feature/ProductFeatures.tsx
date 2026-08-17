import { useState, type ReactNode } from 'react';
import {
  Activity,
  Bot,
  Box,
  Check,
  Circle,
  Cpu,
  FileText,
  Folder,
  FolderOpen,
  Layers,
  ListChecks,
  Monitor,
  MonitorPlay,
  Smartphone,
  Tablet,
  type LucideIcon,
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/* Content config                                                      */
/* ------------------------------------------------------------------ */

type SmallFeature = { icon: LucideIcon; title: string; text: string };

const SMALL_FEATURES: SmallFeature[] = [
  {
    icon: ListChecks,
    title: 'AI Task Planning',
    text: 'Turn complex ideas into structured build tasks with visible progress and activity.',
  },
  {
    icon: Cpu,
    title: 'Multiple AI Providers',
    text: 'Configure different AI providers and models to suit different development workflows.',
  },
  {
    icon: Activity,
    title: 'Build Activity',
    text: 'Keep build events, agent actions and project activity visible while you work.',
  },
  {
    icon: Smartphone,
    title: 'Responsive Preview',
    text: 'Check desktop, tablet and mobile layouts before your project leaves Forge.',
  },
  {
    icon: Box,
    title: 'Project Components',
    text: 'Organise reusable interface components instead of rebuilding the same elements repeatedly.',
  },
  {
    icon: FolderOpen,
    title: 'Assets & Files',
    text: 'Keep project files and visual assets accessible from the same development workspace.',
  },
];

const PROJECT_TREE = [
  { label: 'Pages', children: ['Home', 'About', 'Pricing', 'Contact'] },
  { label: 'Components', children: ['Navbar', 'Hero', 'Footer'] },
  { label: 'Assets', children: ['Images'] },
];

const AGENT_STEPS = [
  { label: 'Analyse project', status: 'done' },
  { label: 'Plan changes', status: 'done' },
  { label: 'Build interface', status: 'active' },
  { label: 'Connect data', status: 'pending' },
] as const;

type ViewportKey = 'desktop' | 'tablet' | 'mobile';

const VIEWPORTS: { key: ViewportKey; label: string; icon: LucideIcon }[] = [
  { key: 'desktop', label: 'Desktop', icon: Monitor },
  { key: 'tablet', label: 'Tablet', icon: Tablet },
  { key: 'mobile', label: 'Mobile', icon: Smartphone },
];

const VIEWPORT_WIDTHS: Record<ViewportKey, string> = {
  desktop: '100%',
  tablet: '66%',
  mobile: '42%',
};

/* ------------------------------------------------------------------ */
/* Building blocks                                                     */
/* ------------------------------------------------------------------ */

function FeatureCard({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`group relative flex flex-col overflow-hidden rounded-lg border border-forge-border-subtle bg-forge-panel transition-all duration-300 hover:border-forge-amber/25 hover:-translate-y-0.5 ${className}`}
    >
      {/* Subtle inner top highlight */}
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_60%_at_50%_0%,rgba(255,255,255,0.04),transparent_60%)]"
        aria-hidden="true"
      />
      {/* Faint amber illumination on hover */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-forge-amber/5 opacity-0 blur-2xl transition-opacity duration-500 group-hover:opacity-100"
        aria-hidden="true"
      />
      <div className="relative flex flex-1 flex-col p-5 md:p-6">{children}</div>
    </div>
  );
}

function IconBadge({ icon: Icon }: { icon: LucideIcon }) {
  return (
    <span className="flex items-center justify-center w-10 h-10 rounded-md bg-forge-amber/10 text-forge-amber mb-4">
      <Icon className="h-5 w-5" aria-hidden="true" />
    </span>
  );
}

function SkeletonSite() {
  return (
    <div className="flex flex-col h-full min-h-[180px]">
      {/* Mini navbar */}
      <div className="h-6 border-b border-forge-border-subtle bg-forge-panel flex items-center gap-1.5 px-2">
        <span className="w-1.5 h-1.5 rounded-full bg-forge-amber/70" aria-hidden="true" />
        <span className="h-1.5 w-10 rounded-full bg-white/10" aria-hidden="true" />
      </div>
      {/* Mini page content */}
      <div className="flex-1 p-3 space-y-2">
        <div className="h-9 rounded-sm bg-gradient-to-r from-forge-amber/20 to-forge-amber/5" />
        <div className="h-1.5 w-3/4 rounded-full bg-white/10" />
        <div className="h-1.5 w-1/2 rounded-full bg-white/5" />
        <div className="grid grid-cols-3 gap-1.5 pt-1">
          <div className="h-12 rounded-sm bg-white/5" />
          <div className="h-12 rounded-sm bg-white/5" />
          <div className="h-12 rounded-sm bg-white/5" />
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Large cards                                                         */
/* ------------------------------------------------------------------ */

function AgentCard() {
  return (
    <FeatureCard className="lg:col-span-7">
      <IconBadge icon={Bot} />
      <h3 className="text-lg md:text-xl font-semibold text-forge-text-primary">
        Build with an AI that understands your project
      </h3>
      <p className="mt-2 text-sm text-forge-text-secondary leading-relaxed">
        Describe what you want to create or change. The Master Agent keeps project context,
        helps organise the work and guides the build from idea through refinement.
      </p>

      {/* Mock agent panel */}
      <div className="mt-5 rounded-lg border border-forge-border-subtle bg-forge-bg p-4">
        <div className="flex items-center justify-between pb-3 border-b border-forge-border-subtle">
          <span className="font-mono text-xs tracking-widest text-forge-text-primary">
            MASTER AGENT
          </span>
          <span className="inline-flex items-center gap-1.5 text-xs text-forge-text-muted">
            <span className="w-1.5 h-1.5 rounded-full bg-forge-success" aria-hidden="true" />
            Context: Online
          </span>
        </div>

        <div className="mt-3 flex justify-end">
          <div className="max-w-[85%] rounded-md border border-forge-border-subtle bg-forge-panel-elevated px-3 py-2 text-sm text-forge-text-primary">
            &ldquo;Add a customer dashboard with subscriptions.&rdquo;
          </div>
        </div>
        <div className="mt-2 flex justify-start">
          <div className="max-w-[85%] rounded-md border border-forge-amber/20 bg-forge-amber/10 px-3 py-2 text-sm text-forge-text-primary">
            I&rsquo;ve created a plan with 6 implementation tasks.
          </div>
        </div>

        <ul className="mt-3 space-y-1.5">
          {AGENT_STEPS.map((step) => (
            <li key={step.label} className="flex items-center gap-2 text-sm">
              {step.status === 'done' && (
                <Check className="h-3.5 w-3.5 text-forge-success" aria-hidden="true" />
              )}
              {step.status === 'active' && (
                <span className="w-3.5 h-3.5 flex items-center justify-center">
                  <span className="w-2 h-2 rounded-full bg-forge-amber animate-forge-pulse" />
                </span>
              )}
              {step.status === 'pending' && (
                <Circle className="h-3.5 w-3.5 text-forge-text-muted" aria-hidden="true" />
              )}
              <span
                className={
                  step.status === 'pending'
                    ? 'text-forge-text-muted'
                    : step.status === 'done'
                      ? 'text-forge-text-secondary'
                      : 'text-forge-text-primary'
                }
              >
                {step.label}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </FeatureCard>
  );
}

function PreviewCard() {
  const [viewport, setViewport] = useState<ViewportKey>('desktop');

  return (
    <FeatureCard className="lg:col-span-5">
      <IconBadge icon={MonitorPlay} />
      <h3 className="text-lg md:text-xl font-semibold text-forge-text-primary">
        See the build as it happens
      </h3>
      <p className="mt-2 text-sm text-forge-text-secondary leading-relaxed">
        Preview your project while you work and review layouts across desktop, tablet and mobile
        without leaving the Forge workspace.
      </p>

      {/* Mini browser preview */}
      <div className="mt-5 flex flex-1 flex-col rounded-lg border border-forge-border-subtle bg-forge-bg overflow-hidden">
        {/* Chrome */}
        <div className="flex items-center gap-1.5 px-3 py-2 border-b border-forge-border-subtle">
          <span className="w-2.5 h-2.5 rounded-full bg-white/15" aria-hidden="true" />
          <span className="w-2.5 h-2.5 rounded-full bg-white/15" aria-hidden="true" />
          <span className="w-2.5 h-2.5 rounded-full bg-white/15" aria-hidden="true" />
          <div className="ml-2 flex-1 h-5 rounded bg-white/5 flex items-center px-2 font-mono text-[10px] text-forge-text-muted">
            yourproject.local
          </div>
        </div>

        {/* Viewport switcher */}
        <div className="flex items-center gap-1 px-3 py-2 border-b border-forge-border-subtle">
          {VIEWPORTS.map((v) => {
            const Icon = v.icon;
            const active = viewport === v.key;
            return (
              <button
                key={v.key}
                type="button"
                onClick={() => setViewport(v.key)}
                aria-pressed={active}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium whitespace-nowrap transition-colors cursor-pointer ${
                  active
                    ? 'bg-forge-amber/15 text-forge-amber'
                    : 'text-forge-text-muted hover:text-forge-text-primary'
                }`}
              >
                <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                {v.label}
              </button>
            );
          })}
        </div>

        {/* Preview canvas */}
        <div className="flex-1 flex justify-center p-4">
          <div
            className="h-full rounded-sm border border-forge-border-subtle bg-forge-bg transition-all duration-500 ease-out overflow-hidden"
            style={{ width: VIEWPORT_WIDTHS[viewport] }}
          >
            <SkeletonSite />
          </div>
        </div>
      </div>
    </FeatureCard>
  );
}

function ProjectTreeCard() {
  return (
    <FeatureCard className="lg:col-span-12">
      <div className="flex flex-col lg:flex-row lg:items-start gap-6">
        {/* Copy */}
        <div className="lg:max-w-sm">
          <IconBadge icon={Layers} />
          <h3 className="text-lg md:text-xl font-semibold text-forge-text-primary">
            Your whole project, organised
          </h3>
          <p className="mt-2 text-sm text-forge-text-secondary leading-relaxed">
            Work with pages, components, assets, project structure and development tools from one
            unified workspace.
          </p>
        </div>

        {/* Project tree */}
        <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-4 w-full">
          {PROJECT_TREE.map((group) => (
            <div
              key={group.label}
              className="rounded-md border border-forge-border-subtle bg-forge-bg p-3.5 font-mono text-sm"
            >
              <div className="flex items-center gap-2 text-forge-text-primary">
                <Folder className="h-4 w-4 text-forge-amber" aria-hidden="true" />
                <span className="font-medium">{group.label}</span>
              </div>
              <ul className="mt-2 space-y-1 text-forge-text-muted">
                {group.children.map((child, index) => {
                  const isLast = index === group.children.length - 1;
                  return (
                    <li key={child} className="flex items-center gap-1.5">
                      <span className="text-forge-text-muted/60">{isLast ? '└' : '├'}</span>
                      <FileText className="h-3.5 w-3.5 text-forge-text-muted/60" aria-hidden="true" />
                      <span>{child}</span>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </FeatureCard>
  );
}

/* ------------------------------------------------------------------ */
/* Section                                                             */
/* ------------------------------------------------------------------ */

export function ProductFeatures() {
  return (
    <section id="features" className="relative py-20 md:py-28 bg-forge-bg scroll-mt-16">
      <div className="max-w-[1200px] mx-auto px-5 md:px-6 animate-hero-fade-in">
        {/* Header */}
        <div className="text-center mb-12 md:mb-16">
          <span className="inline-block text-xs font-semibold uppercase tracking-[0.2em] text-forge-amber mb-4">
            Built for the whole build
          </span>
          <h2 className="text-2xl md:text-4xl font-bold text-forge-text-primary tracking-tight">
            Everything you need to build
          </h2>
          <p className="mt-4 text-forge-text-secondary max-w-2xl mx-auto text-sm md:text-base leading-relaxed">
            From first idea to production-ready application, Forge brings AI, visual development,
            project planning and source-code control into one powerful workspace.
          </p>
        </div>

        {/* Large asymmetric cards */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <AgentCard />
          <PreviewCard />
          <ProjectTreeCard />
        </div>

        {/* Smaller feature cards */}
        <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {SMALL_FEATURES.map((feature) => {
            const Icon = feature.icon;
            return (
              <FeatureCard key={feature.title}>
                <IconBadge icon={Icon} />
                <h3 className="text-base font-semibold text-forge-text-primary">{feature.title}</h3>
                <p className="mt-1.5 text-sm text-forge-text-secondary leading-relaxed">
                  {feature.text}
                </p>
              </FeatureCard>
            );
          })}
        </div>
      </div>
    </section>
  );
}