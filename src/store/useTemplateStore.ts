import { create, useStore } from 'zustand';
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware';
import { temporal, type TemporalState } from 'zundo';
import { get as idbGet, set as idbSet, del as idbDel } from 'idb-keyval';
import { CARD_SIZE_PRESETS } from '../constants/cardSizes';
import { TemplateBundleSchema } from '../utils/templateSchema';
import { leadingEdgeDebounce } from '../utils/leadingEdgeDebounce';
import type {
  CardElement,
  CardElementPatch,
  CardSizePreset,
  DataSheet,
  ElementType,
  ImageAsset,
  Template,
} from '../types';

const DEFAULT_TEMPLATE: Template = {
  name: 'Untitled Deck',
  cardSize: CARD_SIZE_PRESETS[0],
  background: { assetId: null, color: '#ffffff' },
  elements: [],
  bleedMm: 2,
  safeZoneMm: 3,
};

function newId(): string {
  return crypto.randomUUID();
}

function defaultElement(type: ElementType, index: number): CardElement {
  const base = { id: newId(), x: 10, y: 10 + index * 5, width: 100, height: 40, rotation: 0 };
  switch (type) {
    case 'label':
      return {
        ...base,
        type: 'label',
        text: 'Label',
        fontFamily: 'Arial',
        fontSize: 16,
        color: '#000000',
        align: 'left',
        bold: false,
        italic: false,
      };
    case 'image':
      return { ...base, type: 'image', assetId: null, opacity: 1, width: 80, height: 80 };
    case 'text-field':
      return {
        ...base,
        type: 'text-field',
        column: null,
        fontFamily: 'Arial',
        fontSize: 16,
        color: '#000000',
        align: 'left',
      };
    case 'image-field':
      return { ...base, type: 'image-field', column: null, opacity: 1, width: 80, height: 80 };
  }
}

export type AlignEdge = 'left' | 'right' | 'top' | 'bottom' | 'center' | 'middle';

type TemplateStore = {
  template: Template;
  assets: Record<string, ImageAsset>;
  selectedElementIds: string[];
  dataSheet: DataSheet | null;
  previewRowIndex: number;
  hasHydrated: boolean;

  setTemplateName: (name: string) => void;
  setCardSize: (preset: CardSizePreset) => void;
  setCustomCardSize: (widthMm: number, heightMm: number) => void;
  setBleedMm: (mm: number) => void;
  setSafeZoneMm: (mm: number) => void;
  setBackgroundColor: (color: string) => void;
  setBackgroundAsset: (assetId: string | null) => void;

  addElement: (type: ElementType) => void;
  duplicateElement: (id: string) => void;
  updateElement: (id: string, patch: CardElementPatch) => void;
  removeElement: (id: string) => void;
  selectElement: (id: string | null, additive?: boolean) => void;
  reorderElement: (id: string, direction: 'front' | 'back' | 'up' | 'down') => void;
  alignSelectedElements: (edge: AlignEdge) => void;
  moveSelectedElements: (dxPx: number, dyPx: number) => void;
  undo: () => void;
  redo: () => void;

  addAssetFromFile: (file: File) => Promise<ImageAsset>;
  removeAsset: (id: string) => void;

  setDataSheet: (sheet: DataSheet | null) => void;
  setPreviewRowIndex: (i: number) => void;

  loadTemplateBundle: (bundle: { template: Template; assets: Record<string, ImageAsset> }) => void;
  resetTemplate: () => void;
};

type PersistedTemplateState = { template: Template; assets: Record<string, ImageAsset> };
type TrackedTemplateState = { template: Template };

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

// The store used to persist straight to localStorage under this key, which
// has a ~5MB quota that uploaded image assets can silently exceed (the
// write throws and zustand's persist swallows it). Storage below moves to
// IndexedDB, which doesn't have that ceiling; getItem migrates any
// pre-existing localStorage data over on first read, once.
const LEGACY_LOCALSTORAGE_KEY = 'deck-card-creator-template';

const idbStorage: StateStorage = {
  getItem: async (name) => {
    const existing = await idbGet(name);
    if (existing !== undefined) return existing as string;
    const legacy = localStorage.getItem(LEGACY_LOCALSTORAGE_KEY);
    if (legacy !== null) {
      await idbSet(name, legacy);
      localStorage.removeItem(LEGACY_LOCALSTORAGE_KEY);
      return legacy;
    }
    return null;
  },
  setItem: async (name, value) => {
    await idbSet(name, value);
  },
  removeItem: async (name) => {
    await idbDel(name);
  },
};

