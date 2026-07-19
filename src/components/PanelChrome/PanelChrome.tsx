import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { usePanelLayoutStore, type PanelId, type DockZone } from '../../store/usePanelLayoutStore';
import { ZONE_ORIENTATION, indexForPointer } from '../DockZone/dockGeometry';
import './PanelChrome.css';

const DOCK_ZONE_HOVER_CLASS = 'dock-zone--float-hover';

// Both drag-start (native HTML5 DnD, used for docked reordering / moving
// between zones) and drop (see DockZone.tsx / App.tsx canvas drop target)
// read/write this same MIME type to identify which panel is being moved.
export const PANEL_DRAG_MIME = 'application/x-panel-id';

type ChromeProps = {
  id: PanelId;
  title: string;
  children: ReactNode;
};

export function DockedPanel({ id, title, children }: ChromeProps) {
  const togglePin = usePanelLayoutStore((s) => s.togglePin);

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData(PANEL_DRAG_MIME, id);
    e.dataTransfer.effectAllowed = 'move';
  };

  return (
    <div className="panel-chrome panel-chrome--docked" data-panel-id={id}>
      <div className="panel-chrome__header" draggable onDragStart={handleDragStart}>
        <span className="panel-chrome__handle" aria-hidden>
          ⠿
        </span>
        <span className="panel-chrome__title">{title}</span>
        <button
          className="panel-chrome__pin panel-chrome__pin--pinned"
          onClick={() => togglePin(id)}
          title="Undock (float this panel)"
        >
          📌
        </button>
      </div>
      <div className="panel-chrome__body">{children}</div>
    </div>
  );
}

export function FloatingPanel({ id, title, children }: ChromeProps) {
  const rect = usePanelLayoutStore((s) => s.floating[id]);
  const togglePin = usePanelLayoutStore((s) => s.togglePin);
  const moveFloating = usePanelLayoutStore((s) => s.moveFloating);
  const resizeFloating = usePanelLayoutStore((s) => s.resizeFloating);
  const bringToFront = usePanelLayoutStore((s) => s.bringToFront);
  const dockPanel = usePanelLayoutStore((s) => s.dockPanel);

  const rootRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);
  const resizingRef = useRef(false);
  const lastPosRef = useRef({ x: 0, y: 0 });
  // The dock zone currently under the pointer while dragging (by header, not
  // resizing) — dropping over one re-docks the panel there instead of
  // leaving it floating. Tracked outside React state since it's a purely
  // transient visual affordance, toggled directly via classList so it can't
  // be clobbered by an unrelated re-render of this component.
  const hoverZoneElRef = useRef<HTMLElement | null>(null);

  // Same window-level mousemove/mouseup/blur pattern as ResizeHandle.tsx and
  // the Konva stuck-drag fix: if the button is released outside the browser
  // window, no mouseup ever fires on this element, so the drag/resize must
  // be tracked (and force-stopped) at the window level.
  useEffect(() => {
    const clearHoverZone = () => {
      hoverZoneElRef.current?.classList.remove(DOCK_ZONE_HOVER_CLASS);
      hoverZoneElRef.current = null;
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!draggingRef.current && !resizingRef.current) return;
      const dx = e.clientX - lastPosRef.current.x;
      const dy = e.clientY - lastPosRef.current.y;
      lastPosRef.current = { x: e.clientX, y: e.clientY };
      const current = usePanelLayoutStore.getState().floating[id];
      if (!current) return;
      if (draggingRef.current) {
        moveFloating(id, current.x + dx, current.y + dy);
        // The dragged window itself sits directly under the cursor (highest
        // z-index), so it would otherwise be the element elementFromPoint
        // hits — root's pointer-events is set to 'none' for the drag's
        // duration (see startDrag) so this sees through to what's beneath.
        const under = document.elementFromPoint(e.clientX, e.clientY);
        const zoneEl = under?.closest<HTMLElement>('[data-dock-zone]') ?? null;
        if (zoneEl !== hoverZoneElRef.current) {
          clearHoverZone();
          zoneEl?.classList.add(DOCK_ZONE_HOVER_CLASS);
          hoverZoneElRef.current = zoneEl;
        }
      } else {
        resizeFloating(id, current.width + dx, current.height + dy);
      }
    };
    const stop = () => {
      if (draggingRef.current && hoverZoneElRef.current) {
        const zone = hoverZoneElRef.current.dataset.dockZone as DockZone;
        const index = indexForPointer(hoverZoneElRef.current, ZONE_ORIENTATION[zone], lastPosRef.current.x, lastPosRef.current.y);
        dockPanel(id, zone, index);
      }
      clearHoverZone();
      draggingRef.current = false;
      resizingRef.current = false;
      if (rootRef.current) rootRef.current.style.pointerEvents = '';
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', stop);
    window.addEventListener('blur', stop);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', stop);
      window.removeEventListener('blur', stop);
    };
  }, [id, moveFloating, resizeFloating, dockPanel]);

  if (!rect) return null;

  const startDrag = (e: React.MouseEvent) => {
    e.preventDefault();
    bringToFront(id);
    draggingRef.current = true;
    lastPosRef.current = { x: e.clientX, y: e.clientY };
    if (rootRef.current) rootRef.current.style.pointerEvents = 'none';
    document.body.style.cursor = 'grabbing';
    document.body.style.userSelect = 'none';
  };

  const startResize = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    bringToFront(id);
    resizingRef.current = true;
    lastPosRef.current = { x: e.clientX, y: e.clientY };
    document.body.style.cursor = 'nwse-resize';
    document.body.style.userSelect = 'none';
  };

  return (
    <div
      ref={rootRef}
      className="panel-chrome panel-chrome--floating"
      data-panel-id={id}
      style={{ left: rect.x, top: rect.y, width: rect.width, height: rect.height, zIndex: rect.z }}
      onMouseDown={() => bringToFront(id)}
    >
      <div className="panel-chrome__header" onMouseDown={startDrag}>
        <span className="panel-chrome__handle" aria-hidden>
          ⠿
        </span>
        <span className="panel-chrome__title">{title}</span>
        <button
          className="panel-chrome__pin panel-chrome__pin--floating"
          onClick={() => togglePin(id)}
          title="Pin (dock this panel)"
        >
          📌
        </button>
      </div>
      <div className="panel-chrome__body">{children}</div>
      <div className="panel-chrome__resize" onMouseDown={startResize} aria-hidden />
    </div>
  );
}
