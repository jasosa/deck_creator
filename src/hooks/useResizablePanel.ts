import { useEffect, useState } from 'react';

export function useResizablePanel(storageKey: string, defaultSize: number) {
  const [size, setSize] = useState(() => {
    const saved = localStorage.getItem(storageKey);
    const parsed = saved ? Number(saved) : NaN;
    return Number.isFinite(parsed) ? parsed : defaultSize;
  });

  useEffect(() => {
    localStorage.setItem(storageKey, String(size));
  }, [storageKey, size]);

  return [size, setSize] as const;
}
