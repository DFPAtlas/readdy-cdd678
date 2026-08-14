import { useRef, useEffect, useCallback } from 'react';

interface ResizeHandleProps {
  direction: 'horizontal' | 'vertical';
  onResize: (delta: number) => void;
  onDone?: () => void;
  className?: string;
}

export function ResizeHandle({ direction, onResize, onDone, className = '' }: ResizeHandleProps) {
  const isDragging = useRef(false);
  const startPos = useRef(0);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    isDragging.current = true;
    startPos.current = direction === 'horizontal' ? e.clientX : e.clientY;
    document.body.style.cursor = direction === 'horizontal' ? 'col-resize' : 'row-resize';
    document.body.style.userSelect = 'none';
    e.preventDefault();
  }, [direction]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging.current) return;
      const current = direction === 'horizontal' ? e.clientX : e.clientY;
      onResize(current - startPos.current);
      startPos.current = current;
    };

    const handleMouseUp = () => {
      if (!isDragging.current) return;
      isDragging.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      onDone?.();
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [direction, onResize, onDone]);

  return (
    <div
      onMouseDown={handleMouseDown}
      className={`flex-shrink-0 z-20 hover:bg-forge-amber/30 transition-colors ${
        direction === 'horizontal'
          ? 'w-[3px] cursor-col-resize'
          : 'h-[3px] cursor-row-resize'
      } ${className}`}
      aria-label={direction === 'horizontal' ? 'Resize panel' : 'Resize drawer'}
      role="separator"
    />
  );
}