export type WindowType = typeof __WINDOW_TYPE__;

export function useWindowType(): WindowType {
  return (document.documentElement.dataset.codexWindowType ??
    __WINDOW_TYPE__) as WindowType;
}
