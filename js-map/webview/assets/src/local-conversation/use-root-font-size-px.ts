import { useSyncExternalStore } from "react";

const DEFAULT_ROOT_FONT_SIZE_PX = 16;

let currentRootFontSizePx = DEFAULT_ROOT_FONT_SIZE_PX;
let isSubscribed = false;
const subscribers = new Set<() => void>();

function readRootFontSizePx(): number {
  if (typeof window === "undefined") {
    return DEFAULT_ROOT_FONT_SIZE_PX;
  }

  const nextRootFontSizePx = Number.parseFloat(
    window.getComputedStyle(document.documentElement).fontSize,
  );

  if (Number.isNaN(nextRootFontSizePx) || nextRootFontSizePx <= 0) {
    return DEFAULT_ROOT_FONT_SIZE_PX;
  }

  return nextRootFontSizePx;
}

function notifySubscribers(): void {
  subscribers.forEach((subscriber) => subscriber());
}

function updateRootFontSizePx(): void {
  const nextRootFontSizePx = readRootFontSizePx();
  if (nextRootFontSizePx === currentRootFontSizePx) {
    return;
  }
  currentRootFontSizePx = nextRootFontSizePx;
  notifySubscribers();
}

function subscribe(callback: () => void): () => void {
  subscribers.add(callback);

  if (typeof window !== "undefined" && !isSubscribed) {
    isSubscribed = true;
    currentRootFontSizePx = readRootFontSizePx();
    window.addEventListener("resize", updateRootFontSizePx);
  }

  return () => {
    subscribers.delete(callback);
    if (
      typeof window !== "undefined" &&
      isSubscribed &&
      subscribers.size === 0
    ) {
      window.removeEventListener("resize", updateRootFontSizePx);
      isSubscribed = false;
    }
  };
}

function getSnapshot(): number {
  return currentRootFontSizePx;
}

function getServerSnapshot(): number {
  return DEFAULT_ROOT_FONT_SIZE_PX;
}

export function useRootFontSizePx(): number {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
