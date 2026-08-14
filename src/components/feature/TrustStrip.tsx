import {
  Shield,
  Cpu,
  Settings,
  FileCode,
  GitBranch,
  Package,
} from 'lucide-react';
import { TRUST_ITEMS } from '@/config/hero';

const iconMap: Record<string, React.ReactNode> = {
  Shield: <Shield className="h-5 w-5" aria-hidden="true" />,
  Cpu: <Cpu className="h-5 w-5" aria-hidden="true" />,
  Settings: <Settings className="h-5 w-5" aria-hidden="true" />,
  FileCode: <FileCode className="h-5 w-5" aria-hidden="true" />,
  GitBranch: <GitBranch className="h-5 w-5" aria-hidden="true" />,
  Package: <Package className="h-5 w-5" aria-hidden="true" />,
};

export function TrustStrip() {
  return (
    <section
      id="trust"
      className="py-10 md:py-12 bg-forge-panel border-y border-forge-border-subtle"
    >
      <div className="max-w-6xl mx-auto px-5 md:px-6">
        <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-4 md:gap-x-10">
          {TRUST_ITEMS.map((item) => (
            <div
              key={item.label}
              className="flex items-center gap-2.5 text-sm text-forge-text-secondary"
            >
              <span className="text-forge-amber/80">{iconMap[item.icon]}</span>
              <span className="whitespace-nowrap">{item.label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}