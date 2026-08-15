import { EmptyState } from '@/components/ui/EmptyState';
import { CmsIcon } from './CmsIcon';

const SECTION_DETAIL: Record<string, { icon: string; title: string; description: string }> = {
  'dynamic-pages': {
    icon: 'layers',
    title: 'Dynamic pages',
    description: 'Turn a collection into a list page and a reusable detail page (e.g. /services and /services/{slug}), edited on the normal Forge canvas.',
  },
  relationships: {
    icon: 'database',
    title: 'Relationships',
    description: 'Link items across collections — one-to-one, one-to-many and many-to-many — with project-scoped, loop-safe references.',
  },
  imports: {
    icon: 'database',
    title: 'Imports',
    description: 'Import content from CSV or JSON with field mapping, validation, formula-injection protection and a review report.',
  },
  exports: {
    icon: 'database',
    title: 'Exports',
    description: 'Export collections to CSV or JSON through short-lived, private download links.',
  },
  settings: {
    icon: 'database',
    title: 'CMS settings',
    description: 'Configure scheduling, SEO field mappings, publishing and default content behaviour for the project.',
  },
};

export function PlaceholderSection({ section }: { section: string }) {
  const detail = SECTION_DETAIL[section] ?? { icon: 'layers', title: section, description: 'This area is part of the next CMS milestone.' };
  return (
    <div className="rounded-lg border border-forge-border-subtle bg-forge-panel">
      <EmptyState
        icon={<CmsIcon name={detail.icon} className="h-8 w-8" />}
        title={detail.title}
        description={`${detail.description} This section ships in the next CMS milestone.`}
      />
    </div>
  );
}