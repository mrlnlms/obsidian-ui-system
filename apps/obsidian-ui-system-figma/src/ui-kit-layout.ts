interface Size { width: number; height: number }
interface Bounds extends Size { x: number; y: number }

/** Place a new pair to the right of existing page content, without moving earlier runs. */
export function planUiKitPlacement(existing: readonly Bounds[], button: Size, search: Size): {
  actions: Bounds;
  inputs: Bounds;
  inset: number;
} {
  const inset = 40;
  const gap = 80;
  const rightEdge = Math.max(0, ...existing.map((bounds) => bounds.x + bounds.width)
    .filter(Number.isFinite));
  const startX = Math.ceil((rightEdge + 120) / 100) * 100;
  const actions = {
    x: startX, y: 0,
    width: Math.max(320, button.width + inset * 2),
    height: Math.max(160, button.height + inset * 2),
  };
  const inputs = {
    x: actions.x + actions.width + gap, y: 0,
    width: Math.max(320, search.width + inset * 2),
    height: Math.max(160, search.height + inset * 2),
  };
  return { actions, inputs, inset };
}
