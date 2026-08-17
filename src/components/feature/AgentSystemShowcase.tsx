import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Bot,
  BrainCircuit,
  Code2,
  Database,
  FileText,
  FolderGit2,
  ListTodo,
  MonitorPlay,
  Palette,
  Rocket,
  ShieldCheck,
  User,
  UserCheck,
  type LucideIcon,
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/* Content config                                                      */
/* ------------------------------------------------------------------ */

const MASTER_CHIPS = [
  'Project Context',
  'Planning',
  'Task Breakdown',
  'Build Guidance',
  'Review',
];

type Specialist = { icon: LucideIcon; title: string; text: string; chips: string[] };

const SPECIALISTS: Specialist[] = [
  {
    icon: Palette,
    title: 'UI & UX',
    text: 'Layout, component and interface guidance.',
    chips: ['Layout', 'Components', 'Responsive UI'],
  },
  {
    icon: Code2,
    title: 'Code',
    text: 'Implementation and development-focused assistance.',
    chips: ['React', 'Logic', 'Refactoring'],
  },
  {
    icon: Database,
    title: 'Data',
    text: 'Help structure application data and integrations.',
    chips: ['Schema', 'Queries', 'Data Flow'],
  },
  {
    icon: FileText,
    title: 'Content',
    text: 'Help create and refine website content.',
    chips: ['Pages', 'Copy', 'Structure'],
  },
  {
    icon: ShieldCheck,
    title: 'Quality',
    text: 'Review work for potential issues before release.',
    chips: ['Review', 'Checks', 'Improvements'],
  },
  {
    icon: Rocket,
    title: 'Deployment',
    text: 'Help prepare a finished project for export and deployment.',
    chips: ['Build', 'Export', 'Release'],
  },
];

type Supporting = { icon: LucideIcon; title: string; text: string; highlight: boolean };

const SUPPORTING: Supporting[] = [
  {
    icon: BrainCircuit,
    title: 'Shared Project Context',
    text: 'Keep planning, project structure and build conversations connected instead of starting from zero every time.',
    highlight: false,
  },
  {
    icon: ListTodo,
    title: 'Visible Tasks',
    text: 'Break work into understandable steps so users can see what is being planned, worked on and reviewed.',
    highlight: false,
  },
  {
    icon: UserCheck,
    title: 'Human in Control',
    text: 'Forge is designed to assist the developer rather than hide the build process behind a black box.',
    highlight: true,
  },
];

/* ------------------------------------------------------------------ */
/* Building blocks                                                     */
/* ------------------------------------------------------------------ */

function Connector({ label, animated = false }: { label?: string; animated?: boolean }) {
  return (
    <div className="flex flex-col items-center py-1" aria-hidden="true">
      <div className="relative w-px h-8 bg-forge-border-subtle">
        {animated && (
          <span className="absolute left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-forge-amber animate-forge-pulse-travel" />
        )}
      </div>
      {label && (
        <span className="mt-1 text-[10px] font-mono uppercase tracking-widest text-forge-text-muted/70">
          {label}
        </span>
      )}
    </div>
  );
}

function FlowNode({ icon: Icon, label, hint }: { icon: LucideIcon; label: string; hint?: string }) {
  return (
    <div className="flex flex-col items-center">
      <div className="inline-flex items-center gap-2 px-4 py-2 rounded-md border border-forge-border-subtle bg-forge-panel">
        <Icon className="h-4 w-4 text-forge-amber" aria-hidden="true" />
        <span className="text-sm font-medium text-forge-text-primary">{label}</span>
      </div>
      {hint && <span className="mt-1.5 text-[11px] text-forge-text-muted">{hint}</span>}
    </div>
  );
}

function MasterAgentCard() {
  return (
    <div className="w-full max-w-2xl mx-auto rounded-lg border border-forge-amber/25 bg-forge-panel p-5 md:p-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex items-center justify-center w-10 h-10 rounded-md bg-forge-amber/10 text-forge-amber">
            <Bot className="h-5 w-5" aria-hidden="true" />
          </span>
          <h3 className="text-lg font-semibold text-forge-text-primary">Master Agent</h3>
        </div>
        <span className="inline-flex items-center gap-1.5 text-xs text-forge-text-muted whitespace-nowrap">
          <span className="w-1.5 h-1.5 rounded-full bg-forge-success" aria-hidden="true" />
          Context: Online
        </span>
      </div>
      <p className="mt-3 text-sm text-forge-text-secondary leading-relaxed">
        Your central project assistant for planning, context, tasks and build guidance.
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        {MASTER_CHIPS.map((chip) => (
          <span
            key={chip}
            className="px-2.5 py-1 rounded-full border border-forge-border-subtle bg-forge-bg text-xs text-forge-text-secondary"
          >
            {chip}
          </span>
        ))}
      </div>
    </div>
  );
}

