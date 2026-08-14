import type { CanvasElement, CanvasElementKind } from './sandboxPersistence';

export type SandboxAiOperation =
  | { kind: 'add'; elementType: CanvasElementKind; content?: string; x?: number; y?: number }
  | { kind: 'update'; elementId: string; patch: Partial<CanvasElement> }
  | { kind: 'delete'; elementId: string }
  | { kind: 'duplicate'; elementId: string }
  | { kind: 'viewport'; viewport: 'desktop' | 'tablet' | 'mobile' };

export type SandboxAiProposal = {
  id: string;
  title: string;
  summary: string;
  changes: string[];
  operations: SandboxAiOperation[];
  source: 'forge-ai' | 'local';
};

type PromptContext = {
  elements: CanvasElement[];
  selectedElement: CanvasElement | null;
  viewport: 'desktop' | 'tablet' | 'mobile';
};

const colourNames: Record<string, string> = {
  amber: '#f5a400', orange: '#f28c00', red: '#dc2626', blue: '#2563eb',
  green: '#16a34a', black: '#111820', white: '#ffffff', grey: '#64748b', gray: '#64748b',
};

function proposal(changes: string[], operations: SandboxAiOperation[], source: SandboxAiProposal['source'] = 'local'): SandboxAiProposal {
  return {
    id: crypto.randomUUID(),
    title: changes.length === 1 ? changes[0] : `${changes.length} proposed changes`,
    summary: 'Review these changes before they are applied to the canvas.',
    changes,
    operations,
    source,
  };
}

function parseLocalPrompt(promptText: string, context: PromptContext) {
  const prompt = promptText.trim();
  const lower = prompt.toLowerCase();
  const changes: string[] = [];
  const operations: SandboxAiOperation[] = [];
  const selected = context.selectedElement;

  const add = (elementType: CanvasElementKind, content?: string, x?: number, y?: number) => {
    operations.push({ kind: 'add', elementType, content, x, y });
    changes.push(`Add ${content ? `“${content}” ` : ''}${elementType.toLowerCase()}`);
  };

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

  if (!operations.length) {
    add('Text', prompt || 'Describe the content you want to add', 300, 350);
    changes[0] = 'Add AI-generated content block';
  }

  return proposal(changes, operations);
}

function isProposal(value: unknown): value is Omit<SandboxAiProposal, 'source'> {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<SandboxAiProposal>;
  return typeof candidate.title === 'string' && Array.isArray(candidate.changes) && Array.isArray(candidate.operations);
}

export async function analyseSandboxPrompt(prompt: string, context: PromptContext): Promise<SandboxAiProposal> {
  const endpoint = import.meta.env.VITE_FORGE_AI_ENDPOINT as string | undefined;
  if (endpoint) {
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, context }),
      });
      if (!response.ok) throw new Error(`Forge AI returned ${response.status}`);
      const data: unknown = await response.json();
      if (isProposal(data)) return { ...data, id: data.id ?? crypto.randomUUID(), source: 'forge-ai' };
    } catch {
      // The deterministic assistant keeps the builder usable if the AI service is unavailable.
    }
  }
  return parseLocalPrompt(prompt, context);
}
