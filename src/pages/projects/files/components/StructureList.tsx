import { useState } from 'react';
import { ChevronDown, ChevronRight, FolderOpen } from 'lucide-react';
import type { StructureGroup, StructureNode } from '@/services/projectFilesService';
import { kindIcon } from './nodeIcons';

interface StructureListProps {
  groups: StructureGroup[];
  selectedId: string | null;
  onSelect: (node: StructureNode) => void;
  defaultExpanded?: boolean;
}

export function StructureList({ groups, selectedId, onSelect, defaultExpanded = false }: StructureListProps) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const isExpanded = (id: string) => (defaultExpanded ? true : expanded[id] ?? false);

  const toggle = (id: string) => {
    if (defaultExpanded) return;
    setExpanded((prev) => ({ ...prev, [id]: !(prev[id] ?? false) }));
  };

  return (
    <div className="py-1">
      {groups.map((group) => (
        <div key={group.id}>
          <button
            onClick={() => toggle(group.id)}
            className="w-full flex items-center gap-1.5 px-2 py-1.5 text-left text-xs font-medium text-forge-text-secondary hover:bg-forge-hover transition-colors"
            aria-expanded={isExpanded(group.id)}
          >
            {isExpanded(group.id) ? (
              <ChevronDown className="h-3 w-3 flex-shrink-0 text-forge-text-muted" />
            ) : (
              <ChevronRight className="h-3 w-3 flex-shrink-0 text-forge-text-muted" />
            )}
            <FolderOpen className="h-3.5 w-3.5 flex-shrink-0 text-forge-amber" />
            <span className="truncate">{group.name}</span>
            <span className="ml-auto text-[10px] text-forge-text-muted">{group.children.length}</span>
          </button>

          {isExpanded(group.id) && (
            <div>
              {group.children.map((node) => {
                const active = selectedId === node.id;
                return (
                  <button
                    key={node.id}
                    onClick={() => onSelect(node)}
                    className={`w-full flex items-center gap-2 pl-8 pr-2 py-1.5 text-left text-xs transition-colors ${
                      active
                        ? 'bg-forge-amber/10 text-forge-amber'
                        : 'text-forge-text-secondary hover:bg-forge-hover hover:text-forge-text-primary'
                    }`}
                    aria-current={active ? 'true' : undefined}
                  >
                    <span
                      className={`flex-shrink-0 ${
                        active ? 'text-forge-amber' : 'text-forge-text-muted'
                      }`}
                    >
                      {kindIcon(node.kind)}
                    </span>
                    <span className="truncate">{node.name}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}