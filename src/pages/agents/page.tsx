import { useAiWorkspace } from '@/hooks/useAiWorkspace';
import { SPECIALIST_AGENTS } from '@/services/agentsService';
import { Skeleton } from '@/components/ui/Skeleton';
import { ErrorState } from '@/components/ui/ErrorState';
import { AgentsHeader } from './components/AgentsHeader';
import { ProviderSetupBanner } from './components/ProviderSetupBanner';
import { MasterAgentCard } from './components/MasterAgentCard';
import { SpecialistCapabilities } from './components/SpecialistCapabilities';
import { AiConfigurationPanel } from './components/AiConfigurationPanel';
import { AgentActivity } from './components/AgentActivity';
import { HowForgeAiWorks } from './components/HowForgeAiWorks';
import { ControlSafety } from './components/ControlSafety';

function AgentsSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-44 w-full" />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <div className="space-y-4">
          <Skeleton className="h-40" />
          <Skeleton className="h-40" />
        </div>
      </div>
    </div>
  );
}

export default function AgentsPage() {
  const { data, loading, error, retry } = useAiWorkspace();

  return (
    <div className="max-w-6xl mx-auto">
      <AgentsHeader />

      {loading ? (
        <AgentsSkeleton />
      ) : error ? (
        <ErrorState
          title="Unable to load AI configuration"
          message="We couldn't reach your AI provider settings. Please try again."
          onRetry={retry}
        />
      ) : data ? (
        <div className="space-y-6">
          {!data.configured && <ProviderSetupBanner />}

          <MasterAgentCard
            configured={data.configured}
            providerLabel={data.configuredProvider?.display_name ?? null}
            modelLabel={data.defaultModel?.display_name ?? null}
          />

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <SpecialistCapabilities agents={SPECIALIST_AGENTS} />
            </div>
            <div className="space-y-4">
              <AiConfigurationPanel
                configured={data.configured}
                providerLabel={data.configuredProvider?.display_name ?? null}
                modelLabel={data.defaultModel?.display_name ?? null}
                keySuffix={data.keySuffix}
              />
              <AgentActivity items={data.activity} />
            </div>
          </div>

          <HowForgeAiWorks />
          <ControlSafety />
        </div>
      ) : null}
    </div>
  );
}