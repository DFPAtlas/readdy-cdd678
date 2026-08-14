import { ReactNode } from 'react';
import { Construction } from 'lucide-react';

interface FeatureGateProps {
  feature: string;
  fallback?: ReactNode;
  children: ReactNode;
}

const enabledFeatures = ['sandbox', 'files', 'builds', 'versions', 'exports', 'preview', 'agents', 'templates'];

export function FeatureGate({ feature, fallback, children }: FeatureGateProps) {
  const isEnabled = enabledFeatures.includes(feature);

  if (!isEnabled) {
    return fallback ? (
      <>{fallback}</>
    ) : (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <Construction className="h-8 w-8 text-forge-text-muted mb-2" />
        <p className="text-sm text-forge-text-muted">This feature is coming soon.</p>
      </div>
    );
  }

  return <>{children}</>;
}