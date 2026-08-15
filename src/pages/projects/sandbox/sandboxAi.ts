import type { CanvasElement, CanvasElementKind, ComponentDefinition } from './sandboxPersistence';
import type { PageType } from './sandboxPages';
import { invokeForgeAi, type AiGatewayOutcome, type AiMode, type AiTaskClass, type AiUsage } from './sandboxAiGateway';

export type SandboxAiOperation =
  | { kind: 'add'; elementType: CanvasElementKind; content?: string; x?: number; y?: number }
  | { kind: 'update'; elementId: string; patch: Partial<CanvasElement> }
  | { kind: 'delete'; elementId: string }
  | { kind: 'duplicate'; elementId: string }
  | { kind: 'viewport'; viewport: 'desktop' | 'tablet' | 'mobile' };

export type SandboxPageOperation =
  | { kind: 'createPage'; name: string; slug?: string; pageType?: PageType }
  | { kind: 'duplicatePage'; pageId: string }
  | { kind: 'renamePage'; pageId: string; name: string }
  | { kind: 'setPageSlug'; pageId: string; slug: string }
  | { kind: 'setHomepage'; pageId: string }
  | { kind: 'addToNavigation'; pageId: string }
  | { kind: 'removeFromNavigation'; pageId: string }
  | { kind: 'addGlobalFooter' }
  | { kind: 'linkElementToPage'; elementId: string; pageId: string };

export type SandboxComponentOperation =
  | { kind: 'saveSelectionAsComponent'; name?: string }
  | { kind: 'addComponentToCanvas'; componentName?: string }
  | { kind: 'detachComponent'; elementId: string }
  | { kind: 'useVariant'; elementId: string; variantName: string }
  | { kind: 'updateAllInstances'; componentName?: string; value: string };

export type SandboxAiProposal = {
  id: string;
  title: string;
  summary: string;
  changes: string[];
  operations: SandboxAiOperation[];
  pageOperations: SandboxPageOperation[];
  componentOperations: SandboxComponentOperation[];
  warnings?: string[];
  source: 'forge-ai' | 'local';
};

type PromptContext = {
  elements: CanvasElement[];
  selectedElement: CanvasElement | null;
  viewport: 'desktop' | 'tablet' | 'mobile';
  pages?: Array<{ id: string; name: string; slug: string; isHome: boolean }>;
  activePageId?: string;
  components?: ComponentDefinition[];
};

const colourNames: Record<string, string> = {
  amber: '#f5a400', orange: '#f28c00', red: '#dc2626', blue: '#2563eb',
  green: '#16a34a', black: '#111820', white: '#ffffff', grey: '#64748b', gray: '#64748b',
};

function proposal(
  changes: string[],
  operations: SandboxAiOperation[],
  pageOperations: SandboxPageOperation[] = [],
  componentOperations: SandboxComponentOperation[] = [],
  source: SandboxAiProposal['source'] = 'local',
): SandboxAiProposal {
  return {
    id: crypto.randomUUID(),
    title: changes.length === 1 ? changes[0] : `${changes.length} proposed change${changes.length === 1 ? '' : 's'}`,
    summary: 'Review these changes before they are applied to the canvas.',
    changes,
    operations,
    pageOperations,
    componentOperations,
    source,
  };
}

