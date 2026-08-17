import { FileText, Layers, Layout, Palette } from 'lucide-react';
import type { StructureKind } from '@/services/projectFilesService';

export function kindIcon(kind: StructureKind) {
  switch (kind) {
    case 'page':
      return <FileText className="h-3.5 w-3.5" />;
    case 'component':
      return <Layers className="h-3.5 w-3.5" />;
    case 'section':
      return <Layout className="h-3.5 w-3.5" />;
    case 'theme':
      return <Palette className="h-3.5 w-3.5" />;
    default:
      return <FileText className="h-3.5 w-3.5" />;
  }
}

export function kindLabel(kind: StructureKind): string {
  switch (kind) {
    case 'page':
      return 'Page';
    case 'component':
      return 'Component';
    case 'section':
      return 'Section';
    case 'theme':
      return 'Theme';
    default:
      return kind;
  }
}