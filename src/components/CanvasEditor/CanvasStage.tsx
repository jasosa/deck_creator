import { useEffect, useRef } from 'react';
import { Stage, Layer, Rect, Image as KonvaImage, Transformer } from 'react-konva';
import type Konva from 'konva';
import { useTemplateStore } from '../../store/useTemplateStore';
import { mmToPx } from '../../utils/units';
import { EDITOR_DPI } from '../../constants/cardSizes';
import { useHtmlImage } from '../../utils/useHtmlImage';
import { ElementNode } from './ElementNode';

const ARROW_DELTAS: Record<string, [number, number]> = {
  ArrowUp: [0, -1],
  ArrowDown: [0, 1],
  ArrowLeft: [-1, 0],
  ArrowRight: [1, 0],
};

const EDITABLE_TAGS = new Set(['INPUT', 'TEXTAREA', 'SELECT']);

export function CanvasStage() {
  const template = useTemplateStore((s) => s.template);
  const assets = useTemplateStore((s) => s.assets);
  const dataSheet = useTemplateStore((s) => s.dataSheet);
  const previewRowIndex = useTemplateStore((s) => s.previewRowIndex);
  const selectedElementIds = useTemplateStore((s) => s.selectedElementIds);
  const selectElement = useTemplateStore((s) => s.selectElement);
  const updateElement = useTemplateStore((s) => s.updateElement);

  const stageRef = useRef<Konva.Stage>(null);
  const nodeRefs = useRef<Map<string, Konva.Node>>(new Map());
  const transformerRef = useRef<Konva.Transformer>(null);

  const widthPx = mmToPx(template.cardSize.widthMm, EDITOR_DPI);
  const heightPx = mmToPx(template.cardSize.heightMm, EDITOR_DPI);

  const backgroundAsset = template.background.assetId ? assets[template.background.assetId] : undefined;
  const backgroundImg = useHtmlImage(backgroundAsset?.dataUrl);

  const previewRow = dataSheet?.rows[previewRowIndex];

  // Images load asynchronously outside Konva's own load-tracking, so the layer
  // never gets told to repaint once one arrives. Use a synchronous draw()
  // rather than batchDraw() — batchDraw defers to requestAnimationFrame, which
  // can be throttled or delayed on a backgrounded/unfocused tab.
  useEffect(() => {
    stageRef.current?.draw();
  }, [backgroundImg]);

  useEffect(() => {
    const transformer = transformerRef.current;
    if (!transformer) return;
    const nodes = selectedElementIds
      .map((id) => nodeRefs.current.get(id))
      .filter((n): n is Konva.Node => !!n);
    transformer.nodes(nodes);
    transformer.getLayer()?.batchDraw();
  }, [selectedElementIds, template.elements]);

  // Recover from a drag that never received its mouseup/dragend. This happens
  // when the mouse button is released outside the browser window entirely
  // (another app, the OS taskbar, a second monitor) — no mouseup DOM event
  // fires anywhere on the page in that case, so Konva never learns the drag
  // ended. The shape then stays glued to the cursor, and Konva's internal
  // "a drag just happened" flag never clears, which also blocks new clicks
  // from registering — hence "can't select anything, only reload works."
  // window's blur event fires reliably whenever focus leaves the browser,
  // which is guaranteed to happen if the release occurred outside it.
  useEffect(() => {
    const stopStuckDrags = () => {
      nodeRefs.current.forEach((node) => {
        if (node.isDragging()) node.stopDrag();
      });
    };

    window.addEventListener('mouseup', stopStuckDrags);
    window.addEventListener('blur', stopStuckDrags);
    return () => {
      window.removeEventListener('mouseup', stopStuckDrags);
      window.removeEventListener('blur', stopStuckDrags);
    };
  }, []);

  // Arrow-key nudging. Reads fresh state from the store instead of depending
  // on selectedElementIds so the listener only needs to be registered once.
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Escape deselects regardless of focus — it doesn't conflict with any
      // native text-field behavior, unlike undo/arrow nudging below.
      if (e.key === 'Escape') {
        useTemplateStore.getState().selectElement(null);
        return;
      }

      const activeTag = (document.activeElement as HTMLElement | null)?.tagName;
      if (activeTag && EDITABLE_TAGS.has(activeTag)) return;

      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        useTemplateStore.getState().undo();
        return;
      }

      const delta = ARROW_DELTAS[e.key];
      if (!delta) return;

      const { selectedElementIds: currentSelection, moveSelectedElements } = useTemplateStore.getState();
      if (currentSelection.length === 0) return;

      e.preventDefault();
      const step = e.shiftKey ? 10 : 1;
      moveSelectedElements(delta[0] * step, delta[1] * step);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const registerRef = (id: string, node: Konva.Node | null) => {
    if (node) nodeRefs.current.set(id, node);
    else nodeRefs.current.delete(id);
  };

  return (
    <Stage
      ref={stageRef}
      width={widthPx}
      height={heightPx}
      onMouseDown={(e) => {
        if (e.target === e.target.getStage()) selectElement(null);
      }}
    >
      <Layer>
        <Rect
          x={0}
          y={0}
          width={widthPx}
          height={heightPx}
          fill={template.background.color}
          stroke="#cbd5e1"
          strokeWidth={1}
          listening={false}
        />
        {backgroundImg && (
          <KonvaImage image={backgroundImg} x={0} y={0} width={widthPx} height={heightPx} listening={false} />
        )}
        {template.elements.map((el) => (
          <ElementNode
            key={el.id}
            el={el}
            onSelect={selectElement}
            onChange={updateElement}
            previewRow={previewRow}
            assets={assets}
            registerRef={registerRef}
          />
        ))}
        <Transformer
          ref={transformerRef}
          rotateEnabled
          boundBoxFunc={(oldBox, newBox) => {
            if (newBox.width < 5 || newBox.height < 5) return oldBox;
            return newBox;
          }}
        />
      </Layer>
    </Stage>
  );
}
