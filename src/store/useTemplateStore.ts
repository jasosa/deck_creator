import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { CARD_SIZE_PRESETS } from '../constants/cardSizes';
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

export type AlignEdge = 'left' | 'right' | 'top' | 'bottom';

const MAX_HISTORY = 50;

function pushHistory(history: Template[], template: Template): Template[] {
  const next = [...history, template];
  return next.length > MAX_HISTORY ? next.slice(next.length - MAX_HISTORY) : next;
}

type TemplateStore = {
  template: Template;
  assets: Record<string, ImageAsset>;
  selectedElementIds: string[];
  dataSheet: DataSheet | null;
  previewRowIndex: number;
  history: Template[];

  setTemplateName: (name: string) => void;
  setCardSize: (preset: CardSizePreset) => void;
  setCustomCardSize: (widthMm: number, heightMm: number) => void;
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

  addAssetFromFile: (file: File) => Promise<ImageAsset>;
  removeAsset: (id: string) => void;

  setDataSheet: (sheet: DataSheet | null) => void;
  setPreviewRowIndex: (i: number) => void;

  loadTemplateBundle: (bundle: { template: Template; assets: Record<string, ImageAsset> }) => void;
  resetTemplate: () => void;
};

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export const useTemplateStore = create<TemplateStore>()(
  persist(
    (set) => ({
      template: DEFAULT_TEMPLATE,
      assets: {},
      selectedElementIds: [],
      dataSheet: null,
      previewRowIndex: 0,
      history: [],

      setTemplateName: (name) =>
        set((s) => ({ template: { ...s.template, name }, history: pushHistory(s.history, s.template) })),

      setCardSize: (preset) =>
        set((s) => ({ template: { ...s.template, cardSize: preset }, history: pushHistory(s.history, s.template) })),

      setCustomCardSize: (widthMm, heightMm) =>
        set((s) => ({
          template: {
            ...s.template,
            cardSize: { name: 'Custom', widthMm, heightMm, custom: true },
          },
          history: pushHistory(s.history, s.template),
        })),

      setBackgroundColor: (color) =>
        set((s) => ({
          template: { ...s.template, background: { ...s.template.background, color } },
          history: pushHistory(s.history, s.template),
        })),

      setBackgroundAsset: (assetId) =>
        set((s) => ({
          template: { ...s.template, background: { ...s.template.background, assetId } },
          history: pushHistory(s.history, s.template),
        })),

      addElement: (type) =>
        set((s) => {
          const el = defaultElement(type, s.template.elements.length);
          return {
            template: { ...s.template, elements: [...s.template.elements, el] },
            selectedElementIds: [el.id],
            history: pushHistory(s.history, s.template),
          };
        }),

      duplicateElement: (id) =>
        set((s) => {
          const idx = s.template.elements.findIndex((el) => el.id === id);
          if (idx === -1) return {};
          const original = s.template.elements[idx];
          const copy: CardElement = { ...original, id: newId(), x: original.x + 10, y: original.y + 10 };
          const elements = [...s.template.elements];
          elements.splice(idx + 1, 0, copy);
          return {
            template: { ...s.template, elements },
            selectedElementIds: [copy.id],
            history: pushHistory(s.history, s.template),
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
          history: pushHistory(s.history, s.template),
        })),

      removeElement: (id) =>
        set((s) => ({
          template: { ...s.template, elements: s.template.elements.filter((el) => el.id !== id) },
          selectedElementIds: s.selectedElementIds.filter((x) => x !== id),
          history: pushHistory(s.history, s.template),
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
          if (direction === 'front') elements.push(el);
          else if (direction === 'back') elements.unshift(el);
          else if (direction === 'up') elements.splice(Math.min(idx + 1, elements.length), 0, el);
          else if (direction === 'down') elements.splice(Math.max(idx - 1, 0), 0, el);
          return { template: { ...s.template, elements }, history: pushHistory(s.history, s.template) };
        }),

      alignSelectedElements: (edge) =>
        set((s) => {
          const selected = s.template.elements.filter((el) => s.selectedElementIds.includes(el.id));
          if (selected.length < 2) return {};

          let value: number;
          if (edge === 'left') value = Math.min(...selected.map((el) => el.x));
          else if (edge === 'top') value = Math.min(...selected.map((el) => el.y));
          else if (edge === 'right') value = Math.max(...selected.map((el) => el.x + el.width));
          else value = Math.max(...selected.map((el) => el.y + el.height));

          const elements = s.template.elements.map((el) => {
            if (!s.selectedElementIds.includes(el.id)) return el;
            if (edge === 'left') return { ...el, x: value };
            if (edge === 'right') return { ...el, x: value - el.width };
            if (edge === 'top') return { ...el, y: value };
            return { ...el, y: value - el.height };
          });
          return { template: { ...s.template, elements }, history: pushHistory(s.history, s.template) };
        }),

      moveSelectedElements: (dxPx, dyPx) =>
        set((s) => {
          if (s.selectedElementIds.length === 0) return {};
          const ids = new Set(s.selectedElementIds);
          const elements = s.template.elements.map((el) =>
            ids.has(el.id) ? { ...el, x: el.x + dxPx, y: el.y + dyPx } : el,
          );
          return { template: { ...s.template, elements }, history: pushHistory(s.history, s.template) };
        }),

      undo: () =>
        set((s) => {
          if (s.history.length === 0) return {};
          const previous = s.history[s.history.length - 1];
          return { template: previous, history: s.history.slice(0, -1), selectedElementIds: [] };
        }),

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

      loadTemplateBundle: ({ template, assets }) =>
        set({ template, assets, selectedElementIds: [], history: [] }),

      resetTemplate: () => set({ template: DEFAULT_TEMPLATE, assets: {}, selectedElementIds: [], history: [] }),
    }),
    {
      name: 'deck-card-creator-template',
      partialize: (s) => ({ template: s.template, assets: s.assets }),
    },
  ),
);

export function getAssetByName(assets: Record<string, ImageAsset>, name: string | undefined | null) {
  if (!name) return undefined;
  const target = name.trim().toLowerCase();
  return Object.values(assets).find((a) => a.name.toLowerCase() === target);
}
