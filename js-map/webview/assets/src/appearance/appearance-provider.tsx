import { ConfigurationKeys } from "protocol";
import type React from "react";
import type { ReactNode } from "react";
import { useLayoutEffect, useState } from "react";

import { useConfiguration } from "@/hooks/use-configuration";
import { useWindowType } from "@/hooks/use-window-type";
import { isHotkeyWindowContextFromWindow } from "@/hotkey-window/is-hotkey-window-context";
import { useMessage } from "@/message-bus";
import {
  DEFAULT_CODE_FONT_SIZE,
  DEFAULT_SANS_FONT_SIZE,
  MAX_CODE_FONT_SIZE,
  MAX_SANS_FONT_SIZE,
  MIN_CODE_FONT_SIZE,
  MIN_SANS_FONT_SIZE,
} from "@/settings/settings-content/general-settings";
import { getChromeTheme, getChromeThemeVariables } from "@/theme/chrome-theme";
import {
  useResolvedAppearanceMode,
  useResolvedThemeVariant,
} from "@/theme/use-resolved-theme-variant";

const TEXT_TOKEN_BASE_SIZES: Record<string, number> = {
  "--text-4xl": 72,
  "--text-3xl": 48,
  "--text-2xl": 36,
  "--text-xl": 28,
  "--text-lg": 16,
  "--text-base": DEFAULT_SANS_FONT_SIZE,
  "--text-sm": 12,
  "--text-xs": 10,
  "--text-heading-lg": 24,
  "--text-heading-md": 20,
};
const DEFAULT_WINDOW_ZOOM = 1;
const WINDOW_ZOOM_STEP = 0.1;
const MIN_WINDOW_ZOOM = 0.5;
const MAX_WINDOW_ZOOM = 3;

