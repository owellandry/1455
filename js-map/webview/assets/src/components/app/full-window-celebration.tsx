import clsx from "clsx";
/* oxlint-disable react/only-export-components */
import type { ReactElement, ReactNode } from "react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { matchPath, useLocation } from "react-router";

import { CelebrationStarfieldBackground } from "@/components/app/celebrations/celebration-starfield-background";
import { useWindowType } from "@/hooks/use-window-type";

import "./celebrations/hyperspeed-shimmer-overrides.css";
import "./celebrations/window-celebration-overrides.css";

/**
 * Timing model for minimizing visual flicker between background FX and surface masking:
 * - Start: render celebration background immediately, then apply masking classes later.
 * - Stop: remove masking classes immediately, but keep the background FX mounted briefly.
 *
 * This stagger avoids a hard flash when entering/exiting transparent surfaces.
 */
const CELEBRATION_WINDOW_TIMING = {
  classEnterDelayMs: 0,
  classExitDelayMs: 0,
  // Wait until class enter delay + surface background transition complete
  // so the sidebar and main panel reveal the celebration together.
  effectsEnterDelayMs: 300,
  effectsExitDelayMs: 0,
} as const;

type FullWindowCelebrationStateMap = {
  warpSpeed: "idle" | "active" | "blur";
};

type FullWindowCelebrationName = keyof FullWindowCelebrationStateMap;
type FullWindowCelebrationVisualState =
  FullWindowCelebrationStateMap[FullWindowCelebrationName];
type FullWindowCelebrationEffect = {
  /** Visual state for the active celebration renderer. */
  state: FullWindowCelebrationVisualState;
};
type FullWindowCelebrationController = {
  /** Stops this specific play instance if it is still the active one. */
  stop: () => void;
  /** Updates visual state for this play instance (for example "blur"). */
  applyEffect: (state: FullWindowCelebrationVisualState) => void;
};
type ActiveFullWindowCelebration = {
  name: FullWindowCelebrationName;
  token: symbol;
};

type FullWindowCelebrationContextValue = {
  isFullWindowCelebrationStyled: boolean;
  /**
   * Starts or reuses a celebration by name.
   * - If the same celebration is already active, returns the existing controller.
   * - If `effect` is provided during reuse, it is applied immediately.
   * - If a different celebration is active, it is stopped before the new one starts.
   */
  play: (
    name: FullWindowCelebrationName,
    effect?: FullWindowCelebrationEffect,
  ) => FullWindowCelebrationController;
};

const FullWindowCelebrationContext =
  createContext<FullWindowCelebrationContextValue | null>(null);
/**
 * Route allowlist per celebration name.
 * If a route is not allowed for the active celebration, it is auto-stopped.
 */
const FULL_WINDOW_CELEBRATION_ALLOWED_ROUTE_PATTERNS: Record<
  FullWindowCelebrationName,
  Array<string>
> = {
  warpSpeed: [
    "/",
    "/local/:conversationId",
    "/worktree-init-v2/:pendingWorktreeId",
  ],
};

/** Returns whether the active route is valid for the specified celebration. */
function isCelebrationAllowedRoute({
  name,
  pathname,
}: {
  name: FullWindowCelebrationName;
  pathname: string;
}): boolean {
  const allowedPatterns = FULL_WINDOW_CELEBRATION_ALLOWED_ROUTE_PATTERNS[name];
  return allowedPatterns.some(
    (pattern) => matchPath(pattern, pathname) != null,
  );
}