// Captured from zundo's handleSet factory below so resetTemplate/
// loadTemplateBundle can clear its cooldown alongside temporal.clear() —
// otherwise a burst started just before loading a different template could
// suppress the new template's first snapshot until the old cooldown expires.
let templateHistoryDebounce: { reset: () => void } | undefined;

export const useTemplateStore = create<TemplateStore>()(
  temporal(
    persist(
      (set) => ({
        template: DEFAULT_TEMPLATE,
        assets: {},
        selectedElementIds: [],
        dataSheet: null,
        previewRowIndex: 0,
        hasHydrated: false,

        setTemplateName: (name) => set((s) => ({ template: { ...s.template, name } })),

        setCardSize: (preset) => set((s) => ({ template: { ...s.template, cardSize: preset } })),

        setCustomCardSize: (widthMm, heightMm) =>
          set((s) => ({
            template: {
              ...s.template,
              cardSize: { name: 'Custom', widthMm, heightMm, custom: true },
            },
          })),

        setBleedMm: (mm) => set((s) => ({ template: { ...s.template, bleedMm: mm } })),

        setSafeZoneMm: (mm) => set((s) => ({ template: { ...s.template, safeZoneMm: mm } })),

        setBackgroundColor: (color) =>
          set((s) => ({
            template: { ...s.template, background: { ...s.template.background, color } },
          })),

        setBackgroundAsset: (assetId) =>
          set((s) => ({
            template: { ...s.template, background: { ...s.template.background, assetId } },
          })),

        addElement: (type) =>
          set((s) => {
            const el = defaultElement(type, s.template.elements.length);
            return {
              template: { ...s.template, elements: [...s.template.elements, el] },
              selectedElementIds: [el.id],
            };
          }),

        duplicateElement: (id) =>
          set((s) => {
            const idx = s.template.elements.findIndex((el) => el.id === id);
            if (idx === -1) return {};
            const original = s.template.elements[idx];
            if (!original) return {};
            const copy: CardElement = { ...original, id: newId(), x: original.x + 10, y: original.y + 10 };
            const elements = [...s.template.elements];
            elements.splice(idx + 1, 0, copy);
            return {
              template: { ...s.template, elements },
              selectedElementIds: [copy.id],
            };
          }),

        updateElement: (id, patch) =>
          set((s) => ({
            template: {
              ...s.template,
              elements: s.template.elements.map((el) =>
                el.id === id ? ({ ...el, ...patch } as CardElement) : el,
              ),
            },
          })),

        removeElement: (id) =>
          set((s) => ({
            template: { ...s.template, elements: s.template.elements.filter((el) => el.id !== id) },
            selectedElementIds: s.selectedElementIds.filter((x) => x !== id),
          })),

        selectElement: (id, additive = false) =>
          set((s) => {
            if (id === null) return { selectedElementIds: [] };
            if (additive) {
              return s.selectedElementIds.includes(id)
                ? { selectedElementIds: s.selectedElementIds.filter((x) => x !== id) }
                : { selectedElementIds: [...s.selectedElementIds, id] };
            }
            return { selectedElementIds: [id] };
          }),

        reorderElement: (id, direction) =>
          set((s) => {
            const elements = [...s.template.elements];
            const idx = elements.findIndex((el) => el.id === id);
            if (idx === -1) return {};
            const [el] = elements.splice(idx, 1);
            if (!el) return {};
            if (direction === 'front') elements.push(el);
            else if (direction === 'back') elements.unshift(el);
            else if (direction === 'up') elements.splice(Math.min(idx + 1, elements.length), 0, el);
            else if (direction === 'down') elements.splice(Math.max(idx - 1, 0), 0, el);
            return { template: { ...s.template, elements } };
          }),

        alignSelectedElements: (edge) =>
          set((s) => {
            const selected = s.template.elements.filter((el) => s.selectedElementIds.includes(el.id));
            if (selected.length < 2) return {};

            // 'center'/'middle' align to the selection's bounding-box center
            // (same min/max extent 'left'/'right'/'top'/'bottom' already
            // align to), not the average of each element's own center.
            const left = Math.min(...selected.map((el) => el.x));
            const right = Math.max(...selected.map((el) => el.x + el.width));
            const top = Math.min(...selected.map((el) => el.y));
            const bottom = Math.max(...selected.map((el) => el.y + el.height));
            const centerX = (left + right) / 2;
            const centerY = (top + bottom) / 2;

            const elements = s.template.elements.map((el) => {
              if (!s.selectedElementIds.includes(el.id)) return el;
              if (edge === 'left') return { ...el, x: left };
              if (edge === 'right') return { ...el, x: right - el.width };
              if (edge === 'center') return { ...el, x: centerX - el.width / 2 };
              if (edge === 'top') return { ...el, y: top };
              if (edge === 'bottom') return { ...el, y: bottom - el.height };
              return { ...el, y: centerY - el.height / 2 };
            });
            return { template: { ...s.template, elements } };
          }),

        moveSelectedElements: (dxPx, dyPx) =>
          set((s) => {
            if (s.selectedElementIds.length === 0) return {};
            const ids = new Set(s.selectedElementIds);
            const elements = s.template.elements.map((el) =>
              ids.has(el.id) ? { ...el, x: el.x + dxPx, y: el.y + dyPx } : el,
            );
            return { template: { ...s.template, elements } };
          }),

        undo: () => {
          useTemplateStore.temporal.getState().undo();
          set({ selectedElementIds: [] });
        },

        redo: () => {
          useTemplateStore.temporal.getState().redo();
          set({ selectedElementIds: [] });
        },

        addAssetFromFile: async (file) => {
          const dataUrl = await readFileAsDataUrl(file);
          const asset: ImageAsset = { id: newId(), name: file.name, dataUrl };
          set((s) => ({ assets: { ...s.assets, [asset.id]: asset } }));
          return asset;
        },

        removeAsset: (id) =>
          set((s) => {
            const assets = { ...s.assets };
            delete assets[id];
            return { assets };
          }),

        setDataSheet: (sheet) => set({ dataSheet: sheet, previewRowIndex: 0 }),
        setPreviewRowIndex: (i) => set({ previewRowIndex: i }),

        loadTemplateBundle: ({ template, assets }) => {
          const temporalStore = useTemplateStore.temporal.getState();
          temporalStore.clear();
          templateHistoryDebounce?.reset();
          // Paused so this set() isn't itself recorded as a history entry —
          // otherwise a single undo right after loading would jump back into
          // the template that was just replaced.
          temporalStore.pause();
          set({ template, assets, selectedElementIds: [] });
          temporalStore.resume();
        },

        resetTemplate: () => {
          const temporalStore = useTemplateStore.temporal.getState();
          temporalStore.clear();
          templateHistoryDebounce?.reset();
          temporalStore.pause();
          set({ template: DEFAULT_TEMPLATE, assets: {}, selectedElementIds: [] });
          temporalStore.resume();
        },
      }),
      {
        name: 'deck-card-creator-template',
        storage: createJSONStorage<PersistedTemplateState>(() => idbStorage),
        // Bumped from 1 -> 2 for the bleedMm/safeZoneMm fields (see types.ts,
        // templateSchema.ts). Version mismatch is what makes `migrate` below
        // actually run for existing users' v1 data — the zod defaults then
        // backfill the new fields rather than the schema rejecting old saves.
        version: 2,
        partialize: (s) => ({ template: s.template, assets: s.assets }),
        migrate: (persistedState) => {
          const result = TemplateBundleSchema.safeParse(persistedState);
          return result.success ? result.data : { template: DEFAULT_TEMPLATE, assets: {} };
        },
        onRehydrateStorage: () => (_state, _error) => {
          useTemplateStore.setState({ hasHydrated: true });
        },
      },
    ),
    {
      partialize: (s): TrackedTemplateState => ({ template: s.template }),
      equality: (a, b) => a.template === b.template,
      limit: 50,
      // See leadingEdgeDebounce: collapses a burst of rapid template edits
      // (typing, dragging) into a single undo step instead of one per
      // keystroke/pixel, while still recording an isolated single edit
      // immediately (leading edge) so it's undoable right away.
      handleSet: (handleSet) => {
        const debounced = leadingEdgeDebounce(handleSet, 500);
        templateHistoryDebounce = debounced;
        return debounced;
      },
    },
  ),
);

export function useTemporalTemplateStore<T>(selector: (state: TemporalState<TrackedTemplateState>) => T): T {
  return useStore(useTemplateStore.temporal, selector);
}

export function getAssetByName(assets: Record<string, ImageAsset>, name: string | undefined | null) {
  if (!name) return undefined;
  // Cell values may be a bare filename or a full/relative path (Windows or
  // POSIX); uploaded assets are only ever keyed by their bare filename
  // (see addAssetFromFile), so match on the last path segment.
  const trimmed = name.trim();
  const basename = trimmed.split(/[\\/]/).pop() || trimmed;
  const target = basename.toLowerCase();
  return Object.values(assets).find((a) => a.name.toLowerCase() === target);
}
