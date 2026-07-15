import { beforeEach, describe, expect, it } from 'vitest';
import { useTemplateStore } from './useTemplateStore';

function addLabel() {
  useTemplateStore.getState().addElement('label');
  const elements = useTemplateStore.getState().template.elements;
  return elements[elements.length - 1]!;
}

beforeEach(() => {
  useTemplateStore.getState().resetTemplate();
});

describe('reorderElement', () => {
  it('moves an element to the back and front', () => {
    const a = addLabel();
    const b = addLabel();
    const c = addLabel();

    useTemplateStore.getState().reorderElement(c.id, 'back');
    expect(useTemplateStore.getState().template.elements.map((e) => e.id)).toEqual([c.id, a.id, b.id]);

    useTemplateStore.getState().reorderElement(c.id, 'front');
    expect(useTemplateStore.getState().template.elements.map((e) => e.id)).toEqual([a.id, b.id, c.id]);
  });

  it('moves an element up and down by one position', () => {
    const a = addLabel();
    const b = addLabel();
    const c = addLabel();

    useTemplateStore.getState().reorderElement(a.id, 'up');
    expect(useTemplateStore.getState().template.elements.map((e) => e.id)).toEqual([b.id, a.id, c.id]);

    useTemplateStore.getState().reorderElement(a.id, 'down');
    expect(useTemplateStore.getState().template.elements.map((e) => e.id)).toEqual([a.id, b.id, c.id]);
  });

  it('clamps at the boundaries instead of throwing', () => {
    const a = addLabel();
    const b = addLabel();

    useTemplateStore.getState().reorderElement(a.id, 'down');
    expect(useTemplateStore.getState().template.elements.map((e) => e.id)).toEqual([a.id, b.id]);

    useTemplateStore.getState().reorderElement(b.id, 'up');
    expect(useTemplateStore.getState().template.elements.map((e) => e.id)).toEqual([a.id, b.id]);
  });

  it('is a no-op for an unknown id', () => {
    addLabel();
    const before = useTemplateStore.getState().template.elements.map((e) => e.id);
    useTemplateStore.getState().reorderElement('does-not-exist', 'front');
    expect(useTemplateStore.getState().template.elements.map((e) => e.id)).toEqual(before);
  });
});

describe('duplicateElement', () => {
  it('inserts a copy right after the original with a new id and offset position', () => {
    const a = addLabel();
    useTemplateStore.getState().duplicateElement(a.id);

    const elements = useTemplateStore.getState().template.elements;
    expect(elements).toHaveLength(2);
    expect(elements[0]!.id).toBe(a.id);
    const copy = elements[1]!;
    expect(copy.id).not.toBe(a.id);
    expect(copy.x).toBe(a.x + 10);
    expect(copy.y).toBe(a.y + 10);
    expect(useTemplateStore.getState().selectedElementIds).toEqual([copy.id]);
  });

  it('is a no-op for an unknown id', () => {
    addLabel();
    const before = useTemplateStore.getState().template.elements.length;
    useTemplateStore.getState().duplicateElement('does-not-exist');
    expect(useTemplateStore.getState().template.elements).toHaveLength(before);
  });
});

describe('removeElement', () => {
  it('removes the element and clears it from the selection', () => {
    const a = addLabel();
    useTemplateStore.getState().selectElement(a.id);
    useTemplateStore.getState().removeElement(a.id);

    expect(useTemplateStore.getState().template.elements).toHaveLength(0);
    expect(useTemplateStore.getState().selectedElementIds).toEqual([]);
  });
});

describe('alignSelectedElements', () => {
  it('aligns selected elements to the leftmost x', () => {
    const a = addLabel();
    const b = addLabel();
    useTemplateStore.getState().updateElement(a.id, { x: 5 });
    useTemplateStore.getState().updateElement(b.id, { x: 50 });
    useTemplateStore.getState().selectElement(a.id);
    useTemplateStore.getState().selectElement(b.id, true);

    useTemplateStore.getState().alignSelectedElements('left');

    const elements = useTemplateStore.getState().template.elements;
    expect(elements.find((e) => e.id === a.id)!.x).toBe(5);
    expect(elements.find((e) => e.id === b.id)!.x).toBe(5);
  });

  it('is a no-op with fewer than two elements selected', () => {
    const a = addLabel();
    useTemplateStore.getState().updateElement(a.id, { x: 5 });
    useTemplateStore.getState().selectElement(a.id);

    useTemplateStore.getState().alignSelectedElements('left');

    expect(useTemplateStore.getState().template.elements.find((e) => e.id === a.id)!.x).toBe(5);
  });
});

describe('undo', () => {
  it('reverts the most recent change to the template', () => {
    const a = addLabel();
    useTemplateStore.getState().updateElement(a.id, { x: 99 });
    expect(useTemplateStore.getState().template.elements[0]!.x).toBe(99);

    useTemplateStore.getState().undo();

    expect(useTemplateStore.getState().template.elements[0]!.x).toBe(a.x);
  });

  it('is a no-op with empty history', () => {
    useTemplateStore.getState().undo();
    expect(useTemplateStore.getState().template.elements).toEqual([]);
  });
});
