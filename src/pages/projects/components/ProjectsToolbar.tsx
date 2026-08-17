import { SearchInput } from '@/components/ui/SearchInput';
import {
  PROJECT_STATUS_OPTIONS,
  type ProjectStatusValue,
} from '@/services/projectsService';
import { Grid3X3, List } from 'lucide-react';

export type ProjectsViewMode = 'grid' | 'list';
export type ProjectsSort = 'updated' | 'created' | 'name';

interface ProjectsToolbarProps {
  search: string;
  onSearch: (value: string) => void;
  statusFilter: ProjectStatusValue | 'all';
  onStatusFilter: (value: ProjectStatusValue | 'all') => void;
  sort: ProjectsSort;
  onSort: (value: ProjectsSort) => void;
  viewMode: ProjectsViewMode;
  onViewMode: (value: ProjectsViewMode) => void;
}

const sortOptions: { value: ProjectsSort; label: string }[] = [
  { value: 'updated', label: 'Recently updated' },
  { value: 'created', label: 'Recently created' },
  { value: 'name', label: 'Name A–Z' },
];

export function ProjectsToolbar({
  search,
  onSearch,
  statusFilter,
  onStatusFilter,
  sort,
  onSort,
  viewMode,
  onViewMode,
}: ProjectsToolbarProps) {
  return (
    <div className="flex flex-col gap-3 mb-5">
      <div className="flex flex-wrap items-center gap-2">
        <SearchInput
          value={search}
          onChange={onSearch}
          placeholder="Search projects..."
          className="w-full sm:w-64"
          ariaLabel="Search projects"
        />

        <div className="flex-1" />

        <div className="flex items-center gap-2">
          <label htmlFor="projects-sort" className="text-xs text-forge-text-muted whitespace-nowrap">
            Sort
          </label>
          <select
            id="projects-sort"
            value={sort}
            onChange={(e) => onSort(e.target.value as ProjectsSort)}
            className="h-7 px-2.5 pr-7 rounded-md bg-forge-bg border border-forge-border text-forge-text-primary text-xs focus:outline-none focus:border-forge-amber focus:ring-1 focus:ring-forge-amber/30 cursor-pointer"
          >
            {sortOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <div
          className="flex items-center gap-0.5 p-0.5 rounded-md bg-forge-bg border border-forge-border-subtle"
          role="group"
          aria-label="View mode"
        >
          <button
            type="button"
            onClick={() => onViewMode('grid')}
            aria-label="Grid view"
            aria-pressed={viewMode === 'grid'}
            className={`h-7 w-7 flex items-center justify-center rounded transition-colors ${
              viewMode === 'grid'
                ? 'bg-forge-amber text-forge-text-inverse'
                : 'text-forge-text-muted hover:text-forge-text-primary hover:bg-forge-hover'
            }`}
          >
            <Grid3X3 className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onViewMode('list')}
            aria-label="List view"
            aria-pressed={viewMode === 'list'}
            className={`h-7 w-7 flex items-center justify-center rounded transition-colors ${
              viewMode === 'list'
                ? 'bg-forge-amber text-forge-text-inverse'
                : 'text-forge-text-muted hover:text-forge-text-primary hover:bg-forge-hover'
            }`}
          >
            <List className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Filter by status">
        {PROJECT_STATUS_OPTIONS.map((opt) => {
          const active = statusFilter === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onStatusFilter(opt.value)}
              aria-pressed={active}
              className={`h-7 px-3 rounded-full text-xs font-medium transition-colors whitespace-nowrap ${
                active
                  ? 'bg-forge-amber text-forge-text-inverse'
                  : 'text-forge-text-secondary hover:bg-forge-hover hover:text-forge-text-primary border border-forge-border-subtle'
              }`}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}