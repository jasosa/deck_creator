export type CardSizePreset = {
  name: string;
  widthMm: number;
  heightMm: number;
  custom?: boolean;
};

export type ElementBase = {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
};

export type LabelElement = ElementBase & {
  type: 'label';
  text: string;
  fontFamily: string;
  fontSize: number;
  color: string;
  align: 'left' | 'center' | 'right';
  bold: boolean;
  italic: boolean;
};

export type FixedImageElement = ElementBase & {
  type: 'image';
  assetId: string | null;
  opacity: number;
};

export type TextFieldElement = ElementBase & {
  type: 'text-field';
  column: string | null;
  fontFamily: string;
  fontSize: number;
  color: string;
  align: 'left' | 'center' | 'right';
};

export type ImageFieldElement = ElementBase & {
  type: 'image-field';
  column: string | null;
  opacity: number;
};

export type CardElement = LabelElement | FixedImageElement | TextFieldElement | ImageFieldElement;

export type ElementType = CardElement['type'];

// Partial<CardElement> would only expose keys common to every union member.
// This union-of-partials shape allows patching any type-specific field too.
export type CardElementPatch = Partial<LabelElement> &
  Partial<FixedImageElement> &
  Partial<TextFieldElement> &
  Partial<ImageFieldElement>;

export type ImageAsset = {
  id: string;
  name: string;
  dataUrl: string;
};

export type Template = {
  name: string;
  cardSize: CardSizePreset;
  background: { assetId: string | null; color: string };
  elements: CardElement[];
};

export type DataSheet = {
  columns: string[];
  rows: Record<string, string>[];
};
