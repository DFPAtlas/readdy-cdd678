import { Link } from 'react-router-dom';
import { Card } from '@/components/ui/Card';
import { Plus, LayoutTemplate, Cpu, Activity, BookOpen, ChevronRight, type LucideIcon } from 'lucide-react';

interface QuickAction {
  label: string;
  href: string;
  icon: LucideIcon;
}

const actions: QuickAction[] = [
  { label: 'New Project', href: '/projects/new', icon: Plus },
  { label: 'Open Templates', href: '/templates', icon: LayoutTemplate },
  { label: 'Manage AI Providers', href: '/settings/providers', icon: Cpu },
  { label: 'System Status', href: '/system/status', icon: Activity },
  { label: 'Help & Documentation', href: '/help', icon: BookOpen },
];

export function QuickActions() {
  return (
    <section aria-labelledby="quick-actions-heading">
      <h2 id="quick-actions-heading" className="text-sm font-semibold text-forge-text-primary mb-3">
        Quick actions
      </h2>

      <Card className="p-1 divide-y divide-forge-border-subtle">
        {actions.map((action) => (
          <Link
            key={action.href}
            to={action.href}
            className="flex items-center gap-3 px-3 py-2.5 rounded-md text-forge-text-primary hover:bg-forge-hover transition-colors group"
          >
            <div className="h-7 w-7 rounded-md bg-forge-hover flex items-center justify-center text-forge-text-secondary shrink-0">
              <action.icon className="h-3.5 w-3.5" />
            </div>
            <span className="text-xs flex-1 truncate">{action.label}</span>
            <ChevronRight className="h-3.5 w-3.5 text-forge-text-muted opacity-0 group-hover:opacity-100 transition-opacity" />
          </Link>
        ))}
      </Card>
    </section>
  );
}