export type LeadingEdgeDebounced<Args extends unknown[]> = {
  (...args: Args): void;
  // Clears any pending cooldown so the next call starts a fresh burst
  // immediately, instead of possibly being suppressed by a burst that
  // started before some external event (e.g. loading a different
  // template) that should logically start a clean slate.
  reset: () => void;
};

// Fires on the first call of a burst (leading edge), then ignores every
// subsequent call until `waitMs` has passed with no further calls, at which
// point the next call starts a new burst and fires immediately again.
//
// Unlike a plain throttle (which also fires on the trailing edge with
// whatever args arrived last), this never fires a second time for the same
// burst — exactly one commit per burst, which is what makes "one Ctrl+Z"
// revert an entire drag/typing burst instead of just its last increment.
export function leadingEdgeDebounce<Args extends unknown[]>(
  fn: (...args: Args) => void,
  waitMs: number,
): LeadingEdgeDebounced<Args> {
  let timeout: ReturnType<typeof setTimeout> | undefined;

  const debounced = ((...args: Args) => {
    if (timeout === undefined) fn(...args);
    else clearTimeout(timeout);
    timeout = setTimeout(() => {
      timeout = undefined;
    }, waitMs);
  }) as LeadingEdgeDebounced<Args>;

  debounced.reset = () => {
    if (timeout !== undefined) clearTimeout(timeout);
    timeout = undefined;
  };

  return debounced;
}
