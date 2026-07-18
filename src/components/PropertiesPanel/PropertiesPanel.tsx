import { useRef } from 'react';
import { useTemplateStore } from '../../store/useTemplateStore';
import { pxToMm, mmToPx, clampMin } from '../../utils/units';
import { EDITOR_DPI } from '../../constants/cardSizes';
import type { CardElement, CardElementPatch } from '../../types';
import './PropertiesPanel.css';

const FONT_FAMILIES = ['Arial', 'Georgia', 'Times New Roman', 'Courier New', 'Verdana', 'Trebuchet MS'];

export function PropertiesPanel() {
  const template = useTemplateStore((s) => s.template);
  const assets = useTemplateStore((s) => s.assets);
  const dataSheet = useTemplateStore((s) => s.dataSheet);
  const selectedElementIds = useTemplateStore((s) => s.selectedElementIds);
  const updateElement = useTemplateStore((s) => s.updateElement);
  const duplicateElement = useTemplateStore((s) => s.duplicateElement);
  const removeElement = useTemplateStore((s) => s.removeElement);
  const reorderElement = useTemplateStore((s) => s.reorderElement);
  const alignSelectedElements = useTemplateStore((s) => s.alignSelectedElements);
  const addAssetFromFile = useTemplateStore((s) => s.addAssetFromFile);

  const fileRef = useRef<HTMLInputElement>(null);

  if (selectedElementIds.length === 0) {
    return (
      <div className="properties-panel properties-panel--empty">
        <p>Select an element on the card to edit its properties.</p>
      </div>
    );
  }

  if (selectedElementIds.length > 1) {
    return (
      <div className="properties-panel">
        <h3>{selectedElementIds.length} elements selected</h3>
        <div className="properties-panel__zindex">
          <span>Align to selection</span>
          <div className="properties-panel__zindex-buttons">
            <button onClick={() => alignSelectedElements('left')} title="Align left">⊢</button>
            <button onClick={() => alignSelectedElements('right')} title="Align right">⊣</button>
            <button onClick={() => alignSelectedElements('top')} title="Align top">⊤</button>
            <button onClick={() => alignSelectedElements('bottom')} title="Align bottom">⊥</button>
          </div>
        </div>
        <p className="properties-panel__hint">Tip: shift-click (or click a layer) to add or remove elements from the selection.</p>
      </div>
    );
  }

  const el = template.elements.find((e) => e.id === selectedElementIds[0]);

  if (!el) {
    return (
      <div className="properties-panel properties-panel--empty">
        <p>Select an element on the card to edit its properties.</p>
      </div>
    );
  }

  const patch = (p: CardElementPatch) => updateElement(el.id, p);

  const cardWidthPx = mmToPx(template.cardSize.widthMm, EDITOR_DPI);
  const cardHeightPx = mmToPx(template.cardSize.heightMm, EDITOR_DPI);
  const centerHorizontally = () => patch({ x: (cardWidthPx - el.width) / 2 });
  const centerVertically = () => patch({ y: (cardHeightPx - el.height) / 2 });

  const handleAssetUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const asset = await addAssetFromFile(file);
    patch({ assetId: asset.id });
  };

  return (
    <div className="properties-panel">
      <h3>{labelForType(el.type)}</h3>

      <div className="properties-panel__grid">
        <label>
          X (mm)
          <input type="number" value={round(pxToMm(el.x, EDITOR_DPI))} onChange={(e) => patch({ x: mmToPx(+e.target.value, EDITOR_DPI) })} />
        </label>
        <label>
          Y (mm)
          <input type="number" value={round(pxToMm(el.y, EDITOR_DPI))} onChange={(e) => patch({ y: mmToPx(+e.target.value, EDITOR_DPI) })} />
        </label>
        <label>
          Width (mm)
          <input type="number" min={1} value={round(pxToMm(el.width, EDITOR_DPI))} onChange={(e) => patch({ width: clampMin(mmToPx(+e.target.value, EDITOR_DPI), 5) })} />
        </label>
        <label>
          Height (mm)
          <input type="number" min={1} value={round(pxToMm(el.height, EDITOR_DPI))} onChange={(e) => patch({ height: clampMin(mmToPx(+e.target.value, EDITOR_DPI), 5) })} />
        </label>
        <label>
          Rotation (°)
          <input type="number" value={el.rotation} onChange={(e) => patch({ rotation: +e.target.value })} />
        </label>
      </div>

      <div className="properties-panel__zindex">
        <span>Center in card</span>
        <div className="properties-panel__zindex-buttons">
          <button onClick={centerHorizontally} title="Center horizontally">↔</button>
          <button onClick={centerVertically} title="Center vertically">↕</button>
          <button
            onClick={() => {
              centerHorizontally();
              centerVertically();
            }}
            title="Center both"
          >
            ✛
          </button>
        </div>
      </div>

      <div className="properties-panel__zindex">
        <span>Layer order</span>
        <div className="properties-panel__zindex-buttons">
          <button onClick={() => reorderElement(el.id, 'back')} title="Send to back">⤓</button>
          <button onClick={() => reorderElement(el.id, 'down')} title="Move down">↓</button>
          <button onClick={() => reorderElement(el.id, 'up')} title="Move up">↑</button>
          <button onClick={() => reorderElement(el.id, 'front')} title="Bring to front">⤒</button>
        </div>
      </div>

      {(el.type === 'image' || el.type === 'image-field') && (
        <label className="properties-panel__opacity">
          Opacity ({Math.round(el.opacity * 100)}%)
          <input type="range" min={0} max={1} step={0.01} value={el.opacity} onChange={(e) => patch({ opacity: +e.target.value })} />
        </label>
      )}

      {el.type === 'label' && (
        <>
          <label>
            Text
            <textarea value={el.text} onChange={(e) => patch({ text: e.target.value })} rows={2} />
          </label>
          <FontControls el={el} patch={patch} />
        </>
      )}

      {el.type === 'text-field' && (
        <>
          <label>
            Data column
            <select value={el.column ?? ''} onChange={(e) => patch({ column: e.target.value || null })}>
              <option value="">— choose column —</option>
              {dataSheet?.columns.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
          <FontControls el={el} patch={patch} />
        </>
      )}

      {el.type === 'image' && (
        <div className="properties-panel__asset">
          <label>
            Image asset
            <select value={el.assetId ?? ''} onChange={(e) => patch({ assetId: e.target.value || null })}>
              <option value="">— none —</option>
              {Object.values(assets).map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </label>
          <button onClick={() => fileRef.current?.click()}>Upload new image</button>
          <input ref={fileRef} type="file" accept="image/*" hidden onChange={handleAssetUpload} />
        </div>
      )}

      {el.type === 'image-field' && (
        <label>
          Data column (holds image filename)
          <select value={el.column ?? ''} onChange={(e) => patch({ column: e.target.value || null })}>
            <option value="">— choose column —</option>
            {dataSheet?.columns.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
      )}

      <div className="properties-panel__footer-actions">
        <button onClick={() => duplicateElement(el.id)}>Duplicate</button>
        <button className="properties-panel__delete" onClick={() => removeElement(el.id)}>
          Delete element
        </button>
      </div>
    </div>
  );
}

function FontControls({
  el,
  patch,
}: {
  el: Extract<CardElement, { type: 'label' | 'text-field' }>;
  patch: (p: CardElementPatch) => void;
}) {
  return (
    <>
      <div className="properties-panel__grid">
        <label>
          Font
          <select value={el.fontFamily} onChange={(e) => patch({ fontFamily: e.target.value })}>
            {FONT_FAMILIES.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
        </label>
        <label>
          Size
          <input type="number" min={4} value={el.fontSize} onChange={(e) => patch({ fontSize: clampMin(+e.target.value, 4) })} />
        </label>
        <label>
          Color
          <input type="color" value={el.color} onChange={(e) => patch({ color: e.target.value })} />
        </label>
        <label>
          Align
          <select value={el.align} onChange={(e) => patch({ align: e.target.value as 'left' | 'center' | 'right' })}>
            <option value="left">Left</option>
            <option value="center">Center</option>
            <option value="right">Right</option>
          </select>
        </label>
      </div>
      {el.type === 'label' && (
        <div className="properties-panel__toggles">
          <button className={el.bold ? 'active' : ''} onClick={() => patch({ bold: !el.bold })}>
            B
          </button>
          <button className={el.italic ? 'active' : ''} onClick={() => patch({ italic: !el.italic })}>
            I
          </button>
        </div>
      )}
    </>
  );
}

function labelForType(type: CardElement['type']) {
  switch (type) {
    case 'label':
      return 'Fixed label';
    case 'image':
      return 'Fixed image';
    case 'text-field':
      return 'Templated text';
    case 'image-field':
      return 'Templated image';
  }
}

function round(n: number) {
  return Math.round(n * 100) / 100;
}
