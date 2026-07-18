import { describe, expect, it } from 'vitest';
import { mmToPx, pxToMm, clampMin } from './units';

describe('mmToPx / pxToMm', () => {
  it('converts mm to px at a given DPI', () => {
    expect(mmToPx(25.4, 96)).toBeCloseTo(96, 5);
    expect(mmToPx(25.4, 300)).toBeCloseTo(300, 5);
  });

  it('converts px to mm at a given DPI', () => {
    expect(pxToMm(96, 96)).toBeCloseTo(25.4, 5);
    expect(pxToMm(300, 300)).toBeCloseTo(25.4, 5);
  });

  it('round-trips mm -> px -> mm', () => {
    for (const dpi of [96, 300]) {
      for (const mm of [0, 1, 63, 88, 120.5]) {
        expect(pxToMm(mmToPx(mm, dpi), dpi)).toBeCloseTo(mm, 6);
      }
    }
  });

  it('round-trips px -> mm -> px', () => {
    for (const dpi of [96, 300]) {
      for (const px of [0, 10, 240, 354]) {
        expect(mmToPx(pxToMm(px, dpi), dpi)).toBeCloseTo(px, 6);
      }
    }
  });
});

describe('clampMin', () => {
  it('passes through values at or above the minimum', () => {
    expect(clampMin(10, 5)).toBe(10);
    expect(clampMin(5, 5)).toBe(5);
  });

  it('floors values below the minimum', () => {
    expect(clampMin(1, 5)).toBe(5);
    expect(clampMin(-100, 5)).toBe(5);
  });

  it('floors NaN and Infinity from cleared/malformed inputs', () => {
    expect(clampMin(NaN, 5)).toBe(5);
    expect(clampMin(Infinity, 5)).toBe(5);
    expect(clampMin(-Infinity, 5)).toBe(5);
  });
});
