/* ──────────────────────────────────────────────────────────────
   Forge CMS — domain types, field catalogue and preset templates.
   Schema is authoritative on the server; these types mirror the
   cms_collections / cms_fields / cms_items tables.
   ────────────────────────────────────────────────────────────── */

export type CmsFieldType =
  | 'text' | 'textarea' | 'richtext' | 'number' | 'currency'
  | 'boolean' | 'date' | 'datetime' | 'email' | 'tel' | 'url' | 'slug'
  | 'color' | 'image' | 'gallery' | 'video' | 'file' | 'select'
  | 'multiselect' | 'reference' | 'multireference' | 'location' | 'json';

export const CMS_FIELD_TYPES: { value: CmsFieldType; label: string; description: string }[] = [
  { value: 'text', label: 'Short text', description: 'Single-line text' },
  { value: 'textarea', label: 'Long text', description: 'Multi-line text' },
  { value: 'richtext', label: 'Rich text', description: 'Formatted content' },
  { value: 'number', label: 'Number', description: 'Integer or decimal' },
  { value: 'currency', label: 'Currency', description: 'Monetary value' },
  { value: 'boolean', label: 'Boolean', description: 'True / false' },
  { value: 'date', label: 'Date', description: 'Calendar date' },
  { value: 'datetime', label: 'Date and time', description: 'Date with time' },
  { value: 'email', label: 'Email', description: 'Email address' },
  { value: 'tel', label: 'Telephone', description: 'Phone number' },
  { value: 'url', label: 'URL', description: 'Web link' },
  { value: 'slug', label: 'Slug', description: 'URL-friendly key' },
  { value: 'color', label: 'Colour', description: 'Colour value' },
  { value: 'image', label: 'Image', description: 'Single image' },
  { value: 'gallery', label: 'Gallery', description: 'Multiple images' },
  { value: 'video', label: 'Video', description: 'Video file or URL' },
  { value: 'file', label: 'File', description: 'File attachment' },
  { value: 'select', label: 'Select', description: 'Single choice' },
  { value: 'multiselect', label: 'Multi-select', description: 'Multiple choices' },
  { value: 'reference', label: 'Reference', description: 'Link to one item' },
  { value: 'multireference', label: 'Multi-reference', description: 'Link to many items' },
  { value: 'location', label: 'Location', description: 'Geographic point' },
  { value: 'json', label: 'JSON', description: 'Advanced structured data' },
];

export function fieldTypeLabel(type: CmsFieldType): string {
  return CMS_FIELD_TYPES.find((t) => t.value === type)?.label ?? type;
}

export type FieldConfiguration = {
  helpText?: string;
  defaultValue?: unknown;
  searchable?: boolean;
  filterable?: boolean;
  hidden?: boolean;
  options?: string[];
  referenceCollectionId?: string;
  min?: number;
  max?: number;
  maxLength?: number;
};

export type FieldValidation = {
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: string;
};

export type CmsField = {
  id: string;
  collectionId: string;
  fieldKey: string;
  fieldType: CmsFieldType;
  label: string;
  position: number;
  required: boolean;
  uniqueValue: boolean;
  configuration: FieldConfiguration;
  validation: FieldValidation;
  createdAt: string;
  updatedAt: string;
};

export type CmsCollection = {
  id: string;
  projectId: string;
  name: string;
  singularName: string;
  slug: string;
  description: string;
  icon: string;
  displayFieldKey: string;
  sortFieldKey: string;
  defaultSortOrder: 'asc' | 'desc';
  status: string;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
  fields: CmsField[];
  itemCount?: number;
};

export type CmsItemStatus = 'draft' | 'scheduled' | 'published' | 'archived';

export const CMS_ITEM_STATUSES: CmsItemStatus[] = ['draft', 'scheduled', 'published', 'archived'];

