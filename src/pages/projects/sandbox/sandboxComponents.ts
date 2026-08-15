import type {
  CanvasElement,
  CanvasElementKind,
  ComponentCategory,
  ComponentDefinition,
  ComponentInstanceRef,
  ComponentKind,
  ComponentVariant,
  ExposedProperty,
  SandboxPage,
} from './sandboxPersistence';

/* ──────────────────────────────────────────────────────────────
   Component geometry + override resolution
   ────────────────────────────────────────────────────────────── */

export type ComponentBounds = { width: number; height: number; minX: number; minY: number };

export function componentBounds(elements: CanvasElement[]): ComponentBounds {
  if (!elements.length) return { width: 320, height: 200, minX: 0, minY: 0 };
  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;
  elements.forEach((element) => {
    minX = Math.min(minX, element.x);
    minY = Math.min(minY, element.y);
    maxX = Math.max(maxX, element.x + element.width);
    maxY = Math.max(maxY, element.y + element.height);
  });
  return { width: Math.max(40, maxX - minX), height: Math.max(40, maxY - minY), minX, minY };
}

export function defaultVariantFor(definition: ComponentDefinition): ComponentVariant {
  return definition.variants.find((variant) => variant.isDefault) ?? definition.variants[0];
}

export function makeVariant(name: string, overrides: Record<string, string> = {}): ComponentVariant {
  return { id: crypto.randomUUID(), name, isDefault: false, overrides };
}

export function applyInstanceOverrides(definition: ComponentDefinition, instance: ComponentInstanceRef): CanvasElement[] {
  const bounds = componentBounds(definition.elements);
  const variant = definition.variants.find((entry) => entry.id === instance.variantId) ?? definition.variants[0];
  const merged: Record<string, string> = { ...(variant?.overrides ?? {}), ...instance.overrides };

  return definition.elements.map((element) => {
    const next: CanvasElement = { ...element, x: element.x - bounds.minX, y: element.y - bounds.minY };
    if (next.asset) next.asset = { ...next.asset };
    for (const prop of definition.exposedProperties) {
      if (prop.targetElementId !== element.id) continue;
      const value = merged[prop.id];
      if (value === undefined) continue;
      if (prop.targetField === 'content') next.content = value;
      else if (prop.targetField === 'background') next.background = value;
      else if (prop.targetField === 'color') next.color = value;
      else if (prop.targetField === 'link') next.link = { type: 'external', pageId: '', sectionId: '', url: value, newTab: false };
      else if (prop.targetField === 'asset') next.asset = next.asset ? { ...next.asset, url: value } : undefined;
      else if (prop.targetField === 'visible') next.hidden = value === 'false';
    }
    return next;
  });
}

export function componentInstanceCount(componentId: string, pages: SandboxPage[]): number {
  let count = 0;
  pages.forEach((page) => page.elements.forEach((element) => {
    if (element.component?.componentId === componentId) count += 1;
  }));
  return count;
}

export function componentUsagePages(componentId: string, pages: SandboxPage[]): string[] {
  const names: string[] = [];
  pages.forEach((page) => {
    if (page.elements.some((element) => element.component?.componentId === componentId)) names.push(page.name);
  });
  return names;
}

export function createComponentFromSelection(
  elements: CanvasElement[],
  input: { name: string; description: string; category: ComponentCategory; type: ComponentKind },
): ComponentDefinition {
  const now = new Date().toISOString();
  const bounds = componentBounds(elements);
  const normalized = elements.map((element) => ({ ...element, x: element.x - bounds.minX, y: element.y - bounds.minY }));

  const exposedProperties: ExposedProperty[] = [];
  normalized.forEach((element) => {
    if (element.type === 'Heading' || element.type === 'Text' || element.type === 'Button') {
      exposedProperties.push({
        id: `prop-${element.id}-content`,
        label: `${element.name} text`,
        type: 'text',
        defaultValue: element.content,
        targetElementId: element.id,
        targetField: 'content',
        required: false,
      });
    }
    if (element.type === 'Image' || element.type === 'Video') {
      exposedProperties.push({
        id: `prop-${element.id}-asset`,
        label: `${element.name} media`,
        type: 'asset',
        defaultValue: element.asset?.url ?? '',
        targetElementId: element.id,
        targetField: 'asset',
        required: false,
      });
    }
  });

  return {
    id: crypto.randomUUID(),
    name: input.name,
    description: input.description,
    category: input.category,
    type: input.type,
    elements: normalized,
    variants: [{ id: crypto.randomUUID(), name: 'Default', isDefault: true, overrides: {} }],
    exposedProperties,
    builtIn: false,
    createdAt: now,
    updatedAt: now,
  };
}

