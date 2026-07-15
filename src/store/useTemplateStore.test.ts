import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useTemplateStore } from './useTemplateStore';

// The store coalesces rapid template edits into a single undo step (see
// leadingEdgeDebounce.ts) using a 500ms real-world debounce. Fake timers
// make that deterministic: advancing past 500ms between two actions puts
// them in separate "bursts" (separately undoable); calling them back to
// back with no advance keeps them in the same burst (undo reverts both
// together, by design).
const DEBOUNCE_MS = 500;

function addLabel() {
  useTemplateStore.getState().addElement('label');
  const elements = useTemplateStore.getState().template.elements;
  return elements[elements.length - 1]!;
}

function nextBurst() {
  vi.advanceTimersByTime(DEBOUNCE_MS);
}

beforeEach(() => {
  vi.useFakeTimers();
  useTemplateStore.getState().resetTemplate();
});

afterEach(() => {
  vi.useRealTimers();
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

describe('undo/redo', () => {
  it('reverts an isolated change made in its own burst', () => {
    const a = addLabel();
    nextBurst();
    useTemplateStore.getState().updateElement(a.id, { x: 99 });
    expect(useTemplateStore.getState().template.elements[0]!.x).toBe(99);

    useTemplateStore.getState().undo();

    expect(useTemplateStore.getState().template.elements[0]!.x).toBe(a.x);
  });

  it('is a no-op with empty history', () => {
    useTemplateStore.getState().undo();
    expect(useTemplateStore.getState().template.elements).toEqual([]);
  });

  it('coalesces a burst of rapid edits into a single undo step', () => {
    const a = addLabel();
    nextBurst();

    useTemplateStore.getState().updateElement(a.id, { x: 20 });
    useTemplateStore.getState().updateElement(a.id, { x: 50 });
    useTemplateStore.getState().updateElement(a.id, { x: 99 });
    expect(useTemplateStore.getState().template.elements[0]!.x).toBe(99);

    useTemplateStore.getState().undo();

    // one Ctrl+Z reverts the whole burst back to before it started, not
    // just the last of the three updates
    expect(useTemplateStore.getState().template.elements[0]!.x).toBe(a.x);
  });

  it('treats edits in separate bursts as separate undo steps', () => {
    const a = addLabel();
    nextBurst();
    useTemplateStore.getState().updateElement(a.id, { x: 20 });
    nextBurst();
    useTemplateStore.getState().updateElement(a.id, { x: 99 });
    expect(useTemplateStore.getState().template.elements[0]!.x).toBe(99);

    useTemplateStore.getState().undo();
    expect(useTemplateStore.getState().template.elements[0]!.x).toBe(20);

    useTemplateStore.getState().undo();
    expect(useTemplateStore.getState().template.elements[0]!.x).toBe(a.x);
  });

  it('redo re-applies an undone change', () => {
    const a = addLabel();
    nextBurst();
    useTemplateStore.getState().updateElement(a.id, { x: 99 });

    useTemplateStore.getState().undo();
    expect(useTemplateStore.getState().template.elements[0]!.x).toBe(a.x);

    useTemplateStore.getState().redo();
    expect(useTemplateStore.getState().template.elements[0]!.x).toBe(99);
  });

  it('redo is a no-op with empty future', () => {
    const a = addLabel();
    nextBurst();
    useTemplateStore.getState().updateElement(a.id, { x: 99 });

    useTemplateStore.getState().redo();

    expect(useTemplateStore.getState().template.elements[0]!.x).toBe(99);
  });

  it('a new edit after undo clears the redo stack', () => {
    const a = addLabel();
    nextBurst();
    useTemplateStore.getState().updateElement(a.id, { x: 20 });
    nextBurst();
    useTemplateStore.getState().updateElement(a.id, { x: 99 });

    useTemplateStore.getState().undo();
    nextBurst();
    useTemplateStore.getState().updateElement(a.id, { x: 5 });

    useTemplateStore.getState().redo();
    // nothing to redo — the x:99 branch was discarded by the new edit
    expect(useTemplateStore.getState().template.elements[0]!.x).toBe(5);
  });

  it('clears the selection on undo and redo', () => {
    const a = addLabel();
    nextBurst();
    useTemplateStore.getState().updateElement(a.id, { x: 99 });
    useTemplateStore.getState().selectElement(a.id);
    expect(useTemplateStore.getState().selectedElementIds).toEqual([a.id]);

    useTemplateStore.getState().undo();
    expect(useTemplateStore.getState().selectedElementIds).toEqual([]);

    useTemplateStore.getState().selectElement(a.id);
    useTemplateStore.getState().redo();
    expect(useTemplateStore.getState().selectedElementIds).toEqual([]);
  });

  it('resetTemplate clears undo/redo history and any pending debounce cooldown', () => {
    const a = addLabel();
    useTemplateStore.getState().updateElement(a.id, { x: 99 });

    useTemplateStore.getState().resetTemplate();
    useTemplateStore.getState().undo();

    expect(useTemplateStore.getState().template.elements).toEqual([]);

    // the debounce cooldown from the pre-reset burst must not suppress
    // the first edit of the fresh template
    addLabel();
    expect(useTemplateStore.temporal.getState().pastStates.length).toBeGreaterThan(0);
  });
});
