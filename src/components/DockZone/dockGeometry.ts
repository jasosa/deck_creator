import type { DockZone as DockZoneName } from '../../store/usePanelLayoutStore';

// bottom holds panels side-by-side (there's width to spare, little height);
// left/right stack panels top-to-bottom sharing the column's height.
export const ZONE_ORIENTATION: Record<DockZoneName, 'row' | 'column'> = {
  left: 'column',
  right: 'column',
  bottom: 'row',
};

// Shared by DockZone's native-HTML5-drag reordering and FloatingPanel's
// mouse-driven "drag a floating window onto a zone to re-dock it" — both
// need to turn a drop point into an insertion index among a zone's panels.
export function indexForPointer(
  container: HTMLElement,
  orientation: 'row' | 'column',
  clientX: number,
  clientY: number,
): number {
  const children = Array.from(container.querySelectorAll<HTMLElement>(':scope > [data-panel-id]'));
  const pointer = orientation === 'column' ? clientY : clientX;
  for (let i = 0; i < children.length; i++) {
    const rect = children[i]!.getBoundingClientRect();
    const mid = orientation === 'column' ? rect.top + rect.height / 2 : rect.left + rect.width / 2;
    if (pointer < mid) return i;
  }
  return children.length;
}