export function FullWindowCelebrationProvider({
  children,
}: {
  children: ReactNode;
}): ReactElement {
  const windowType = useWindowType();
  const { pathname } = useLocation();
  const [activeCelebration, setActiveCelebration] =
    useState<ActiveFullWindowCelebration | null>(null);
  const [portalNode, setPortalNode] = useState<HTMLDivElement | null>(null);
  const [showWindowBackgroundEffects, setShowWindowBackgroundEffects] =
    useState(false);
  const [celebrationEffect, setCelebrationEffect] =
    useState<FullWindowCelebrationEffect | null>(null);
  const [
    shouldApplyCelebrationWindowClass,
    setShouldApplyCelebrationWindowClass,
  ] = useState(false);
  const celebrationEffectsTimerIdRef = useRef<number | null>(null);
  const celebrationClassTimerIdRef = useRef<number | null>(null);
  const activeCelebrationTokenRef = useRef<symbol | null>(null);
  const activeCelebrationNameRef = useRef<FullWindowCelebrationName | null>(
    null,
  );
  const activeControllerRef = useRef<FullWindowCelebrationController | null>(
    null,
  );

  const hasCelebrationWindowBackground =
    activeCelebration?.name === "warpSpeed";

  const play = useCallback(
    (
      name: FullWindowCelebrationName,
      effect?: FullWindowCelebrationEffect,
    ): FullWindowCelebrationController => {
      if (
        activeCelebrationTokenRef.current != null &&
        activeCelebrationNameRef.current === name &&
        activeControllerRef.current != null
      ) {
        // Reuse the active controller for idempotent play(name) calls.
        if (effect != null) {
          activeControllerRef.current.applyEffect(effect.state);
        }
        return activeControllerRef.current;
      }

      if (activeControllerRef.current != null) {
        activeControllerRef.current.stop();
      }

      const token = Symbol(name);
      activeCelebrationTokenRef.current = token;
      activeCelebrationNameRef.current = name;
      setActiveCelebration({ name, token });
      setCelebrationEffect(effect ?? null);

      const controller: FullWindowCelebrationController = {
        stop: (): void => {
          if (activeCelebrationTokenRef.current !== token) {
            return;
          }
          activeCelebrationTokenRef.current = null;
          activeCelebrationNameRef.current = null;
          if (activeControllerRef.current === controller) {
            activeControllerRef.current = null;
          }
          setCelebrationEffect(null);
          setActiveCelebration((currentCelebration) => {
            if (currentCelebration?.token !== token) {
              return currentCelebration;
            }
            return null;
          });
        },
        applyEffect: (state: FullWindowCelebrationVisualState): void => {
          if (activeCelebrationTokenRef.current !== token) {
            return;
          }
          setCelebrationEffect((currentEffect) => {
            if (state === currentEffect?.state) {
              return currentEffect;
            }
            return { state };
          });
        },
      };
      activeControllerRef.current = controller;
      return controller;
    },
    [],
  );

  useEffect(() => {
    if (celebrationClassTimerIdRef.current != null) {
      window.clearTimeout(celebrationClassTimerIdRef.current);
      celebrationClassTimerIdRef.current = null;
    }

    if (hasCelebrationWindowBackground) {
      if (!shouldApplyCelebrationWindowClass) {
        // Delay class application so background FX can start first.
        celebrationClassTimerIdRef.current = window.setTimeout(() => {
          setShouldApplyCelebrationWindowClass(true);
          celebrationClassTimerIdRef.current = null;
        }, CELEBRATION_WINDOW_TIMING.classEnterDelayMs);
      }
      return;
    }

    if (!shouldApplyCelebrationWindowClass) {
      return;
    }

    celebrationClassTimerIdRef.current = window.setTimeout(() => {
      // Remove masking class first on stop; keep FX alive separately for fade-out.
      setShouldApplyCelebrationWindowClass(false);
      celebrationClassTimerIdRef.current = null;
    }, CELEBRATION_WINDOW_TIMING.classExitDelayMs);

    return (): void => {
      if (celebrationClassTimerIdRef.current != null) {
        window.clearTimeout(celebrationClassTimerIdRef.current);
        celebrationClassTimerIdRef.current = null;
      }
    };
  }, [hasCelebrationWindowBackground, shouldApplyCelebrationWindowClass]);

  useEffect(() => {
    if (celebrationEffectsTimerIdRef.current != null) {
      window.clearTimeout(celebrationEffectsTimerIdRef.current);
      celebrationEffectsTimerIdRef.current = null;
    }

    if (hasCelebrationWindowBackground) {
      if (!showWindowBackgroundEffects) {
        celebrationEffectsTimerIdRef.current = window.setTimeout(() => {
          setShowWindowBackgroundEffects(true);
          celebrationEffectsTimerIdRef.current = null;
        }, CELEBRATION_WINDOW_TIMING.effectsEnterDelayMs);
      }
      return;
    }

    if (!showWindowBackgroundEffects) {
      return;
    }

    celebrationEffectsTimerIdRef.current = window.setTimeout(() => {
      setShowWindowBackgroundEffects(false);
      celebrationEffectsTimerIdRef.current = null;
    }, CELEBRATION_WINDOW_TIMING.effectsExitDelayMs);

    return (): void => {
      if (celebrationEffectsTimerIdRef.current != null) {
        window.clearTimeout(celebrationEffectsTimerIdRef.current);
        celebrationEffectsTimerIdRef.current = null;
      }
    };
  }, [hasCelebrationWindowBackground, showWindowBackgroundEffects]);

  const shouldShowWindowBackgroundEffects =
    hasCelebrationWindowBackground || showWindowBackgroundEffects;

  useEffect(() => {
    if (windowType !== "electron") {
      if (activeControllerRef.current != null) {
        activeControllerRef.current.stop();
      }
      return;
    }
    if (activeCelebrationNameRef.current == null) {
      return;
    }
    if (
      isCelebrationAllowedRoute({
        name: activeCelebrationNameRef.current,
        pathname,
      })
    ) {
      return;
    }
    if (activeControllerRef.current != null) {
      activeControllerRef.current.stop();
    }
  }, [pathname, windowType]);

  const contextValue = useMemo<FullWindowCelebrationContextValue>(
    () => ({
      isFullWindowCelebrationStyled: shouldApplyCelebrationWindowClass,
      play,
    }),
    [play, shouldApplyCelebrationWindowClass],
  );

  return (
    <FullWindowCelebrationContext.Provider value={contextValue}>
      <div
        ref={setPortalNode}
        className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
        aria-hidden="true"
      />
      {portalNode != null && shouldShowWindowBackgroundEffects
        ? createPortal(
            <FullWindowCelebrationRenderer
              active={showWindowBackgroundEffects}
              name="warpSpeed"
              effect={celebrationEffect}
            />,
            portalNode,
          )
        : null}
      {children}
    </FullWindowCelebrationContext.Provider>
  );
}

