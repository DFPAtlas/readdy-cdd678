import { getSandboxClient } from '@/pages/projects/sandbox/sandboxPersistence';
import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  CmsCollection, CmsField, CmsFieldType, CmsItem, CmsItemStatus,
  FieldConfiguration, FieldValidation,
} from './cmsTypes';
import { defaultFieldConfiguration } from './cmsTypes';

/* ──────────────────────────────────────────────────────────────
   Forge CMS data layer.

   All reads/writes go through the tenant-isolated cms_* tables and
   are protected by RLS + triggers. This module never constructs raw
   SQL — it uses the parameterised Supabase client only.
   ────────────────────────────────────────────────────────────── */

function client(): SupabaseClient | null {
  return getSandboxClient();
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function toFieldKey(input: string): string {
  const slug = slugify(input);
  return slug.replace(/-/g, '_');
}

/* ── Row mappers ── */

type Row = Record<string, unknown>;

function mapField(row: Row): CmsField {
  const config = (row.configuration && typeof row.configuration === 'object' ? row.configuration : {}) as FieldConfiguration;
  const validation = (row.validation && typeof row.validation === 'object' ? row.validation : {}) as FieldValidation;
  return {
    id: String(row.id),
    collectionId: String(row.collection_id),
    fieldKey: String(row.field_key),
    fieldType: String(row.field_type) as CmsFieldType,
    label: String(row.label),
    position: Number(row.position ?? 0),
    required: Boolean(row.required),
    uniqueValue: Boolean(row.unique_value),
    configuration: config,
    validation: validation,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

function mapCollection(row: Row): CmsCollection {
  return {
    id: String(row.id),
    projectId: String(row.project_id),
    name: String(row.name),
    singularName: String(row.singular_name),
    slug: String(row.slug),
    description: row.description ? String(row.description) : '',
    icon: row.icon ? String(row.icon) : 'layers',
    displayFieldKey: row.display_field_key ? String(row.display_field_key) : '',
    sortFieldKey: row.sort_field_key ? String(row.sort_field_key) : '',
    defaultSortOrder: String(row.default_sort_order ?? 'desc') as 'asc' | 'desc',
    status: String(row.status ?? 'active'),
    createdBy: row.created_by ? String(row.created_by) : null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
    fields: [],
  };
}

function mapItem(row: Row): CmsItem {
  return {
    id: String(row.id),
    projectId: String(row.project_id),
    collectionId: String(row.collection_id),
    slug: String(row.slug),
    status: String(row.status) as CmsItemStatus,
    fieldValues: (row.field_values && typeof row.field_values === 'object' ? row.field_values : {}) as Record<string, unknown>,
    publishedValues: (row.published_values && typeof row.published_values === 'object' ? row.published_values : null) as Record<string, unknown> | null,
    scheduledPublishAt: row.scheduled_publish_at ? String(row.scheduled_publish_at) : null,
    scheduledUnpublishAt: row.scheduled_unpublish_at ? String(row.scheduled_unpublish_at) : null,
    createdBy: row.created_by ? String(row.created_by) : null,
    updatedBy: row.updated_by ? String(row.updated_by) : null,
    publishedAt: row.published_at ? String(row.published_at) : null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

/* ── Collections ── */

export async function listCollections(projectId: string): Promise<CmsCollection[]> {
  const supabase = client();
  if (!supabase) return [];
  const { data: cols, error } = await supabase
    .from('cms_collections')
    .select('*')
    .eq('project_id', projectId)
    .eq('status', 'active')
    .order('created_at', { ascending: true });
  if (error || !cols) return [];

  const collections = (cols as Row[]).map(mapCollection);
  const ids = collections.map((c) => c.id);
  if (ids.length) {
    const { data: fields } = await supabase
      .from('cms_fields')
      .select('*')
      .in('collection_id', ids)
      .order('position', { ascending: true });
    const byCollection = new Map<string, CmsField[]>();
    (fields as Row[] | undefined)?.forEach((f) => {
      const mapped = mapField(f);
      const list = byCollection.get(mapped.collectionId) ?? [];
      list.push(mapped);
      byCollection.set(mapped.collectionId, list);
    });

    const { data: counts } = await supabase
      .from('cms_items')
      .select('collection_id, status')
      .eq('project_id', projectId);
    const countByCollection = new Map<string, number>();
    (counts as Row[] | undefined)?.forEach((r) => {
      const cid = String(r.collection_id);
      countByCollection.set(cid, (countByCollection.get(cid) ?? 0) + 1);
    });

    collections.forEach((c) => {
      c.fields = byCollection.get(c.id) ?? [];
      c.itemCount = countByCollection.get(c.id) ?? 0;
    });
  }
  return collections;
}

export type CreateCollectionInput = {
  name: string;
  singularName: string;
  slug: string;
  description: string;
  icon: string;
  fields: { fieldKey: string; fieldType: CmsFieldType; label: string; required?: boolean; configuration?: FieldConfiguration }[];
};

export async function createCollection(projectId: string, input: CreateCollectionInput): Promise<{ ok: boolean; message: string; collection?: CmsCollection }> {
  const supabase = client();
  if (!supabase) return { ok: false, message: 'Sign in to create collections.' };
  const displayField = input.fields[0]?.fieldKey ?? '';

  const { data: created, error } = await supabase
    .from('cms_collections')
    .insert({
      project_id: projectId,
      name: input.name,
      singular_name: input.singularName,
      slug: input.slug,
      description: input.description,
      icon: input.icon,
      display_field_key: displayField,
      sort_field_key: '',
      default_sort_order: 'desc',
      status: 'active',
    })
    .select('*')
    .single();
  if (error) return { ok: false, message: error.message };

  const collectionId = String((created as Row).id);
  const fieldRows = input.fields.map((f, i) => ({
    collection_id: collectionId,
    field_key: f.fieldKey,
    field_type: f.fieldType,
    label: f.label,
    position: i,
    required: f.required ?? false,
    unique_value: false,
    configuration: { ...defaultFieldConfiguration(), ...(f.configuration ?? {}) },
    validation: {},
  }));

  if (fieldRows.length) {
    const { error: fieldError } = await supabase.from('cms_fields').insert(fieldRows);
    if (fieldError) return { ok: false, message: fieldError.message };
  }

  return { ok: true, message: `Collection "${input.name}" created`, collection: mapCollection(created as Row) };
}

export async function updateCollection(collectionId: string, patch: Partial<{ name: string; singularName: string; slug: string; description: string; icon: string; displayFieldKey: string; sortFieldKey: string; defaultSortOrder: 'asc' | 'desc' }>): Promise<{ ok: boolean; message: string }> {
  const supabase = client();
  if (!supabase) return { ok: false, message: 'Sign in to edit collections.' };
  const payload: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };
  if (patch.name !== undefined) payload.name = patch.name;
  if (patch.singularName !== undefined) payload.singular_name = patch.singularName;
  if (patch.slug !== undefined) payload.slug = patch.slug;
  if (patch.description !== undefined) payload.description = patch.description;
  if (patch.icon !== undefined) payload.icon = patch.icon;
  if (patch.displayFieldKey !== undefined) payload.display_field_key = patch.displayFieldKey;
  if (patch.sortFieldKey !== undefined) payload.sort_field_key = patch.sortFieldKey;
  if (patch.defaultSortOrder !== undefined) payload.default_sort_order = patch.defaultSortOrder;

  const { error } = await supabase.from('cms_collections').update(payload).eq('id', collectionId);
  if (error) return { ok: false, message: error.message };
  return { ok: true, message: 'Collection updated' };
}

export async function deleteCollection(collectionId: string): Promise<{ ok: boolean; message: string }> {
  const supabase = client();
  if (!supabase) return { ok: false, message: 'Sign in to delete collections.' };
  const { error } = await supabase.from('cms_collections').delete().eq('id', collectionId);
  if (error) return { ok: false, message: error.message };
  return { ok: true, message: 'Collection deleted' };
}

/* ── Fields ── */

export async function createField(collectionId: string, input: { fieldKey: string; fieldType: CmsFieldType; label: string; required?: boolean; uniqueValue?: boolean; configuration?: FieldConfiguration; position?: number }): Promise<{ ok: boolean; message: string }> {
  const supabase = client();
  if (!supabase) return { ok: false, message: 'Sign in to add fields.' };
  const { error } = await supabase.from('cms_fields').insert({
    collection_id: collectionId,
    field_key: input.fieldKey,
    field_type: input.fieldType,
    label: input.label,
    position: input.position ?? 0,
    required: input.required ?? false,
    unique_value: input.uniqueValue ?? false,
    configuration: { ...defaultFieldConfiguration(), ...(input.configuration ?? {}) },
    validation: {},
  });
  if (error) return { ok: false, message: error.message };
  return { ok: true, message: 'Field added' };
}

export async function updateField(fieldId: string, patch: Partial<{ label: string; required: boolean; uniqueValue: boolean; configuration: FieldConfiguration; fieldType: CmsFieldType }>): Promise<{ ok: boolean; message: string }> {
  const supabase = client();
  if (!supabase) return { ok: false, message: 'Sign in to edit fields.' };
  const payload: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (patch.label !== undefined) payload.label = patch.label;
  if (patch.required !== undefined) payload.required = patch.required;
  if (patch.uniqueValue !== undefined) payload.unique_value = patch.uniqueValue;
  if (patch.configuration !== undefined) payload.configuration = patch.configuration;
  if (patch.fieldType !== undefined) payload.field_type = patch.fieldType;
  const { error } = await supabase.from('cms_fields').update(payload).eq('id', fieldId);
  if (error) return { ok: false, message: error.message };
  return { ok: true, message: 'Field updated' };
}

export async function deleteField(fieldId: string): Promise<{ ok: boolean; message: string }> {
  const supabase = client();
  if (!supabase) return { ok: false, message: 'Sign in to delete fields.' };
  const { error } = await supabase.from('cms_fields').delete().eq('id', fieldId);
  if (error) return { ok: false, message: error.message };
  return { ok: true, message: 'Field deleted' };
}

/* ── Items ── */

export async function listItems(projectId: string, collectionId: string): Promise<CmsItem[]> {
  const supabase = client();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('cms_items')
    .select('*')
    .eq('project_id', projectId)
    .eq('collection_id', collectionId)
    .order('created_at', { ascending: false });
  if (error || !data) return [];
  return (data as Row[]).map(mapItem);
}

export async function createItem(projectId: string, collectionId: string, slug: string, fieldValues: Record<string, unknown>): Promise<{ ok: boolean; message: string }> {
  const supabase = client();
  if (!supabase) return { ok: false, message: 'Sign in to create items.' };
  const { error } = await supabase.from('cms_items').insert({
    project_id: projectId,
    collection_id: collectionId,
    slug,
    status: 'draft',
    field_values: fieldValues,
  });
  if (error) return { ok: false, message: error.message };
  return { ok: true, message: 'Item saved as draft' };
}

export async function updateItem(itemId: string, fieldValues: Record<string, unknown>, options?: { newSlug?: string }): Promise<{ ok: boolean; message: string }> {
  const supabase = client();
  if (!supabase) return { ok: false, message: 'Sign in to edit items.' };
  const payload: Record<string, unknown> = { field_values: fieldValues };
  if (options?.newSlug) payload.slug = options.newSlug;
  const { error } = await supabase.from('cms_items').update(payload).eq('id', itemId);
  if (error) return { ok: false, message: error.message };
  return { ok: true, message: 'Item saved' };
}

export async function duplicateItem(item: CmsItem): Promise<{ ok: boolean; message: string }> {
  const supabase = client();
  if (!supabase) return { ok: false, message: 'Sign in to duplicate items.' };
  const { error } = await supabase.from('cms_items').insert({
    project_id: item.projectId,
    collection_id: item.collectionId,
    slug: `${item.slug}-copy`,
    status: 'draft',
    field_values: item.fieldValues,
  });
  if (error) return { ok: false, message: error.message };
  return { ok: true, message: 'Item duplicated as draft' };
}

export async function setItemStatus(itemId: string, status: CmsItemStatus, extra?: { scheduledPublishAt?: string | null; scheduledUnpublishAt?: string | null }): Promise<{ ok: boolean; message: string }> {
  const supabase = client();
  if (!supabase) return { ok: false, message: 'Sign in to change item status.' };
  const payload: Record<string, unknown> = { status };
  if (extra?.scheduledPublishAt !== undefined) payload.scheduled_publish_at = extra.scheduledPublishAt;
  if (extra?.scheduledUnpublishAt !== undefined) payload.scheduled_unpublish_at = extra.scheduledUnpublishAt;
  const { error } = await supabase.from('cms_items').update(payload).eq('id', itemId);
  if (error) return { ok: false, message: error.message };
  return { ok: true, message: `Item ${status}` };
}

export async function deleteItem(itemId: string): Promise<{ ok: boolean; message: string }> {
  const supabase = client();
  if (!supabase) return { ok: false, message: 'Sign in to delete items.' };
  const { error } = await supabase.from('cms_items').delete().eq('id', itemId);
  if (error) return { ok: false, message: error.message };
  return { ok: true, message: 'Item deleted' };
}

export async function saveItemVersion(itemId: string, values: Record<string, unknown>, status: string, versionNumber: number): Promise<{ ok: boolean; message: string }> {
  const supabase = client();
  if (!supabase) return { ok: false, message: 'Sign in to save versions.' };
  const { error } = await supabase.from('cms_item_versions').insert({
    cms_item_id: itemId,
    version_number: versionNumber,
    values,
    status,
  });
  if (error) return { ok: false, message: error.message };
  return { ok: true, message: 'Version saved' };
}

/* ── Current user role (for UI gating; server RLS is authoritative) ── */

export async function currentProjectRole(projectId: string): Promise<string | null> {
  const supabase = client();
  if (!supabase) return null;
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return null;
  const { data } = await supabase
    .from('project_members')
    .select('role, status')
    .eq('project_id', projectId)
    .eq('user_id', auth.user.id)
    .maybeSingle();
  if (!data) return null;
  const row = data as Row;
  if (String(row.status) !== 'active') return null;
  return row.role ? String(row.role) : null;
}

/* ── Rich-text sanitisation ──
   Renders structured content safely. Strips script/style/iframes,
   event handlers and dangerous URLs. Never trusts stored HTML. */

const ALLOWED_TAGS = new Set([
  'P', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'B', 'STRONG', 'I', 'EM', 'U', 'S',
  'A', 'UL', 'OL', 'LI', 'BLOCKQUOTE', 'CODE', 'PRE', 'IMG', 'TABLE', 'THEAD',
  'TBODY', 'TR', 'TH', 'TD', 'BR', 'HR', 'SPAN', 'DIV', 'FIGURE', 'FIGCAPTION',
  'SUP', 'SUB', 'MARK',
]);

const ALLOWED_ATTRIBUTES = new Set(['href', 'src', 'alt', 'title', 'colspan', 'rowspan', 'align']);

function safeUrl(value: string, allowDataImage: boolean): string {
  const trimmed = value.trim().toLowerCase();
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('mailto:') || trimmed.startsWith('tel:') || trimmed.startsWith('#')) {
    return value;
  }
  if (allowDataImage && trimmed.startsWith('data:image/')) return value;
  if (!trimmed.includes(':') && !trimmed.startsWith('//')) return value; // relative URL
  return '';
}

export function sanitizeRichText(html: string): string {
  if (!html) return '';
  let doc: Document;
  try {
    doc = new DOMParser().parseFromString(html, 'text/html');
  } catch {
    return '';
  }
  const walk = (el: Element) => {
    const children = Array.from(el.children);
    children.forEach((child) => {
      const tag = child.tagName.toUpperCase();
      if (!ALLOWED_TAGS.has(tag)) {
        // Unwrap dangerous/invalid tags but keep their text content.
        const parent = child.parentElement;
        while (child.firstChild) {
          parent?.insertBefore(child.firstChild, child);
        }
        child.remove();
        return;
      }
      Array.from(child.attributes).forEach((attr) => {
        const name = attr.name.toLowerCase();
        if (name.startsWith('on')) {
          child.removeAttribute(attr.name);
          return;
        }
        if (!ALLOWED_ATTRIBUTES.has(name)) {
          child.removeAttribute(attr.name);
          return;
        }
        if (name === 'href' || name === 'src') {
          const isImg = tag === 'IMG' && name === 'src';
          const clean = safeUrl(attr.value, isImg);
          if (!clean) {
            child.removeAttribute(attr.name);
          } else {
            child.setAttribute(attr.name, clean);
          }
        }
      });
      if (tag === 'A') child.setAttribute('rel', 'noopener noreferrer');
      walk(child);
    });
  };
  walk(doc.body);
  return doc.body.innerHTML;
}