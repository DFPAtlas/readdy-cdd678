import { Card } from '@/components/ui/Card';
import { Check, X } from 'lucide-react';
import type { EntitlementKey } from '@/pages/projects/sandbox/sandboxBilling';

const CAPABILITY_LABELS: Array<{ key: EntitlementKey; label: string }> = [
  { key: 'export_access', label: 'Export projects' },
  { key: 'collaboration_access', label: 'Team collaboration' },
  { key: 'advanced_seo_access', label: 'Advanced SEO' },
  { key: 'priority_ai_access', label: 'Priority AI processing' },
];

interface PlanFeaturesSectionProps {
  features: string[];
  entitlements: Partial<Record<EntitlementKey, number | null>>;
}

export function PlanFeaturesSection({ features, entitlements }: PlanFeaturesSectionProps) {
  const includedCapabilities = CAPABILITY_LABELS.filter((cap) => entitlements[cap.key] === 1);
  const excludedCapabilities = CAPABILITY_LABELS.filter((cap) => entitlements[cap.key] !== 1);

  return (
    <section aria-labelledby="features-heading">
      <h2 id="features-heading" className="text-sm font-semibold text-forge-text-primary mb-3">
        Plan features
      </h2>
      <Card className="p-4">
        {features.length > 0 && (
          <>
            <p className="text-xs font-medium uppercase tracking-wider text-forge-text-muted mb-2">Included</p>
            <ul className="space-y-2">
              {features.map((feature) => (
                <li key={feature} className="flex items-start gap-2 text-sm text-forge-text-primary">
                  <Check className="h-4 w-4 text-forge-success shrink-0 mt-0.5" />
                  <span>{feature}</span>
                </li>
              ))}
              {includedCapabilities.map((cap) => (
                <li key={cap.key} className="flex items-start gap-2 text-sm text-forge-text-primary">
                  <Check className="h-4 w-4 text-forge-success shrink-0 mt-0.5" />
                  <span>{cap.label}</span>
                </li>
              ))}
            </ul>
          </>
        )}

        {excludedCapabilities.length > 0 && (
          <div className={features.length > 0 ? 'mt-4 pt-4 border-t border-forge-border-subtle' : ''}>
            <p className="text-xs font-medium uppercase tracking-wider text-forge-text-muted mb-2">Not included</p>
            <ul className="space-y-2">
              {excludedCapabilities.map((cap) => (
                <li key={cap.key} className="flex items-start gap-2 text-sm text-forge-text-muted">
                  <X className="h-4 w-4 text-forge-text-muted shrink-0 mt-0.5" />
                  <span>{cap.label}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </Card>
    </section>
  );
}