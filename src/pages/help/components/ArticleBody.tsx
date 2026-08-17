import { useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Check, Copy, Info, Lightbulb, AlertTriangle, OctagonAlert } from 'lucide-react';
import type { HelpArticle, HelpBlock, CalloutKind } from '../helpData';

/* ──────────────────────────────────────────────────────────────
   Inline markdown for documentation text. Supports a small,
   safe subset: **bold**, `code`, and [label](url). Internal links
   (starting with "/") render as router links; everything else is
   an external link.
   ────────────────────────────────────────────────────────────── */

const INLINE_REGEX = /(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\([^)]+\))/g;

function renderInline(text: string, keyPrefix: string): ReactNode[] {
  const parts = text.split(INLINE_REGEX);
  const nodes: ReactNode[] = [];
  parts.forEach((part, i) => {
    if (part === '') return;
    const key = `${keyPrefix}-${i}`;
    if (part.startsWith('**') && part.endsWith('**')) {
      nodes.push(
        <strong key={key} className="font-semibold text-forge-text-primary">
          {part.slice(2, -2)}
        </strong>,
      );
    } else if (part.startsWith('`') && part.endsWith('`')) {
      nodes.push(
        <code
          key={key}
          className="rounded bg-forge-border/60 px-1.5 py-0.5 font-mono text-[0.85em] text-forge-text-primary"
        >
          {part.slice(1, -1)}
        </code>,
      );
    } else if (part.startsWith('[')) {
      const match = part.match(/\[([^\]]+)\]\(([^)]+)\)/);
      if (match) {
        const label = match[1];
        const url = match[2];
        if (url.startsWith('/')) {
          nodes.push(
            <Link
              key={key}
              to={url}
              className="text-forge-amber underline decoration-forge-amber/40 underline-offset-2 hover:decoration-forge-amber"
            >
              {label}
            </Link>,
          );
        } else {
          nodes.push(
            <a
              key={key}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-forge-amber underline decoration-forge-amber/40 underline-offset-2 hover:decoration-forge-amber"
            >
              {label}
            </a>,
          );
        }
      } else {
        nodes.push(part);
      }
    } else {
      nodes.push(part);
    }
  });
  return nodes;
}

/* ── Code block with copy button ── */

function CodeBlock({ language, code }: { language?: string; code: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      // Clipboard unavailable — leave the button in its idle state.
    }
  };

  return (
    <div className="group relative my-4 overflow-hidden rounded-lg border border-forge-border-subtle bg-[#0b0f13]">
      <div className="flex items-center justify-between border-b border-forge-border-subtle px-3 py-1.5">
        <span className="font-mono text-[11px] uppercase tracking-wide text-forge-text-muted">
          {language || 'text'}
        </span>
        <button
          type="button"
          onClick={copy}
          aria-label="Copy code"
          className="inline-flex items-center gap-1.5 rounded px-2 py-1 text-[11px] text-forge-text-secondary transition-colors hover:bg-forge-hover hover:text-forge-text-primary"
        >
          {copied ? (
            <>
              <Check className="h-3.5 w-3.5 text-forge-success" />
              <span className="text-forge-success">Copied</span>
            </>
          ) : (
            <>
              <Copy className="h-3.5 w-3.5" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
      <pre className="overflow-x-auto p-3.5 font-mono text-[13px] leading-relaxed text-forge-text-primary">
        <code>{code}</code>
      </pre>
    </div>
  );
}

/* ── Callout ── */

const CALLOUT_STYLES: Record<CalloutKind, { icon: typeof Info; label: string; cls: string; iconCls: string }> = {
  note: { icon: Info, label: 'Note', cls: 'border-forge-accent/30 bg-forge-accent/5', iconCls: 'text-forge-accent' },
  tip: { icon: Lightbulb, label: 'Tip', cls: 'border-forge-success/30 bg-forge-success/5', iconCls: 'text-forge-success' },
  important: { icon: AlertTriangle, label: 'Important', cls: 'border-forge-amber/30 bg-forge-amber/5', iconCls: 'text-forge-amber' },
  warning: { icon: OctagonAlert, label: 'Warning', cls: 'border-forge-error/30 bg-forge-error/5', iconCls: 'text-forge-error' },
};

function Callout({ kind, text }: { kind: CalloutKind; text: string }) {
  const style = CALLOUT_STYLES[kind];
  const Icon = style.icon;
  return (
    <div className={`my-5 flex gap-3 rounded-lg border px-4 py-3 ${style.cls}`}>
      <span className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center">
        <Icon className={`h-4 w-4 ${style.iconCls}`} />
      </span>
      <div className="min-w-0 text-[14px] leading-relaxed">
        <span className="mr-1 font-semibold text-forge-text-primary">{style.label}:</span>
        <span className="text-forge-text-secondary">{renderInline(text, `callout-${kind}`)}</span>
      </div>
    </div>
  );
}

/* ── Block renderer ── */

function renderBlock(block: HelpBlock, index: number): ReactNode {
  switch (block.type) {
    case 'heading':
      return block.level === 2 ? (
        <h2
          key={index}
          className="mt-9 mb-3 text-lg font-semibold tracking-tight text-forge-text-primary"
        >
          {block.text}
        </h2>
      ) : (
        <h3
          key={index}
          className="mt-7 mb-2 text-[15px] font-semibold text-forge-text-primary"
        >
          {block.text}
        </h3>
      );
    case 'paragraph':
      return (
        <p key={index} className="my-4 text-[14px] leading-[1.8] text-forge-text-secondary">
          {renderInline(block.text, `p-${index}`)}
        </p>
      );
    case 'list': {
      const items = block.items.map((item, i) => (
        <li key={i} className="my-1.5 text-[14px] leading-[1.8] text-forge-text-secondary">
          {renderInline(item, `li-${index}-${i}`)}
        </li>
      ));
      return block.ordered ? (
        <ol key={index} className="my-4 list-decimal space-y-1 pl-6">
          {items}
        </ol>
      ) : (
        <ul key={index} className="my-4 list-disc space-y-1 pl-6">
          {items}
        </ul>
      );
    }
    case 'code':
      return <CodeBlock key={index} language={block.language} code={block.code} />;
    case 'callout':
      return <Callout key={index} kind={block.kind} text={block.text} />;
  }
}

export function ArticleBody({ article }: { article: HelpArticle }) {
  return <div className="max-w-[68ch]">{article.body.map((block, i) => renderBlock(block, i))}</div>;
}