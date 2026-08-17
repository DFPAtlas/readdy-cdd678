import {
  ClipboardList,
  Code,
  Eye,
  Rocket,
} from 'lucide-react';
import { WORKFLOW_STEPS } from '@/config/hero';

const iconMap: Record<string, React.ReactNode> = {
  ClipboardList: <ClipboardList className="h-6 w-6" aria-hidden="true" />,
  Code: <Code className="h-6 w-6" aria-hidden="true" />,
  Eye: <Eye className="h-6 w-6" aria-hidden="true" />,
  Rocket: <Rocket className="h-6 w-6" aria-hidden="true" />,
};

export function WorkflowSteps() {
  return (
    <div className="max-w-6xl mx-auto px-5 md:px-6">
      <div className="text-center mb-12 md:mb-16">
        <span className="inline-block text-xs font-semibold uppercase tracking-[0.2em] text-forge-amber mb-4">
          A Guided Workflow
        </span>
        <h2 className="text-2xl md:text-4xl font-bold text-forge-text-primary tracking-tight mb-3">
          How Forge works
        </h2>
        <p className="text-forge-text-secondary max-w-lg mx-auto">
          A complete workflow from idea to production-ready website, guided by local AI.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
        {WORKFLOW_STEPS.map((item) => (
          <div
            key={item.step}
            className="group relative bg-forge-panel border border-forge-border-subtle rounded-lg p-5 hover:border-forge-amber/30 transition-colors duration-300"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-md bg-forge-amber/10 text-forge-amber">
                {iconMap[item.icon]}
              </div>
              <span className="text-xs font-mono text-forge-text-muted">
                {item.step}
              </span>
            </div>
            <h3 className="text-base font-semibold text-forge-text-primary mb-1.5">
              {item.title}
            </h3>
            <p className="text-sm text-forge-text-secondary leading-relaxed">
              {item.description}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}