/* ──────────────────────────────────────────────────────────────
   Built-in starter components
   ────────────────────────────────────────────────────────────── */

const BUILTIN_STYLE: Record<CanvasElementKind, { background: string; color: string }> = {
  Heading: { background: 'transparent', color: '#111820' },
  Text: { background: 'transparent', color: '#424a52' },
  Button: { background: '#f5a400', color: '#101820' },
  Image: { background: '#ffe6b8', color: '#9a5b00' },
  Video: { background: '#151d26', color: '#ffffff' },
  Container: { background: '#f7f8fa', color: '#59626b' },
  Columns: { background: '#ffffff', color: '#59626b' },
  Form: { background: '#ffffff', color: '#111820' },
  Document: { background: '#f7f8fa', color: '#59626b' },
};

let builtinSeq = 0;

function bel(type: CanvasElementKind, content: string, x: number, y: number, width: number, height: number, background?: string, color?: string): CanvasElement {
  builtinSeq += 1;
  const style = BUILTIN_STYLE[type];
  return { id: `builtin-${builtinSeq}`, type, name: content, content, x, y, width, height, background: background ?? style.background, color: color ?? style.color };
}

function textProp(label: string, element: CanvasElement): ExposedProperty {
  return { id: `builtin-prop-${element.id}-content`, label, type: 'text', defaultValue: element.content, targetElementId: element.id, targetField: 'content', required: false };
}