function SpecialistCard({ specialist }: { specialist: Specialist }) {
  const Icon = specialist.icon;
  return (
    <div className="group relative flex flex-col rounded-lg border border-forge-border-subtle bg-forge-panel p-4 transition-colors duration-300 hover:border-forge-amber/25">
      <div className="flex items-center gap-2.5 mb-2">
        <span className="flex items-center justify-center w-8 h-8 rounded-md bg-forge-amber/10 text-forge-amber">
          <Icon className="h-4 w-4" aria-hidden="true" />
        </span>
        <h4 className="text-sm font-semibold text-forge-text-primary">{specialist.title}</h4>
      </div>
      <p className="text-sm text-forge-text-secondary leading-relaxed">{specialist.text}</p>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {specialist.chips.map((chip) => (
          <span
            key={chip}
            className="px-2 py-0.5 rounded bg-forge-bg border border-forge-border-subtle text-[11px] text-forge-text-muted"
          >
            {chip}
          </span>
        ))}
      </div>
    </div>
  );
}

function SupportingCard({ supporting }: { supporting: Supporting }) {
  const Icon = supporting.icon;
  return (
    <div
      className={`group relative flex flex-col rounded-lg border p-5 transition-colors duration-300 ${
        supporting.highlight
          ? 'border-forge-amber/30 bg-forge-amber/[0.04] hover:border-forge-amber/50'
          : 'border-forge-border-subtle bg-forge-panel hover:border-forge-amber/25'
      }`}
    >
      <span className="flex items-center justify-center w-10 h-10 rounded-md bg-forge-amber/10 text-forge-amber mb-4">
        <Icon className="h-5 w-5" aria-hidden="true" />
      </span>
      <h3 className="text-base font-semibold text-forge-text-primary">{supporting.title}</h3>
      <p className="mt-1.5 text-sm text-forge-text-secondary leading-relaxed">{supporting.text}</p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Section                                                             */
/* ------------------------------------------------------------------ */

export function AgentSystemShowcase() {
  const scrollToWorkspace = () => {
    document.querySelector('#sandbox-workspace')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section
      id="ai-agents"
      className="relative py-20 md:py-28 bg-[#0B0D10] border-y border-forge-border-subtle scroll-mt-16"
    >
      <div className="max-w-6xl mx-auto px-5 md:px-6">
        {/* Header */}
        <div className="text-center mb-14 md:mb-20">
          <span className="inline-block text-xs font-semibold uppercase tracking-[0.2em] text-forge-amber mb-4">
            AI-Assisted Development
          </span>
          <h2 className="text-2xl md:text-4xl font-bold text-forge-text-primary tracking-tight">
            One workspace. A team of AI specialists.
          </h2>
          <p className="mt-4 text-forge-text-secondary max-w-2xl mx-auto text-sm md:text-base leading-relaxed">
            Start with the Master Agent, keep the project context in one place, and bring focused
            AI capabilities into the workflow when different parts of the build need specialist
            attention.
          </p>
        </div>

        {/* Orchestration diagram */}
        <div className="max-w-4xl mx-auto">
          <FlowNode icon={User} label="You" hint="describe what you want to build" />
          <Connector label="Describes" />

          <MasterAgentCard />
          <Connector label="Coordinates" animated />

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {SPECIALISTS.map((specialist) => (
              <SpecialistCard key={specialist.title} specialist={specialist} />
            ))}
          </div>
          <Connector label="Updates" />

          <FlowNode icon={FolderGit2} label="Forge Project" hint="pages · components · assets" />
          <Connector label="Previews" />

          <FlowNode icon={MonitorPlay} label="Live Preview" hint="desktop · tablet · mobile" />
        </div>

        {/* Supporting cards */}
        <div className="mt-16 md:mt-20 grid grid-cols-1 md:grid-cols-3 gap-4">
          {SUPPORTING.map((supporting) => (
            <SupportingCard key={supporting.title} supporting={supporting} />
          ))}
        </div>

        {/* Amber statement */}
        <p className="mt-8 text-center text-sm md:text-base font-medium text-forge-amber">
          AI does the heavy lifting. You keep control of the project.
        </p>

        {/* CTA */}
        <div className="mt-14 md:mt-16 text-center">
          <h3 className="text-xl md:text-2xl font-bold text-forge-text-primary">
            Meet your development workspace
          </h3>
          <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              to="/projects/new"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-md bg-forge-amber text-forge-text-inverse font-medium text-sm hover:bg-forge-amber-dim transition-colors whitespace-nowrap cursor-pointer"
            >
              Start a project
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <button
              type="button"
              onClick={scrollToWorkspace}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-md border border-forge-border-subtle text-forge-text-primary font-medium text-sm hover:border-forge-amber/25 hover:text-white transition-colors whitespace-nowrap cursor-pointer"
            >
              Explore the workspace
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}