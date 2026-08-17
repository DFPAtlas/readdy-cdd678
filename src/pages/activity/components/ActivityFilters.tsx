import { SearchInput } from '@/components/ui/SearchInput';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { X } from 'lucide-react';
import type { ActivityFilters, ActivityProject, ActivityKind, ActivityStatus } from '@/services/activityService';

interface ActivityFiltersProps {
  filters: ActivityFilters;
  projects: ActivityProject[];
  onChange: (patch: Partial<ActivityFilters>) => void;
  onClear: () => void;
  hasActiveFilters: boolean;
}

const kindOptions: { value: ActivityKind | 'all'; label: string }[] = [
  { value: 'all', label: 'All types' },
  { value: 'project', label: 'Projects' },
  { value: 'build', label: 'Builds' },
  { value: 'ai', label: 'AI' },
  { value: 'version', label: 'Versions' },
  { value: 'export', label: 'Exports' },
];

const statusOptions: { value: ActivityStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'All statuses' },
  { value: 'success', label: 'Success' },
  { value: 'running', label: 'Running' },
  { value: 'failed', label: 'Failed' },
  { value: 'info', label: 'Info' },
];

const dateOptions: { value: ActivityFilters['dateRange']; label: string }[] = [
  { value: 'all', label: 'All time' },
  { value: 'today', label: 'Today' },
  { value: '7d', label: '7 days' },
  { value: '30d', label: '30 days' },
];

export function ActivityFilters({ filters, projects, onChange, onClear, hasActiveFilters }: ActivityFiltersProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <SearchInput
        value={filters.search}
        onChange={(value) => onChange({ search: value })}
        placeholder="Search activity..."
        ariaLabel="Search activity"
        className="w-full sm:w-56"
      />

      <Select
        aria-label="Filter by type"
        value={filters.kind}
        onChange={(e) => onChange({ kind: e.target.value as ActivityKind | 'all' })}
        options={kindOptions}
      />

      <Select
        aria-label="Filter by project"
        value={filters.projectId}
        onChange={(e) => onChange({ projectId: e.target.value })}
        options={[
          { value: 'all', label: 'All projects' },
          ...projects.map((p) => ({ value: p.id, label: p.name })),
        ]}
      />

      <Select
        aria-label="Filter by status"
        value={filters.status}
        onChange={(e) => onChange({ status: e.target.value as ActivityStatus | 'all' })}
        options={statusOptions}
      />

      <Select
        aria-label="Filter by date"
        value={filters.dateRange}
        onChange={(e) => onChange({ dateRange: e.target.value as ActivityFilters['dateRange'] })}
        options={dateOptions}
      />

      {hasActiveFilters && (
        <Button variant="ghost" size="sm" onClick={onClear} icon={<X className="h-3.5 w-3.5" />}>
          Clear filters
        </Button>
      )}
    </div>
  );
}