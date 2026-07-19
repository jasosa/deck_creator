import { beforeEach, describe, expect, it } from 'vitest';
import { usePanelLayoutStore } from './usePanelLayoutStore';

const DEFAULT_ZONES = {
  left: ['layers'],
  right: ['properties', 'export'],
  bottom: ['data'],
} as const;

beforeEach(() => {
  usePanelLayoutStore.setState({ zones: structuredClone(DEFAULT_ZONES) as never, floating: {}, nextZ: 1 });
});

describe('default layout', () => {
  it('reproduces the fixed layout', () => {
    expect(usePanelLayoutStore.getState().zones).toEqual(DEFAULT_ZONES);
    expect(usePanelLayoutStore.getState().floating).toEqual({});
  });
});

describe('dockPanel', () => {
  it('moves a panel between zones', () => {
    usePanelLayoutStore.getState().dockPanel('export', 'left');
    const zones = usePanelLayoutStore.getState().zones;
    expect(zones.right).toEqual(['properties']);
    expect(zones.left).toEqual(['layers', 'export']);
  });

  it('reorders within the same zone via index', () => {
    usePanelLayoutStore.getState().dockPanel('export', 'right', 0);
    expect(usePanelLayoutStore.getState().zones.right).toEqual(['export', 'properties']);
  });

  it('removes the panel from floating when re-docked', () => {
    usePanelLayoutStore.getState().floatPanel('data');
    usePanelLayoutStore.getState().dockPanel('data', 'bottom');
    expect(usePanelLayoutStore.getState().floating.data).toBeUndefined();
    expect(usePanelLayoutStore.getState().zones.bottom).toEqual(['data']);
  });
});

describe('floatPanel', () => {
  it('removes the panel from its zone and adds a float rect', () => {
    usePanelLayoutStore.getState().floatPanel('layers');
    const s = usePanelLayoutStore.getState();
    expect(s.zones.left).toEqual([]);
    expect(s.floating.layers).toBeDefined();
    expect(s.floating.layers!.width).toBeGreaterThan(0);
  });

  it('applies an explicit rect override (e.g. drop position)', () => {
    usePanelLayoutStore.getState().floatPanel('layers', { x: 111, y: 222 });
    const rect = usePanelLayoutStore.getState().floating.layers!;
    expect(rect.x).toBe(111);
    expect(rect.y).toBe(222);
  });

  it('clamps width/height to the minimum float size', () => {
    usePanelLayoutStore.getState().floatPanel('layers', { width: 10, height: 10 });
    const rect = usePanelLayoutStore.getState().floating.layers!;
    expect(rect.width).toBeGreaterThanOrEqual(200);
    expect(rect.height).toBeGreaterThanOrEqual(150);
  });

  it('bumps the z-index each time', () => {
    usePanelLayoutStore.getState().floatPanel('layers');
    const z1 = usePanelLayoutStore.getState().floating.layers!.z;
    usePanelLayoutStore.getState().floatPanel('properties');
    const z2 = usePanelLayoutStore.getState().floating.properties!.z;
    expect(z2).toBeGreaterThan(z1);
  });
});

describe('togglePin', () => {
  it('floats a docked panel, then re-docks it at its home zone', () => {
    usePanelLayoutStore.getState().togglePin('export');
    expect(usePanelLayoutStore.getState().zones.right).toEqual(['properties']);
    expect(usePanelLayoutStore.getState().floating.export).toBeDefined();

    usePanelLayoutStore.getState().togglePin('export');
    expect(usePanelLayoutStore.getState().floating.export).toBeUndefined();
    expect(usePanelLayoutStore.getState().zones.right).toContain('export');
  });
});

describe('moveFloating / resizeFloating', () => {
  it('is a no-op when the panel is not currently floating', () => {
    usePanelLayoutStore.getState().moveFloating('layers', 5, 5);
    usePanelLayoutStore.getState().resizeFloating('layers', 300, 300);
    expect(usePanelLayoutStore.getState().floating.layers).toBeUndefined();
  });

  it('updates position and size once floating', () => {
    usePanelLayoutStore.getState().floatPanel('layers');
    usePanelLayoutStore.getState().moveFloating('layers', 42, 43);
    usePanelLayoutStore.getState().resizeFloating('layers', 500, 400);
    const rect = usePanelLayoutStore.getState().floating.layers!;
    expect(rect.x).toBe(42);
    expect(rect.y).toBe(43);
    expect(rect.width).toBe(500);
    expect(rect.height).toBe(400);
  });
});

describe('bringToFront', () => {
  it('bumps z on an existing float rect', () => {
    usePanelLayoutStore.getState().floatPanel('layers');
    usePanelLayoutStore.getState().floatPanel('properties');
    const before = usePanelLayoutStore.getState().floating.layers!.z;
    usePanelLayoutStore.getState().bringToFront('layers');
    const after = usePanelLayoutStore.getState().floating.layers!.z;
    expect(after).toBeGreaterThan(before);
  });

  it('is a no-op when the panel is not floating', () => {
    usePanelLayoutStore.getState().bringToFront('layers');
    expect(usePanelLayoutStore.getState().floating.layers).toBeUndefined();
  });
});
