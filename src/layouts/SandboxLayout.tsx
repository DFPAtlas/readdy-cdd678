import { useEffect } from 'react';
import { useThemeStore, applyThemeToDocument } from '@/stores/themeStore';
import { useSandboxStore } from '@/stores/sandboxStore';
import { TopBar } from '@/components/feature/TopBar';
import { StatusBar } from '@/components/feature/StatusBar';
import { ResizeHandle } from '@/components/sandbox/ResizeHandle';

interface SandboxLayoutProps {
  toolbar: React.ReactNode;
  leftPanel: React.ReactNode;
  mainContent: React.ReactNode;
  rightPanel: React.ReactNode;
  bottomDrawer: React.ReactNode;
  embedded?: boolean;
}

const MIN_LEFT = 160;
const MAX_LEFT = 400;
const MIN_RIGHT = 280;
const MAX_RIGHT = 520;
const MIN_BOTTOM = 120;
const MAX_BOTTOM = 400;

export default function SandboxLayout({
  toolbar, leftPanel, mainContent, rightPanel, bottomDrawer, embedded = false,
}: SandboxLayoutProps) {
  const effectiveTheme = useThemeStore((s) => s.effectiveTheme);
  const {
    leftPanelOpen, leftPanelWidth, rightPanelOpen, rightPanelWidth,
    bottomDrawerOpen, bottomDrawerHeight,
    setLeftPanelWidth, setRightPanelWidth, setBottomDrawerHeight,
  } = useSandboxStore();

  useEffect(() => {
    applyThemeToDocument(effectiveTheme);
  }, [effectiveTheme]);

  const clamp = (val: number, min: number, max: number) => Math.max(min, Math.min(max, val));

  return (
    <div
      className={`flex flex-col bg-forge-bg overflow-hidden ${
        embedded
          ? 'h-[820px] rounded-xl border border-forge-border-subtle shadow-2xl'
          : 'h-screen'
      }`}
    >
      {embedded && (
        <div className="flex items-center h-7 px-3 border-b border-forge-border-subtle bg-forge-panel flex-shrink-0">
          <span className="inline-flex items-center gap-2 text-[11px] font-medium tracking-wide text-forge-text-muted">
            <span className="w-1.5 h-1.5 rounded-full bg-forge-amber" aria-hidden="true" />
            WORKSPACE PREVIEW
          </span>
          <span className="ml-3 text-[11px] text-forge-text-muted/70 hidden sm:inline">
            Interactive demonstration of the Forge interface
          </span>
        </div>
      )}
      {!embedded && <TopBar compact />}

      {/* Project Toolbar */}
      <div className="h-9 border-b border-forge-border-subtle bg-forge-panel flex items-center flex-shrink-0">
        {toolbar}
      </div>

      {/* Main workspace */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left panel */}
        <div
          className="flex-shrink-0 overflow-hidden transition-all duration-200"
          style={{
            width: leftPanelOpen ? leftPanelWidth : 72,
            minWidth: leftPanelOpen ? leftPanelWidth : 72,
          }}
        >
          {leftPanel}
        </div>

        {leftPanelOpen && (
          <ResizeHandle
            direction="horizontal"
            onResize={(delta) => setLeftPanelWidth(clamp(leftPanelWidth + delta, MIN_LEFT, MAX_LEFT))}
          />
        )}

        {/* Center + right */}
        <div className={`flex flex-1 min-w-0 ${rightPanelOpen ? 'overflow-hidden' : 'overflow-visible'}`}>
          {/* Center content */}
          <div className="flex flex-col flex-1 min-w-0">
            <div className="flex flex-1 overflow-hidden">
              <div className="flex flex-col flex-1 min-w-0">
                {mainContent}
              </div>
            </div>

            {/* Bottom drawer */}
            {bottomDrawerOpen && (
              <>
                <ResizeHandle
                  direction="vertical"
                  onResize={(delta) => setBottomDrawerHeight(clamp(bottomDrawerHeight - delta, MIN_BOTTOM, MAX_BOTTOM))}
                />
                <div
                  className="flex-shrink-0 overflow-hidden"
                  style={{ height: bottomDrawerHeight }}
                >
                  {bottomDrawer}
                </div>
              </>
            )}
          </div>

          {/* Right panel */}
          <div
            className={`flex-shrink-0 ${rightPanelOpen ? 'overflow-hidden' : 'overflow-visible'}`}
            style={{
              width: rightPanelOpen ? rightPanelWidth : 0,
              minWidth: rightPanelOpen ? rightPanelWidth : 0,
            }}
          >
            {rightPanel}
          </div>
          {rightPanelOpen && (
            <ResizeHandle
              direction="horizontal"
              onResize={(delta) => setRightPanelWidth(clamp(rightPanelWidth - delta, MIN_RIGHT, MAX_RIGHT))}
            />
          )}
        </div>
      </div>

      {/* Bottom status bar */}
      {!embedded && (
        <div className="flex-shrink-0 border-t border-forge-border-subtle bg-forge-panel px-3 h-7 flex items-center justify-between">
          <StatusBar compact />
        </div>
      )}
    </div>
  );
}