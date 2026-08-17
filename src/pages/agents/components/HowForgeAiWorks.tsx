import { User, Bot, Cpu, FolderGit2, UserCheck, ArrowDown, type LucideIcon } from 'lucide-react';

const FLOW: Array<{ icon: LucideIcon; label: string; hint: string }> = [
  { icon: User, label: 'You', hint: 'describe what you want to build' },
  { icon: Bot, label: 'Master Agent', hint: 'coordinates the work' },
  { icon: Cpu, label: 'Specialist capability', hint: 'plan, build and refine' },
  { icon: FolderGit2, label: 'Project task / change', hint: 'visible and reviewable' },
  { icon: UserCheck, label: 'Review', hint: 'you approve before it sticks' },
];

function Node({ icon: Icon, label, hint }: { icon: LucideIcon; label: string; hint: string }) {
  return (
    <div className="flex flex-col items-center">
      <div className="inline-flex items-center gap-2 px-4 py-2 rounded-md border border-forge-border-subtle bg-forge-panel">
        <Icon className="h-4 w-4 text-forge-amber" aria-hidden="true" />
        <span className="text-sm font-medium text-forge-text-primary">{label}</span>
      </div>
      <span className="mt-1.5 text-[11px] text-forge-text-muted">{hint}</span>
    </div>
  );
}

export function HowForgeAiWorks() {
  return (
    <section className="rounded-lg border border-forge-border-subtle bg-forge-panel p-5 md:p-6">
      <div className="text-center mb-6">
        <h2 className="text-sm font-semibold text-forge-text-primary">How Forge AI works</h2>
      </div>

      <div className="max-w-md mx-auto flex flex-col items-center">
        {FLOW.map((step, i) => (
          <div key={step.label} className="flex flex-col items-center w-full">
            {i > 0 && (
              <div className="flex flex-col items-center py-1.5" aria-hidden="true">
                <ArrowDown className="h-4 w-4 text-forge-text-muted" />
              </div>
            )}
            <Node icon={step.icon} label={step.label} hint={step.hint} />
          </div>
        ))}
      </div>

      <p className="mt-6 text-sm text-forge-text-secondary text-center max-w-2xl mx-auto leading-relaxed">
        Forge is designed to keep AI work part of a visible development process rather than hiding
        the project behind one chat response.
      </p>
    </section>
  );
}