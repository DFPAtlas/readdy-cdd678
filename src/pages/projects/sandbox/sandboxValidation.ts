import type { CanvasElement, SandboxDocument, SandboxPage } from './sandboxPersistence';
import { resolveComponent } from './sandboxComponents';
import type { AssetRecord } from './sandboxAssets';

export type Severity = 'blocker' | 'error' | 'warning' | 'recommendation' | 'passed';

export type ValidationCategory =
  | 'integrity' | 'pages' | 'links' | 'assets' | 'components'
  | 'responsive' | 'accessibility' | 'seo' | 'forms' | 'performance' | 'security';

export type ValidationIssue = {
  severity: Severity;
  category: ValidationCategory;
  page: string;
  element: string;
  message: string;
  fix: string;
  elementId?: string;
};

export type ValidationResult = {
  issues: ValidationIssue[];
  blockers: number;
  errors: number;
  warnings: number;
  recommendations: number;
  passed: number;
};

export const SEVERITY_ORDER: Record<Severity, number> = {
  blocker: 0, error: 1, warning: 2, recommendation: 3, passed: 4,
};

export const SEVERITY_LABELS: Record<Severity, string> = {
  blocker: 'Blocker', error: 'Error', warning: 'Warning', recommendation: 'Recommendation', passed: 'Passed',
};

export const CATEGORY_LABELS: Record<ValidationCategory, string> = {
  integrity: 'Blueprint integrity',
  pages: 'Pages & routes',
  links: 'Navigation & links',
  assets: 'Assets',
  components: 'Components',
  responsive: 'Responsive layout',
  accessibility: 'Accessibility',
  seo: 'SEO',
  forms: 'Forms',
  performance: 'Performance',
  security: 'Security',
};

function allElements(doc: SandboxDocument): Array<{ element: CanvasElement; page: SandboxPage }> {
  const result: Array<{ element: CanvasElement; page: SandboxPage }> = [];
  doc.pages.forEach((page) => page.elements.forEach((element) => result.push({ element, page })));
  return result;
}

function issue(
  severity: Severity,
  category: ValidationCategory,
  page: string,
  element: string,
  message: string,
  fix: string,
  elementId?: string,
): ValidationIssue {
  return { severity, category, page, element, message, fix, elementId };
}

function detectComponentCycles(doc: SandboxDocument): string[] {
  const adjacency = new Map<string, string[]>();
  doc.components.forEach((component) => {
    const refs: string[] = [];
    component.elements.forEach((el) => {
      if (el.component?.componentId) refs.push(el.component.componentId);
    });
    adjacency.set(component.id, refs);
  });

  const cyclic = new Set<string>();
  const visiting = new Set<string>();
  const visited = new Set<string>();

  const dfs = (id: string): boolean => {
    if (visiting.has(id)) return true;
    if (visited.has(id)) return false;
    visiting.add(id);
    const refs = adjacency.get(id) ?? [];
    for (const ref of refs) {
      if (dfs(ref)) { cyclic.add(id); cyclic.add(ref); return true; }
    }
    visiting.delete(id);
    visited.add(id);
    return false;
  };

  doc.components.forEach((component) => { if (!visited.has(component.id)) dfs(component.id); });
  return [...cyclic];
}

