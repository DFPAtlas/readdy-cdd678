import { useCallback, useMemo } from 'react';
import {
  PanelTop, GitCompare, Sparkles, ChevronDown, Play,
} from 'lucide-react';
import { useSandboxStore } from '@/stores/sandboxStore';
import { useToast } from '@/components/ui/Toast';
import { Tooltip } from '@/components/ui/Tooltip';

export function WorkingPrompt() {
  const toast = useToast();
  const {
    promptText, promptVersion, promptSaved, promptPanelOpen,
    togglePromptPanel, setPromptText,
  } = useSandboxStore();

  const charCount = promptText.length;
  const tokenEstimate = useMemo(() => Math.round(charCount / 4), [charCount]);

  const handleSubmit = useCallback(() => {
    toast.show('Build prompt submitted', 'success');
  }, [toast]);

  if (!promptPanelOpen) {
    return (
      <div className="flex items-center h-9 px-3 border-b border-forge-border-subtle bg-forge-panel flex-shrink-0">
        <button
          onClick={togglePromptPanel}
          className="flex items-center gap-2 text-xs text-forge-text-muted hover:text-forge-text-primary transition-colors"
        >
          <PanelTop className="h-3.5 w-3.5" />
          <span>Working Prompt</span>
          <span className="text-[10px] text-forge-text-muted bg-forge-bg px-1.5 py-0.5 rounded">
            v{promptVersion}
          </span>
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col border-b border-forge-border-subtle bg-forge-panel flex-shrink-0">
      {/* Header */}
      <div className="flex items-center h-9 px-3 gap-2 flex-shrink-0">
        <span className="text-sm font-medium text-forge-text-primary">Working Prompt</span>
        <span className="text-[10px] text-forge-text-muted bg-forge-bg px-1.5 py-0.5 rounded">
          v{promptVersion}
        </span>
        <Tooltip content="Compare versions">
          <button className="ml-1 p-1 rounded text-forge-text-muted hover:text-forge-text-primary hover:bg-forge-hover transition-colors">
            <GitCompare className="h-3.5 w-3.5" />
          </button>
        </Tooltip>
        <div className="flex-1" />
        <Tooltip content="Collapse prompt panel">
          <button
            onClick={togglePromptPanel}
            className="p-1 rounded text-forge-text-muted hover:text-forge-text-primary hover:bg-forge-hover transition-colors"
          >
            <PanelTop className="h-3.5 w-3.5" />
          </button>
        </Tooltip>
      </div>

      {/* Textarea */}
      <textarea
        value={promptText}
        onChange={(e) => setPromptText(e.target.value)}
        className="flex-1 min-h-[100px] max-h-[180px] mx-3 mb-2 p-2.5 text-sm leading-relaxed text-forge-text-primary bg-forge-bg border border-forge-border-subtle rounded-md resize-y focus:outline-none focus:border-forge-border transition-colors font-sans"
        spellCheck={false}
      />

      {/* Footer bar */}
      <div className="flex items-center h-9 px-3 gap-3 flex-shrink-0 border-t border-forge-border-subtle">
        <span className="text-[11px] text-forge-text-muted">
          {charCount} characters
        </span>
        <span className="text-[11px] text-forge-text-muted">
          ~{tokenEstimate} tokens
        </span>
        <div className="flex-1" />
        {promptSaved && (
          <span className="text-[11px] text-forge-success">Saved</span>
        )}
        <button className="inline-flex items-center gap-1 h-6 px-2 rounded text-[11px] text-forge-text-secondary bg-forge-bg border border-forge-border-subtle hover:bg-forge-hover transition-colors">
          <Sparkles className="h-3 w-3" />
          Suggested
          <ChevronDown className="h-3 w-3" />
        </button>
        <button
          onClick={handleSubmit}
          className="inline-flex items-center gap-1 h-6 px-3 rounded text-[11px] font-medium bg-forge-amber text-forge-text-inverse hover:bg-forge-amber-dim transition-colors"
        >
          <Play className="h-3 w-3" />
          Submit Build
        </button>
      </div>
    </div>
  );
}