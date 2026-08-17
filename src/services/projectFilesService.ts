import { getSupabaseClient } from '@/services/supabaseClient';

// ------------------------------------------------------------
// Project structure data model — derived from the real project
// blueprint (pages, components, global sections, theme).
// Forge has no traditional file system; the blueprint IS the
// project structure, so we surface it honestly and read-only.
// ------------------------------------------------------------

export type StructureKind = 'page' | 'component' | 'section' | 'theme';

export interface StructureNode {
  id: string;
  name: string;
  kind: StructureKind;
  detail: string;
  path: string;
  updatedAt: string | null;
  sizeBytes: number;
  summary: string;
  raw: unknown;
}

export interface StructureGroup {
  id: string;
  name: string;
  children: StructureNode[];
}

export interface ProjectFilesData {
  authenticated: boolean;
  found: boolean;
  project: {
    id: string;
    name: string;
    description: string | null;
    updatedAt: string | null;
  } | null;
  groups: StructureGroup[];
  totalNodes: number;
}

export function createEmptyFilesData(): ProjectFilesData {
  return {
    authenticated: false,
    found: false,
    project: null,
    groups: [],
    totalNodes: 0,
  };
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : null;
}

function str(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function serializeSize(value: unknown): number {
  try {
    return new TextEncoder().encode(JSON.stringify(value)).length;
  } catch {
    return 0;
  }
}

function nodeUpdatedAt(value: unknown, fallback: string | null): string | null {
  if (value && typeof value === 'object') {
    const rec = value as Record<string, unknown>;
    if (typeof rec.updatedAt === 'string') return rec.updatedAt;
  }
  return fallback;
}

function parseBlueprint(raw: unknown): StructureGroup[] {
  const doc = asRecord(raw);
  if (!doc) return [];

  const groups: StructureGroup[] = [];
  const docUpdatedAt = typeof doc.updatedAt === 'string' ? doc.updatedAt : null;

  // Pages
  const pages = doc.pages;
  if (Array.isArray(pages) && pages.length > 0) {
    const children: StructureNode[] = pages.map((p, i) => {
      const page = asRecord(p) ?? {};
      const name = str(page.name) || str(page.title) || `Page ${i + 1}`;
      const slug = str(page.slug) || str(page.path) || '';
      const elementCount = Array.isArray(page.elements) ? page.elements.length : 0;
      const status = str(page.status);
      const isHome = page.isHome === true;
      const summary = [
        isHome ? 'Home page' : 'Page',
        status || null,
        `${elementCount} elements`,
      ].filter(Boolean).join(' · ');
      return {
        id: `page-${i}`,
        name,
        kind: 'page' as const,
        detail: slug || '—',
        path: slug ? `pages${slug === '/' ? '/home' : slug}` : `pages / ${name}`,
        updatedAt: nodeUpdatedAt(page, docUpdatedAt),
        sizeBytes: serializeSize(page),
        summary,
        raw: page,
      };
    });
    groups.push({ id: 'pages', name: 'Pages', children });
  }

  // Components
  const components = doc.components;
  if (Array.isArray(components) && components.length > 0) {
    const children: StructureNode[] = components.map((c, i) => {
      const comp = asRecord(c) ?? {};
      const name = str(comp.name) || `Component ${i + 1}`;
      const category = str(comp.category);
      const elementCount = Array.isArray(comp.elements) ? comp.elements.length : 0;
      const variantCount = Array.isArray(comp.variants) ? comp.variants.length : 0;
      const builtIn = comp.builtIn === true;
      const summary = [
        category || 'Component',
        `${elementCount} elements`,
        variantCount ? `${variantCount} variants` : null,
        builtIn ? 'Built-in' : null,
      ].filter(Boolean).join(' · ');
      return {
        id: `component-${i}`,
        name,
        kind: 'component' as const,
        detail: category || '—',
        path: `components / ${name}`,
        updatedAt: nodeUpdatedAt(comp, docUpdatedAt),
        sizeBytes: serializeSize(comp),
        summary,
        raw: comp,
      };
    });
    groups.push({ id: 'components', name: 'Components', children });
  }

  // Global sections (header, footer, navigation)
  const global = doc.globalSections;
  if (global && typeof global === 'object') {
    const gs = global as Record<string, unknown>;
    const header = Array.isArray(gs.header) ? gs.header : [];
    const footer = Array.isArray(gs.footer) ? gs.footer : [];
    const navigation = Array.isArray(gs.navigation) ? gs.navigation : [];
    groups.push({
      id: 'global-sections',
      name: 'Global sections',
      children: [
        {
          id: 'global-header',
          name: 'Header',
          kind: 'section' as const,
          detail: `${header.length} elements`,
          path: 'global / header',
          updatedAt: docUpdatedAt,
          sizeBytes: serializeSize(header),
          summary: `Global header · ${header.length} elements`,
          raw: header,
        },
        {
          id: 'global-footer',
          name: 'Footer',
          kind: 'section' as const,
          detail: `${footer.length} elements`,
          path: 'global / footer',
          updatedAt: docUpdatedAt,
          sizeBytes: serializeSize(footer),
          summary: `Global footer · ${footer.length} elements`,
          raw: footer,
        },
        {
          id: 'global-navigation',
          name: 'Navigation',
          kind: 'section' as const,
          detail: `${navigation.length} items`,
          path: 'global / navigation',
          updatedAt: docUpdatedAt,
          sizeBytes: serializeSize(navigation),
          summary: `Site navigation · ${navigation.length} items`,
          raw: navigation,
        },
      ],
    });
  }

  // Theme
  const theme = doc.theme;
  if (theme && typeof theme === 'object') {
    const t = theme as Record<string, unknown>;
    const name = str(t.name) || 'Project theme';
    groups.push({
      id: 'theme',
      name: 'Theme',
      children: [
        {
          id: 'theme-root',
          name,
          kind: 'theme' as const,
          detail: 'Design tokens',
          path: 'theme',
          updatedAt: docUpdatedAt,
          sizeBytes: serializeSize(theme),
          summary: 'Colours, typography and spacing tokens',
          raw: theme,
        },
      ],
    });
  }

  return groups;
}

export async function fetchProjectFiles(projectId: string): Promise<ProjectFilesData> {
  const supabase = getSupabaseClient();
  if (!supabase) return createEmptyFilesData();

  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) return createEmptyFilesData();

  const { data: project, error } = await supabase
    .from('projects')
    .select('id, name, description, blueprint, updated_at')
    .eq('id', projectId)
    .maybeSingle();

  if (error) throw error;
  if (!project) {
    return { ...createEmptyFilesData(), authenticated: true, found: false };
  }

  const groups = parseBlueprint(project.blueprint);
  const totalNodes = groups.reduce((sum, g) => sum + g.children.length, 0);

  return {
    authenticated: true,
    found: true,
    project: {
      id: project.id,
      name: project.name,
      description: project.description,
      updatedAt: project.updated_at,
    },
    groups,
    totalNodes,
  };
}