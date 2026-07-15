import { useEffect, useRef } from 'react';
import { Group, Rect, Text, Image as KonvaImage } from 'react-konva';
import type Konva from 'konva';
import type { KonvaEventObject } from 'konva/lib/Node';
import { useHtmlImage } from '../../utils/useHtmlImage';
import { getAssetByName } from '../../store/useTemplateStore';
import type { CardElement, CardElementPatch, ImageAsset } from '../../types';

type Props = {
  el: CardElement;
  onSelect: (id: string, additive: boolean) => void;
  onChange: (id: string, patch: CardElementPatch) => void;
  previewRow: Record<string, string> | undefined;
  assets: Record<string, ImageAsset>;
  registerRef: (id: string, node: Konva.Node | null) => void;
};

function resolveFieldValue(column: string | null, row: Record<string, string> | undefined): string {
  if (!column) return '';
  return row?.[column] ?? '';
}

function isAdditiveClick(e: KonvaEventObject<MouseEvent | TouchEvent>): boolean {
  const evt = e.evt as MouseEvent;
  return !!(evt.shiftKey || evt.ctrlKey || evt.metaKey);
}

export function ElementNode({ el, onSelect, onChange, previewRow, assets, registerRef }: Props) {
  const handleDragEnd = (e: KonvaEventObject<DragEvent>) => {
    onChange(el.id, { x: e.target.x(), y: e.target.y() });
  };

  const handleTransformEnd = (e: KonvaEventObject<Event>) => {
    const node = e.target;
    const scaleX = node.scaleX();
    const scaleY = node.scaleY();
    node.scaleX(1);
    node.scaleY(1);
    onChange(el.id, {
      x: node.x(),
      y: node.y(),
      rotation: node.rotation(),
      width: Math.max(5, el.width * scaleX),
      height: Math.max(5, el.height * scaleY),
    });
  };

  const setRef = (node: Konva.Node | null) => registerRef(el.id, node);

  if (el.type === 'label') {
    return (
      <Text
        ref={setRef}
        id={el.id}
        x={el.x}
        y={el.y}
        width={el.width}
        height={el.height}
        rotation={el.rotation}
        text={el.text}
        fontFamily={el.fontFamily}
        fontSize={el.fontSize}
        fill={el.color}
        align={el.align}
        fontStyle={[el.bold ? 'bold' : '', el.italic ? 'italic' : ''].filter(Boolean).join(' ') || 'normal'}
        draggable
        onClick={(e) => onSelect(el.id, isAdditiveClick(e))}
        onTap={(e) => onSelect(el.id, isAdditiveClick(e))}
        onDragEnd={handleDragEnd}
        onTransformEnd={handleTransformEnd}
      />
    );
  }

  if (el.type === 'text-field') {
    const value = resolveFieldValue(el.column, previewRow);
    const display = value || `{{${el.column ?? 'column'}}}`;
    return (
      <Text
        ref={setRef}
        id={el.id}
        x={el.x}
        y={el.y}
        width={el.width}
        height={el.height}
        rotation={el.rotation}
        text={display}
        fontFamily={el.fontFamily}
        fontSize={el.fontSize}
        fill={value ? el.color : '#94a3b8'}
        align={el.align}
        draggable
        onClick={(e) => onSelect(el.id, isAdditiveClick(e))}
        onTap={(e) => onSelect(el.id, isAdditiveClick(e))}
        onDragEnd={handleDragEnd}
        onTransformEnd={handleTransformEnd}
      />
    );
  }

  if (el.type === 'image') {
    const asset = el.assetId ? assets[el.assetId] : undefined;
    return (
      <ImageOrPlaceholder
        setRef={setRef}
        id={el.id}
        x={el.x}
        y={el.y}
        width={el.width}
        height={el.height}
        rotation={el.rotation}
        opacity={el.opacity}
        src={asset?.dataUrl}
        label="Image"
        onSelect={(e) => onSelect(el.id, isAdditiveClick(e))}
        onDragEnd={handleDragEnd}
        onTransformEnd={handleTransformEnd}
      />
    );
  }

  const raw = resolveFieldValue(el.column, previewRow);
  const asset = getAssetByName(assets, raw);
  return (
    <ImageOrPlaceholder
      setRef={setRef}
      id={el.id}
      x={el.x}
      y={el.y}
      width={el.width}
      height={el.height}
      rotation={el.rotation}
      opacity={el.opacity}
      src={asset?.dataUrl}
      label={el.column ? `{{${el.column}}}` : 'Image field'}
      onSelect={(e) => onSelect(el.id, isAdditiveClick(e))}
      onDragEnd={handleDragEnd}
      onTransformEnd={handleTransformEnd}
    />
  );
}

type ImageOrPlaceholderProps = {
  setRef: (node: Konva.Node | null) => void;
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  opacity: number;
  src: string | undefined;
  label: string;
  onSelect: (e: KonvaEventObject<MouseEvent | TouchEvent>) => void;
  onDragEnd: (e: KonvaEventObject<DragEvent>) => void;
  onTransformEnd: (e: KonvaEventObject<Event>) => void;
};

function ImageOrPlaceholder({
  setRef,
  id,
  x,
  y,
  width,
  height,
  rotation,
  opacity,
  src,
  label,
  onSelect,
  onDragEnd,
  onTransformEnd,
}: ImageOrPlaceholderProps) {
  const img = useHtmlImage(src);
  const groupRef = useRef<Konva.Group>(null);

  // Same fix as the background image: the image loads outside Konva's own
  // load-tracking, so nothing else tells the layer to repaint once it arrives.
  useEffect(() => {
    groupRef.current?.getLayer()?.draw();
  }, [img]);

  return (
    <Group
      ref={(node) => {
        groupRef.current = node;
        setRef(node);
      }}
      id={id}
      x={x}
      y={y}
      width={width}
      height={height}
      rotation={rotation}
      draggable
      onClick={onSelect}
      onTap={onSelect}
      onDragEnd={onDragEnd}
      onTransformEnd={onTransformEnd}
    >
      {img ? (
        <KonvaImage image={img} width={width} height={height} opacity={opacity} />
      ) : (
        <>
          <Rect width={width} height={height} fill="#e2e8f0" stroke="#94a3b8" dash={[4, 4]} opacity={opacity} />
          <Text width={width} height={height} text={label} align="center" verticalAlign="middle" fontSize={11} fill="#64748b" />
        </>
      )}
    </Group>
  );
}
