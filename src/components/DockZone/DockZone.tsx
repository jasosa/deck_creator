import { useState } from 'react';
import { usePanelLayoutStore, type DockZone as DockZoneName, type PanelId } from '../../store/usePanelLayoutStore';
import { DockedPanel, PANEL_DRAG_MIME } from '../PanelChrome/PanelChrome';
import { PANEL_REGISTRY } from './panelRegistry';
import { ZONE_ORIENTATION, indexForPointer as indexForPoint } from './dockGeometry';
import './DockZone.css';

type Props = {
  zone: DockZoneName;
  style?: React.CSSProperties;
};

export function DockZone({ zone, style }: Props) {
  const panelIds = usePanelLayoutStore((s) => s.zones[zone]);
  const dockPanel = usePanelLayoutStore((s) => s.dockPanel);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const orientation = ZONE_ORIENTATION[zone];

  const indexForPointer = (e: React.DragEvent, container: HTMLElement) =>
    indexForPoint(container, orientation, e.clientX, e.clientY);

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    // Always accept the drag here rather than gating on
    // `dataTransfer.types.includes(...)` first — reading custom MIME types
    // out of `types` during `dragover` (as opposed to `drop`) is
    // inconsistent across browsers, and if that check ever comes back
    // false, `preventDefault()` never runs, so the browser never arms this
    // as a drop target and `drop` silently never fires. `handleDrop` still
    // no-ops if there's no panel id to read, so this stays harmless.
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverIndex(indexForPointer(e, e.currentTarget));
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setDragOverIndex(null);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    const id = e.dataTransfer.getData(PANEL_DRAG_MIME);
    if (!id) return;
    e.preventDefault();
    const index = indexForPointer(e, e.currentTarget);
    dockPanel(id as PanelId, zone, index);
    setDragOverIndex(null);
  };

  return (
    <div
      className={`dock-zone dock-zone--${orientation}${dragOverIndex !== null ? ' dock-zone--drag-over' : ''}`}
      style={style}
      data-dock-zone={zone}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {panelIds.length === 0 && dragOverIndex === null && <div className="dock-zone__empty">Drop a panel here</div>}
      {panelIds.map((id) => {
        const entry = PANEL_REGISTRY[id];
        return (
          <DockedPanel key={id} id={id} title={entry.title}>
            {entry.render()}
          </DockedPanel>
        );
      })}
    </div>
  );
}
