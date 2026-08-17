import { getStarterKits } from '@/pages/projects/sandbox/starterKits';
import {
  TEMPLATE_TYPE_LABELS,
  type TemplateManifest,
} from '@/pages/projects/sandbox/sandboxTemplates';

export interface StarterPage {
  name: string;
  slug: string;
}

export interface StarterDisplay {
  id: string;
  name: string;
  description: string;
  typeKey: string;
  typeLabel: string;
  tags: string[];
  pageCount: number;
  pages: StarterPage[];
  manifest: TemplateManifest;
}

export interface StarterCategory {
  value: string;
  label: string;
}

export const ALL_CATEGORY = 'all';

/**
 * Derive tags from the actual blueprint (not the manifest's declared
 * `requiredFeatures`) so a single-page starter is never labelled
 * "Multi-page" and we never claim features that aren't really present.
 */
function detectTags(manifest: TemplateManifest): string[] {
  const tags: string[] = [];
  const pages = manifest.document.pages;
  if (pages.some((page) => page.elements.some((element) => element.type === 'Form'))) {
    tags.push('Forms');
  }
  if (pages.length > 1) {
    tags.push('Multi-page');
  }
  return tags;
}

export function toStarterDisplay(manifest: TemplateManifest): StarterDisplay {
  return {
    id: manifest.templateId,
    name: manifest.name,
    description: manifest.description,
    typeKey: manifest.templateType,
    typeLabel: TEMPLATE_TYPE_LABELS[manifest.templateType] ?? manifest.templateType,
    tags: detectTags(manifest),
    pageCount: manifest.preview.pages.length,
    pages: manifest.preview.pages.map((page) => ({ name: page.name, slug: page.slug })),
    manifest,
  };
}

export async function fetchStarters(): Promise<StarterDisplay[]> {
  const kits = await getStarterKits();
  return kits.map(toStarterDisplay);
}

/** Build category filters from what actually exists — never empty fake categories. */
export function deriveCategories(starters: StarterDisplay[]): StarterCategory[] {
  const categories: StarterCategory[] = [{ value: ALL_CATEGORY, label: 'All' }];
  const seen = new Set<string>();
  for (const starter of starters) {
    if (seen.has(starter.typeKey)) continue;
    seen.add(starter.typeKey);
    categories.push({ value: starter.typeKey, label: starter.typeLabel });
  }
  return categories;
}