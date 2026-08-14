import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { getServiceStatuses } from '@/services/mock/demoData';
import type { SystemService } from '@/types';
import { Wrench, RotateCcw, CheckCircle, AlertTriangle, XCircle, Clock, HardDrive, Activity } from 'lucide-react';

const statusIconMap: Record<string, React.ReactNode> = {
  online: <CheckCircle className="h-4 w-4 text-emerald-500" />,
  degraded: <AlertTriangle className="h-4 w-4 text-amber-500" />,
  offline: <XCircle className="h-4 w-4 text-rose-500" />,
  unknown: <Clock className="h-4 w-4 text-foreground-400" />,
};

export default function SystemStatusPage() {
  const [services, setServices] = useState<SystemService[]>(getServiceStatuses());
  const [checking, setChecking] = useState(false);

  const handleCheckAgain = () => {
    setChecking(true);
    setTimeout(() => {
      setServices(getServiceStatuses());
      setChecking(false);
    }, 1200);
  };

  const onlineCount = services.filter((s) => s.status === 'online').length;
  const degradedCount = services.filter((s) => s.status === 'degraded').length;
  const overallStatus = degradedCount > 0 ? 'degraded' : onlineCount === services.length ? 'online' : 'offline';

  return (
    <>
      <PageHeader
        title="System Status"
        description="Monitor the health and performance of all connected services"
        actions={
          <Button size="sm" variant="ghost" onClick={handleCheckAgain} disabled={checking} icon={<RotateCcw className={`h-3.5 w-3.5 ${checking ? 'animate-spin' : ''}`} />}>
            {checking ? 'Checking...' : 'Check Again'}
          </Button>
        }
        breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'System Status' }]}
      />

      {/* Overall status banner */}
      <div className={`rounded-lg p-4 mb-6 ${
        overallStatus === 'online' ? 'bg-emerald-500/5 border border-emerald-500/20' :
        overallStatus === 'degraded' ? 'bg-amber-500/5 border border-amber-500/20' :
        'bg-rose-500/5 border border-rose-500/20'
      }`}>
        <div className="flex items-center gap-3">
          {statusIconMap[overallStatus]}
          <div>
            <p className="text-sm font-semibold text-foreground-950 capitalize">{overallStatus === 'online' ? 'All Systems Operational' : overallStatus === 'degraded' ? 'Some Services Degraded' : 'Services Offline'}</p>
            <p className="text-xs text-foreground-500">{onlineCount} of {services.length} services online</p>
          </div>
        </div>
      </div>

      {/* Service cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
        {services.map((svc) => (
          <Card key={svc.id} className="p-3">
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2">
                <Wrench className="h-4 w-4 text-foreground-400" />
                <h3 className="text-sm font-medium text-foreground-950">{svc.name}</h3>
              </div>
              <Badge variant={
                svc.status === 'online' ? 'success' : svc.status === 'degraded' ? 'warning' : 'danger'
              } size="sm">{svc.status}</Badge>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <p className="text-foreground-500">Latency</p>
                <p className="font-mono text-foreground-950">{svc.latency ?? '—'}ms</p>
              </div>
              <div>
                <p className="text-foreground-500">Version</p>
                <p className="font-mono text-foreground-950">{svc.version || '—'}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* System info cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Active Builds', value: '1', sub: 'Wedora v5 running', icon: <Activity className="h-4 w-4 text-amber-500" /> },
          { label: 'Active Previews', value: '2', sub: 'Ports 5173, 5174', icon: <Activity className="h-4 w-4 text-sky-500" /> },
          { label: 'Storage', value: '7.2 GB / 10 GB', sub: '72% used', icon: <HardDrive className="h-4 w-4 text-emerald-500" /> },
          { label: 'Last Backup', value: '2 hours ago', sub: 'Auto-backup enabled', icon: <Clock className="h-4 w-4 text-foreground-400" /> },
        ].map((item) => (
          <Card key={item.label} className="p-3">
            <div className="flex items-center gap-2 mb-1">
              {item.icon}
              <span className="text-xs text-foreground-500">{item.label}</span>
            </div>
            <p className="text-sm font-semibold text-foreground-950">{item.value}</p>
            <p className="text-xs text-foreground-400">{item.sub}</p>
          </Card>
        ))}
      </div>
    </>
  );
}