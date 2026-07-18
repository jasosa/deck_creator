import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen, fireEvent } from '@testing-library/react';
import { PropertiesPanel } from './PropertiesPanel';
import { useTemplateStore } from '../../store/useTemplateStore';
import { EDITOR_DPI } from '../../constants/cardSizes';
import { pxToMm } from '../../utils/units';

// Width/Height clamp to the same 5px floor as the Transformer drag-resize
// handler in ElementNode.tsx; Font Size clamps to 4px, matching its
// pre-existing `min={4}` HTML attribute.
const MIN_SIZE_PX = 5;
const MIN_FONT_SIZE_PX = 4;

function addLabel() {
  useTemplateStore.getState().addElement('label');
  const elements = useTemplateStore.getState().template.elements;
  return elements[elements.length - 1]!;
}

function selectedElement() {
  const { template, selectedElementIds } = useTemplateStore.getState();
  return template.elements.find((el) => el.id === selectedElementIds[0])!;
}

beforeEach(() => {
  useTemplateStore.getState().resetTemplate();
});

afterEach(() => {
  cleanup();
});

describe('PropertiesPanel', () => {
  it('shows a placeholder when nothing is selected', () => {
    render(<PropertiesPanel />);
    expect(screen.getByText(/select an element/i)).toBeInTheDocument();
  });

  it('clamps Width to the 5px floor when typing 0', () => {
    addLabel();
    render(<PropertiesPanel />);

    fireEvent.change(screen.getByLabelText(/width \(mm\)/i), { target: { value: '0' } });

    expect(selectedElement().width).toBe(MIN_SIZE_PX);
  });

  it('clamps Height to the 5px floor when typing a negative number', () => {
    addLabel();
    render(<PropertiesPanel />);

    fireEvent.change(screen.getByLabelText(/height \(mm\)/i), { target: { value: '-20' } });

    expect(selectedElement().height).toBe(MIN_SIZE_PX);
  });

  it('clamps Width to the 5px floor when the field is cleared', () => {
    addLabel();
    render(<PropertiesPanel />);

    fireEvent.change(screen.getByLabelText(/width \(mm\)/i), { target: { value: '' } });

    expect(selectedElement().width).toBe(MIN_SIZE_PX);
  });

  it('applies an in-range Width unclamped (mm -> px round trip)', () => {
    const el = addLabel();
    render(<PropertiesPanel />);

    fireEvent.change(screen.getByLabelText(/width \(mm\)/i), { target: { value: '50' } });

    expect(selectedElement().width).not.toBe(el.width);
    expect(selectedElement().width).toBeCloseTo((50 / 25.4) * EDITOR_DPI, 5);
  });

  it('clamps Font Size to 4 when typing 0', () => {
    addLabel();
    render(<PropertiesPanel />);

    fireEvent.change(screen.getByLabelText(/^size$/i), { target: { value: '0' } });

    const el = selectedElement();
    expect(el.type).toBe('label');
    if (el.type === 'label') expect(el.fontSize).toBe(MIN_FONT_SIZE_PX);
  });

  it('clamps Font Size to 4 when the field is cleared', () => {
    addLabel();
    render(<PropertiesPanel />);

    fireEvent.change(screen.getByLabelText(/^size$/i), { target: { value: '' } });

    const el = selectedElement();
    expect(el.type).toBe('label');
    if (el.type === 'label') expect(el.fontSize).toBe(MIN_FONT_SIZE_PX);
  });

  it('displays the clamped width back in mm after the change is applied', () => {
    addLabel();
    render(<PropertiesPanel />);

    const input = screen.getByLabelText(/width \(mm\)/i) as HTMLInputElement;
    fireEvent.change(input, { target: { value: '0' } });

    expect(Number(input.value)).toBeCloseTo(pxToMm(MIN_SIZE_PX, EDITOR_DPI), 2);
  });
});
