import { useEffect, useRef } from 'react';
import './ResizeHandle.css';

type Props = {
  // 'vertical' = the handle bar itself is a vertical line; dragging it left/right resizes a width.
  // 'horizontal' = the handle bar is a horizontal line; dragging it up/down resizes a height.
  orientation: 'vertical' | 'horizontal';
  onResize: (deltaPx: number) => void;
};

export function ResizeHandle({ orientation, onResize }: Props) {
  const draggingRef = useRef(false);
  const lastPosRef = useRef(0);
  const onResizeRef = useRef(onResize);
  onResizeRef.current = onResize;

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!draggingRef.current) return;
      const pos = orientation === 'vertical' ? e.clientX : e.clientY;
      onResizeRef.current(pos - lastPosRef.current);
      lastPosRef.current = pos;
    };

    // Listening on window (not just this element) and also on 'blur' is the
    // fix for the same class of bug as the Konva stuck-drag issue: if the
    // mouse button is released outside the browser window, no mouseup event
    // fires here at all, and the drag would otherwise never end.
    const stopDragging = () => {
      if (!draggingRef.current) return;
      draggingRef.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', stopDragging);
    window.addEventListener('blur', stopDragging);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', stopDragging);
      window.removeEventListener('blur', stopDragging);
    };
  }, [orientation]);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    draggingRef.current = true;
    lastPosRef.current = orientation === 'vertical' ? e.clientX : e.clientY;
    document.body.style.cursor = orientation === 'vertical' ? 'col-resize' : 'row-resize';
    document.body.style.userSelect = 'none';
  };

  return <div className={`resize-handle resize-handle--${orientation}`} onMouseDown={handleMouseDown} />;
}
