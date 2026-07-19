import { useCallback } from 'react';
import { TopBar } from './components/TopBar/TopBar';
import { Toolbox } from './components/Toolbox/Toolbox';
import { CanvasStage } from './components/CanvasEditor';
import { ResizeHandle } from './components/ResizeHandle/ResizeHandle';
import { DockZone } from './components/DockZone/DockZone';
import { PANEL_REGISTRY } from './components/DockZone/panelRegistry';
import { FloatingPanel, PANEL_DRAG_MIME } from './components/PanelChrome/PanelChrome';
import { useResizablePanel } from './hooks/useResizablePanel';
import { useTemplateStore } from './store/useTemplateStore';
import { usePanelLayoutStore, type PanelId } from './store/usePanelLayoutStore';
import './App.css';

const LEFT_MIN = 180;
const LEFT_MAX = 420;
const RIGHT_MIN = 220;
const RIGHT_MAX = 480;
const BOTTOM_MIN = 120;
const BOTTOM_MAX = 560;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function App() {
  const hasHydrated = useTemplateStore((s) => s.hasHydrated);
  const [leftWidth, setLeftWidth] = useResizablePanel('panel-width-left', 220);
  const [rightWidth, setRightWidth] = useResizablePanel('panel-width-right', 260);
  const [bottomHeight, setBottomHeight] = useResizablePanel('panel-height-bottom', 260);
  const floating = usePanelLayoutStore((s) => s.floating);
  const floatPanel = usePanelLayoutStore((s) => s.floatPanel);

  const handleLeftResize = useCallback(
    (delta: number) => setLeftWidth((w) => clamp(w + delta, LEFT_MIN, LEFT_MAX)),
    [setLeftWidth],
  );
  const handleRightResize = useCallback(
    // the handle sits left of the right panel, so dragging it left (negative delta) should grow the panel
    (delta: number) => setRightWidth((w) => clamp(w - delta, RIGHT_MIN, RIGHT_MAX)),
    [setRightWidth],
  );
  const handleBottomResize = useCallback(
    // the handle sits above the bottom panel, so dragging it up (negative delta) should grow the panel
    (delta: number) => setBottomHeight((h) => clamp(h - delta, BOTTOM_MIN, BOTTOM_MAX)),
    [setBottomHeight],
  );

  // Dragging a docked panel's header and dropping it on the canvas floats
  // it at the drop point — the one place a panel can be unpinned by drag
  // rather than via its header's pin button.
  const handleCanvasDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    // See DockZone.tsx's handleDragOver for why this doesn't gate on
    // `dataTransfer.types.includes(...)` before calling preventDefault().
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };
  const handleCanvasDrop = (e: React.DragEvent<HTMLDivElement>) => {
    const id = e.dataTransfer.getData(PANEL_DRAG_MIME);
    if (!id) return;
    e.preventDefault();
    floatPanel(id as PanelId, { x: e.clientX, y: e.clientY });
  };

  // Storage now rehydrates asynchronously from IndexedDB (see useTemplateStore.ts),
  // so without this gate the app would flash the blank default template for a
  // moment before the saved one loads.
  if (!hasHydrated) {
    return <div className="app__loading">Loading your deck…</div>;
  }

  return (
    <div className="app">
      <TopBar />
      <div className="app__body">
        <div className="app__left" style={{ width: leftWidth }}>
          <Toolbox />
          <DockZone zone="left" />
        </div>
        <ResizeHandle orientation="vertical" onResize={handleLeftResize} />
        <div className="app__canvas-area" onDragOver={handleCanvasDragOver} onDrop={handleCanvasDrop}>
          <CanvasStage />
        </div>
        <ResizeHandle orientation="vertical" onResize={handleRightResize} />
        <div className="app__right" style={{ width: rightWidth }}>
          <DockZone zone="right" />
        </div>
      </div>
      <ResizeHandle orientation="horizontal" onResize={handleBottomResize} />
      <DockZone zone="bottom" style={{ height: bottomHeight, flex: 'none' }} />

      <div className="app__float-layer">
        {(Object.keys(floating) as PanelId[]).map((id) =>
          floating[id] ? (
            <FloatingPanel key={id} id={id} title={PANEL_REGISTRY[id].title}>
              {PANEL_REGISTRY[id].render()}
            </FloatingPanel>
          ) : null,
        )}
      </div>
    </div>
  );
}

export default App;
