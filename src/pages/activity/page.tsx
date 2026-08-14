import { useState } from 'react';
import { Link } from 'react-router-dom';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { SearchInput } from '@/components/ui/SearchInput';
import { demoActivityFeed } from '@/services/mock/demoData';
import type { DemoActivityItem } from '@/services/mock/demoData';
import { Activity, Clock, Filter, X, Hammer, GitBranch, Download, FolderKanban, Image as ImageIcon, Cpu, AlertTriangle } from 'lucide-react';

const typeIcons: Record<string, React.ReactNode> = {
  build: <Hammer className="h-4 w-4 text-amber-500" />,
  version: <GitBranch className="h-4 w-4 text-sky-500" />,
  export: <Download className="h-4 w-4 text-violet-500" />,
  project: <FolderKanban className="h-4 w-4 text-emerald-500" />,
  asset: <ImageIcon className="h-4 w-4 text-rose-500" />,
  system: <AlertTriangle className="h-4 w-4 text-foreground-400" />,
  provider: <Cpu className="h-4 w-4 text-sky-500" />,
  blueprint: <Activity className="h-4 w-4 text-amber-500" />,
};

export default function ActivityPage() {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [projectFilter, setProjectFilter] = useState('all');
  const [selectedItem, setSelectedItem] = useState<DemoActivityItem | null>(null);

  const uniqueProjects = [...new Set(demoActivityFeed.filter((a) => a.projectName).map((a) => a.projectName))];

  const filtered = demoActivityFeed.filter((a) => {
    if (typeFilter !== 'all' && a.type !== typeFilter) return false;
    if (projectFilter !== 'all' && a.projectName !== projectFilter) return false;
    if (search && !a.action.toLowerCase().includes(search.toLowerCase()) && !a.user.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <>
      <PageHeader
        title="Activity"
        description="Workspace-wide activity feed"
        breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Activity' }]}
      />

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <SearchInput value={search} onChange={setSearch} placeholder="Search activity..." className="w-48" />
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="h-8 px-2.5 text-xs rounded-lg border border-background-200 bg-white text-foreground-950 focus:outline-none focus:ring-1 focus:ring-amber-500"
        >
          <option value="all">All Types</option>
          <option value="build">Build</option>
          <option value="version">Version</option>
          <option value="export">Export</option>
          <option value="project">Project</option>
          <option value="asset">Asset</option>
          <option value="provider">Provider</option>
          <option value="system">System</option>
        </select>
        <select
          value={projectFilter}
          onChange={(e) => setProjectFilter(e.target.value)}
          className="h-8 px-2.5 text-xs rounded-lg border border-background-200 bg-white text-foreground-950 focus:outline-none focus:ring-1 focus:ring-amber-500"
        >
          <option value="all">All Projects</option>
          {uniqueProjects.map((p) => (
            <option key={p!} value={p!}>{p}</option>
          ))}
        </select>
      </div>

      {/* Activity list */}
      <Card className="overflow-hidden">
        <div className="divide-y divide-background-50">
          {filtered.map((item) => (
            <div
              key={item.id}
              className="flex items-start gap-3 px-4 py-3 hover:bg-background-50 transition-colors cursor-pointer"
              onClick={() => setSelectedItem(item)}
            >
              <div className={`h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${
                item.type === 'build' ? 'bg-amber-500/10' :
                item.type === 'export' ? 'bg-violet-500/10' :
                item.type === 'system' ? 'bg-foreground-100' :
                'bg-background-100'
              }`}>
                {typeIcons[item.type]}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-sm font-medium text-foreground-950">{item.action}</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  {item.projectName && (
                    <>
                      <Link
                        to={item.projectId ? `/projects/${item.projectId}/overview` : '#'}
                        className="text-amber-500 hover:text-amber-400"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {item.projectName}
                      </Link>
                      <span className="text-foreground-300">·</span>
                    </>
                  )}
                  <span className="text-foreground-500">{item.user}</span>
                  <span className="text-foreground-300">·</span>
                  <span className="text-foreground-400 flex items-center gap-0.5">
                    <Clock className="h-2.5 w-2.5" />
                    {new Date(item.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </span>
                  {item.details && (
                    <>
                      <span className="text-foreground-300">·</span>
                      <span className="text-foreground-500 truncate max-w-[200px]">{item.details}</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Detail drawer */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={() => setSelectedItem(null)}>
          <div className="bg-white rounded-xl max-w-sm w-full mx-4 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-background-100">
              <h3 className="text-sm font-semibold text-foreground-950">Activity Detail</h3>
              <button onClick={() => setSelectedItem(null)} className="p-1 rounded-md hover:bg-background-100 transition-colors">
                <X className="h-4 w-4 text-foreground-500" />
              </button>
            </div>
            <div className="p-5 space-y-3">
              <div className="flex items-center gap-3">
                <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${
                  selectedItem.type === 'build' ? 'bg-amber-500/10' : 'bg-background-100'
                }`}>
                  {typeIcons[selectedItem.type]}
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground-950">{selectedItem.action}</p>
                  <Badge size="sm" variant="default">{selectedItem.type}</Badge>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-background-50 rounded-lg p-2.5">
                  <p className="text-foreground-500">User</p>
                  <p className="font-medium text-foreground-950">{selectedItem.user}</p>
                </div>
                <div className="bg-background-50 rounded-lg p-2.5">
                  <p className="text-foreground-500">Time</p>
                  <p className="font-medium text-foreground-950">{new Date(selectedItem.timestamp).toLocaleString()}</p>
                </div>
                {selectedItem.projectName && (
                  <div className="bg-background-50 rounded-lg p-2.5 col-span-2">
                    <p className="text-foreground-500">Project</p>
                    <p className="font-medium text-foreground-950">{selectedItem.projectName}</p>
                  </div>
                )}
                {selectedItem.details && (
                  <div className="bg-background-50 rounded-lg p-2.5 col-span-2">
                    <p className="text-foreground-500">Details</p>
                    <p className="font-medium text-foreground-950">{selectedItem.details}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}