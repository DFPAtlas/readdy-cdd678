import type { LucideIcon } from 'lucide-react';
import {
  FileText, Briefcase, Users, Folder, Home, ShoppingBag, Calendar,
  HelpCircle, Quote, MapPin, Layers, Star, Database, Type, AlignLeft,
  Text, Hash, CircleDollarSign, ToggleLeft, CalendarDays, Clock, Mail,
  Phone, Link2, Palette, Image, Images, Video, Paperclip, ListChecks,
  ChevronDownSquare, GitBranch, Globe2, Braces,
} from 'lucide-react';

const COLLECTION_ICONS: Record<string, LucideIcon> = {
  'file-text': FileText,
  briefcase: Briefcase,
  users: Users,
  folder: Folder,
  home: Home,
  'shopping-bag': ShoppingBag,
  calendar: Calendar,
  'help-circle': HelpCircle,
  quote: Quote,
  'map-pin': MapPin,
  layers: Layers,
  star: Star,
  database: Database,
};

const FIELD_ICONS: Record<string, LucideIcon> = {
  text: Type,
  textarea: AlignLeft,
  richtext: Text,
  number: Hash,
  currency: CircleDollarSign,
  boolean: ToggleLeft,
  date: CalendarDays,
  datetime: Clock,
  email: Mail,
  tel: Phone,
  url: Link2,
  slug: Link2,
  color: Palette,
  image: Image,
  gallery: Images,
  video: Video,
  file: Paperclip,
  select: ListChecks,
  multiselect: ChevronDownSquare,
  reference: GitBranch,
  multireference: GitBranch,
  location: Globe2,
  json: Braces,
};

export function CmsIcon({ name, className }: { name: string; className?: string }) {
  const Icon = COLLECTION_ICONS[name] ?? Layers;
  return <Icon className={className ?? 'h-4 w-4'} />;
}

export function CmsFieldIcon({ type, className }: { type: string; className?: string }) {
  const Icon = FIELD_ICONS[type] ?? Type;
  return <Icon className={className ?? 'h-4 w-4'} />;
}