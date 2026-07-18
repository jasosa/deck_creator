import { describe, expect, it } from 'vitest';
import { TemplateBundleSchema } from './templateSchema';

function validBundle() {
  return {
    template: {
      name: 'My Deck',
      cardSize: { name: 'Poker (63×88mm)', widthMm: 63, heightMm: 88 },
      background: { assetId: null, color: '#ffffff' },
      elements: [
        {
          id: 'a',
          x: 0,
          y: 0,
          width: 10,
          height: 10,
          rotation: 0,
          type: 'label',
          text: 'Hi',
          fontFamily: 'Arial',
          fontSize: 16,
          color: '#000000',
          align: 'left',
          bold: false,
          italic: false,
        },
        {
          id: 'b',
          x: 0,
          y: 0,
          width: 10,
          height: 10,
          rotation: 0,
          type: 'image-field',
          column: 'art',
          opacity: 1,
        },
      ],
    },
    assets: {
      asset1: { id: 'asset1', name: 'dragon.png', dataUrl: 'data:image/png;base64,AAA' },
    },
  };
}

describe('TemplateBundleSchema', () => {
  it('accepts a well-formed bundle', () => {
    const result = TemplateBundleSchema.safeParse(validBundle());
    expect(result.success).toBe(true);
  });

  it('fills in bleedMm/safeZoneMm/cardBack defaults for a bundle saved before those fields existed', () => {
    const result = TemplateBundleSchema.safeParse(validBundle());
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.template.bleedMm).toBe(2);
    expect(result.data.template.safeZoneMm).toBe(3);
    expect(result.data.template.cardBack).toEqual({ assetId: null, color: '#ffffff' });
  });

  it('accepts every element type', () => {
    const bundle = validBundle();
    bundle.template.elements = [
      { id: '1', x: 0, y: 0, width: 1, height: 1, rotation: 0, type: 'label', text: '', fontFamily: 'Arial', fontSize: 12, color: '#000', align: 'left', bold: false, italic: false },
      { id: '2', x: 0, y: 0, width: 1, height: 1, rotation: 0, type: 'image', assetId: null, opacity: 1 },
      { id: '3', x: 0, y: 0, width: 1, height: 1, rotation: 0, type: 'text-field', column: null, fontFamily: 'Arial', fontSize: 12, color: '#000', align: 'center' },
      { id: '4', x: 0, y: 0, width: 1, height: 1, rotation: 0, type: 'image-field', column: null, opacity: 1 },
    ] as never;
    expect(TemplateBundleSchema.safeParse(bundle).success).toBe(true);
  });

  it('rejects a missing top-level key', () => {
    const bundle = validBundle();
    const { template } = bundle;
    expect(TemplateBundleSchema.safeParse({ template }).success).toBe(false);
  });

  it('rejects an element with an unknown type', () => {
    const bundle = validBundle();
    bundle.template.elements = [{ ...bundle.template.elements[0], type: 'sticker' }] as never;
    expect(TemplateBundleSchema.safeParse(bundle).success).toBe(false);
  });

  it('rejects an element missing a field required by its own type', () => {
    const bundle = validBundle();
    const { text: _text, ...withoutText } = bundle.template.elements[0] as { text: string };
    bundle.template.elements = [withoutText] as never;
    expect(TemplateBundleSchema.safeParse(bundle).success).toBe(false);
  });

  it('rejects a non-object payload entirely', () => {
    expect(TemplateBundleSchema.safeParse('not a bundle').success).toBe(false);
    expect(TemplateBundleSchema.safeParse(null).success).toBe(false);
    expect(TemplateBundleSchema.safeParse(undefined).success).toBe(false);
  });

  it('rejects wrong types on scalar fields', () => {
    const bundle = validBundle();
    (bundle.template as { cardSize: unknown }).cardSize = { name: 'X', widthMm: '63', heightMm: 88 };
    expect(TemplateBundleSchema.safeParse(bundle).success).toBe(false);
  });
});
