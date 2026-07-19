import type { ReactNode } from 'react';
import { LayersPanel } from '../LayersPanel/LayersPanel';
import { PropertiesPanel } from '../PropertiesPanel/PropertiesPanel';
import { ExportPanel } from '../ExportPanel/ExportPanel';
import { DataPanel } from '../DataPanel/DataPanel';
import type { PanelId } from '../../store/usePanelLayoutStore';

export const PANEL_REGISTRY: Record<PanelId, { title: string; render: () => ReactNode }> = {
  layers: { title: 'Layers', render: () => <LayersPanel /> },
  properties: { title: 'Properties', render: () => <PropertiesPanel /> },
  export: { title: 'Export', render: () => <ExportPanel /> },
  data: { title: 'Data', render: () => <DataPanel /> },
};
