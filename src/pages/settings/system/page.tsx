import { Card } from '@/components/ui/Card';
import { LinkButton } from '@/pages/dashboard/components/LinkButton';
import { Activity, Info } from 'lucide-react';

export default function SettingsSystemPage() {
  return (
    <div className="max-w-xl space-y-4">
      <div>
        <h2 className="text-base font-semibold text-forge-text-primary">System</h2>
        <p className="text-sm text-forge-text-muted mt-0.5">
          Global Forge health and configuration. Project-specific settings live on each project's own settings page.
        </p>
      </div>

      <Card className="p-4">
        <div className="flex items-start gap-3">
          <div className="flex items-center justify-center h-9 w-9 rounded-md bg-forge-border text-forge-text-secondary shrink-0">
            <Activity className="h-4 w-4" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-forge-text-primary">System status</h3>
            <p className="text-sm text-forge-text-muted mt-1 leading-relaxed">
              View the health and latency of Forge's connected services — API, database, auth, storage and
              more — with a live check.
            </p>
            <div className="mt-3">
              <LinkButton to="/system/status" variant="secondary" size="sm">
                View System Status
              </LinkButton>
            </div>
          </div>
        </div>
      </Card>

      <Card className="p-4">
        <div className="flex items-start gap-3">
          <div className="flex items-center justify-center h-9 w-9 rounded-md bg-forge-border text-forge-text-secondary shrink-0">
            <Info className="h-4 w-4" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-forge-text-primary">Where other settings live</h3>
            <ul className="mt-2 space-y-1.5 text-sm text-forge-text-muted">
              <li>
                <span className="text-forge-text-secondary">Account &amp; profile</span> — display name, email and plan.
              </li>
              <li>
                <span className="text-forge-text-secondary">Appearance</span> — theme preference.
              </li>
              <li>
                <span className="text-forge-text-secondary">AI Providers</span> — the models and credentials Forge uses.
              </li>
              <li>
                <span className="text-forge-text-secondary">Project settings</span> — per-project details, access and AI
                configuration.
              </li>
            </ul>
            <p className="text-xs text-forge-text-muted mt-3 leading-relaxed">
              There are no additional global system preferences to configure in this area.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}