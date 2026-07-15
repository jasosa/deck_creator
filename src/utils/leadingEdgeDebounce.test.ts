import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { leadingEdgeDebounce } from './leadingEdgeDebounce';

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('leadingEdgeDebounce', () => {
  it('fires immediately on the first call of a burst', () => {
    const fn = vi.fn();
    const debounced = leadingEdgeDebounce(fn, 500);

    debounced('a');

    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith('a');
  });

  it('suppresses subsequent calls within the wait window', () => {
    const fn = vi.fn();
    const debounced = leadingEdgeDebounce(fn, 500);

    debounced('a');
    vi.advanceTimersByTime(100);
    debounced('b');
    vi.advanceTimersByTime(100);
    debounced('c');

    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith('a');
  });

  it('re-arms after the wait window elapses with no calls, firing again on the next call', () => {
    const fn = vi.fn();
    const debounced = leadingEdgeDebounce(fn, 500);

    debounced('a');
    vi.advanceTimersByTime(500);
    debounced('b');

    expect(fn).toHaveBeenCalledTimes(2);
    expect(fn).toHaveBeenNthCalledWith(1, 'a');
    expect(fn).toHaveBeenNthCalledWith(2, 'b');
  });

  it('never fires for the trailing edge of a burst that goes quiet', () => {
    const fn = vi.fn();
    const debounced = leadingEdgeDebounce(fn, 500);

    debounced('a');
    debounced('b');
    debounced('c');
    vi.advanceTimersByTime(500);

    // only the leading call ever fires — no trailing call for 'c'
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith('a');
  });

  it('reset() clears an in-progress cooldown so the next call fires immediately', () => {
    const fn = vi.fn();
    const debounced = leadingEdgeDebounce(fn, 500);

    debounced('a');
    vi.advanceTimersByTime(100);
    debounced.reset();
    debounced('b');

    expect(fn).toHaveBeenCalledTimes(2);
    expect(fn).toHaveBeenNthCalledWith(2, 'b');
  });

  it('reset() before any call is a no-op', () => {
    const fn = vi.fn();
    const debounced = leadingEdgeDebounce(fn, 500);

    expect(() => debounced.reset()).not.toThrow();
    debounced('a');
    expect(fn).toHaveBeenCalledTimes(1);
  });
});
