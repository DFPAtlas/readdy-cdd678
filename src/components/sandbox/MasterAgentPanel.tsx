import { useState, useRef, useEffect, useCallback } from 'react';
import {
  MessageSquare, FileText, ListChecks, Activity as ActivityIcon,
  ChevronRight, Send, PanelRightClose, PanelRightOpen,
  RotateCcw, CheckCircle, CircleDot, Clock, Ban, Play,
  ThumbsUp, Copy, Share2,
} from 'lucide-react';
import { useSandboxStore } from '@/stores/sandboxStore';
import { useToast } from '@/components/ui/Toast';
import {
  demoMessages, demoBuildTasks, demoActivityEvents,
} from '@/services/mock/sandboxMock';

const AGENT_TABS = [
  { id: 'chat', label: 'Chat', icon: MessageSquare },
  { id: 'prompt', label: 'Prompt', icon: FileText },
  { id: 'tasks', label: 'Tasks', icon: ListChecks },
  { id: 'activity', label: 'Activity', icon: ActivityIcon },
];

export function MasterAgentPanel() {
  const { rightPanelOpen, toggleRightPanel, activeAgentTab, setActiveAgentTab } = useSandboxStore();

  return (
    <div className="relative h-full"
    >
      {/* Reopen Handle — fixed to the right edge of the viewport so it can never be clipped or pushed off-screen */}
      {!rightPanelOpen && (
        <button
          onClick={toggleRightPanel}
          title="Open Master Agent"
          aria-label="Open Master Agent panel"
          className="fixed right-0 top-1/2 -translate-y-1/2 z-[60] w-[38px] h-[64px] border border-forge-border-subtle border-r-0 rounded-l-lg bg-[linear-gradient(145deg,rgba(28,22,16,0.98),rgba(9,12,16,0.98))] text-white flex flex-col items-center justify-center gap-1 cursor-pointer shadow-[-8px_10px_24px_rgba(0,0,0,0.28)] hover:border-forge-amber/50 hover:w-[44px] transition-all"
        >
          <PanelRightOpen className="h-4 w-4" />
        </button>
      )}

      <div
        className={`flex flex-col h-full bg-forge-sidebar transition-all duration-300 ${
          rightPanelOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        style={{ width: rightPanelOpen ? '100%' : 0 }}
      >
        {/* Header */}
        <div className="flex items-center h-[50px] px-4 border-b border-forge-border-subtle flex-shrink-0"
        >
          <div className="flex-1"
          >
            <h3 className="text-[15px] font-semibold text-forge-text-primary m-0">Master Agent</h3>
            <span className="text-[11px] text-forge-success">Context: Online</span>
          </div>
          <button
            onClick={toggleRightPanel}
            className="w-[30px] h-[30px] border border-forge-border-subtle rounded-lg bg-transparent text-forge-text-muted grid place-items-center hover:text-white hover:border-white/20 transition-colors cursor-pointer"
          >
            <PanelRightClose className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Controls */}
        <div className="grid grid-cols-3 gap-2 px-2.5 py-2.5 border-b border-forge-border-subtle bg-[rgba(6,12,25,0.96)]"
        >
          <button className="min-h-[38px] px-2 rounded-lg border border-forge-border-subtle bg-[rgba(11,19,38,0.9)] text-white text-[11px] hover:border-forge-amber/50 transition-colors cursor-pointer whitespace-nowrap"
          >
            Draft
          </button>
          <button className="min-h-[38px] px-2 rounded-lg border border-forge-amber/40 bg-forge-amber/15 text-white text-[11px] hover:border-forge-amber/60 transition-colors cursor-pointer whitespace-nowrap"
          >
            Build
          </button>
          <button className="min-h-[38px] px-2 rounded-lg border border-forge-border-subtle bg-[rgba(11,19,38,0.9)] text-white text-[11px] hover:border-forge-amber/50 transition-colors cursor-pointer whitespace-nowrap"
          >
            Deploy
          </button>
        </div>

        {/* Mode Tabs */}
        <div className="grid grid-cols-4 gap-1.5 px-2.5 py-2.5 border-b border-forge-border-subtle"
        >
          {AGENT_TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveAgentTab(t.id as typeof activeAgentTab)}
              className={`text-center px-1 py-2 rounded-lg text-[11px] transition-colors cursor-pointer whitespace-nowrap ${
                activeAgentTab === t.id
                  ? 'text-white bg-forge-amber/18 border border-forge-amber/40'
                  : 'text-forge-text-muted bg-transparent border border-transparent hover:text-white hover:bg-white/5'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden min-h-0"
        >
          {activeAgentTab === 'chat' && <ChatTab />}
          {activeAgentTab === 'prompt' && <PromptTab />}
          {activeAgentTab === 'tasks' && <TasksTab />}
          {activeAgentTab === 'activity' && <ActivityTab />}
        </div>
      </div>
    </div>
  );
}

/* ─── Chat Tab ─── */

function ChatTab() {
  const [messages] = useState(demoMessages);
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const toast = useToast();

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  const handleSend = () => {
    if (!input.trim()) return;
    toast.show('Message sent (demo)');
    setInput('');
  };

  return (
    <div className="flex flex-col h-full"
    >
      <div ref={scrollRef} className="flex-1 overflow-auto p-3 space-y-2.5"
      >
        {messages.map((msg) => (
          <MessageBubble key={msg.id} msg={msg} />
        ))}
      </div>

      {/* Composer */}
      <div className="flex-shrink-0 border-t border-forge-border-subtle p-3"
      >
        <div className="border border-forge-border-subtle rounded-xl overflow-hidden bg-[#070A0E]"
        >
          <div className="flex items-center justify-between px-3 py-2.5 border-b border-forge-border-subtle"
          >
            <span className="text-xs text-[#dce5ff]">Prompt</span>
            <span className="text-[10px] text-forge-text-muted">v1</span>
          </div>
          <pre className="m-0 p-3 min-h-[120px] text-[10px] leading-[1.5] text-forge-amber whitespace-pre-wrap"
          >
            Create a modern portfolio homepage with a dark theme and amber accents. Include a hero section, about section, projects grid, and contact form.
          </pre>
        </div>

        <div className="mt-2"
        >
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Ask me anything about your project..."
            className="w-full h-[70px] resize-none border border-forge-border-subtle rounded-lg text-white bg-[#0A0E13] p-2.5 text-xs outline-none focus:border-forge-border transition-colors"
            rows={1}
          />
        </div>

        <div className="grid grid-cols-2 gap-2 mt-2"
        >
          <button className="h-9 rounded-lg border border-forge-border-subtle bg-[rgba(11,19,38,0.9)] text-white text-xs hover:border-forge-amber/50 transition-colors cursor-pointer whitespace-nowrap"
          >
            Cancel
          </button>
          <button
            onClick={handleSend}
            disabled={!input.trim()}
            className="h-9 rounded-lg bg-forge-amber text-[#0B0D10] text-xs font-semibold hover:bg-forge-amber/90 transition-colors disabled:opacity-30 cursor-pointer whitespace-nowrap"
          >
            <Send className="h-3.5 w-3.5 inline mr-1" />
            Run
          </button>
        </div>
      </div>
    </div>
  );
}

function MessageBubble({ msg }: { msg: typeof demoMessages[0] }) {
  const isUser = msg.role === 'user';

  if (msg.type === 'plan') {
    return (
      <div className="p-3 rounded-xl border border-forge-border-subtle bg-[rgba(10,20,42,0.84)]"
      >
        <div className="text-xs font-medium text-forge-text-primary mb-2"
        >Plan</div>
        <ol className="space-y-1"
        >
          {msg.planSteps?.map((step, i) => (
            <li
              key={i}
              className={`flex items-center gap-2 text-xs ${
                step.status === 'completed'
                  ? 'text-forge-success'
                  : step.status === 'active'
                  ? 'text-forge-amber'
                  : 'text-forge-text-muted'
              }`}
            >
              <span className="w-4 text-right">{i + 1}.</span>
              <span className={step.status === 'completed' ? 'line-through opacity-60' : ''}>{step.text}</span>
              {step.status === 'active' && <ChevronRight className="h-3 w-3 text-forge-amber" />}
            </li>
          ))}
        </ol>
      </div>
    );
  }

  return (
    <div className={`p-3 rounded-xl text-xs leading-relaxed ${
      isUser
        ? 'ml-11 bg-[linear-gradient(145deg,rgba(251,191,36,0.78),rgba(184,79,0,0.72))] text-white border border-forge-amber/30'
        : 'border border-forge-border-subtle bg-[rgba(10,20,42,0.84)] text-forge-text-primary'
    }`}
    >
      <div className="flex items-center gap-2 mb-1"
      >
        <span className="font-medium text-[11px]">{isUser ? 'You' : 'Master Agent'}</span>
        <span className="text-[10px] text-forge-text-muted">{msg.timestamp}</span>
      </div>
      <p className="m-0">{msg.content}</p>
      {!isUser && (
        <div className="flex items-center gap-1 mt-1"
        >
          <ActionBtn icon={ThumbsUp} />
          <ActionBtn icon={Copy} />
          <ActionBtn icon={Share2} />
          <ActionBtn icon={RotateCcw} />
        </div>
      )}
    </div>
  );
}

function ActionBtn({ icon: Icon }: { icon: typeof ThumbsUp }) {
  return (
    <button className="p-0.5 rounded text-forge-text-muted hover:text-forge-text-primary hover:bg-forge-hover transition-colors cursor-pointer"
    >
      <Icon className="h-3 w-3" />
    </button>
  );
}

/* ─── Prompt Tab ─── */

function PromptTab() {
  const toast = useToast();
  const { setBuildStatus } = useSandboxStore();

  const handleSubmit = () => {
    setBuildStatus('running');
    toast.show('Build prompt submitted from Prompt tab', 'success');
  };

  return (
    <div className="flex flex-col h-full p-3 gap-3 overflow-auto"
    >
      <div className="bg-forge-bg border border-forge-border-subtle rounded-lg p-3"
      >
        <div className="text-xs font-medium text-forge-text-primary mb-1"
        >Working Prompt</div>
        <div className="text-[10px] text-forge-text-muted mb-2"
        >Version 1</div>
        <div className="text-xs text-forge-text-secondary leading-relaxed whitespace-pre-wrap"
        >
          Create a modern portfolio homepage with a dark theme and amber accents.
        </div>
      </div>

      <button
        onClick={handleSubmit}
        className="h-8 flex items-center justify-center gap-1.5 rounded-md text-xs font-medium bg-forge-amber text-forge-text-inverse hover:bg-forge-amber-dim transition-colors cursor-pointer whitespace-nowrap"
      >
        <Play className="h-3.5 w-3.5" />
        Submit Build
      </button>
    </div>
  );
}

/* ─── Tasks Tab ─── */

function TasksTab() {
  const [tasks] = useState(demoBuildTasks);

  return (
    <div className="flex flex-col h-full overflow-auto p-2"
    >
      <div className="text-[10px] font-semibold uppercase tracking-wider text-forge-text-muted px-1 mb-1"
      >Build Tasks</div>
      <div className="space-y-0.5"
      >
        {tasks.map((t) => (
          <div
            key={t.id}
            className="flex items-center gap-2 px-2 py-1.5 rounded text-xs bg-forge-bg border border-forge-border-subtle"
          >
            <StatusIcon status={t.status} />
            <div className="flex-1 min-w-0"
            >
              <div className="truncate text-forge-text-primary">{t.name}</div>
              <div className="text-[10px] text-forge-text-muted">{t.agent}</div>
            </div>
            <div className="text-[10px] text-forge-text-muted tabular-nums">
              {t.progress}%
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function StatusIcon({ status }: { status: string }) {
  switch (status) {
    case 'completed': return <CheckCircle className="h-3.5 w-3.5 text-forge-success flex-shrink-0" />;
    case 'running': return <CircleDot className="h-3.5 w-3.5 text-forge-amber animate-pulse flex-shrink-0" />;
    case 'failed': return <Ban className="h-3.5 w-3.5 text-forge-error flex-shrink-0" />;
    default: return <Clock className="h-3.5 w-3.5 text-forge-text-muted flex-shrink-0" />;
  }
}

/* ─── Activity Tab ─── */

function ActivityTab() {
  const [events] = useState(demoActivityEvents);

  return (
    <div className="flex flex-col h-full overflow-auto p-2"
    >
      <div className="text-[10px] font-semibold uppercase tracking-wider text-forge-text-muted px-1 mb-1"
      >Activity</div>
      <div className="space-y-0.5"
      >
        {events.map((e) => (
          <div
            key={e.id}
            className="flex items-start gap-2 px-2 py-1.5 rounded text-xs hover:bg-forge-hover transition-colors"
          >
            <div className="mt-0.5 h-2 w-2 rounded-full bg-forge-accent flex-shrink-0"
            ></div>
            <div className="flex-1 min-w-0"
            >
              <div className="text-forge-text-secondary">{e.message}</div>
              <div className="flex items-center gap-2 text-[10px] text-forge-text-muted"
              >
                <span>{e.agent}</span>
                <span>{e.timestamp}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}