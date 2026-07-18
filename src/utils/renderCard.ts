import Konva from 'konva';
import { EDITOR_DPI, EXPORT_DPI } from '../constants/cardSizes';
import { mmToPx } from './units';
import { getAssetByName } from '../store/useTemplateStore';
import type { CardElement, ImageAsset, Template } from '../types';

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function resolveFieldValue(column: string | null, row: Record<string, string> | undefined): string {
  if (!column) return '';
  return row?.[column] ?? '';
}

async function addElementToLayer(
  layer: Konva.Group,
  el: CardElement,
  assets: Record<string, ImageAsset>,
  row: Record<string, string> | undefined,
) {
  const common = { x: el.x, y: el.y, width: el.width, height: el.height, rotation: el.rotation };

  if (el.type === 'label') {
    layer.add(
      new Konva.Text({
        ...common,
        text: el.text,
        fontFamily: el.fontFamily,
        fontSize: el.fontSize,
        fill: el.color,
        align: el.align,
        fontStyle: [el.bold ? 'bold' : '', el.italic ? 'italic' : ''].filter(Boolean).join(' ') || 'normal',
      }),
    );
    return;
  }

  if (el.type === 'text-field') {
    const value = resolveFieldValue(el.column, row);
    if (!value) return;
    layer.add(
      new Konva.Text({
        ...common,
        text: value,
        fontFamily: el.fontFamily,
        fontSize: el.fontSize,
        fill: el.color,
        align: el.align,
      }),
    );
    return;
  }

  if (el.type === 'image') {
    const asset = el.assetId ? assets[el.assetId] : undefined;
    if (!asset) return;
    try {
      const img = await loadImage(asset.dataUrl);
      layer.add(new Konva.Image({ ...common, image: img, opacity: el.opacity }));
    } catch {
      /* skip images that fail to decode */
    }
    return;
  }

  // image-field
  const raw = resolveFieldValue(el.column, row);
  const asset = getAssetByName(assets, raw);
  if (!asset) return;
  try {
    const img = await loadImage(asset.dataUrl);
    layer.add(new Konva.Image({ ...common, image: img, opacity: el.opacity }));
  } catch {
    /* skip images that fail to decode */
  }
}

type BleedStage = {
  container: HTMLDivElement;
  stage: Konva.Stage;
  layer: Konva.Layer;
  content: Konva.Group;
  widthPx: number;
  heightPx: number;
  bleedPx: number;
};

// Shared by renderCardToDataUrl and renderCardBackToDataUrl: an off-DOM
// Konva stage sized to the card's trim size plus bleed on every side, with
// a `content` group offset by the bleed amount so trim-box-relative
// coordinates (element x/y, or the -bleedPx/-bleedPx background rect below)
// don't need to know bleed exists (see CanvasStage.tsx for the same trick
// in the editor).
function createBleedStage(template: Template): BleedStage {
  const trimWidthPx = mmToPx(template.cardSize.widthMm, EDITOR_DPI);
  const trimHeightPx = mmToPx(template.cardSize.heightMm, EDITOR_DPI);
  const bleedPx = mmToPx(template.bleedMm, EDITOR_DPI);
  const widthPx = trimWidthPx + bleedPx * 2;
  const heightPx = trimHeightPx + bleedPx * 2;

  const container = document.createElement('div');
  container.style.position = 'absolute';
  container.style.left = '-99999px';
  container.style.top = '0';
  document.body.appendChild(container);

  try {
    const stage = new Konva.Stage({ container, width: widthPx, height: heightPx });
    const layer = new Konva.Layer();
    stage.add(layer);
    const content = new Konva.Group({ x: bleedPx, y: bleedPx });
    layer.add(content);

    return { container, stage, layer, content, widthPx, heightPx, bleedPx };
  } catch (e) {
    container.remove();
    throw e;
  }
}

async function drawBackgroundLayer(
  content: Konva.Group,
  background: { assetId: string | null; color: string },
  assets: Record<string, ImageAsset>,
  widthPx: number,
  heightPx: number,
  bleedPx: number,
) {
  content.add(new Konva.Rect({ x: -bleedPx, y: -bleedPx, width: widthPx, height: heightPx, fill: background.color }));

  const asset = background.assetId ? assets[background.assetId] : undefined;
  if (!asset) return;
  try {
    const img = await loadImage(asset.dataUrl);
    content.add(new Konva.Image({ x: -bleedPx, y: -bleedPx, width: widthPx, height: heightPx, image: img }));
  } catch {
    /* skip background image that fails to decode */
  }
}

function rasterize(stage: Konva.Stage, layer: Konva.Layer): string {
  layer.draw();
  const pixelRatio = EXPORT_DPI / EDITOR_DPI;
  const dataUrl = stage.toDataURL({ pixelRatio, mimeType: 'image/png' });
  stage.destroy();
  return dataUrl;
}

export async function renderCardToDataUrl(
  template: Template,
  assets: Record<string, ImageAsset>,
  row: Record<string, string> | undefined,
): Promise<string> {
  const { container, stage, layer, content, widthPx, heightPx, bleedPx } = createBleedStage(template);
  try {
    await drawBackgroundLayer(content, template.background, assets, widthPx, heightPx, bleedPx);
    for (const el of template.elements) {
      await addElementToLayer(content, el, assets, row);
    }
    return rasterize(stage, layer);
  } finally {
    container.remove();
  }
}

// The back is the same for every card in the deck (see types.ts) — no
// elements, no per-row data, just a background — so this only ever needs
// to be called once per export, not once per row like renderCardToDataUrl.
export async function renderCardBackToDataUrl(
  template: Template,
  assets: Record<string, ImageAsset>,
): Promise<string> {
  const { container, stage, layer, content, widthPx, heightPx, bleedPx } = createBleedStage(template);
  try {
    await drawBackgroundLayer(content, template.cardBack, assets, widthPx, heightPx, bleedPx);
    return rasterize(stage, layer);
  } finally {
    container.remove();
  }
}