export type CmsItem = {
  id: string;
  projectId: string;
  collectionId: string;
  slug: string;
  status: CmsItemStatus;
  fieldValues: Record<string, unknown>;
  publishedValues: Record<string, unknown> | null;
  scheduledPublishAt: string | null;
  scheduledUnpublishAt: string | null;
  createdBy: string | null;
  updatedBy: string | null;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CollectionPreset = {
  id: string;
  name: string;
  singularName: string;
  icon: string;
  description: string;
  fields: { fieldKey: string; fieldType: CmsFieldType; label: string; required?: boolean; configuration?: FieldConfiguration }[];
};

export const COLLECTION_PRESETS: CollectionPreset[] = [
  {
    id: 'blog',
    name: 'Blog posts',
    singularName: 'Blog post',
    icon: 'file-text',
    description: 'Articles with title, body, author and publication date.',
    fields: [
      { fieldKey: 'title', fieldType: 'text', label: 'Title', required: true },
      { fieldKey: 'slug', fieldType: 'slug', label: 'Slug', required: true },
      { fieldKey: 'excerpt', fieldType: 'textarea', label: 'Excerpt' },
      { fieldKey: 'body', fieldType: 'richtext', label: 'Body' },
      { fieldKey: 'author', fieldType: 'text', label: 'Author' },
      { fieldKey: 'cover_image', fieldType: 'image', label: 'Cover image' },
      { fieldKey: 'published_date', fieldType: 'date', label: 'Published date' },
      { fieldKey: 'category', fieldType: 'select', label: 'Category', configuration: { options: ['News', 'Guides', 'Tutorials', 'Updates'] } },
      { fieldKey: 'featured', fieldType: 'boolean', label: 'Featured' },
    ],
  },
  {
    id: 'services',
    name: 'Services',
    singularName: 'Service',
    icon: 'briefcase',
    description: 'Offerings with a name, description, price and icon.',
    fields: [
      { fieldKey: 'name', fieldType: 'text', label: 'Name', required: true },
      { fieldKey: 'slug', fieldType: 'slug', label: 'Slug', required: true },
      { fieldKey: 'description', fieldType: 'textarea', label: 'Description' },
      { fieldKey: 'price', fieldType: 'currency', label: 'Price' },
      { fieldKey: 'duration', fieldType: 'text', label: 'Duration' },
      { fieldKey: 'icon', fieldType: 'text', label: 'Icon' },
      { fieldKey: 'featured', fieldType: 'boolean', label: 'Featured' },
    ],
  },
  {
    id: 'team',
    name: 'Team members',
    singularName: 'Team member',
    icon: 'users',
    description: 'People with a name, role, bio and photo.',
    fields: [
      { fieldKey: 'name', fieldType: 'text', label: 'Name', required: true },
      { fieldKey: 'role', fieldType: 'text', label: 'Role' },
      { fieldKey: 'bio', fieldType: 'textarea', label: 'Bio' },
      { fieldKey: 'photo', fieldType: 'image', label: 'Photo' },
      { fieldKey: 'email', fieldType: 'email', label: 'Email' },
      { fieldKey: 'order', fieldType: 'number', label: 'Order' },
    ],
  },
  {
    id: 'projects',
    name: 'Projects',
    singularName: 'Project',
    icon: 'folder',
    description: 'Portfolio work with title, description, images and tags.',
    fields: [
      { fieldKey: 'title', fieldType: 'text', label: 'Title', required: true },
      { fieldKey: 'slug', fieldType: 'slug', label: 'Slug', required: true },
      { fieldKey: 'summary', fieldType: 'textarea', label: 'Summary' },
      { fieldKey: 'description', fieldType: 'richtext', label: 'Description' },
      { fieldKey: 'cover_image', fieldType: 'image', label: 'Cover image' },
      { fieldKey: 'gallery', fieldType: 'gallery', label: 'Gallery' },
      { fieldKey: 'client', fieldType: 'text', label: 'Client' },
      { fieldKey: 'year', fieldType: 'number', label: 'Year' },
      { fieldKey: 'tags', fieldType: 'multiselect', label: 'Tags' },
    ],
  },
  {
    id: 'properties',
    name: 'Properties',
    singularName: 'Property',
    icon: 'home',
    description: 'Real-estate listings with price, beds, baths and location.',
    fields: [
      { fieldKey: 'title', fieldType: 'text', label: 'Title', required: true },
      { fieldKey: 'slug', fieldType: 'slug', label: 'Slug', required: true },
      { fieldKey: 'description', fieldType: 'richtext', label: 'Description' },
      { fieldKey: 'price', fieldType: 'currency', label: 'Price', required: true },
      { fieldKey: 'bedrooms', fieldType: 'number', label: 'Bedrooms' },
      { fieldKey: 'bathrooms', fieldType: 'number', label: 'Bathrooms' },
      { fieldKey: 'area', fieldType: 'number', label: 'Area (sq ft)' },
      { fieldKey: 'location', fieldType: 'location', label: 'Location' },
      { fieldKey: 'status', fieldType: 'select', label: 'Status', configuration: { options: ['For sale', 'For rent', 'Sold', 'Under offer'] } },
      { fieldKey: 'images', fieldType: 'gallery', label: 'Images' },
    ],
  },
  {
    id: 'products',
    name: 'Products',
    singularName: 'Product',
    icon: 'shopping-bag',
    description: 'Catalogue items with price, SKU and imagery.',
    fields: [
      { fieldKey: 'name', fieldType: 'text', label: 'Name', required: true },
      { fieldKey: 'slug', fieldType: 'slug', label: 'Slug', required: true },
      { fieldKey: 'description', fieldType: 'richtext', label: 'Description' },
      { fieldKey: 'price', fieldType: 'currency', label: 'Price', required: true },
      { fieldKey: 'sku', fieldType: 'text', label: 'SKU' },
      { fieldKey: 'image', fieldType: 'image', label: 'Image' },
      { fieldKey: 'category', fieldType: 'select', label: 'Category' },
      { fieldKey: 'in_stock', fieldType: 'boolean', label: 'In stock' },
    ],
  },
  {
    id: 'events',
    name: 'Events',
    singularName: 'Event',
    icon: 'calendar',
    description: 'Calendar entries with date, time, venue and description.',
    fields: [
      { fieldKey: 'name', fieldType: 'text', label: 'Name', required: true },
      { fieldKey: 'slug', fieldType: 'slug', label: 'Slug', required: true },
      { fieldKey: 'description', fieldType: 'richtext', label: 'Description' },
      { fieldKey: 'start_date', fieldType: 'datetime', label: 'Start date & time', required: true },
      { fieldKey: 'end_date', fieldType: 'datetime', label: 'End date & time' },
      { fieldKey: 'venue', fieldType: 'text', label: 'Venue' },
      { fieldKey: 'location', fieldType: 'location', label: 'Location' },
      { fieldKey: 'image', fieldType: 'image', label: 'Image' },
    ],
  },
  {
    id: 'faqs',
    name: 'FAQs',
    singularName: 'FAQ',
    icon: 'help-circle',
    description: 'Question and answer pairs with ordering and category.',
    fields: [
      { fieldKey: 'question', fieldType: 'text', label: 'Question', required: true },
      { fieldKey: 'answer', fieldType: 'richtext', label: 'Answer' },
      { fieldKey: 'category', fieldType: 'text', label: 'Category' },
      { fieldKey: 'order', fieldType: 'number', label: 'Order' },
    ],
  },
  {
    id: 'testimonials',
    name: 'Testimonials',
    singularName: 'Testimonial',
    icon: 'quote',
    description: 'Customer quotes with attribution and rating.',
    fields: [
      { fieldKey: 'quote', fieldType: 'textarea', label: 'Quote', required: true },
      { fieldKey: 'author', fieldType: 'text', label: 'Author' },
      { fieldKey: 'role', fieldType: 'text', label: 'Role' },
      { fieldKey: 'rating', fieldType: 'number', label: 'Rating', configuration: { min: 1, max: 5 } },
      { fieldKey: 'avatar', fieldType: 'image', label: 'Avatar' },
    ],
  },
  {
    id: 'locations',
    name: 'Locations',
    singularName: 'Location',
    icon: 'map-pin',
    description: 'Branches or offices with address, hours and contact.',
    fields: [
      { fieldKey: 'name', fieldType: 'text', label: 'Name', required: true },
      { fieldKey: 'slug', fieldType: 'slug', label: 'Slug', required: true },
      { fieldKey: 'address', fieldType: 'textarea', label: 'Address' },
      { fieldKey: 'location', fieldType: 'location', label: 'Map location' },
      { fieldKey: 'phone', fieldType: 'tel', label: 'Phone' },
      { fieldKey: 'email', fieldType: 'email', label: 'Email' },
      { fieldKey: 'hours', fieldType: 'textarea', label: 'Opening hours' },
    ],
  },
];

export const COLLECTION_ICONS: { value: string; label: string }[] = [
  { value: 'file-text', label: 'Document' },
  { value: 'briefcase', label: 'Briefcase' },
  { value: 'users', label: 'People' },
  { value: 'folder', label: 'Folder' },
  { value: 'home', label: 'Home' },
  { value: 'shopping-bag', label: 'Product' },
  { value: 'calendar', label: 'Event' },
  { value: 'help-circle', label: 'FAQ' },
  { value: 'quote', label: 'Quote' },
  { value: 'map-pin', label: 'Location' },
  { value: 'layers', label: 'Layers' },
  { value: 'star', label: 'Star' },
];

export const CUSTOM_PRESET_ID = 'custom';

export function defaultFieldConfiguration(): FieldConfiguration {
  return {
    helpText: '',
    searchable: true,
    filterable: false,
    hidden: false,
    options: [],
  };
}