export function AppearanceProvider({
  children,
}: {
  children: ReactNode;
}): React.ReactElement {
  const [windowZoom, setWindowZoom] = useState(DEFAULT_WINDOW_ZOOM);
  const windowType = useWindowType();
  const appearanceMode = useResolvedAppearanceMode();
  const appearanceVariant = useResolvedThemeVariant(appearanceMode);
  const { data: lightChromeTheme } = useConfiguration(
    ConfigurationKeys.APPEARANCE_LIGHT_CHROME_THEME,
    { enabled: windowType === "electron" },
  );
  const { data: darkChromeTheme } = useConfiguration(
    ConfigurationKeys.APPEARANCE_DARK_CHROME_THEME,
    { enabled: windowType === "electron" },
  );
  const { data: sansFontSize, setData: setSansFontSize } = useConfiguration(
    ConfigurationKeys.SANS_FONT_SIZE,
    { enabled: windowType === "electron" },
  );
  const { data: codeFontSize, setData: setCodeFontSize } = useConfiguration(
    ConfigurationKeys.CODE_FONT_SIZE,
  );
  const { data: usePointerCursors } = useConfiguration(
    ConfigurationKeys.USE_POINTER_CURSORS,
    { enabled: windowType === "electron" },
  );
  const lightResolvedChromeTheme = getChromeTheme(lightChromeTheme, "light");
  const darkResolvedChromeTheme = getChromeTheme(darkChromeTheme, "dark");
  const activeChromeTheme =
    appearanceVariant === "light"
      ? lightResolvedChromeTheme
      : darkResolvedChromeTheme;

  useMessage("step-font-size", ({ delta }) => {
    if (windowType !== "electron") {
      return;
    }

    const clamp = (value: number, min: number, max: number): number => {
      return Math.min(max, Math.max(min, value));
    };

    const currentSansFontSize = sansFontSize ?? DEFAULT_SANS_FONT_SIZE;
    const currentCodeFontSize = codeFontSize ?? DEFAULT_CODE_FONT_SIZE;
    const nextSansFontSize = clamp(
      currentSansFontSize + delta,
      MIN_SANS_FONT_SIZE,
      MAX_SANS_FONT_SIZE,
    );
    const nextCodeFontSize = clamp(
      currentCodeFontSize + delta,
      MIN_CODE_FONT_SIZE,
      MAX_CODE_FONT_SIZE,
    );

    const updates: Array<Promise<void>> = [];
    if (nextSansFontSize !== currentSansFontSize) {
      updates.push(setSansFontSize(nextSansFontSize));
    }
    if (nextCodeFontSize !== currentCodeFontSize) {
      updates.push(setCodeFontSize(nextCodeFontSize));
    }
    if (updates.length === 0) {
      return;
    }

    void Promise.all(updates);
  });

  useMessage("step-window-zoom", ({ delta }) => {
    if (windowType !== "electron") {
      return;
    }

    setWindowZoom((currentZoom) => {
      const nextZoom = currentZoom + delta * WINDOW_ZOOM_STEP;
      return roundWindowZoom(
        Math.min(MAX_WINDOW_ZOOM, Math.max(MIN_WINDOW_ZOOM, nextZoom)),
      );
    });
  });

  useMessage("reset-window-zoom", () => {
    if (windowType !== "electron") {
      return;
    }

    setWindowZoom(DEFAULT_WINDOW_ZOOM);
  });

  useLayoutEffect((): void => {
    if (windowType !== "electron") {
      return;
    }

    const baseFontSize = sansFontSize ?? DEFAULT_SANS_FONT_SIZE;
    const scale = baseFontSize / DEFAULT_SANS_FONT_SIZE;
    const root = document.documentElement;
    const body = document.body;

    root.style.setProperty("--vscode-font-size", `${baseFontSize}px`);
    body.style.setProperty("--vscode-font-size", `${baseFontSize}px`);

    for (const [token, defaultSize] of Object.entries(TEXT_TOKEN_BASE_SIZES)) {
      const scaledSize = Math.round(defaultSize * scale);
      const value = `${scaledSize}px`;
      root.style.setProperty(token, value);
      body.style.setProperty(token, value);
    }
  }, [sansFontSize, windowType]);

  useLayoutEffect(() => {
    const root = document.documentElement;
    if (windowType !== "electron") {
      root.style.zoom = "";
      return;
    }

    if (windowZoom === DEFAULT_WINDOW_ZOOM) {
      root.style.zoom = "";
      return;
    }

    root.style.zoom = String(windowZoom);
  }, [windowType, windowZoom]);

  useLayoutEffect(() => {
    document.documentElement.style.setProperty(
      "--vscode-editor-font-size",
      `${codeFontSize ?? DEFAULT_CODE_FONT_SIZE}px`,
    );
  }, [codeFontSize]);

  useLayoutEffect((): void => {
    if (windowType !== "electron") {
      return;
    }

    const nextValue = activeChromeTheme.fonts.ui ?? "";
    const root = document.documentElement;
    const body = document.body;

    if (nextValue.length > 0) {
      const nextValueWithFallback = appendFontFamilyFallback(
        nextValue,
        "--font-sans-default",
      );
      root.style.setProperty("--vscode-font-family", nextValueWithFallback);
      body.style.setProperty("--vscode-font-family", nextValueWithFallback);
      return;
    }

    root.style.removeProperty("--vscode-font-family");
    body.style.removeProperty("--vscode-font-family");
  }, [activeChromeTheme, windowType]);

  useLayoutEffect((): void => {
    if (windowType !== "electron") {
      return;
    }

    const nextValue = activeChromeTheme.fonts.code ?? "";
    const root = document.documentElement;
    const body = document.body;

    if (nextValue.length > 0) {
      const nextValueWithFallback = appendFontFamilyFallback(
        nextValue,
        "--font-mono-default",
      );
      root.style.setProperty(
        "--vscode-editor-font-family",
        nextValueWithFallback,
      );
      body.style.setProperty(
        "--vscode-editor-font-family",
        nextValueWithFallback,
      );
      return;
    }

    root.style.removeProperty("--vscode-editor-font-family");
    body.style.removeProperty("--vscode-editor-font-family");
  }, [activeChromeTheme, windowType]);

  useLayoutEffect((): void => {
    if (windowType !== "electron") {
      return;
    }

    const electronWindow = document.querySelector(
      '[data-codex-window-type="electron"]',
    );
    if (!electronWindow || !(electronWindow instanceof HTMLElement)) {
      return;
    }

    electronWindow.classList.toggle(
      "electron-dark",
      appearanceVariant === "dark",
    );
    electronWindow.classList.toggle(
      "electron-light",
      appearanceVariant === "light",
    );

    for (const [token, value] of Object.entries(
      getChromeThemeVariables(activeChromeTheme, appearanceVariant),
    )) {
      electronWindow.style.setProperty(token, value);
    }
  }, [activeChromeTheme, appearanceVariant, windowType]);

  useLayoutEffect((): void => {
    if (windowType !== "electron") {
      return;
    }
    const electronWindow = document.querySelector(
      '[data-codex-window-type="electron"]',
    );
    if (!electronWindow) {
      return;
    }
    if (activeChromeTheme.opaqueWindows && !isHotkeyWindowContextFromWindow()) {
      electronWindow.classList.add("electron-opaque");
      return;
    }
    electronWindow.classList.remove("electron-opaque");
  }, [activeChromeTheme, windowType]);

  useLayoutEffect((): void => {
    if (windowType !== "electron") {
      return;
    }

    const root = document.documentElement;
    const body = document.body;
    if (usePointerCursors === true) {
      root.style.setProperty("--cursor-interaction", "pointer");
      body.style.setProperty("--cursor-interaction", "pointer");
      return;
    }

    root.style.removeProperty("--cursor-interaction");
    body.style.removeProperty("--cursor-interaction");
  }, [usePointerCursors, windowType]);

  return <>{children}</>;
}

function appendFontFamilyFallback(
  fontFamily: string,
  fallbackVariable: string,
): string {
  return `${fontFamily}, var(${fallbackVariable})`;
}

function roundWindowZoom(value: number): number {
  return Math.round(value * 100) / 100;
}
