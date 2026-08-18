import { Skeleton } from '@/components/ui/Skeleton';
import { ErrorState } from '@/components/ui/ErrorState';
import type { ForgeAiStatus } from '@/services/forgeAiService';
import { Cpu, CheckCircle2 } from 'lucide-react';

interface AiStatusStepProps {
  data: ForgeAiStatus;
  loading: boolean;
  error: boolean;
  onRetry: () => void;
}

export function AiStatusStep({ data, loading, error, onRetry }: AiStatusStepProps) {
  if (loading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
    );
  }

  if (error) {
    return <ErrorState title="Unable to load AI status" onRetry={onRetry} />;
  }

  const operational = data.activeProviders.length > 0;

  return (
    <div>
      <div
        className={`rounded-md border px-3 py-2.5 mb-4 flex items-start gap-2 ${
          operational
            ? 'bg-forge-success/10 border-forge-success/20'
            : 'bg-forge-bg border-forge-border-subtle'
        }`}
      >
        <Cpu className={`h-4 w-4 mt-0.5 shrink-0 ${operational ? 'text-forge-success' : 'text-forge-text-muted'}`} />
        <div>
          <p className="text-sm font-medium text-forge-text-primary">
            {operational ? 'Forge AI is ready' : 'Forge AI is managed for you'}
          </p>
          <p className="text-xs text-forge-text-muted mt-0.5">
            AI access is included according to your subscription plan — no API keys are required.
          </p>
        </div>
      </div>

      <div className="rounded-md border border-forge-border-subtle divide-y divide-forge-border-subtle">
        <div className="flex items-center justify-between gap-3 px-3 py-2.5">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm text-forge-text-primary">AI service</span>
              <span className="inline-flex items-center gap-1 text-xs text-forge-success">
                <CheckCircle2 className="h-3.5 w-3.5" /> Included
              </span>
            </div>
            <p className="text-xs text-forge-text-muted mt-0.5">
              {data.planLabel} plan · {data.monthlyCreditLimit.toLocaleString('en-US')} monthly credits
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}