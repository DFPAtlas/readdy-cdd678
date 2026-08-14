import {
  ClipboardList,
  Bot,
  Users,
  MonitorPlay,
  Package,
  ArrowRight,
} from 'lucide-react';
import { ARCHITECTURE_NODES } from '@/config/hero';

const iconMap: Record<string, React.ReactNode> = {
  ClipboardList: <ClipboardList className="h-4 w-4" aria-hidden="true" />,
  Bot: <Bot className="h-4 w-4" aria-hidden="true" />,
  Users: <Users className="h-4 w-4" aria-hidden="true" />,
  MonitorPlay: <MonitorPlay className="h-4 w-4" aria-hidden="true" />,
  Package: <Package className="h-4 w-4" aria-hidden="true" />,
};

export function ArchitectureStrip() {
  return (
    <section id="architecture" className="py-14 md:py-20 bg-forge-bg scroll-mt-16">
      <div className="max-w-5xl mx-auto px-5 md:px-6">
        <h3 className="text-center text-sm font-semibold text-forge-text-muted uppercase tracking-wider mb-10">
          Architecture
        </h3>

        <div className="flex flex-wrap items-center justify-center gap-2 md:gap-3">
          {ARCHITECTURE_NODES.map((node, index) => (
            <div key={node.label} className="flex items-center gap-2 md:gap-3">
              {/* Node */}
              <div className="flex items-center gap-2 px-3.5 py-2 rounded-full bg-forge-panel border border-forge-border-subtle text-sm text-forge-text-primary hover:border-forge-amber/25 transition-colors">
                <span className="text-forge-amber/70">{iconMap[node.icon]}</span>
                <span className="whitespace-nowrap">{node.label}</span>
              </div>

              {/* Arrow */}
              {index < ARCHITECTURE_NODES.length - 1 && (
                <ArrowRight
                  className="h-4 w-4 text-forge-text-muted shrink-0 hidden sm:block"
                  aria-hidden="true"
                />
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}