import { useRef } from 'react';
import { useTemplateStore } from '../../store/useTemplateStore';
import { parseExcelFile } from '../../utils/excel';
import './DataPanel.css';

export function DataPanel() {
  const dataSheet = useTemplateStore((s) => s.dataSheet);
  const setDataSheet = useTemplateStore((s) => s.setDataSheet);
  const previewRowIndex = useTemplateStore((s) => s.previewRowIndex);
  const setPreviewRowIndex = useTemplateStore((s) => s.setPreviewRowIndex);
  const assets = useTemplateStore((s) => s.assets);
  const addAssetFromFile = useTemplateStore((s) => s.addAssetFromFile);
  const removeAsset = useTemplateStore((s) => s.removeAsset);

  const excelInputRef = useRef<HTMLInputElement>(null);
  const imagesInputRef = useRef<HTMLInputElement>(null);

  const handleExcelFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const sheet = await parseExcelFile(file);
    setDataSheet(sheet);
  };

  const handleImageFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = '';
    for (const file of files) {
      await addAssetFromFile(file);
    }
  };

  const rowCount = dataSheet?.rows.length ?? 0;

  return (
    <div className="data-panel">
      <section>
        <h3>Data sheet (Excel)</h3>
        <button onClick={() => excelInputRef.current?.click()}>Upload .xlsx</button>
        <input ref={excelInputRef} type="file" accept=".xlsx,.xls" hidden onChange={handleExcelFile} />
        {dataSheet ? (
          <>
            <p className="data-panel__hint">
              {rowCount} row{rowCount === 1 ? '' : 's'} · columns: {dataSheet.columns.join(', ')}
            </p>
            <div className="data-panel__table-wrap">
              <table>
                <thead>
                  <tr>
                    {dataSheet.columns.map((c) => (
                      <th key={c}>{c}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {dataSheet.rows.map((row, i) => (
                    <tr key={i} className={i === previewRowIndex ? 'data-panel__row--active' : ''} onClick={() => setPreviewRowIndex(i)}>
                      {dataSheet.columns.map((c) => (
                        <td key={c}>{row[c]}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="data-panel__row-nav">
              <button disabled={previewRowIndex <= 0} onClick={() => setPreviewRowIndex(previewRowIndex - 1)}>
                ← Prev
              </button>
              <span>
                Previewing row {rowCount === 0 ? 0 : previewRowIndex + 1} / {rowCount}
              </span>
              <button disabled={previewRowIndex >= rowCount - 1} onClick={() => setPreviewRowIndex(previewRowIndex + 1)}>
                Next →
              </button>
            </div>
          </>
        ) : (
          <p className="data-panel__hint">No sheet uploaded yet. Each row becomes one card.</p>
        )}
      </section>

      <section>
        <h3>Image assets</h3>
        <button onClick={() => imagesInputRef.current?.click()}>Upload images</button>
        <input ref={imagesInputRef} type="file" accept="image/*" multiple hidden onChange={handleImageFiles} />
        <p className="data-panel__hint">
          For templated images, name the file to match the value in the data column (e.g. <code>dragon.png</code>).
        </p>
        <div className="data-panel__assets">
          {Object.values(assets).map((a) => (
            <div key={a.id} className="data-panel__asset">
              <img src={a.dataUrl} alt={a.name} />
              <span title={a.name}>{a.name}</span>
              <button onClick={() => removeAsset(a.id)}>✕</button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
