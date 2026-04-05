import clsx from "clsx";
import { useLocation } from "react-router";

import { isHotkeyWindowHomePathname } from "./hotkey-window-home-composer-menu";
import { useAboveComposerPortalContainer } from "./use-above-composer-portal-container";

import hotkeyWindowStyles from "@/hotkey-window/hotkey-window.module.css";

export function useComposerTopMenuChrome({
  placement = "top",
  zIndexClassName = "z-50",
}: {
  placement?: "top" | "bottom";
  zIndexClassName?: string;
}): {
  dialogContainer: HTMLElement | null;
  hotkeyWindowPortalContainer: HTMLElement | null;
  panelClassName: string;
  shellClassName: string;
} {
  const location = useLocation();
  const dialogContainer = useAboveComposerPortalContainer();
  const isHotkeyWindowHome = isHotkeyWindowHomePathname(location.pathname);

  return {
    dialogContainer,
    hotkeyWindowPortalContainer: isHotkeyWindowHome ? dialogContainer : null,
    panelClassName: isHotkeyWindowHome
      ? clsx(hotkeyWindowStyles.homeInlineMenuPanel, "origin-bottom")
      : placement === "top"
        ? "mb-1.5 origin-bottom"
        : "mt-1.5 origin-top",
    shellClassName: isHotkeyWindowHome
      ? clsx(hotkeyWindowStyles.homeInlineMenuShell, "absolute bottom-0 z-40")
      : clsx(
          "absolute left-0 right-0",
          placement === "top" ? "bottom-full mb-2" : "top-full mt-2",
          zIndexClassName,
        ),
  };
}
