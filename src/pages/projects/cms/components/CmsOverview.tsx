import type { ReactNode } from 'react';
import { Layers, FileText, FileEdit, CheckCircle2 } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import type { ProjectCmsData } from '@/services/projectCmsService';

export function CmsOverview({ data }: { data: ProjectCmsData }) {
  const cards: { label: string; value: number; icon: ReactNode }[] = [
    { label: 'Content types', value: data.collections.length, icon: <Layers className="h-4 w-4" /> },
    { label: 'Content items', value: data.totalItems, icon: <FileText className="h-4 w-4" /> },
    { label: 'Drafts', value: data.draftCount, icon: <FileEdit className="h-4 w-4" /> },
    { label: 'Published', value: data.publishedCount, icon: <CheckCircle2 className="h-4 w-4" /> },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {cards.map((c) => (
        <Card key={c.label} className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-md bg-forge-amber/10 text-forge-amber flex items-center justify-center shrink-0">
            {c.icon}
          </div>
          <div className="min-w-0">
            <p className="text-lg font-semibold text-forge-text-primary leading-tight">{c.value}</p>
            <p className="text-xs text-forge-text-muted truncate">{c.label}</p>
          </div>
        </Card>
      ))}
    </div>
  );
}