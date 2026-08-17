import { UserCheck, Cpu, Activity, type LucideIcon } from 'lucide-react';

const CARDS: Array<{ icon: LucideIcon; title: string; text: string }> = [
  {
    icon: UserCheck,
    title: 'Human review',
    text: 'Review project changes and decisions before treating AI-generated work as finished.',
  },
  {
    icon: Cpu,
    title: 'Provider control',
    text: 'Configure supported AI providers through Forge settings.',
  },
  {
    icon: Activity,
    title: 'Visible activity',
    text: 'Keep AI-assisted actions connected to project tasks and activity where supported.',
  },
];

export function ControlSafety() {
  return (
    <section>
      <h2 className="text-sm font-semibold text-forge-text-primary mb-3">Control & safety</h2>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {CARDS.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.title}
              className="rounded-lg border border-forge-border-subtle bg-forge-panel p-4"
            >
              <span className="flex items-center justify-center w-9 h-9 rounded-md bg-forge-amber/10 text-forge-amber mb-3">
                <Icon className="h-4 w-4" aria-hidden="true" />
              </span>
              <h3 className="text-sm font-medium text-forge-text-primary">{card.title}</h3>
              <p className="mt-1 text-xs text-forge-text-secondary leading-relaxed">{card.text}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}