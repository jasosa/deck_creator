import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export type PanelId = 'layers' | 'properties' | 'export' | 'data';
export type DockZone = 'left' | 'right' | 'bottom';
export type FloatRect = { x: number; y: number; width: number; height: number; z: number };

const PANEL_IDS: PanelId[] = ['layers', 'properties', 'export', 'data'];

// Where a panel re-docks to when pinned via the toggle button (as opposed to
// dragged to a specific zone) — reproduces today's fixed layout.
export const HOME_ZONE: Record<PanelId, DockZone> = {
  layers: 'left',
  properties: 'right',
  export: 'right',
  data: 'bottom',
};

const MIN_FLOAT_WIDTH = 200;
const MIN_FLOAT_HEIGHT = 150;

const DEFAULT_FLOAT_SIZE: Record<PanelId, { width: number; height: number }> = {
  layers: { width: 240, height: 320 },
  properties: { width: 280, height: 420 },
  export: { width: 280, height: 360 },
  data: { width: 420, height: 320 },
};

type PanelLayoutState = {
  zones: Record<DockZone, PanelId[]>;
  floating: Partial<Record<PanelId, FloatRect>>;
  nextZ: number;
};

type PanelLayoutActions = {
  dockPanel: (id: PanelId, zone: DockZone, index?: number) => void;
  floatPanel: (id: PanelId, rect?: Partial<Omit<FloatRect, 'z'>>) => void;
  togglePin: (id: PanelId) => void;
  moveFloating: (id: PanelId, x: number, y: number) => void;
  resizeFloating: (id: PanelId, width: number, height: number) => void;
  bringToFront: (id: PanelId) => void;
};

function removeFromAllZones(zones: Record<DockZone, PanelId[]>, id: PanelId): Record<DockZone, PanelId[]> {
  return {
    left: zones.left.filter((p) => p !== id),
    right: zones.right.filter((p) => p !== id),
    bottom: zones.bottom.filter((p) => p !== id),
  };
}

function isDocked(zones: Record<DockZone, PanelId[]>, id: PanelId): boolean {
  return zones.left.includes(id) || zones.right.includes(id) || zones.bottom.includes(id);
}

function defaultFloatRect(id: PanelId, z: number): FloatRect {
  const size = DEFAULT_FLOAT_SIZE[id];
  // Cascade successive floats so they don't stack exactly on top of one
  // another; wraps every 5 windows so it doesn't drift off-screen.
  const cascade = (z % 5) * 24;
  return { x: 360 + cascade, y: 80 + cascade, width: size.width, height: size.height, z };
}

const clampFloatSize = (width: number, height: number) => ({
  width: Math.max(MIN_FLOAT_WIDTH, width),
  height: Math.max(MIN_FLOAT_HEIGHT, height),
});

export const usePanelLayoutStore = create<PanelLayoutState & PanelLayoutActions>()(
  persist(
    (set, get) => ({
      zones: {
        left: ['layers'],
        right: ['properties', 'export'],
        bottom: ['data'],
      },
      floating: {},
      nextZ: 1,

      dockPanel: (id, zone, index) =>
        set((s) => {
          const zones = removeFromAllZones(s.zones, id);
          const list = [...zones[zone]];
          const at = index === undefined ? list.length : Math.max(0, Math.min(index, list.length));
          list.splice(at, 0, id);
          zones[zone] = list;
          const floating = { ...s.floating };
          delete floating[id];
          return { zones, floating };
        }),

      floatPanel: (id, rect) =>
        set((s) => {
          const zones = removeFromAllZones(s.zones, id);
          const z = s.nextZ;
          const base = { ...defaultFloatRect(id, z), ...s.floating[id] };
          const merged = { ...base, ...rect, z };
          const { width, height } = clampFloatSize(merged.width, merged.height);
          return {
            zones,
            floating: { ...s.floating, [id]: { ...merged, width, height } },
            nextZ: z + 1,
          };
        }),

      togglePin: (id) => {
        if (isDocked(get().zones, id)) {
          get().floatPanel(id);
        } else {
          get().dockPanel(id, HOME_ZONE[id]);
        }
      },

      moveFloating: (id, x, y) =>
        set((s) => {
          const current = s.floating[id];
          if (!current) return {};
          return { floating: { ...s.floating, [id]: { ...current, x, y } } };
        }),

      resizeFloating: (id, width, height) =>
        set((s) => {
          const current = s.floating[id];
          if (!current) return {};
          return { floating: { ...s.floating, [id]: { ...current, ...clampFloatSize(width, height) } } };
        }),

      bringToFront: (id) =>
        set((s) => {
          const current = s.floating[id];
          if (!current) return {};
          const z = s.nextZ;
          return { floating: { ...s.floating, [id]: { ...current, z } }, nextZ: z + 1 };
        }),
    }),
    {
      name: 'deck-card-creator-panel-layout',
      storage: createJSONStorage(() => localStorage),
      version: 1,
      // Guard against corrupted/foreign localStorage payloads missing a
      // panel entirely (e.g. hand-edited or from an older shape) — fall
      // back to docking it at its home zone rather than losing the panel.
      merge: (persisted, current) => {
        const merged = { ...current, ...(persisted as Partial<PanelLayoutState>) };
        const zones = merged.zones ?? current.zones;
        for (const id of PANEL_IDS) {
          const docked = isDocked(zones, id);
          const floating = !!merged.floating?.[id];
          if (!docked && !floating) {
            zones[HOME_ZONE[id]] = [...zones[HOME_ZONE[id]], id];
          }
        }
        return { ...merged, zones };
      },
    },
  ),
);
