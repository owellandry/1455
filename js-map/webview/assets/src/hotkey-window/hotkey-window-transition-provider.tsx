import type React from "react";
import { useEffect, useRef, useState } from "react";

import { messageBus, useMessage } from "@/message-bus";

import styles from "./hotkey-window.module.css";

type TransitionOverlayState = {
  transitionId: string;
  curtainPhase: "raise" | "lower";
  durationMs: number;
};

export function HotkeyWindowTransitionProvider({
  children,
}: {
  children: React.ReactNode;
}): React.ReactElement {
  const [overlayState, setOverlayState] =
    useState<TransitionOverlayState | null>(null);
  const transitionTimeoutRef = useRef<number | null>(null);

  const clearTransitionTimeout = (): void => {
    if (transitionTimeoutRef.current == null) {
      return;
    }
    window.clearTimeout(transitionTimeoutRef.current);
    transitionTimeoutRef.current = null;
  };

  useMessage("hotkey-window-transition", (message): void => {
    clearTransitionTimeout();

    switch (message.step) {
      case "commit": {
        setOverlayState(null);
        return;
      }
      case "raise-curtain": {
        setOverlayState({
          transitionId: message.transitionId,
          curtainPhase: "raise",
          durationMs: message.durationMs,
        });
        transitionTimeoutRef.current = window.setTimeout(() => {
          messageBus.dispatchMessage("hotkey-window-transition-done", {
            transitionId: message.transitionId,
            step: "raised",
          });
        }, message.durationMs);
        return;
      }
      case "lower-curtain": {
        setOverlayState({
          transitionId: message.transitionId,
          curtainPhase: "lower",
          durationMs: message.durationMs,
        });
        transitionTimeoutRef.current = window.setTimeout(() => {
          messageBus.dispatchMessage("hotkey-window-transition-done", {
            transitionId: message.transitionId,
            step: "lowered",
          });
          setOverlayState(null);
        }, message.durationMs);
        return;
      }
    }
  });

  useEffect((): (() => void) => {
    return () => {
      clearTransitionTimeout();
    };
  }, []);

  return (
    <>
      {children}
      {overlayState ? (
        <div
          key={`${overlayState.transitionId}:${overlayState.curtainPhase}`}
          data-hotkey-window-curtain
          className={styles.curtain}
          data-phase={overlayState.curtainPhase}
          style={{ animationDuration: `${overlayState.durationMs}ms` }}
        />
      ) : null}
    </>
  );
}
