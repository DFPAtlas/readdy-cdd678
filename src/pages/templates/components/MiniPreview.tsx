import type { TemplateManifest } from '@/pages/projects/sandbox/sandboxTemplates';

/**
 * A lightweight, locally rendered mock preview built from the starter's
 * actual blueprint. No external screenshots — it shows the real heading,
 * copy and call-to-action the starter ships with, with placeholder tokens
 * swapped for friendly labels so it reads cleanly.
 */
const TOKEN_DEFAULTS: Record<string, string> = {
  '{{business_name}}': 'Your Business',
  '{{tagline}}': 'Your tagline',
  '{{description}}': 'A short description of your project',
  '{{primary_cta}}': 'Get started',
  '{{contact_email}}': 'hello@example.com',
};

function previewText(value: string): string {
  return value.replace(/\{\{\w+\}\}/g, (token) => TOKEN_DEFAULTS[token] ?? '…');
}

export function MiniPreview({ manifest }: { manifest: TemplateManifest }) {
  const firstPage = manifest.document.pages[0];
  const elements = firstPage?.elements ?? [];
  const heading = elements.find((element) => element.type === 'Heading')?.content;
  const text = elements.find((element) => element.type === 'Text')?.content;
  const button = elements.find((element) => element.type === 'Button')?.content;
  const hasColumns = elements.some((element) => element.type === 'Columns');
  const hasForm = elements.some((element) => element.type === 'Form');

  return (
    <div className="relative aspect-[16/10] w-full bg-forge-bg overflow-hidden">
      <div className="flex items-center gap-1 h-6 px-3 border-b border-forge-border-subtle">
        <span className="h-1.5 w-1.5 rounded-full bg-forge-border" />
        <span className="h-1.5 w-1.5 rounded-full bg-forge-border" />
        <span className="h-1.5 w-1.5 rounded-full bg-forge-amber/60" />
      </div>

      <div className="p-3 flex flex-col gap-1.5">
        {heading ? (
          <div className="text-[11px] font-semibold leading-snug text-forge-text-primary line-clamp-2">
            {previewText(heading)}
          </div>
        ) : null}

        {text ? (
          <div className="text-[9px] leading-relaxed text-forge-text-muted line-clamp-2">
            {previewText(text)}
          </div>
        ) : null}

        {button ? (
          <div className="self-start mt-0.5 rounded bg-forge-amber px-2 py-0.5 text-[9px] font-medium text-forge-text-inverse">
            {previewText(button)}
          </div>
        ) : null}

        {hasColumns ? (
          <div className="grid grid-cols-3 gap-1 mt-1">
            <div className="h-7 rounded-sm bg-forge-border/50" />
            <div className="h-7 rounded-sm bg-forge-border/50" />
            <div className="h-7 rounded-sm bg-forge-border/50" />
          </div>
        ) : null}

        {hasForm ? (
          <div className="mt-1 space-y-1">
            <div className="h-2 w-3/4 rounded-sm bg-forge-border/50" />
            <div className="h-2 w-full rounded-sm bg-forge-border/40" />
            <div className="h-2 w-full rounded-sm bg-forge-border/40" />
            <div className="h-3.5 w-1/3 rounded-sm bg-forge-amber/70" />
          </div>
        ) : null}
      </div>
    </div>
  );
}