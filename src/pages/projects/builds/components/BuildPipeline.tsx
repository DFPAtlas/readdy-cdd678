import { BUILD_PIPELINE_STAGES } from '@/services/projectBuildsService';
import { ArrowRight } from 'lucide-react';

export function BuildPipeline() {
  return (
    <div className="rounded-lg border border-forge-border-subtle bg-forge-panel p-4">
      <h3 className="text-sm font-semibold text-forge-text-primary mb-3">Build pipeline</h3>
      <div className="flex flex-wrap items-center gap-y-2">
        {BUILD_PIPELINE_STAGES.map((stage, i) => (
          <div key={stage} className="flex items-center">
            <span className="px-2.5 py-1 rounded-md border border-forge-border-subtle bg-forge-bg text-xs text-forge-text-secondary whitespace-nowrap">
              {stage}
            </span>
            {i < BUILD_PIPELINE_STAGES.length - 1 && (
              <ArrowRight className="h-3.5 w-3.5 text-forge-text-muted mx-1 flex-shrink-0" />
            )}
          </div>
        ))}
      </div>
      <p className="mt-3 text-xs text-forge-text-muted">
        Forge validates your blueprint, generates static files and packages them into a portable build.
      </p>
    </div>
  );
}