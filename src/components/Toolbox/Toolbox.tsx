import { useRef } from 'react';
import { useTemplateStore } from '../../store/useTemplateStore';
import './Toolbox.css';

export function Toolbox() {
  const addElement = useTemplateStore((s) => s.addElement);
  const template = useTemplateStore((s) => s.template);
  const assets = useTemplateStore((s) => s.assets);
  const setBackgroundColor = useTemplateStore((s) => s.setBackgroundColor);
  const setBackgroundAsset = useTemplateStore((s) => s.setBackgroundAsset);
  const addAssetFromFile = useTemplateStore((s) => s.addAssetFromFile);

  const bgFileRef = useRef<HTMLInputElement>(null);

  const backgroundAsset = template.background.assetId ? assets[template.background.assetId] : undefined;

  const handleBgFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const asset = await addAssetFromFile(file);
    setBackgroundAsset(asset.id);
  };

  return (
    <div className="toolbox">
      <h3>Add element</h3>
      <button onClick={() => addElement('label')}>+ Fixed label</button>
      <button onClick={() => addElement('image')}>+ Fixed image</button>
      <button onClick={() => addElement('text-field')}>+ Templated text</button>
      <button onClick={() => addElement('image-field')}>+ Templated image</button>

      <h3>Background</h3>
      <label className="toolbox__color">
        Color
        <input
          type="color"
          value={template.background.color}
          onChange={(e) => setBackgroundColor(e.target.value)}
        />
      </label>
      <button onClick={() => bgFileRef.current?.click()}>Upload background image</button>
      <input ref={bgFileRef} type="file" accept="image/*" hidden onChange={handleBgFile} />
      {backgroundAsset && (
        <div className="toolbox__bg-preview">
          <img src={backgroundAsset.dataUrl} alt={backgroundAsset.name} />
          <button onClick={() => setBackgroundAsset(null)}>Remove</button>
        </div>
      )}
    </div>
  );
}
