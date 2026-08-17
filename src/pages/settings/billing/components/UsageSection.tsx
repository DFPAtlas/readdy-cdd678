import { Card } from '@/components/ui/Card';
import { Folder, FileText, Globe, Link2, Users, Zap } from 'lucide-react';
import type { Meter } from '@/pages/projects/sandbox/sandboxBilling';

const METER_ICONS: Record<string, typeof Zap> = {
  ai_credits: Zap,
  projects: Folder,
  pages: FileText,
  team_members: Users,
  published_sites: Globe,
  custom_domains: Link2,
};

function percentage(used: number, limit: number): number {
  if (limit <= 0) return 0;
  return Math.min(100, Math.round((used / limit) * 100));
}

interface UsageSectionProps {
  meters: Meter[];
}

export function UsageSection({ meters }: UsageSectionProps) {
  return (
    <section aria-labelledby="usage-heading">
      <h2 id="usage-heading" className="text-sm font-semibold text-forge-text-primary mb-3">
        Plan allowances
      </h2>
      <Card className="p-4">
        {meters.length === 0 ? (
          <p className="text-sm text-forge-text-muted">No usage data is available for this plan.</p>
        ) : (
          <ul className="space-y-4">
            {meters.map((meter) => {
              const Icon = METER_ICONS[meter.key] ?? Zap;
              const unlimited = meter.limit === null;
              const notAvailable = meter.limit === 0;
              const pct = meter.limit && meter.limit > 0 ? percentage(meter.used, meter.limit) : 0;
              const nearLimit = !unlimited && !notAvailable && pct >= 80;

              return (
                <li key={meter.key}>
                  <div className="flex items-center gap-2.5">
                    <span className="h-7 w-7 flex items-center justify-center rounded-md bg-forge-border text-forge-text-secondary shrink-0">
                      <Icon className="h-3.5 w-3.5" />
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline justify-between gap-3">
                        <span className="text-sm text-forge-text-primary truncate">{meter.label}</span>
                        <span className={`text-xs whitespace-nowrap ${nearLimit ? 'text-forge-warning font-medium' : 'text-forge-text-secondary'}`}>
                          {unlimited
                            ? 'Unlimited'
                            : notAvailable
                              ? 'Not available'
                              : `${meter.used.toLocaleString()} of ${meter.limit.toLocaleString()} ${meter.unit}`}
                        </span>
                      </div>
                      {!unlimited && !notAvailable && (
                        <div
                          className="mt-1.5 h-1.5 rounded-full bg-forge-border overflow-hidden"
                          role="progressbar"
                          aria-label={meter.label}
                          aria-valuemin={0}
                          aria-valuemax={meter.limit ?? 0}
                          aria-valuenow={meter.used}
                        >
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${nearLimit ? 'bg-forge-error' : 'bg-forge-amber'}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </section>
  );
}