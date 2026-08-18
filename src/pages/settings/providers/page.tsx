import { useForgeAi } from '@/hooks/useForgeAi';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { ErrorState } from '@/components/ui/ErrorState';
import { EmptyState } from '@/components/ui/EmptyState';
import { LinkButton } from '@/pages/dashboard/components/LinkButton';
import {
  Sparkles,
  ShieldCheck,
  RefreshCw,
  Gauge,
  Layers,
  CheckCircle2,
  ArrowUpRight,
  Cpu,
} from 'lucide-react';

const CAPABILITY_LABELS: Record<string, string> = {
  fast_edit: 'Quick edits',
  standard: 'Standard builds',
  complex: 'Complex builds',
  copywriting: 'Copywriting',
  seo: 'SEO',
  accessibility: 'Accessibility',
  image_alt: 'Image alt text',
  planning: 'Planning',
  layout: 'Layout',
  code: 'Code',
  image: 'Image',
  form: 'Forms',
  data: 'Data',
  debug: 'Debugging',
  review: 'Review',
  validation: 'Validation',
};

function formatCredits(n: number): string {
  return n.toLocaleString('en-US');
}

function ForgeAiSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-6 w-40" />
      <Skeleton className="h-4 w-96 max-w-full" />
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
      <Skeleton className="h-40 w-full" />
    </div>
  );
}

export default function SettingsProvidersPage() {
  const { data, loading, error, retry, refresh, refreshing } = useForgeAi();

  if (loading) return <ForgeAiSkeleton />;

  if (error) {
    return (
      <ErrorState
        title="Unable to load AI status"
        message="Something went wrong while loading your AI service status. Please try again."
        onRetry={retry}
      />
    );
  }

  if (!data.authenticated) {
    return (
      <EmptyState
        icon={<Cpu className="h-8 w-8" />}
        title="Sign in to view AI status"
        description="You need to be signed in to see the AI service included with your plan."
        action={
          <LinkButton variant="secondary" to="/login">
            Sign in
          </LinkButton>
        }
      />
    );
  }

  const operational = data.activeProviders.length > 0;
  const reachedLimit = data.monthlyCreditLimit > 0 && data.creditsRemaining <= 0;

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-semibold text-forge-text-primary">Forge AI</h2>
            <Badge variant={operational ? 'success' : 'default'} size="sm">
              {operational ? 'Operational' : 'Standby'}
            </Badge>
          </div>
          <p className="text-sm text-forge-text-muted mt-0.5 max-w-2xl">
            Forge securely manages the AI providers used by your projects. Access is included
            according to your subscription plan.
          </p>
        </div>
        <Button
          variant="secondary"
          size="sm"
          onClick={refresh}
          loading={refreshing}
          icon={<RefreshCw className="h-3.5 w-3.5" />}
        >
          Refresh
        </Button>
      </div>

      {reachedLimit && (
        <div className="rounded-lg border border-forge-amber/40 bg-forge-amber/10 px-4 py-3 flex items-start gap-3">
          <Gauge className="h-4 w-4 text-forge-amber shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium text-forge-text-primary">Monthly AI allowance reached</p>
            <p className="text-xs text-forge-text-muted mt-0.5">
              You&apos;ve used your included AI credits for this period. Upgrade to keep building with AI.
            </p>
          </div>
          <LinkButton to="/settings/billing" variant="primary" size="sm" className="shrink-0">
            Upgrade <ArrowUpRight className="h-3.5 w-3.5" />
          </LinkButton>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
        <div className="rounded-lg border border-forge-border-subtle bg-forge-panel p-4">
          <p className="text-xs text-forge-text-muted">Current plan</p>
          <p className="text-lg font-semibold text-forge-text-primary mt-1">{data.planLabel}</p>
          {data.planCode === 'free' && (
            <LinkButton to="/settings/billing" variant="ghost" size="sm" className="mt-1 px-0">
              Upgrade
            </LinkButton>
          )}
        </div>

        <div className="rounded-lg border border-forge-border-subtle bg-forge-panel p-4">
          <p className="text-xs text-forge-text-muted">Monthly allowance</p>
          <p className="text-lg font-semibold text-forge-text-primary mt-1">
            {formatCredits(data.monthlyCreditLimit)} credits
          </p>
        </div>

        <div className="rounded-lg border border-forge-border-subtle bg-forge-panel p-4">
          <p className="text-xs text-forge-text-muted">Used this period</p>
          <p className="text-lg font-semibold text-forge-text-primary mt-1">
            {formatCredits(data.creditsUsed)} credits
          </p>
        </div>

        <div className="rounded-lg border border-forge-border-subtle bg-forge-panel p-4">
          <p className="text-xs text-forge-text-muted">Remaining</p>
          <p className="text-lg font-semibold text-forge-text-primary mt-1">
            {formatCredits(data.creditsRemaining)} credits
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
        <section className="rounded-lg border border-forge-border-subtle bg-forge-panel p-4">
          <div className="flex items-center gap-2 mb-3">
            <Layers className="h-4 w-4 text-forge-text-muted" />
            <h3 className="text-sm font-semibold text-forge-text-primary">Enabled capabilities</h3>
          </div>
          {data.allowedTaskClasses.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {data.allowedTaskClasses.map((task) => (
                <span
                  key={task}
                  className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-forge-bg border border-forge-border text-xs text-forge-text-primary"
                >
                  <CheckCircle2 className="h-3.5 w-3.5 text-forge-success" />
                  {CAPABILITY_LABELS[task] ?? task}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-xs text-forge-text-muted">No capabilities available on your current plan.</p>
          )}

          <div className="mt-4 pt-3 border-t border-forge-border-subtle flex items-center gap-2">
            <span className="inline-flex h-2 w-2 rounded-full bg-forge-success" />
            <p className="text-xs text-forge-text-muted">
              Local-only mode: {data.localAvailable ? 'Available' : 'Not configured for this workspace'}
            </p>
          </div>
        </section>

        <section className="rounded-lg border border-forge-border-subtle bg-forge-panel p-4">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="h-4 w-4 text-forge-text-muted" />
            <h3 className="text-sm font-semibold text-forge-text-primary">
              Available models on {data.planLabel}
            </h3>
          </div>
          {data.availableModels.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {data.availableModels.map((m) => (
                <span
                  key={m.id}
                  className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-forge-bg border border-forge-border text-xs"
                >
                  <span className="font-mono text-forge-text-primary">{m.model_key}</span>
                </span>
              ))}
            </div>
          ) : (
            <p className="text-xs text-forge-text-muted">
              No models are currently available. Upgrade your plan to unlock more AI models.
            </p>
          )}
        </section>
      </div>

      <div className="rounded-lg border border-forge-border-subtle bg-forge-panel p-4 flex items-start gap-3">
        <ShieldCheck className="h-4 w-4 text-forge-text-muted shrink-0 mt-0.5" />
        <p className="text-xs text-forge-text-muted leading-relaxed">
          Provider credentials are managed centrally by Forge and are never shown or required from you.
          Your AI access is governed by your subscription plan, entitlements and usage limits.
        </p>
      </div>
    </div>
  );
}