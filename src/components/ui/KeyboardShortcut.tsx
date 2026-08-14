interface KeyboardShortcutProps {
  keys: string[];
  className?: string;
}

export function KeyboardShortcut({ keys, className = '' }: KeyboardShortcutProps) {
  return (
    <kbd className={`inline-flex items-center gap-0.5 text-[10px] font-mono text-forge-text-muted ${className}`}>
      {keys.map((key, i) => (
        <span key={i} className="inline-flex items-center">
          {i > 0 && <span className="mx-0.5 opacity-50">+</span>}
          <span className="px-1 py-0.5 rounded bg-forge-border border border-forge-border-subtle leading-none">
            {key}
          </span>
        </span>
      ))}
    </kbd>
  );
}