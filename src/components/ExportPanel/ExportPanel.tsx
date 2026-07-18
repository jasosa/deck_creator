import { useState } from 'react';
import { useTemplateStore } from '../../store/useTemplateStore';
import { PAPER_SIZES } from '../../constants/cardSizes';
import { exportDeckPdf } from '../../utils/pdfExport';
import { downloadFile } from '../../utils/downloadFile';
import './ExportPanel.css';

export function ExportPanel() {
  const template = useTemplateStore((s) => s.template);
  const assets = useTemplateStore((s) => s.assets);
  const dataSheet = useTemplateStore((s) => s.dataSheet);

  const [paperSize, setPaperSize] = useState<keyof typeof PAPER_SIZES>('A4');
  const [marginMm, setMarginMm] = useState(10);
  const [gapMm, setGapMm] = useState(3);
  const [showCropMarks, setShowCropMarks] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });

  const cardCount = dataSheet && dataSheet.rows.length > 0 ? dataSheet.rows.length : 1;
  const bleedOverlapsGap = template.bleedMm > 0 && gapMm < template.bleedMm * 2;

  const handleExport = async () => {
    setExporting(true);
    setProgress({ done: 0, total: cardCount });
    try {
      const blob = await exportDeckPdf(
        template,
        assets,
        dataSheet,
        { paperSize, marginMm, gapMm, showCropMarks },
        (done, total) => setProgress({ done, total }),
      );
      downloadFile(`${template.name || 'deck'}.pdf`, blob);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="export-panel">
      <h3>Export</h3>
      <label>
        Paper size
        <select value={paperSize} onChange={(e) => setPaperSize(e.target.value as keyof typeof PAPER_SIZES)}>
          {Object.keys(PAPER_SIZES).map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
      </label>
      <label>
        Margin (mm)
        <input type="number" min={0} value={marginMm} onChange={(e) => setMarginMm(+e.target.value)} />
      </label>
      <label>
        Gap between cards (mm)
        <input type="number" min={0} value={gapMm} onChange={(e) => setGapMm(+e.target.value)} />
      </label>
      <label className="export-panel__checkbox">
        <input type="checkbox" checked={showCropMarks} onChange={(e) => setShowCropMarks(e.target.checked)} />
        Show crop marks
      </label>
      {bleedOverlapsGap && (
        <p className="export-panel__warning">
          Gap ({gapMm}mm) is smaller than 2× the template&apos;s bleed ({template.bleedMm * 2}mm) — adjacent cards&apos;
          bleed may overlap. Increase the gap or reduce bleed in the top bar.
        </p>
      )}
      <p className="export-panel__hint">
        {cardCount} card{cardCount === 1 ? '' : 's'} will be exported{dataSheet ? ' (one per data row)' : ' (no data sheet loaded — a single blank card)'}.
      </p>
      <button disabled={exporting} onClick={handleExport}>
        {exporting ? `Rendering ${progress.done}/${progress.total}…` : 'Export deck as PDF'}
      </button>
    </div>
  );
}
