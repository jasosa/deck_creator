import { useRef, useState } from 'react';
import { useTemplateStore } from '../../store/useTemplateStore';
import { CARD_SIZE_PRESETS } from '../../constants/cardSizes';
import { downloadJson } from '../../utils/downloadFile';
import type { Template, ImageAsset } from '../../types';
import './TopBar.css';

export function TopBar() {
  const template = useTemplateStore((s) => s.template);
  const assets = useTemplateStore((s) => s.assets);
  const setTemplateName = useTemplateStore((s) => s.setTemplateName);
  const setCardSize = useTemplateStore((s) => s.setCardSize);
  const setCustomCardSize = useTemplateStore((s) => s.setCustomCardSize);
  const loadTemplateBundle = useTemplateStore((s) => s.loadTemplateBundle);
  const resetTemplate = useTemplateStore((s) => s.resetTemplate);
  const undo = useTemplateStore((s) => s.undo);
  const canUndo = useTemplateStore((s) => s.history.length > 0);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [customUnit, setCustomUnit] = useState<'mm' | 'in'>('mm');

  const isCustom = !!template.cardSize.custom;

  const handlePresetChange = (name: string) => {
    const preset = CARD_SIZE_PRESETS.find((p) => p.name === name);
    if (preset) setCardSize(preset);
  };

  const handleCustomChange = (widthRaw: number, heightRaw: number) => {
    const factor = customUnit === 'in' ? 25.4 : 1;
    setCustomCardSize(widthRaw * factor, heightRaw * factor);
  };

  const handleSave = () => {
    downloadJson(`${template.name || 'deck-template'}.json`, { template, assets });
  };

  const handleLoadClick = () => fileInputRef.current?.click();

  const handleFileChosen = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const text = await file.text();
    try {
      const parsed = JSON.parse(text) as { template: Template; assets: Record<string, ImageAsset> };
      if (!parsed.template) throw new Error('Missing template');
      loadTemplateBundle({ template: parsed.template, assets: parsed.assets ?? {} });
    } catch {
      alert('Could not load this file — it does not look like a valid deck template JSON.');
    }
  };

  return (
    <div className="top-bar">
      <input
        className="top-bar__name"
        value={template.name}
        onChange={(e) => setTemplateName(e.target.value)}
        placeholder="Deck name"
      />

      <label className="top-bar__field">
        Card size
        <select value={template.cardSize.name} onChange={(e) => handlePresetChange(e.target.value)}>
          {CARD_SIZE_PRESETS.map((p) => (
            <option key={p.name} value={p.name}>
              {p.name}
            </option>
          ))}
        </select>
      </label>

      {isCustom && (
        <div className="top-bar__custom-size">
          <input
            type="number"
            min={1}
            value={customUnit === 'in' ? +(template.cardSize.widthMm / 25.4).toFixed(2) : template.cardSize.widthMm}
            onChange={(e) => handleCustomChange(+e.target.value, customUnit === 'in' ? template.cardSize.heightMm / 25.4 : template.cardSize.heightMm)}
          />
          ×
          <input
            type="number"
            min={1}
            value={customUnit === 'in' ? +(template.cardSize.heightMm / 25.4).toFixed(2) : template.cardSize.heightMm}
            onChange={(e) => handleCustomChange(customUnit === 'in' ? template.cardSize.widthMm / 25.4 : template.cardSize.widthMm, +e.target.value)}
          />
          <select value={customUnit} onChange={(e) => setCustomUnit(e.target.value as 'mm' | 'in')}>
            <option value="mm">mm</option>
            <option value="in">in</option>
          </select>
        </div>
      )}

      <div className="top-bar__spacer" />

      <button onClick={undo} disabled={!canUndo} title="Undo (Ctrl+Z)">
        Undo
      </button>
      <button onClick={handleSave}>Save template</button>
      <button onClick={handleLoadClick}>Load template</button>
      <input ref={fileInputRef} type="file" accept="application/json" hidden onChange={handleFileChosen} />
      <button
        className="top-bar__danger"
        onClick={() => {
          if (confirm('Start a new blank template? Unsaved changes will be lost.')) resetTemplate();
        }}
      >
        New
      </button>
    </div>
  );
}
