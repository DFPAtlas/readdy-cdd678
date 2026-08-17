import { Link } from 'react-router-dom';
import { Card } from '@/components/ui/Card';
import {
  Code, Database, Users, Workflow, FileText, Image, Hammer, GitBranch, Download, Settings,
} from 'lucide-react';

interface QuickAccessProps {
  projectId: string;
}

const quickLinks = [
  { label: 'Sandbox', path: 'sandbox', icon: <Code className="h-4 w-4" /> },
  { label: 'CMS', path: 'cms', icon: <Database className="h-4 w-4" /> },
  { label: 'Members', path: 'members', icon: <Users className="h-4 w-4" /> },
  { label: 'Workflows', path: 'workflows', icon: <Workflow className="h-4 w-4" /> },
  { label: 'Files', path: 'files', icon: <FileText className="h-4 w-4" /> },
  { label: 'Assets', path: 'assets', icon: <Image className="h-4 w-4" /> },
  { label: 'Builds', path: 'builds', icon: <Hammer className="h-4 w-4" /> },
  { label: 'Versions', path: 'versions', icon: <GitBranch className="h-4 w-4" /> },
  { label: 'Exports', path: 'exports', icon: <Download className="h-4 w-4" /> },
  { label: 'Settings', path: 'settings', icon: <Settings className="h-4 w-4" /> },
];

export function QuickAccess({ projectId }: QuickAccessProps) {
  return (
    <Card className="p-4">
      <h2 className="text-sm font-semibold text-forge-text-primary mb-3">Quick access</h2>
      <div className="grid grid-cols-2 gap-1.5">
        {quickLinks.map((link) => (
          <Link
            key={link.path}
            to={`/projects/${projectId}/${link.path}`}
            className="flex items-center gap-2 px-2.5 py-2 rounded-md text-xs text-forge-text-secondary hover:bg-forge-hover hover:text-forge-text-primary transition-colors"
          >
            <span className="text-forge-text-muted flex-shrink-0">{link.icon}</span>
            <span className="truncate">{link.label}</span>
          </Link>
        ))}
      </div>
    </Card>
  );
}