import { useSystemStatus } from '@/hooks/useSystemStatus';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import { ErrorState } from '@/components/ui/ErrorState';
import { LinkButton } from '@/pages/dashboard/components/LinkButton';
import { StatusIndicator } from './components/StatusIndicator';
import { OverallStatusPanel } from './components/OverallStatusPanel';
import { CoreServicesSection } from './components/CoreServicesSection';
import { AiProviderHealthSection } from './components/AiProviderHealthSection';
import { NeedsAttentionSection } from './components/NeedsAttentionSection';
import { SystemInfoSection } from './components/SystemInfoSection';
import { RefreshCw, Activity, Database, KeyRound, Server, Clock } from 'lucide-react';

function formatCheckedAt(iso: string): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleTimeString();
}

function StatusSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-16 w-full" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-32" />
        ))}
      </div>
      <Skeleton className="h-40 w-full" />
    </div>
  );
}

export default function SystemStatusPage() {
  const { snapshot, derived, loading, error, retry, refresh, refreshing } = useSystemStatus();

  if (loading) return <StatusSkeleton />;

  if (error) {
    return (
      <ErrorState
        title="Unable to check system status"
        message="Forge could not run its status checks. Please try again."
        onRetry={retry}
      />
    );
  }

  const sessionChecks = [
    {
      icon: <Activity className="h-3.5 w-3.5 text-forge-text-muted" />,
      label: 'Authentication',
      status: snapshot.auth.status,
    },
    {
      icon: <Database className="h-3.5 w-3.5 text-forge-text-muted" />,
      label: 'Provider registry',
      status: snapshot.registry.status,
    },
    {
      icon: <KeyRound className="h-3.5 w-3.5 text-forge-text-muted" />,
      label: 'Provider credentials',
      status: snapshot.supabaseConfigured
        ? snapshot.configuredCount > 0
          ? 'operational'
          : 'not_configured'
        : 'not_configured',
    },
  ] as const;

  return (
    <>
      {/* Header */}
      <div className="mb-6 flex items-start justify-between gap-4 flex-wrap">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-forge-text-muted mb-1">System</p>
          <h1 className="text-lg font-semibold text-forge-text-primary">System Status</h1>
          <p className="mt-1 text-sm text-forge-text-muted max-w-2xl">
            Review the health of Forge services, AI configuration and workspace dependencies.
          </p>
        </div>
        <div className="flex-shrink-0 flex flex-col items-end gap-1">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => void refresh()}
            loading={refreshing}
            icon={<RefreshCw className="h-3.5 w-3.5" />}
          >
            Refresh status
          </Button>
          <span className="text-[11px] text-forge-text-muted">
            Last checked: {formatCheckedAt(snapshot.checkedAt)}
          </span>
        </div>
      </div>

      {/* 1. Overall status */}
      <div className="mb-5">
        <OverallStatusPanel derived={derived} />
      </div>

      {/* 2. Core services */}
      <div className="mb-5">
        <CoreServicesSection services={derived.coreServices} />
      </div>

      {/* 3. AI provider health */}
      <div className="mb-5">
        <AiProviderHealthSection snapshot={snapshot} />
      </div>

      {/* 4. Local-first services */}
      <div className="mb-5">
        <section aria-labelledby="local-services-title">
          <h2 id="local-services-title" className="text-sm font-semibold text-forge-text-primary mb-2">
            Local-first services
          </h2>
          <Card className="p-4">
            <div className="flex items-start gap-2">
              <Server className="h-4 w-4 text-forge-text-muted shrink-0 mt-0.5" aria-hidden="true" />
              <p className="text-xs text-forge-text-muted leading-relaxed">
                No local runtime or service endpoint is configured or verifiable from this session. Forge's
                local-first integrations are not active in this environment.
              </p>
            </div>
          </Card>
        </section>
      </div>

      {/* 5. Needs attention */}
      <div className="mb-5">
        <NeedsAttentionSection issues={derived.issues} />
      </div>

      {/* 6. System information */}
      <div className="mb-5">
        <SystemInfoSection supabaseConfigured={snapshot.supabaseConfigured} />
      </div>

      {/* 7. Session checks */}
      <div className="mb-5">
        <section aria-labelledby="session-checks-title">
          <h2 id="session-checks-title" className="text-sm font-semibold text-forge-text-primary mb-2">
            Checks this session
          </h2>
          <Card className="p-4">
            <div className="flex items-center gap-1.5 mb-3 text-[11px] text-forge-text-muted">
              <Clock className="h-3.5 w-3.5" aria-hidden="true" />
              Performed {snapshot.checkedAt ? new Date(snapshot.checkedAt).toLocaleString() : '—'}
            </div>
            <ul className="space-y-2">
              {sessionChecks.map((check) => (
                <li key={check.label} className="flex items-center justify-between gap-3">
                  <span className="flex items-center gap-2 text-xs text-forge-text-secondary">
                    <span className="flex h-6 w-6 items-center justify-center rounded bg-forge-border">
                      {check.icon}
                    </span>
                    {check.label}
                  </span>
                  <StatusIndicator status={check.status} />
                </li>
              ))}
            </ul>
          </Card>
        </section>
      </div>

      {/* 8. Diagnostic actions */}
      <div className="mb-5">
        <section aria-labelledby="diagnostic-actions-title">
          <h2 id="diagnostic-actions-title" className="text-sm font-semibold text-forge-text-primary mb-2">
            Diagnostic actions
          </h2>
          <div className="flex items-center gap-2 flex-wrap">
            <Button variant="secondary" size="sm" onClick={() => void refresh()} icon={<RefreshCw className="h-3.5 w-3.5" />}>
              Refresh status
            </Button>
            <LinkButton variant="secondary" size="sm" to="/settings/providers">
              Configure AI
            </LinkButton>
            <LinkButton variant="ghost" size="sm" to="/help">
              Open help
            </LinkButton>
          </div>
        </section>
      </div>
    </>
  );
}