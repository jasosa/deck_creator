import { z } from 'zod';

const AlignSchema = z.enum(['left', 'center', 'right']);

const CardSizePresetSchema = z.object({
  name: z.string(),
  widthMm: z.number(),
  heightMm: z.number(),
  custom: z.boolean().optional(),
});

const ElementBaseSchema = z.object({
  id: z.string(),
  x: z.number(),
  y: z.number(),
  width: z.number(),
  height: z.number(),
  rotation: z.number(),
});

const LabelElementSchema = ElementBaseSchema.extend({
  type: z.literal('label'),
  text: z.string(),
  fontFamily: z.string(),
  fontSize: z.number(),
  color: z.string(),
  align: AlignSchema,
  bold: z.boolean(),
  italic: z.boolean(),
});

const FixedImageElementSchema = ElementBaseSchema.extend({
  type: z.literal('image'),
  assetId: z.string().nullable(),
  opacity: z.number(),
});

const TextFieldElementSchema = ElementBaseSchema.extend({
  type: z.literal('text-field'),
  column: z.string().nullable(),
  fontFamily: z.string(),
  fontSize: z.number(),
  color: z.string(),
  align: AlignSchema,
});

const ImageFieldElementSchema = ElementBaseSchema.extend({
  type: z.literal('image-field'),
  column: z.string().nullable(),
  opacity: z.number(),
});

export const CardElementSchema = z.discriminatedUnion('type', [
  LabelElementSchema,
  FixedImageElementSchema,
  TextFieldElementSchema,
  ImageFieldElementSchema,
]);

export const ImageAssetSchema = z.object({
  id: z.string(),
  name: z.string(),
  dataUrl: z.string(),
});

export const TemplateSchema = z.object({
  name: z.string(),
  cardSize: CardSizePresetSchema,
  background: z.object({
    assetId: z.string().nullable(),
    color: z.string(),
  }),
  elements: z.array(CardElementSchema),
  // .default() lets templates saved before bleed/safe-zone existed keep
  // loading — missing keys are filled in rather than rejected.
  bleedMm: z.number().min(0).default(2),
  safeZoneMm: z.number().min(0).default(3),
});

export const TemplateBundleSchema = z.object({
  template: TemplateSchema,
  assets: z.record(z.string(), ImageAssetSchema),
});

export type TemplateBundle = z.infer<typeof TemplateBundleSchema>;
