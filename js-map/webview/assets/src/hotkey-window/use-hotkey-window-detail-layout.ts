import type React from "react";
import {
  createContext,
  useContext,
  useLayoutEffect,
  type Dispatch,
  type SetStateAction,
} from "react";

export type HotkeyWindowDetailConfig = {
  title: React.ReactNode;
  mainWindowPath: string;
  canCollapseToHome?: boolean;
};

export const HotkeyWindowDetailLayoutContext = createContext<Dispatch<
  SetStateAction<HotkeyWindowDetailConfig | null>
> | null>(null);

export function useHotkeyWindowDetailLayout(
  detail: HotkeyWindowDetailConfig | null,
): void {
  const setDetail = useContext(HotkeyWindowDetailLayoutContext);

  useLayoutEffect(() => {
    if (setDetail == null) {
      return;
    }
    setDetail(detail);
    return (): void => {
      setDetail(null);
    };
  }, [detail, setDetail]);
}
