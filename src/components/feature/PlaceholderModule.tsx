import { ReactNode } from 'react';
import { Card } from '@/components/ui/Card';
import { Construction } from 'lucide-react';

interface PlaceholderModuleProps {
  title: string;
  description: string;
  phase?: string;
  children?: ReactNode;
}

export function PlaceholderModule({ title, description, phase, children }: PlaceholderModuleProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <div className="h-16 w-16 rounded-2xl bg-forge-border flex items-center justify-center mb-6">
        <Construction className="h-8 w-8 text-forge-text-muted" />
      </div>
      <h2 className="text-lg font-semibold text-forge-text-primary mb-2">{title}</h2>
      <p className="text-sm text-forge-text-muted max-w-md text-center mb-6">{description}</p>
      {children && <div className="mb-6">{children}</div>}
      <Card className="px-4 py-2 bg-forge-bg">
        <p className="text-xs text-forge-text-muted">
          Demo module — {phase ? `Will be built in ${phase}` : 'Live connection added later'}
        </p>
      </Card>
    </div>
  );
}