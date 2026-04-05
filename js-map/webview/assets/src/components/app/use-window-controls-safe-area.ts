import { useEffect, useState } from "react";

import { useWindowType, type WindowType } from "@/hooks/use-window-type";
import { useMessage } from "@/message-bus";

export type WindowControlsSafeArea = {
  left: number;
  right: number;
};

type NavigatorWithWindowControlsOverlay = Navigator & {
  userAgentData?: {
    platform?: string;
    platformVersion?: string;
  };
  windowControlsOverlay?: {
    visible: boolean;
    getTitlebarAreaRect: () => DOMRect;
    addEventListener: (type: "geometrychange", listener: () => void) => void;
    removeEventListener: (type: "geometrychange", listener: () => void) => void;
  };
};

// Keep in sync with electron/src/window-manager.ts trafficLightPosition.x (currently 18px)
const TRAFFIC_LIGHT_OFFSET_X = 18;

const SAFE_AREAS = Object.freeze({
  default: Object.freeze({ left: 0, right: 0 }),
  mac: Object.freeze({
    legacy: Object.freeze({ left: 66 + TRAFFIC_LIGHT_OFFSET_X, right: 0 }),
    modern: Object.freeze({ left: 76 + TRAFFIC_LIGHT_OFFSET_X, right: 0 }),
  }),
  windows: Object.freeze({ left: 0, right: 0 }),
  linux: Object.freeze({ left: 0, right: 120 }),
});

const MAC_VERSION_PATTERN = /mac os x (\d+)[_.](\d+)/i;

function getMacSafeArea(userAgent: string): WindowControlsSafeArea {
  const match = MAC_VERSION_PATTERN.exec(userAgent);
  if (!match) {
    return SAFE_AREAS.mac.modern;
  }
  const major = Number.parseInt(match[1] ?? "", 10);
  const minor = Number.parseInt(match[2] ?? "", 10);
  if (Number.isNaN(major) || Number.isNaN(minor)) {
    return SAFE_AREAS.mac.modern;
  }
  return major === 10 && minor <= 15
    ? SAFE_AREAS.mac.legacy
    : SAFE_AREAS.mac.modern;
}

function getWindowControlsOverlaySafeArea(): WindowControlsSafeArea | null {
  if (typeof window === "undefined" || typeof navigator === "undefined") {
    return null;
  }

  const overlay = (navigator as NavigatorWithWindowControlsOverlay)
    .windowControlsOverlay;
  if (!overlay?.visible) {
    return null;
  }

  const titlebarAreaRect = overlay.getTitlebarAreaRect();
  return {
    left: Math.max(0, Math.round(titlebarAreaRect.x)),
    right: Math.max(
      0,
      Math.round(
        window.innerWidth - (titlebarAreaRect.x + titlebarAreaRect.width),
      ),
    ),
  };
}

function getWindowControlsSafeArea(
  windowType: WindowType,
  isFullScreen: boolean,
  windowControlsOverlaySafeArea: WindowControlsSafeArea | null,
): WindowControlsSafeArea {
  if (isFullScreen && windowType === "electron") {
    return SAFE_AREAS.default;
  }
  if (windowType !== "electron" || typeof navigator === "undefined") {
    return SAFE_AREAS.default;
  }

  const nav = navigator as NavigatorWithWindowControlsOverlay;
  const userAgent = (nav.userAgent ?? "").toLowerCase();
  const platformHint =
    nav.userAgentData?.platform?.toLowerCase() ??
    nav.platform?.toLowerCase() ??
    userAgent;

  if (
    platformHint.includes("darwin") ||
    platformHint.includes("mac") ||
    userAgent.includes("mac os x") ||
    userAgent.includes("macintosh")
  ) {
    return getMacSafeArea(userAgent);
  }

  if (platformHint.includes("win") || userAgent.includes("windows")) {
    return windowControlsOverlaySafeArea ?? SAFE_AREAS.windows;
  }

  if (platformHint.includes("linux")) {
    return SAFE_AREAS.linux;
  }

  return SAFE_AREAS.default;
}

/** Helper for components that need window-control padding. */
export function useWindowControlsSafeArea(): WindowControlsSafeArea {
  const windowType = useWindowType();
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [windowControlsOverlaySafeArea, setWindowControlsOverlaySafeArea] =
    useState<WindowControlsSafeArea | null>(() =>
      getWindowControlsOverlaySafeArea(),
    );
  useMessage(
    "window-fullscreen-changed",
    (payload): void => {
      setIsFullScreen(payload.isFullScreen);
    },
    [],
  );

  useEffect(() => {
    if (windowType !== "electron" || typeof window === "undefined") {
      setWindowControlsOverlaySafeArea(null);
      return;
    }

    const overlay = (navigator as NavigatorWithWindowControlsOverlay)
      .windowControlsOverlay;
    if (!overlay) {
      setWindowControlsOverlaySafeArea(null);
      return;
    }

    const handleGeometryChange = (): void => {
      setWindowControlsOverlaySafeArea(getWindowControlsOverlaySafeArea());
    };

    handleGeometryChange();
    overlay.addEventListener("geometrychange", handleGeometryChange);
    window.addEventListener("resize", handleGeometryChange);
    return (): void => {
      overlay.removeEventListener("geometrychange", handleGeometryChange);
      window.removeEventListener("resize", handleGeometryChange);
    };
  }, [windowType]);

  useEffect(() => {
    const media = window.matchMedia("(display-mode: fullscreen)");
    setIsFullScreen(media.matches);
    const handleChange = (event: MediaQueryListEvent): void => {
      setIsFullScreen(event.matches);
    };
    media.addEventListener("change", handleChange);
    return (): void => {
      media.removeEventListener("change", handleChange);
    };
  }, []);
  return getWindowControlsSafeArea(
    windowType,
    isFullScreen,
    windowControlsOverlaySafeArea,
  );
}
