const MM_PER_INCH = 25.4;

export function mmToPx(mm: number, dpi: number): number {
  return (mm / MM_PER_INCH) * dpi;
}

export function pxToMm(px: number, dpi: number): number {
  return (px / dpi) * MM_PER_INCH;
}

// Floors a user-typed value at `min`, also catching NaN/Infinity from a
// cleared or malformed number input rather than letting them through.
export function clampMin(value: number, min: number): number {
  return Number.isFinite(value) && value >= min ? value : min;
}
