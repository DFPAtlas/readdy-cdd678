import { useRef } from 'react';
import type { CSSProperties, PointerEvent as ReactPointerEvent, ReactNode } from 'react';
import { Minus, X, Square, PanelLeftClose, Maximize2 } from 'lucide-react';

type ResizeDirection = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw';

type FloatingPanelProps = {
  title: string;
  minimized: boolean;
  x: number;
  y: number;
  width: number;
  height: number;
  minWidth: number;
  minHeight: number;
  z: number;
  active: boolean;
  dockIcon?: ReactNode;
  boundsRef: { current: HTMLElement | null };
  onMove: (x: number, y: number) => void;
  onResize: (width: number, height: number, x: number, y: number) => void;
  onFocus: () => void;
  onDock: () => void;
  onMinimize: () => void;
  onRestore: () => void;
  onClose: () => void;
  children: ReactNode;
};

const CORNER_DIRECTIONS: ResizeDirection[] = ['ne', 'nw', 'se', 'sw'];

export default function FloatingPanel({
  title,
  minimized,
  x,
  y,
  width,
  height,
  minWidth,
  minHeight,
  z,
  active,
  dockIcon,
  boundsRef,
  onMove,
  onResize,
  onFocus,
  onDock,
  onMinimize,
  onRestore,
  onClose,
  children,
}: FloatingPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  const startDrag = (event: ReactPointerEvent) => {
    event.preventDefault();
    onFocus();
    const bounds = boundsRef.current;
    if (!bounds) return;
    const rect = bounds.getBoundingClientRect();
    const startX = event.clientX;
    const startY = event.clientY;
    const origin = { x, y };

    const handleMove = (moveEvent: PointerEvent) => {
      const maxX = Math.max(0, rect.width - width);
      const maxY = Math.max(0, rect.height - height);
      const nextX = Math.min(maxX, Math.max(0, origin.x + (moveEvent.clientX - startX)));
      const nextY = Math.min(maxY, Math.max(0, origin.y + (moveEvent.clientY - startY)));
      onMove(nextX, nextY);
    };
    const handleUp = () => {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
      window.removeEventListener('pointercancel', handleUp);
    };
    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp);
    window.addEventListener('pointercancel', handleUp);
  };

  const startResize = (event: ReactPointerEvent, direction: ResizeDirection) => {
    event.preventDefault();
    event.stopPropagation();
    onFocus();
    const bounds = boundsRef.current;
    if (!bounds) return;
    const rect = bounds.getBoundingClientRect();
    const startX = event.clientX;
    const startY = event.clientY;
    const origin = { x, y, width, height };

    const handleMove = (moveEvent: PointerEvent) => {
      let nextX = origin.x;
      let nextY = origin.y;
      let nextWidth = origin.width;
      let nextHeight = origin.height;
      const dx = moveEvent.clientX - startX;
      const dy = moveEvent.clientY - startY;

      if (direction.includes('e')) nextWidth = Math.max(minWidth, origin.width + dx);
      if (direction.includes('s')) nextHeight = Math.max(minHeight, origin.height + dy);
      if (direction.includes('w')) {
        nextWidth = Math.max(minWidth, origin.width - dx);
        nextX = origin.x + (origin.width - nextWidth);
      }
      if (direction.includes('n')) {
        nextHeight = Math.max(minHeight, origin.height - dy);
        nextY = origin.y + (origin.height - nextHeight);
      }

      nextWidth = Math.min(nextWidth, rect.width);
      nextHeight = Math.min(nextHeight, rect.height);
      nextX = Math.min(Math.max(0, nextX), Math.max(0, rect.width - nextWidth));
      nextY = Math.min(Math.max(0, nextY), Math.max(0, rect.height - nextHeight));

      onResize(nextWidth, nextHeight, nextX, nextY);
    };
    const handleUp = () => {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
      window.removeEventListener('pointercancel', handleUp);
    };
    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp);
    window.addEventListener('pointercancel', handleUp);
  };

  const style: CSSProperties = {
    left: x,
    top: y,
    width,
    height,
    zIndex: z,
  };

  return (
    <div
      ref={panelRef}
      className={`forge-floating-panel ${active ? 'active' : ''} ${minimized ? 'minimized' : ''}`}
      style={style}
      onPointerDown={onFocus}
      role="dialog"
      aria-label={title}
    >
      <div
        className="forge-floating-header"
        onPointerDown={startDrag}
        onDoubleClick={onDock}
        title="Drag to move · double-click to dock"
      >
        <span className="forge-floating-title">{title}</span>
        <div
          className="forge-floating-actions"
          onPointerDown={(event) => event.stopPropagation()}
          onDoubleClick={(event) => event.stopPropagation()}
        >
          {minimized ? (
            <button aria-label="Restore panel" title="Restore" onClick={onRestore}><Square size={13} /></button>
          ) : (
            <button aria-label="Minimise panel" title="Minimise" onClick={onMinimize}><Minus size={15} /></button>
          )}
          <button aria-label="Dock panel" title="Dock back to sidebar" onClick={onDock}>{dockIcon ?? <PanelLeftClose size={14} />}</button>
          <button className="close" aria-label="Close panel" title="Close" onClick={onClose}><X size={15} /></button>
        </div>
      </div>

      {!minimized && (
        <>
          <div className="forge-floating-body">{children}</div>
          <span className="forge-resize-handle n" onPointerDown={(event) => startResize(event, 'n')} />
          <span className="forge-resize-handle s" onPointerDown={(event) => startResize(event, 's')} />
          <span className="forge-resize-handle e" onPointerDown={(event) => startResize(event, 'e')} />
          <span className="forge-resize-handle w" onPointerDown={(event) => startResize(event, 'w')} />
          {CORNER_DIRECTIONS.map((direction) => (
            <span
              key={direction}
              className={`forge-resize-handle ${direction}`}
              onPointerDown={(event) => startResize(event, direction)}
            >
              {direction === 'se' && <Maximize2 size={11} />}
            </span>
          ))}
        </>
      )}
    </div>
  );
}