/**
 * Usage:
 * `const { play } = useFullWindowCelebration();`
 * `const celebration = play("warpSpeed");`
 * Optional: `play("warpSpeed", { state: "blur" })` to set initial effect.
 * Call `celebration.applyEffect("blur")` to update effect props.
 * Call `celebration.stop()` when done.
 */
export function useFullWindowCelebration(): FullWindowCelebrationContextValue {
  const value = useContext(FullWindowCelebrationContext);
  if (value == null) {
    throw new Error(
      "useFullWindowCelebration must be used inside FullWindowCelebrationProvider.",
    );
  }
  return value;
}

function FullWindowCelebrationRenderer({
  active,
  effect,
  name,
}: {
  active: boolean;
  effect: FullWindowCelebrationEffect | null;
  name: FullWindowCelebrationName;
}): ReactElement {
  switch (name) {
    case "warpSpeed":
      return <WindowBackgroundEffects active={active} state={effect?.state} />;
  }
}

function WindowBackgroundEffects({
  active,
  state,
}: {
  active: boolean;
  state?: FullWindowCelebrationVisualState;
}): ReactElement {
  const starfieldState = active ? state : "idle";

  return (
    <div
      className={clsx(
        "pointer-events-none absolute inset-0 z-0 overflow-hidden transition-opacity duration-relaxed ease-basic",
        active ? "opacity-100" : "opacity-0",
      )}
      data-testid="window-background-effects"
      aria-hidden="true"
    >
      <CelebrationStarfieldBackground
        state={starfieldState}
        className="absolute inset-0"
        starOpacityMultiplier={1}
      />
    </div>
  );
}
