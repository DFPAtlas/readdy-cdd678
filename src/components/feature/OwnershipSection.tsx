import {
  Check,
  Cpu,
  Download,
  Eye,
  FolderGit2,
  GitBranch,
  HardDrive,
  type LucideIcon,
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/* Content config                                                      */
/* ------------------------------------------------------------------ */

const CHECKLIST = [
  'Exportable source code',
  'Standard development formats',
  'Project files remain visible',
  'Choose where you deploy',
];

const EXPORT_INCLUDED = ['Source', 'Components', 'Assets', 'Configuration'];

type ControlCard = { icon: LucideIcon; eyebrow: string; title: string; text: string };

const CONTROL_CARDS: ControlCard[] = [
  {
    icon: HardDrive,
    eyebrow: 'Local-First Architecture',
    title: 'More control over where AI runs',
    text: 'Forge is designed to support local-first workflows and configurable AI providers, giving developers more choice over their development environment.',
  },
  {
    icon: Cpu,
    eyebrow: 'Multiple AI Providers',
    title: 'Choose the right model for the job',
    text: 'Configure supported providers instead of building your entire workflow around one AI vendor.',
  },
  {
    icon: GitBranch,
    eyebrow: 'Version History',
    title: 'Move forward without losing the past',
    text: 'Keep project versions visible so changes can be reviewed and earlier states remain part of the development workflow.',
  },
  {
    icon: Eye,
    eyebrow: 'Visible Development',
    title: 'Know what Forge is doing',
    text: 'Tasks, build activity, project structure and files remain visible rather than hiding the development process behind a single prompt box.',
  },
];

/* ------------------------------------------------------------------ */
/* Building blocks                                                     */
/* ------------------------------------------------------------------ */

function ControlCard({ card }: { card: ControlCard }) {
  const Icon = card.icon;
  return (
    <div className="group relative flex flex-col rounded-lg border border-forge-border-subtle bg-forge-panel p-5 md:p-6 transition-colors duration-300 hover:border-forge-amber/25">
      <div className="flex items-center gap-2.5 mb-3">
        <span className="flex items-center justify-center w-8 h-8 rounded-md bg-forge-amber/10 text-forge-amber">
          <Icon className="h-4 w-4" aria-hidden="true" />
        </span>
        <span className="text-[11px] font-semibold uppercase tracking-widest text-forge-text-muted">
          {card.eyebrow}
        </span>
      </div>
      <h3 className="text-base font-semibold text-forge-text-primary">{card.title}</h3>
      <p className="mt-1.5 text-sm text-forge-text-secondary leading-relaxed">{card.text}</p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Section                                                             */
/* ------------------------------------------------------------------ */

export function OwnershipSection() {
  return (
    <section
      id="ownership"
      className="relative py-20 md:py-28 bg-forge-bg scroll-mt-16"
    >
      <div className="max-w-6xl mx-auto px-5 md:px-6">
        {/* Header */}
        <div className="max-w-3xl mx-auto text-center mb-14 md:mb-20">
          <span className="inline-block text-xs font-semibold uppercase tracking-[0.2em] text-forge-amber mb-4">
            Your Project. Your Control.
          </span>
          <h2 className="text-2xl md:text-4xl font-bold text-forge-text-primary tracking-tight">
            AI development without the lock-in
          </h2>
          <p className="mt-4 text-forge-text-secondary text-sm md:text-base leading-relaxed">
            Forge is designed around control and portability. Build with AI assistance while
            keeping visibility over your project, its structure, its versions and the code you take
            with you.
          </p>
        </div>

        {/* Large feature panel */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 rounded-lg border border-forge-border-subtle bg-forge-panel p-6 md:p-8">
          {/* Left — copy + checklist */}
          <div className="flex flex-col justify-center">
            <h3 className="text-xl md:text-2xl font-bold text-forge-text-primary tracking-tight">
              Your code leaves with you
            </h3>
            <p className="mt-3 text-forge-text-secondary text-sm md:text-base leading-relaxed">
              Forge is built around standard project structures and source-code export, so the end
              result is your project rather than a page trapped inside a proprietary visual editor.
            </p>
            <ul className="mt-6 space-y-3">
              {CHECKLIST.map((item) => (
                <li key={item} className="flex items-center gap-3 text-sm text-forge-text-primary">
                  <span className="flex items-center justify-center w-5 h-5 rounded-md bg-forge-amber/10 text-forge-amber shrink-0">
                    <Check className="h-3.5 w-3.5" aria-hidden="true" />
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {/* Right — export visual (presentational only) */}
          <div className="rounded-lg border border-forge-border-subtle bg-forge-bg overflow-hidden">
            {/* Window chrome */}
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-forge-border-subtle bg-forge-panel">
              <div className="flex items-center gap-1.5" aria-hidden="true">
                <span className="w-2.5 h-2.5 rounded-full bg-forge-border" />
                <span className="w-2.5 h-2.5 rounded-full bg-forge-border" />
                <span className="w-2.5 h-2.5 rounded-full bg-forge-border" />
              </div>
              <span className="text-[11px] font-mono uppercase tracking-widest text-forge-text-muted">
                Export Project
              </span>
              <span className="w-9" aria-hidden="true" />
            </div>

            <div className="p-5 space-y-5">
              {/* Project */}
              <div>
                <span className="block text-[11px] text-forge-text-muted mb-1.5">Project</span>
                <div className="flex items-center gap-2 text-forge-text-primary">
                  <FolderGit2 className="h-4 w-4 text-forge-amber" aria-hidden="true" />
                  <span className="font-mono text-sm">forge-site</span>
                </div>
              </div>

              {/* Included */}
              <div>
                <span className="block text-[11px] text-forge-text-muted mb-2">Included</span>
                <ul className="grid grid-cols-2 gap-2">
                  {EXPORT_INCLUDED.map((item) => (
                    <li key={item} className="flex items-center gap-1.5 text-sm text-forge-text-secondary">
                      <Check className="h-3.5 w-3.5 text-forge-amber" aria-hidden="true" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Format + status */}
              <div className="flex items-center justify-between gap-4">
                <div>
                  <span className="block text-[11px] text-forge-text-muted mb-1.5">Format</span>
                  <span className="text-sm font-mono text-forge-text-primary">Source Code</span>
                </div>
                <div>
                  <span className="block text-[11px] text-forge-text-muted mb-1.5">Status</span>
                  <span className="inline-flex items-center gap-1.5 text-sm text-forge-text-primary">
                    <span className="w-1.5 h-1.5 rounded-full bg-forge-success" aria-hidden="true" />
                    Ready
                  </span>
                </div>
              </div>

              {/* Mock button (decorative) */}
              <div className="pt-1" aria-hidden="true">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-forge-amber text-forge-text-inverse text-sm font-medium">
                  <Download className="h-4 w-4" />
                  Export project
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 2x2 cards */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          {CONTROL_CARDS.map((card) => (
            <ControlCard key={card.eyebrow} card={card} />
          ))}
        </div>
      </div>
    </section>
  );
}