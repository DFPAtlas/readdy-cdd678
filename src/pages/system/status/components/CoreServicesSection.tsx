import type { CoreService } from '@/services/systemStatusService';
import { Card } from '@/components/ui/Card';
import { StatusIndicator } from './StatusIndicator';

export function CoreServicesSection({ services }: { services: CoreService[] }) {
  return (
    <section aria-labelledby="core-services-title">
      <h2 id="core-services-title" className="text-sm font-semibold text-forge-text-primary mb-2">
        Core services
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {services.map((svc) => (
          <Card key={svc.key} className="p-4">
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <h3 className="text-sm font-medium text-forge-text-primary">{svc.name}</h3>
              <StatusIndicator status={svc.status} />
            </div>
            <p className="text-xs text-forge-text-muted leading-relaxed">{svc.description}</p>
            <p className="mt-2 text-[11px] text-forge-text-muted/80 leading-relaxed">{svc.detail}</p>
          </Card>
        ))}
      </div>
    </section>
  );
}