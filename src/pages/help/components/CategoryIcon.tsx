import {
  Rocket, Folder, Layout, Sparkles, GitBranch, FileCode, Database,
  Users, Workflow, Package, CreditCard, Wrench, Scale, type LucideIcon,
} from 'lucide-react';

const ICONS: Record<string, LucideIcon> = {
  rocket: Rocket,
  folder: Folder,
  layout: Layout,
  sparkles: Sparkles,
  'git-branch': GitBranch,
  'file-code': FileCode,
  database: Database,
  users: Users,
  workflow: Workflow,
  package: Package,
  'credit-card': CreditCard,
  wrench: Wrench,
  scale: Scale,
};

export function CategoryIcon({ name, className }: { name: string; className?: string }) {
  const Icon = ICONS[name] ?? Rocket;
  return <Icon className={className} aria-hidden="true" />;
}