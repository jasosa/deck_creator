import { useTemplateStore } from '../../store/useTemplateStore';
import type { CardElement, ImageAsset } from '../../types';
import './LayersPanel.css';

function typeLabel(type: CardElement['type']): string {
  switch (type) {
    case 'label':
      return 'Label';
    case 'image':
      return 'Image';
    case 'text-field':
      return 'Text field';
    case 'image-field':
      return 'Image field';
  }
}

function summarize(el: CardElement, assets: Record<string, ImageAsset>): string {
  switch (el.type) {
    case 'label':
      return el.text.trim() || '(empty)';
    case 'text-field':
      return el.column ? `{{${el.column}}}` : '(unbound)';
    case 'image':
      return el.assetId ? (assets[el.assetId]?.name ?? '(missing asset)') : '(no image)';
    case 'image-field':
      return el.column ? `{{${el.column}}}` : '(unbound)';
  }
}

export function LayersPanel() {
  const template = useTemplateStore((s) => s.template);
  const assets = useTemplateStore((s) => s.assets);
  const selectedElementIds = useTemplateStore((s) => s.selectedElementIds);
  const selectElement = useTemplateStore((s) => s.selectElement);

  // Front-most element (last in z-order) listed first, matching how it
  // visually sits on top of the stack.
  const layers = [...template.elements].reverse();

  return (
    <div className="layers-panel">
      <h3>Layers</h3>
      {layers.length === 0 ? (
        <p className="layers-panel__hint">No elements yet.</p>
      ) : (
        <ul className="layers-panel__list">
          {layers.map((el) => {
            const isSelected = selectedElementIds.includes(el.id);
            return (
              <li
                key={el.id}
                className={isSelected ? 'layers-panel__item layers-panel__item--selected' : 'layers-panel__item'}
                onClick={(e) => selectElement(el.id, e.shiftKey || e.ctrlKey || e.metaKey)}
              >
                <span className="layers-panel__type">{typeLabel(el.type)}</span>
                <span className="layers-panel__summary">{summarize(el, assets)}</span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