function parseLocalPrompt(promptText: string, context: PromptContext) {
  const prompt = promptText.trim();
  const lower = prompt.toLowerCase();
  const changes: string[] = [];
  const operations: SandboxAiOperation[] = [];
  const pageOperations: SandboxPageOperation[] = [];
  const componentOperations: SandboxComponentOperation[] = [];
  const selected = context.selectedElement;
  const pages = context.pages ?? [];
  const activePageId = context.activePageId;

  const add = (elementType: CanvasElementKind, content?: string, x?: number, y?: number) => {
    operations.push({ kind: 'add', elementType, content, x, y });
    changes.push(`Add ${content ? `“${content}” ` : ''}${elementType.toLowerCase()}`);
  };

  /* ── Page-level instructions ── */
  const createPageMatch = prompt.match(/(?:create|add|make) (?:a |an |new )?(about|contact|services|pricing|blog|legal|landing|home|404|page)\b/i);
  const createName = prompt.match(/(?:create|add|make) (?:a |an |new )?page (?:called |named )?[“"]?([^”".]+)[”".]?/i)?.[1];

  if (/create (?:an? )?about page/i.test(lower)) {
    pageOperations.push({ kind: 'createPage', name: 'About', pageType: 'about' });
    changes.push('Create an About page');
  } else if (/create (?:an? )?contact page/i.test(lower)) {
    pageOperations.push({ kind: 'createPage', name: 'Contact', pageType: 'contact' });
    changes.push('Create a Contact page with a form');
  } else if (/create (?:an? )?services page/i.test(lower)) {
    pageOperations.push({ kind: 'createPage', name: 'Services', pageType: 'services' });
    changes.push('Create a Services page');
  } else if (/create (?:an? )?pricing page/i.test(lower)) {
    pageOperations.push({ kind: 'createPage', name: 'Pricing', pageType: 'pricing' });
    changes.push('Create a Pricing page');
  } else if (/create (?:an? )?blog page/i.test(lower)) {
    pageOperations.push({ kind: 'createPage', name: 'Blog', pageType: 'blog' });
    changes.push('Create a Blog page');
  } else if (/create (?:an? )?legal page/i.test(lower)) {
    pageOperations.push({ kind: 'createPage', name: 'Legal', pageType: 'legal' });
    changes.push('Create a Legal page');
  } else if (/create (?:an? )?landing page/i.test(lower)) {
    pageOperations.push({ kind: 'createPage', name: 'Landing', pageType: 'landing' });
    changes.push('Create a Landing page');
  } else if (createPageMatch && createName) {
    const type: PageType = createPageMatch[1].toLowerCase() === '404' ? 'notfound' : createPageMatch[1].toLowerCase() as PageType;
    pageOperations.push({ kind: 'createPage', name: createName, pageType: type });
    changes.push(`Create page “${createName}”`);
  } else if (/create (?:a |an |new )?page/i.test(lower)) {
    const named = prompt.match(/[“"]([^”"]+)[”"]/i)?.[1];
    pageOperations.push({ kind: 'createPage', name: named ?? 'New page', pageType: 'standard' });
    changes.push(`Create page “${named ?? 'New page'}”`);
  }

  if (/duplicate (?:this|the) page/i.test(lower) && activePageId) {
    pageOperations.push({ kind: 'duplicatePage', pageId: activePageId });
    changes.push('Duplicate this page');
  }

  const renameTarget = prompt.match(/rename (?:this |the )?page (?:to )?[“"]?([^”".]+)[”".]?/i)?.[1];
  if (renameTarget && activePageId) {
    pageOperations.push({ kind: 'renamePage', pageId: activePageId, name: renameTarget });
    changes.push(`Rename this page to “${renameTarget}”`);
  }

  const slugTarget = prompt.match(/(?:change|set) (?:this |the )?page slug (?:to )?(\/[a-z0-9/-]+)/i)?.[1];
  if (slugTarget && activePageId) {
    pageOperations.push({ kind: 'setPageSlug', pageId: activePageId, slug: slugTarget });
    changes.push(`Change this page slug to ${slugTarget}`);
  }

  if (/add (?:this |the )?page to navigation/i.test(lower) && activePageId) {
    pageOperations.push({ kind: 'addToNavigation', pageId: activePageId });
    changes.push('Add this page to navigation');
  }

  const homepageMatch = prompt.match(/set ([^"]+) as (?:the )?homepage/i);
  if (homepageMatch) {
    const target = pages.find((page) => page.name.toLowerCase() === homepageMatch[1].trim().toLowerCase());
    if (target) {
      pageOperations.push({ kind: 'setHomepage', pageId: target.id });
      changes.push(`Set ${target.name} as the homepage`);
    }
  } else if (/set (?:this |the current )?page as (?:the )?homepage/i.test(lower) && activePageId) {
    pageOperations.push({ kind: 'setHomepage', pageId: activePageId });
    changes.push('Set this page as the homepage');
  }

  if (/add (?:a |an )?global footer/i.test(lower)) {
    pageOperations.push({ kind: 'addGlobalFooter' });
    changes.push('Add a global footer');
  }

  const linkMatch = prompt.match(/link (?:this |the )?(button|text|image)? ?to (?:the )?([a-z ]+) page/i);
  if (linkMatch && selected) {
    const pageName = linkMatch[2].trim();
    const target = pages.find((page) => page.name.toLowerCase() === pageName.toLowerCase());
    if (target) {
      pageOperations.push({ kind: 'linkElementToPage', elementId: selected.id, pageId: target.id });
      changes.push(`Link ${selected.name} to the ${target.name} page`);
    }
  }

  /* ── Component-level instructions ── */
  if (/save (?:this |the )?(?:selection|hero|section)? ?as (?:a |an )?component/i.test(lower)) {
    componentOperations.push({ kind: 'saveSelectionAsComponent', name: 'My component' });
    changes.push('Save this selection as a component');
  }

  if (/add (?:the |a |an )?(testimonial|pricing table|pricing card|contact form|footer|cta banner|hero|feature)/i.test(lower) && /component|card|table|form|footer|banner|hero/.test(lower)) {
    const builtInName = /testimonial/i.test(lower) ? 'Testimonial card'
      : /pricing/i.test(lower) ? 'Pricing card'
      : /contact form/i.test(lower) ? 'Contact form'
      : /footer/i.test(lower) ? 'Footer'
      : /cta/i.test(lower) ? 'CTA banner'
      : /hero/i.test(lower) ? 'Split hero'
      : 'Feature grid';
    componentOperations.push({ kind: 'addComponentToCanvas', componentName: builtInName });
    changes.push(`Add ${builtInName} to this page`);
  }

  if (/detach (?:this |the )?component/i.test(lower) && selected?.component) {
    componentOperations.push({ kind: 'detachComponent', elementId: selected.id });
    changes.push('Detach this component');
  }

  const variantMatch = prompt.match(/use (?:the )?([a-z]+) variant/i);
  if (variantMatch && selected?.component) {
    componentOperations.push({ kind: 'useVariant', elementId: selected.id, variantName: variantMatch[1] });
    changes.push(`Use the ${variantMatch[1]} variant`);
  }

  const updateAllMatch = prompt.match(/update (?:every |all )?(?:cta|button)s? to(?: say)? [“"]?(.+?)[”"]?$/i);
  if (updateAllMatch) {
    componentOperations.push({ kind: 'updateAllInstances', value: updateAllMatch[1].trim() });
    changes.push(`Update every CTA to “${updateAllMatch[1].trim()}”`);
  }

  /* ── Element-level instructions ── */
  if (/two[ -]?column|2[ -]?column/.test(lower)) add('Columns', 'Two-column section', 390, 280);
  if (/book(ing)? (button|cta)|book a demo|book now/.test(lower)) add('Button', /book a demo/.test(lower) ? 'Book a Demo' : 'Book now', 620, 465);

  const requestedTypes: Array<[RegExp, CanvasElementKind, string]> = [
    [/add (?:a |an )?heading/, 'Heading', 'A powerful new heading'],
    [/add (?:some |a )?text|add (?:a )?paragraph/, 'Text', 'Add supporting copy here.'],
    [/add (?:a |an )?image/, 'Image', 'Image placeholder'],
    [/add (?:a |an )?video/, 'Video', 'Video placeholder'],
    [/add (?:a |an )?form|contact form/, 'Form', 'Contact us'],
    [/add (?:a )?container/, 'Container', 'New container'],
  ];
  requestedTypes.forEach(([pattern, type, content], index) => {
    if (pattern.test(lower) && !operations.some((operation) => operation.kind === 'add' && operation.elementType === type)) {
      add(type, content, 120 + index * 35, 210 + index * 45);
    }
  });

  if (/add (?:a )?button/.test(lower) && !operations.some((operation) => operation.kind === 'add' && operation.elementType === 'Button')) {
    const quoted = prompt.match(/[“"]([^”"]+)[”"]/i)?.[1];
    add('Button', quoted ?? 'Get started', 360, 460);
  }

  if (selected && /delete|remove/.test(lower)) {
    operations.push({ kind: 'delete', elementId: selected.id });
    changes.push(`Delete ${selected.name}`);
  } else if (selected && /duplicate|copy/.test(lower)) {
    operations.push({ kind: 'duplicate', elementId: selected.id });
    changes.push(`Duplicate ${selected.name}`);
  }

  if (selected) {
    const content = prompt.match(/(?:change|replace|set) (?:the )?(?:text|content)(?: to| with)? [“"]?(.+?)[”"]?$/i)?.[1];
    if (content) {
      operations.push({ kind: 'update', elementId: selected.id, patch: { content } });
      changes.push(`Update ${selected.name} content`);
    }

    const colour = Object.entries(colourNames).find(([name]) => new RegExp(`(?:make|set|change).*\\b${name}\\b`, 'i').test(prompt));
    if (colour) {
      const target = /background/i.test(prompt) ? 'background' : 'color';
      operations.push({ kind: 'update', elementId: selected.id, patch: { [target]: colour[1] } });
      changes.push(`Set ${selected.name} ${target} to ${colour[0]}`);
    }
  }

  (['mobile', 'tablet', 'desktop'] as const).forEach((viewport) => {
    if (new RegExp(`(?:switch|show|preview|change).*${viewport}`, 'i').test(prompt)) {
      operations.push({ kind: 'viewport', viewport });
      changes.push(`Switch preview to ${viewport}`);
    }
  });

  if (!operations.length && !pageOperations.length && !componentOperations.length) {
    add('Text', prompt || 'Describe the content you want to add', 300, 350);
    changes[0] = 'Add AI-generated content block';
  }

  return proposal(changes, operations, pageOperations, componentOperations);
}

export type SandboxAiResult = {
  proposal: SandboxAiProposal;
  usage: AiUsage;
  mode: AiMode;
};

export type AiCreativity = 'precise' | 'balanced' | 'creative';

export type AiOptions = {
  taskClass: AiTaskClass;
  creativity: AiCreativity;
  currentPageOnly: boolean;
  preserveCopy: boolean;
  preserveDesign: boolean;
  accessibilityFirst: boolean;
  seoFirst: boolean;
  scope?: string;
  preferredModel?: string;
  localOnly?: boolean;
  signal?: AbortSignal;
};

const defaultAiOptions: AiOptions = {
  taskClass: 'fast_edit',
  creativity: 'balanced',
  currentPageOnly: true,
  preserveCopy: false,
  preserveDesign: true,
  accessibilityFirst: false,
  seoFirst: false,
};

function buildGatewayPrompt(prompt: string, options: AiOptions): string {
  const modifiers: string[] = [];
  if (options.creativity === 'creative') modifiers.push('Be creative and expressive.');
  else if (options.creativity === 'precise') modifiers.push('Be precise and conservative.');
  if (options.preserveCopy) modifiers.push('Preserve existing copy where possible.');
  if (options.preserveDesign) modifiers.push('Preserve the existing design system.');
  if (options.accessibilityFirst) modifiers.push('Prioritise accessibility.');
  if (options.seoFirst) modifiers.push('Prioritise SEO.');
  return modifiers.length ? `${prompt}\n\nAdditional guidance: ${modifiers.join(' ')}` : prompt;
}

export async function analyseSandboxPrompt(prompt: string, context: PromptContext, options?: Partial<AiOptions>): Promise<SandboxAiResult> {
  const opts: AiOptions = { ...defaultAiOptions, ...options };
  const localProposal = parseLocalPrompt(prompt, context);

  const componentIds = new Set<string>();
  context.elements.forEach((element) => { if (element.component) componentIds.add(element.component.componentId); });
  const componentDefinitions = (context.components ?? [])
    .filter((component) => componentIds.has(component.id))
    .map((component) => ({ id: component.id, name: component.name, category: component.category, type: component.type }));
  const assetMetadata = context.elements
    .filter((element) => element.asset)
    .map((element) => ({ id: element.asset!.assetId, name: element.asset!.name, kind: element.asset!.kind, mimeType: element.asset!.mimeType, altText: element.asset!.altText }));

  const signal = opts.signal ?? new AbortController().signal;
  let gatewayResult: AiGatewayOutcome;
  try {
    gatewayResult = await invokeForgeAi({
      prompt: buildGatewayPrompt(prompt, opts),
      pageId: context.activePageId ?? '',
      viewport: context.viewport,
      selectedElementIds: context.selectedElement ? [context.selectedElement.id] : [],
      pageStructure: {
        pageId: context.activePageId ?? '',
        elementCount: context.elements.length,
        headings: context.elements.filter((element) => element.type === 'Heading').map((element) => element.content).slice(0, 12),
      },
      componentDefinitions,
      assetMetadata,
      taskClass: opts.taskClass,
      schemaVersion: 3,
      scope: opts.scope,
      preferredModel: opts.preferredModel,
      localOnly: opts.localOnly,
    }, signal);
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') throw err;
    gatewayResult = { mode: 'offline', proposal: null, usage: { mode: 'offline', inputTokens: 0, outputTokens: 0, estimatedCostMicros: 0, durationMs: 0 }, localFallbackAvailable: true };
  }

  if (gatewayResult.proposal) {
    return { proposal: gatewayResult.proposal, usage: gatewayResult.usage, mode: gatewayResult.mode };
  }

  return { proposal: localProposal, usage: { ...gatewayResult.usage, mode: 'local' }, mode: 'local' };
}