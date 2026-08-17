import {
  BarChart3,
  Building2,
  Cpu,
  Download,
  FileCode2,
  FolderTree,
  GitBranch,
  ListChecks,
  MonitorPlay,
  Quote,
  UserCheck,
  type LucideIcon,
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/* Content config                                                      */
/* ------------------------------------------------------------------ */

type TrustStatement = { icon: LucideIcon; title: string; text: string };

const TRUST_STATEMENTS: TrustStatement[] = [
  {
    icon: FolderTree,
    title: 'Your Project Structure',
    text: 'Pages, components, files and assets remain visible within the Forge workspace.',
  },
  {
    icon: ListChecks,
    title: 'Visible AI Workflow',
    text: 'Planning, tasks and activity are surfaced instead of reducing the entire build to one unexplained result.',
  },
  {
    icon: FileCode2,
    title: 'Source-Code Ownership',
    text: 'Forge is designed around projects that can leave the platform as usable source code.',
  },
  {
    icon: GitBranch,
    title: 'Version Awareness',
    text: 'Project versions are part of the development workflow so progress does not depend on one irreversible state.',
  },
  {
    icon: Cpu,
    title: 'Provider Choice',
    text: 'Forge is designed to support configurable AI providers rather than forcing every workflow through one model.',
  },
  {
    icon: UserCheck,
    title: 'Human Control',
    text: 'The developer remains responsible for reviewing, refining and approving what gets built.',
  },
];

type WorkflowStage = { label: string; status: string };

const WORKFLOW_STAGES: WorkflowStage[] = [
  { label: 'Project Idea', status: 'Visible' },
  { label: 'Plan', status: 'Reviewable' },
  { label: 'Tasks', status: 'Tracked' },
  { label: 'Files Changed', status: 'Tracked' },
  { label: 'Live Preview', status: 'Visible' },
  { label: 'Version', status: 'Tracked' },
  { label: 'Export', status: 'Owned' },
];

const DIFFERENTIATOR_POINTS: { icon: LucideIcon; text: string }[] = [
  { icon: Quote, text: 'No fabricated testimonials' },
  { icon: Building2, text: 'No invented customer logos' },
  { icon: BarChart3, text: 'No meaningless vanity statistics' },
];

const STORY_SLOTS: { category: string }[] = [
  { category: 'SaaS Build' },
  { category: 'Business Platform' },
  { category: 'Internal Tool' },
];

type EvidenceCard = { icon: LucideIcon; title: string; text: string };

const EVIDENCE_CARDS: EvidenceCard[] = [
  {
    icon: MonitorPlay,
    title: 'Interactive Workspace',
    text: 'Build and preview your project in a live workspace as you go.',
  },
  {
    icon: FolderTree,
    title: 'Project Structure',
    text: 'Pages, components, files and assets stay organised and visible.',
  },
  {
    icon: GitBranch,
    title: 'Version Workflow',
    text: 'Review and move between project versions as work progresses.',
  },
  {
    icon: Download,
    title: 'Source Export',
    text: 'Take your project with you as usable source code.',
  },
];

/* ------------------------------------------------------------------ */
/* Building blocks                                                     */
/* ------------------------------------------------------------------ */

function TrustStatementRow({ statement }: { statement: TrustStatement }) {
  const Icon = statement.icon;
  return (
    <div className="flex items-start gap-3 py-3 border-b border-forge-border-subtle last:border-0">
      <span className="flex items-center justify-center w-8 h-8 rounded-md bg-forge-amber/10 text-forge-amber shrink-0">
        <Icon className="h-4 w-4" aria-hidden="true" />
      </span>
      <div className="min-w-0">
        <h4 className="text-sm font-semibold text-forge-text-primary">{statement.title}</h4>
        <p className="mt-1 text-[13px] text-forge-text-secondary leading-relaxed">{statement.text}</p>
      </div>
    </div>
  );
}

function TransparencyVisual() {
  return (
    <div className="rounded-lg border border-forge-border-subtle bg-forge-bg overflow-hidden">
      {/* Window chrome */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-forge-border-subtle bg-forge-panel">
        <div className="flex items-center gap-1.5" aria-hidden="true">
          <span className="w-2.5 h-2.5 rounded-full bg-forge-border" />
          <span className="w-2.5 h-2.5 rounded-full bg-forge-border" />
          <span className="w-2.5 h-2.5 rounded-full bg-forge-border" />
        </div>
        <span className="text-[11px] font-mono uppercase tracking-widest text-forge-text-muted">
          Project Transparency
        </span>
        <span className="w-9" aria-hidden="true" />
      </div>

      <div className="p-4 md:p-5">
        <ol className="space-y-1" aria-label="Forge project development stages">
          {WORKFLOW_STAGES.map((stage, i) => (
            <li key={stage.label}>
              <div className="flex items-center justify-between gap-3 rounded-md px-3 py-2 bg-forge-panel border border-forge-border-subtle">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span
                    className="flex items-center justify-center w-5 h-5 rounded-full bg-forge-amber/10 text-forge-amber text-[10px] font-semibold shrink-0"
                    aria-hidden="true"
                  >
                    {i + 1}
                  </span>
                  <span className="text-sm text-forge-text-primary truncate">{stage.label}</span>
                </div>
                <span className="text-[11px] font-medium text-forge-text-muted whitespace-nowrap shrink-0">
                  {stage.status}
                </span>
              </div>
              {i < WORKFLOW_STAGES.length - 1 && (
                <div className="flex justify-center py-0.5 text-forge-amber/50" aria-hidden="true">
                  <span className="w-px h-2 bg-forge-border-subtle" />
                </div>
              )}
            </li>
          ))}
        </ol>
        <p className="mt-4 text-[11px] text-forge-text-muted leading-relaxed">
          A visual representation of Forge&apos;s development philosophy — not every stage is fully automated.
        </p>
      </div>
    </div>
  );
}

function StorySlot({ category }: { category: string }) {
  return (
    <div className="relative flex flex-col rounded-lg border border-dashed border-forge-border bg-forge-panel/50 p-5 md:p-6 min-h-[140px]">
      <span className="text-[10px] font-semibold uppercase tracking-widest text-forge-amber/70">
        Customer Story
      </span>
      <h4 className="mt-3 text-base font-semibold text-forge-text-primary">{category}</h4>
      <div className="mt-auto pt-4 flex items-center gap-2 text-[12px] text-forge-text-muted">
        <span className="w-1.5 h-1.5 rounded-full bg-forge-amber/40" aria-hidden="true" />
        Coming as Forge launches
      </div>
    </div>
  );
}

function EvidenceCard({ card }: { card: EvidenceCard }) {
  const Icon = card.icon;
  return (
    <div className="flex flex-col rounded-lg border border-forge-border-subtle bg-forge-panel p-4 md:p-5 transition-colors duration-300 hover:border-forge-amber/25">
      <span className="flex items-center justify-center w-8 h-8 rounded-md bg-forge-amber/10 text-forge-amber mb-3">
        <Icon className="h-4 w-4" aria-hidden="true" />
      </span>
      <h4 className="text-sm font-semibold text-forge-text-primary">{card.title}</h4>
      <p className="mt-1.5 text-[13px] text-forge-text-secondary leading-relaxed">{card.text}</p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Section                                                             */
/* ------------------------------------------------------------------ */

export function TrustEvidenceSection() {
  return (
    <section
      id="trust-evidence"
      className="relative py-20 md:py-28 bg-forge-bg scroll-mt-16"
    >
      <div className="max-w-6xl mx-auto px-5 md:px-6">
        {/* Header */}
        <div className="max-w-3xl mx-auto text-center mb-14 md:mb-20">
          <span className="inline-block text-xs font-semibold uppercase tracking-[0.2em] text-forge-amber mb-4">
            Built on Principles That Matter
          </span>
          <h2 className="text-2xl md:text-4xl font-bold text-forge-text-primary tracking-tight">
            Trust the workflow, not the marketing.
          </h2>
          <p className="mt-4 text-forge-text-secondary text-sm md:text-base leading-relaxed">
            Forge is designed to keep the development process visible. Your project structure,
            AI-assisted work, versions and source code remain part of a workflow you can inspect
            and control.
          </p>
        </div>

        {/* Large trust panel — two sides */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 rounded-lg border border-forge-border-subtle bg-forge-panel p-6 md:p-8">
          {/* Left — what Forge doesn't hide */}
          <div className="flex flex-col">
            <h3 className="text-xl md:text-2xl font-bold text-forge-text-primary tracking-tight">
              What Forge doesn&apos;t hide
            </h3>
            <p className="mt-3 text-forge-text-secondary text-sm md:text-base leading-relaxed">
              AI development should make the work faster without turning the project into an
              invisible black box.
            </p>
            <div className="mt-6">
              {TRUST_STATEMENTS.map((statement) => (
                <TrustStatementRow key={statement.title} statement={statement} />
              ))}
            </div>
          </div>

          {/* Right — transparency visual */}
          <div className="flex flex-col justify-center">
            <TransparencyVisual />
          </div>
        </div>

        {/* Differentiator panel */}
        <div className="mt-6 rounded-lg border border-forge-border-subtle bg-forge-panel p-6 md:p-8">
          <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_1fr] gap-6 items-center">
            <div>
              <h3 className="text-xl md:text-2xl font-bold text-forge-text-primary tracking-tight">
                Built before it&apos;s bragged about.
              </h3>
              <p className="mt-3 text-forge-text-secondary text-sm md:text-base leading-relaxed max-w-xl">
                Forge should earn trust through the product itself. Customer stories, usage figures
                and performance claims should only appear when there is real evidence behind them.
              </p>
            </div>
            <ul className="space-y-3">
              {DIFFERENTIATOR_POINTS.map((point) => {
                const Icon = point.icon;
                return (
                  <li
                    key={point.text}
                    className="flex items-center gap-3 rounded-md border border-forge-border-subtle bg-forge-bg px-4 py-3"
                  >
                    <span className="flex items-center justify-center w-7 h-7 rounded-md bg-forge-amber/10 text-forge-amber shrink-0">
                      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                    </span>
                    <span className="text-sm text-forge-text-primary">{point.text}</span>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>

        {/* Future customer story area */}
        <div className="mt-16 md:mt-20">
          <div className="max-w-2xl">
            <h3 className="text-xl md:text-2xl font-bold text-forge-text-primary tracking-tight">
              From the Forge
            </h3>
            <p className="mt-2 text-forge-text-secondary text-sm md:text-base leading-relaxed">
              Real project stories will appear here as people build and ship with Forge.
            </p>
          </div>
          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            {STORY_SLOTS.map((slot) => (
              <StorySlot key={slot.category} category={slot.category} />
            ))}
          </div>
        </div>

        {/* Evidence row */}
        <div className="mt-12 md:mt-14">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {EVIDENCE_CARDS.map((card) => (
              <EvidenceCard key={card.title} card={card} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}