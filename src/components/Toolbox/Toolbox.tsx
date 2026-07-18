import { useRef } from 'react';
import { useTemplateStore } from '../../store/useTemplateStore';
import type { ImageAsset } from '../../types';
import './Toolbox.css';

type BackgroundSectionProps = {
  title: string;
  color: string;
  asset: ImageAsset | undefined;
  onColorChange: (color: string) => void;
  onFilePicked: (file: File) => void;
  onRemoveAsset: () => void;
};

// Shared by the front's "Background" section and the "Card Back" section
// below — same color + optional image, just bound to different template
// fields (template.background vs template.cardBack).
function BackgroundSection({ title, color, asset, onColorChange, onFilePicked, onRemoveAsset }: BackgroundSectionProps) {
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (file) onFilePicked(file);
  };

  return (
    <>
      <h3>{title}</h3>
      <label className="toolbox__color">
        Color
        <input type="color" value={color} onChange={(e) => onColorChange(e.target.value)} />
      </label>
      <button onClick={() => fileRef.current?.click()}>Upload image</button>
      <input ref={fileRef} type="file" accept="image/*" hidden onChange={handleFile} />
      {asset && (
        <div className="toolbox__bg-preview">
          <img src={asset.dataUrl} alt={asset.name} />
          <button onClick={onRemoveAsset}>Remove</button>
        </div>
      )}
    </>
  );
}

export function Toolbox() {
  const addElement = useTemplateStore((s) => s.addElement);
  const template = useTemplateStore((s) => s.template);
  const assets = useTemplateStore((s) => s.assets);
  const setBackgroundColor = useTemplateStore((s) => s.setBackgroundColor);
  const setBackgroundAsset = useTemplateStore((s) => s.setBackgroundAsset);
  const setCardBackColor = useTemplateStore((s) => s.setCardBackColor);
  const setCardBackAsset = useTemplateStore((s) => s.setCardBackAsset);
  const addAssetFromFile = useTemplateStore((s) => s.addAssetFromFile);

  const backgroundAsset = template.background.assetId ? assets[template.background.assetId] : undefined;
  const cardBackAsset = template.cardBack.assetId ? assets[template.cardBack.assetId] : undefined;

  return (
    <div className="toolbox">
      <h3>Add element</h3>
      <button onClick={() => addElement('label')}>+ Fixed label</button>
      <button onClick={() => addElement('image')}>+ Fixed image</button>
      <button onClick={() => addElement('text-field')}>+ Templated text</button>
      <button onClick={() => addElement('image-field')}>+ Templated image</button>

      <BackgroundSection
        title="Background"
        color={template.background.color}
        asset={backgroundAsset}
        onColorChange={setBackgroundColor}
        onFilePicked={async (file) => setBackgroundAsset((await addAssetFromFile(file)).id)}
        onRemoveAsset={() => setBackgroundAsset(null)}
      />

      <BackgroundSection
        title="Card Back"
        color={template.cardBack.color}
        asset={cardBackAsset}
        onColorChange={setCardBackColor}
        onFilePicked={async (file) => setCardBackAsset((await addAssetFromFile(file)).id)}
        onRemoveAsset={() => setCardBackAsset(null)}
      />
    </div>
  );
}
