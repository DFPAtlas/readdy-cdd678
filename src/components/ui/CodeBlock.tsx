import { useState } from 'react';
import { Check, Copy } from 'lucide-react';

interface CodeBlockProps {
  code: string;
  language?: string;
  className?: string;
}

export function CodeBlock({ code, language, className = '' }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={`relative rounded-md bg-forge-bg border border-forge-border overflow-hidden ${className}`}>
      {language && (
        <div className="flex items-center justify-between px-3 py-1 border-b border-forge-border-subtle">
          <span className="text-[10px] font-mono text-forge-text-muted uppercase">{language}</span>
          <button onClick={handleCopy} className="text-forge-text-muted hover:text-forge-text-primary transition-colors">
            {copied ? <Check className="h-3 w-3 text-forge-success" /> : <Copy className="h-3 w-3" />}
          </button>
        </div>
      )}
      <pre className="p-3 overflow-x-auto">
        <code className="text-xs font-mono text-forge-text-primary whitespace-pre">{code}</code>
      </pre>
    </div>
  );
}