function builtIn(name: string, description: string, category: ComponentCategory, type: ComponentKind, build: () => { elements: CanvasElement[]; props: ExposedProperty[]; variants?: ComponentVariant[] }): ComponentDefinition {
  const result = build();
  const now = '2026-01-01T00:00:00.000Z';
  return {
    id: `builtin-component-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
    name,
    description,
    category,
    type,
    elements: result.elements,
    variants: result.variants ?? [{ id: crypto.randomUUID(), name: 'Default', isDefault: true, overrides: {} }],
    exposedProperties: result.props,
    builtIn: true,
    createdAt: now,
    updatedAt: now,
  };
}

export const BUILT_IN_COMPONENTS: ComponentDefinition[] = [
  builtIn('Header navigation', 'A top navigation bar with brand, links and actions.', 'Navigation', 'section', () => {
    const brand = bel('Heading', 'FORGE', 20, 22, 120, 40);
    const link = bel('Text', 'Product  Solutions  Pricing  About', 180, 32, 380, 40);
    const cta = bel('Button', 'Sign in', 620, 20, 110, 40);
    return {
      elements: [brand, link, cta],
      props: [textProp('Brand name', brand), textProp('Navigation links', link), textProp('Primary action', cta)],
      variants: [
        { id: 'nav-light', name: 'Light', isDefault: true, overrides: {} },
        { id: 'nav-dark', name: 'Dark', isDefault: false, overrides: {} },
      ],
    };
  }),
  builtIn('Split hero', 'A two-column hero with copy on the left and media on the right.', 'Hero', 'section', () => {
    const heading = bel('Heading', 'Build something people love', 30, 60, 360, 130);
    const desc = bel('Text', 'A clear, confident headline with supporting copy and a single call to action.', 30, 210, 340, 90);
    const cta = bel('Button', 'Get started', 30, 320, 160, 46);
    const media = bel('Image', 'Hero image', 430, 50, 380, 300);
    return {
      elements: [heading, desc, cta, media],
      props: [textProp('Headline', heading), textProp('Description', desc), textProp('Call to action', cta), { id: 'builtin-prop-hero-media', label: 'Hero image', type: 'asset', defaultValue: '', targetElementId: media.id, targetField: 'asset', required: false }],
    };
  }),
  builtIn('Centred hero', 'A centred hero with a headline and two actions.', 'Hero', 'section', () => {
    const heading = bel('Heading', 'Ship faster with AI', 130, 60, 600, 90);
    const desc = bel('Text', 'Centred headline and supporting copy for a focused landing page.', 160, 170, 540, 70);
    const cta = bel('Button', 'Start Building', 240, 270, 160, 46);
    const secondary = bel('Button', 'Book a Demo', 420, 270, 160, 46);
    return { elements: [heading, desc, cta, secondary], props: [textProp('Headline', heading), textProp('Description', desc), textProp('Primary action', cta), textProp('Secondary action', secondary)] };
  }),
  builtIn('Feature grid', 'Three feature cards laid out in a row.', 'Features', 'section', () => {
    const heading = bel('Heading', 'Why choose us', 40, 30, 400, 60);
    const f1 = bel('Container', 'Feature one', 40, 120, 240, 160);
    const f2 = bel('Container', 'Feature two', 300, 120, 240, 160);
    const f3 = bel('Container', 'Feature three', 560, 120, 240, 160);
    return { elements: [heading, f1, f2, f3], props: [textProp('Section heading', heading), textProp('Feature one', f1), textProp('Feature two', f2), textProp('Feature three', f3)] };
  }),
  builtIn('Logo strip', 'A row of client logos for social proof.', 'Content', 'section', () => {
    const heading = bel('Text', 'Trusted by teams at', 40, 40, 200, 40);
    const logos = bel('Container', 'Logo marks', 260, 30, 500, 60);
    return { elements: [heading, logos], props: [textProp('Eyebrow', heading), textProp('Logos', logos)] };
  }),
  builtIn('Testimonial card', 'A single customer quote with name and role.', 'Testimonials', 'component', () => {
    const quote = bel('Text', '“Forge helped us ship our site in a weekend. The component system is a game changer.”', 30, 40, 360, 120);
    const name = bel('Text', 'Alex Morgan — Head of Product', 30, 180, 300, 40);
    return { elements: [quote, name], props: [textProp('Quote', quote), textProp('Customer', name)] };
  }),
  builtIn('Pricing card', 'A single pricing column with a highlighted plan.', 'Pricing', 'component', () => {
    const plan = bel('Heading', 'Pro', 40, 30, 200, 50);
    const amount = bel('Heading', '$29/mo', 40, 90, 200, 50);
    const desc = bel('Text', 'Everything you need to launch and scale.', 40, 150, 260, 70);
    const cta = bel('Button', 'Choose plan', 40, 240, 180, 46);
    return { elements: [plan, amount, desc, cta], props: [textProp('Plan name', plan), textProp('Price', amount), textProp('Description', desc), textProp('Call to action', cta)] };
  }),
  builtIn('CTA banner', 'A full-width call-to-action banner.', 'CTA', 'section', () => {
    const heading = bel('Heading', 'Ready to get started?', 40, 40, 500, 60);
    const cta = bel('Button', 'Get a demo', 620, 40, 160, 46);
    return { elements: [heading, cta], props: [textProp('Heading', heading), textProp('Action', cta)] };
  }),
  builtIn('Contact form', 'A simple contact form with heading.', 'Forms', 'section', () => {
    const heading = bel('Heading', 'Get in touch', 40, 30, 400, 60);
    const form = bel('Form', 'Contact form', 40, 110, 400, 260);
    return { elements: [heading, form], props: [textProp('Heading', heading), textProp('Form title', form)] };
  }),
  builtIn('Footer', 'A site footer with links and copyright.', 'Footers', 'section', () => {
    const brand = bel('Heading', 'FORGE', 30, 30, 120, 40);
    const links = bel('Text', 'Product  Company  Resources  Legal', 200, 40, 420, 40);
    const copyright = bel('Text', '© 2026 Forge. All rights reserved.', 30, 90, 300, 40);
    return { elements: [brand, links, copyright], props: [textProp('Brand', brand), textProp('Links', links), textProp('Copyright', copyright)] };
  }),
];

export function resolveComponent(id: string, userComponents: ComponentDefinition[]): ComponentDefinition | undefined {
  return BUILT_IN_COMPONENTS.find((component) => component.id === id) ?? userComponents.find((component) => component.id === id);
}