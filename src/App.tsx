import { useCallback } from 'react';
import { TopBar } from './components/TopBar/TopBar';
import { Toolbox } from './components/Toolbox/Toolbox';
import { LayersPanel } from './components/LayersPanel/LayersPanel';
import { CanvasStage } from './components/CanvasEditor';
import { PropertiesPanel } from './components/PropertiesPanel/PropertiesPanel';
import { ExportPanel } from './components/ExportPanel/ExportPanel';
import { DataPanel } from './components/DataPanel/DataPanel';
import { ResizeHandle } from './components/ResizeHandle/ResizeHandle';
import { useResizablePanel } from './hooks/useResizablePanel';
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
  const [leftWidth, setLeftWidth] = useResizablePanel('panel-width-left', 220);
  const [rightWidth, setRightWidth] = useResizablePanel('panel-width-right', 260);
  const [bottomHeight, setBottomHeight] = useResizablePanel('panel-height-bottom', 260);

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

  return (
    <div className="app">
      <TopBar />
      <div className="app__body">
        <div className="app__left" style={{ width: leftWidth }}>
          <Toolbox />
          <LayersPanel />
        </div>
        <ResizeHandle orientation="vertical" onResize={handleLeftResize} />
        <div className="app__canvas-area">
          <CanvasStage />
        </div>
        <ResizeHandle orientation="vertical" onResize={handleRightResize} />
        <div className="app__right" style={{ width: rightWidth }}>
          <PropertiesPanel />
          <ExportPanel />
        </div>
      </div>
      <ResizeHandle orientation="horizontal" onResize={handleBottomResize} />
      <DataPanel height={bottomHeight} />
    </div>
  );
}

export default App;
