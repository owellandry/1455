import type { ThreadTitleState } from "protocol";

export function pruneThreadTitleState(
  state: ThreadTitleState,
  maxEntries: number,
): ThreadTitleState {
  if (state.order.length <= maxEntries) {
    return state;
  }
  const titles = { ...state.titles };
  const order = [...state.order];
  while (order.length > maxEntries) {
    const dropped = order.pop();
    if (dropped) {
      delete titles[dropped];
    }
  }
  return { titles, order };
}
