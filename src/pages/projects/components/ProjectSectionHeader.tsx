import type { ReactNode } from 'react';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';

interface ProjectSectionHeaderProps {
  eyebrow: string;
  title: string;
  description: string;
  projectId: string;
  projectName: string;
  actions?: ReactNode;
}

export function ProjectSectionHeader({
  eyebrow,
  title,
  description,
  projectId,
  projectName,
  actions,
}: ProjectSectionHeaderProps) {
  return (
    <div className="mb-6">
      <Breadcrumbs
        items={[
          { label: 'Projects', href: '/projects' },
          { label: projectName, href: `/projects/${projectId}/overview` },
          { label: title },
        ]}
        className="mb-3"
      />
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-forge-text-muted mb-1">
            {eyebrow}
          </p>
          <h1 className="text-lg font-semibold text-forge-text-primary">{title}</h1>
          <p className="mt-1 text-sm text-forge-text-muted max-w-2xl">{description}</p>
        </div>
        {actions && <div className="flex-shrink-0 flex items-center gap-2">{actions}</div>}
      </div>
    </div>
  );
}