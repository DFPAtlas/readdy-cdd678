import { Eye } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { MiniPreview } from './MiniPreview';
import type { StarterDisplay } from '../templatesData';

export function StarterCard({
  starter,
  onPreview,
}: {
  starter: StarterDisplay;
  onPreview: (starter: StarterDisplay) => void;
}) {
  return (
    <Card className="p-0 overflow-hidden flex flex-col group hover:border-forge-border transition-colors">
      <button
        type="button"
        onClick={() => onPreview(starter)}
        className="block w-full text-left cursor-pointer"
        aria-label={`Preview the ${starter.name} starter`}
      >
        <MiniPreview manifest={starter.manifest} />
      </button>

      <div className="p-3 flex flex-col flex-1">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-sm font-medium text-forge-text-primary leading-snug">{starter.name}</h3>
          <Badge variant="amber" size="sm" className="shrink-0">
            {starter.typeLabel}
          </Badge>
        </div>

        <p className="text-xs text-forge-text-muted mt-1 line-clamp-2">{starter.description}</p>

        <div className="flex flex-wrap items-center gap-1 mt-2">
          <Badge variant="default" size="sm">
            {starter.pageCount} {starter.pageCount === 1 ? 'page' : 'pages'}
          </Badge>
          {starter.tags.map((tag) => (
            <Badge key={tag} variant="default" size="sm">
              {tag}
            </Badge>
          ))}
        </div>

        <div className="mt-auto pt-3">
          <Button
            variant="secondary"
            size="sm"
            className="w-full"
            onClick={() => onPreview(starter)}
          >
            <Eye className="h-3.5 w-3.5" />
            Preview
          </Button>
        </div>
      </div>
    </Card>
  );
}