export function validateBlueprint(doc: SandboxDocument, assets: AssetRecord[] = []): ValidationResult {
  const issues: ValidationIssue[] = [];
  const push = (item: ValidationIssue) => issues.push(item);

  /* ── Blueprint integrity ── */
  if (!doc.pages.length) {
    push(issue('blocker', 'integrity', '—', '—', 'The blueprint has no pages.', 'Add at least one page before exporting.'));
  }

  const homePages = doc.pages.filter((page) => page.isHome);
  if (homePages.length === 0) {
    push(issue('blocker', 'integrity', '—', '—', 'No homepage is defined.', 'Mark one page as the homepage.'));
  } else if (homePages.length > 1) {
    push(issue('blocker', 'integrity', '—', '—', `More than one homepage exists (${homePages.length}).`, 'Keep a single page marked as the homepage.'));
  }

  /* Duplicate slugs */
  const slugCounts = new Map<string, number>();
  doc.pages.forEach((page) => slugCounts.set(page.slug, (slugCounts.get(page.slug) ?? 0) + 1));
  slugCounts.forEach((count, slug) => {
    if (count > 1) push(issue('blocker', 'pages', '—', '—', `Duplicate page slug “${slug}”.`, 'Give each page a unique slug.'));
  });

  /* Duplicate element IDs */
  const idSeen = new Set<string>();
  const idDuplicates = new Set<string>();
  allElements(doc).forEach(({ element }) => {
    if (idSeen.has(element.id)) idDuplicates.add(element.id);
    else idSeen.add(element.id);
  });
  doc.globalSections.header.concat(doc.globalSections.footer).forEach((el) => {
    if (idSeen.has(el.id)) idDuplicates.add(el.id);
    else idSeen.add(el.id);
  });
  idDuplicates.forEach((id) => {
    push(issue('blocker', 'integrity', '—', id, `Duplicate element ID “${id}”.`, 'Remove or regenerate the duplicate element ID.'));
  });

  /* Circular component references */
  const cyclic = detectComponentCycles(doc);
  cyclic.forEach((id) => {
    push(issue('error', 'components', '—', id, `Circular component reference involving “${id}”.`, 'Break the reference cycle between components.'));
  });

  /* Missing component definitions */
  allElements(doc).forEach(({ element, page }) => {
    if (element.component && !resolveComponent(element.component.componentId, doc.components)) {
      push(issue('error', 'components', page.name, element.name, `Component “${element.component.componentId}” is missing.`, 'Restore the component definition or detach the instance.', element.id));
    }
  });

  /* ── Links ── */
  const pageIds = new Set(doc.pages.map((page) => page.id));
  const anchorIds = new Set<string>();
  allElements(doc).forEach(({ element }) => { if (element.link?.type === 'section' && element.link.sectionId) anchorIds.add(element.link.sectionId); });

  allElements(doc).forEach(({ element, page }) => {
    const link = element.link;
    if (!link || link.type === 'none') return;

    if (link.type === 'page') {
      if (!link.pageId) {
        push(issue('warning', 'links', page.name, element.name, 'A link has no destination page.', 'Choose a destination page.', element.id));
      } else if (!pageIds.has(link.pageId)) {
        push(issue('error', 'links', page.name, element.name, 'A link points to a deleted page.', 'Re-point the link to an existing page.', element.id));
      }
    } else if (link.type === 'section') {
      if (!link.sectionId) {
        push(issue('warning', 'links', page.name, element.name, 'A section link has no anchor.', 'Choose a section anchor.', element.id));
      } else if (!anchorIds.has(link.sectionId)) {
        push(issue('warning', 'links', page.name, element.name, `Anchor “${link.sectionId}” was not found.`, 'Link to an existing section anchor.', element.id));
      }
    } else if (link.type === 'external') {
      if (!link.url) push(issue('warning', 'links', page.name, element.name, 'An external link has an empty URL.', 'Enter a full URL.', element.id));
      else if (!/^https?:\/\//i.test(link.url)) push(issue('error', 'links', page.name, element.name, 'An external link uses an unsafe or invalid URL.', 'Use a URL starting with http(s)://.', element.id));
    } else if (link.type === 'email') {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(link.url)) push(issue('warning', 'links', page.name, element.name, 'An email link has an invalid address.', 'Enter a valid email address.', element.id));
    } else if (link.type === 'tel') {
      if (!/^\+?[0-9\s()-]{4,}$/.test(link.url)) push(issue('warning', 'links', page.name, element.name, 'A telephone link has an invalid number.', 'Enter a valid phone number.', element.id));
    } else if (link.type === 'file') {
      if (!link.url) push(issue('warning', 'links', page.name, element.name, 'A file link has no file URL.', 'Enter a file URL.', element.id));
    }
  });

  /* Navigation links */
  doc.globalSections.navigation.forEach((item) => {
    if (item.type === 'page') {
      if (!item.pageId) push(issue('warning', 'links', '—', item.label, 'A navigation item has no page.', 'Choose a destination page.'));
      else if (!pageIds.has(item.pageId)) push(issue('error', 'links', '—', item.label, `Navigation “${item.label}” points to a deleted page.`, 'Re-point or remove the navigation item.'));
    } else if (item.type === 'external') {
      if (!/^https?:\/\//i.test(item.url)) push(issue('warning', 'links', '—', item.label, `Navigation “${item.label}” has an invalid external URL.`, 'Enter a full URL.'));
    } else if (item.type === 'anchor' && !anchorIds.has(item.anchor)) {
      push(issue('warning', 'links', '—', item.label, `Navigation “${item.label}” points to a missing anchor.`, 'Link to an existing anchor.'));
    }
  });

  /* ── Assets ── */
  const assetIds = new Set(assets.map((asset) => asset.id));
  allElements(doc).forEach(({ element, page }) => {
    if (element.asset?.assetId && !element.asset.url) {
      push(issue('error', 'assets', page.name, element.name, 'A referenced asset is missing its file.', 'Re-upload or replace the missing asset.', element.id));
    }
    if (element.asset?.assetId && assets.length && !assetIds.has(element.asset.assetId)) {
      push(issue('warning', 'assets', page.name, element.name, 'An asset reference has no matching asset record.', 'Re-link the element to an existing asset.', element.id));
    }
    if (element.type === 'Image' && element.asset && !element.asset.decorative && !element.asset.altText) {
      push(issue('warning', 'accessibility', page.name, element.name, 'An image is missing alt text.', 'Add a descriptive alt text, or mark it decorative.', element.id));
    }
    if (element.type === 'Video' && element.asset && !element.asset.accessibleTitle) {
      push(issue('warning', 'accessibility', page.name, element.name, 'A video is missing an accessible title.', 'Add a short descriptive title.', element.id));
    }
  });

  /* ── SEO ── */
  doc.pages.forEach((page) => {
    if (!page.seo.title || !page.seo.title.trim()) {
      push(issue('warning', 'seo', page.name, '—', 'The page has no SEO title.', 'Add a descriptive title.'));
    }
    if (!page.seo.metaDescription || !page.seo.metaDescription.trim()) {
      push(issue('recommendation', 'seo', page.name, '—', 'The page has no meta description.', 'Add a 120–160 character description.'));
    }
    if (!page.seo.socialImageAssetId) {
      push(issue('recommendation', 'seo', page.name, '—', 'No social share image is set.', 'Add a social image for Open Graph previews.'));
    }
  });

  const titleCounts = new Map<string, number>();
  doc.pages.forEach((page) => { const t = page.seo.title || page.name; titleCounts.set(t, (titleCounts.get(t) ?? 0) + 1); });
  titleCounts.forEach((count, title) => {
    if (count > 1) push(issue('warning', 'seo', '—', '—', `Duplicate page title “${title}”.`, 'Make each page title unique.'));
  });

  /* ── Responsive / overflow ── */
  const viewportWidth = doc.viewport === 'mobile' ? 390 : doc.viewport === 'tablet' ? 768 : 1280;
  allElements(doc).forEach(({ element, page }) => {
    if (element.x + element.width > viewportWidth + 40) {
      push(issue('recommendation', 'responsive', page.name, element.name, 'An element may overflow the viewport width.', 'Move or resize the element to fit the viewport.', element.id));
    }
  });

  /* ── Empty interactive elements ── */
  allElements(doc).forEach(({ element, page }) => {
    if (element.type === 'Button' && !element.content.trim()) {
      push(issue('warning', 'accessibility', page.name, element.name, 'A button has no label.', 'Add visible text to the button.', element.id));
    }
  });

  /* ── Forms ── */
  allElements(doc).forEach(({ element, page }) => {
    if (element.type !== 'Form') return;
    const form = element.form;
    if (!form) {
      push(issue('warning', 'forms', page.name, element.name, 'This form has no field definition.', 'Add fields via the form builder.', element.id));
      return;
    }
    if (!form.name.trim()) {
      push(issue('warning', 'forms', page.name, element.name, 'The form has no name.', 'Give the form a name.', element.id));
    }
    // Duplicate field keys break stored submissions.
    const seenKeys = new Set<string>();
    form.fields.forEach((field) => {
      if (field.type === 'submit') return;
      if (seenKeys.has(field.key)) {
        push(issue('error', 'forms', page.name, element.name, `Duplicate field key “${field.key}”.`, 'Give every field a unique key.', element.id));
      }
      seenKeys.add(field.key);
    });
    // Unsafe redirect URL.
    if ((form.successAction === 'redirect' || form.successAction === 'external') && form.redirectUrl) {
      if (form.successAction === 'external' && !/^https?:\/\//i.test(form.redirectUrl)) {
        push(issue('error', 'forms', page.name, element.name, 'The external redirect URL is unsafe or invalid.', 'Use a full http(s) URL for external redirects.', element.id));
      }
    }
    // Invalid notification recipients.
    if (form.notifyRecipients) {
      form.notifyRecipients.split(',').map((email) => email.trim()).filter(Boolean).forEach((email) => {
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
          push(issue('warning', 'forms', page.name, element.name, `Invalid notification recipient “${email}”.`, 'Enter a valid email address.', element.id));
        }
      });
    }
    if (form.turnstile) {
      push(issue('recommendation', 'forms', page.name, element.name, 'Turnstile is enabled — ensure the server secret is configured.', 'Configure the Turnstile secret before publishing.', element.id));
    }
  });

  /* ── Sort by severity ── */
  issues.sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]);

  const count = (severity: Severity) => issues.filter((item) => item.severity === severity).length;
  return {
    issues,
    blockers: count('blocker'),
    errors: count('error'),
    warnings: count('warning'),
    recommendations: count('recommendation'),
    passed: 0,
  };
}

export function hasBlockers(result: ValidationResult): boolean {
  return result.blockers > 0;
}

export function issueLabel(issueItem: ValidationIssue): string {
  return `${SEVERITY_LABELS[issueItem.severity]} · ${CATEGORY_LABELS[issueItem.category]}${issueItem.page && issueItem.page !== '—' ? ` · ${issueItem.page}` : ''}`;
}