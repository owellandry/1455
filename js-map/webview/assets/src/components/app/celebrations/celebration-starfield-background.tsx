import clsx from "clsx";
import { useEffect, useRef } from "react";

type Rgb = { r: number; g: number; b: number };

const STARFIELD_CONFIG = {
  numStars: 1900,
  minStars: 700,
  starsPerMegaPixel: 900,
  baseTrailLength: 2,
  maxTrailLength: 22,
  speedBase: 1,
  speedWarpMultiplier: 38,
  clearAlphaWarpMultiplier: 0.8,
  warpEasing: 0.06,
  warpAlphaDamp: 0.35,
  idleMaxFps: 20,
  activeMaxFps: 60,
  unfocusedFpsMultiplier: 0.6,
  moderatePressureScore: 4,
  highPressureScore: 10,
  moderatePressureQualityMultiplier: 0.8,
  highPressureQualityMultiplier: 0.6,
  pressureOverrunMultiplier: 1.75,
} as const;
// numStars: total star points rendered each frame (CPU cost scales roughly linearly).
// baseTrailLength: minimum number of points in each star's trail (idle).
// maxTrailLength: maximum number of points in each star's trail (full warp).
// speedBase: base forward speed of stars (z decrement) even when idle.
// speedWarpMultiplier: additional speed at full warp (added to speedBase).
// clearAlphaWarpMultiplier: how much the background fade strengthens with warp.
// warpEasing: smoothing factor for warpSpeed (higher = snappier transitions).
// warpAlphaDamp: reduces star alpha at high warp to avoid a noisy "whiteout".
// idleMaxFps: cap draw rate while idle (keeps background cheap).
// activeMaxFps: cap draw rate while active/warping.

function clampByte(value: number): number {
  return Math.max(0, Math.min(255, Math.round(value)));
}

function parseCssColorToRgb(value: string): Rgb | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const rgbMatch =
    /^rgba?\(\s*([0-9.]+)\s*,\s*([0-9.]+)\s*,\s*([0-9.]+)(?:\s*,\s*[0-9.]+\s*)?\)$/i.exec(
      trimmed,
    );
  if (rgbMatch) {
    return {
      r: clampByte(Number(rgbMatch[1])),
      g: clampByte(Number(rgbMatch[2])),
      b: clampByte(Number(rgbMatch[3])),
    };
  }

  const hexMatch = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(trimmed);
  if (!hexMatch) {
    return null;
  }

  const hex = hexMatch[1].toLowerCase();
  if (hex.length === 3) {
    const r = parseInt(hex[0] + hex[0], 16);
    const g = parseInt(hex[1] + hex[1], 16);
    const b = parseInt(hex[2] + hex[2], 16);
    return { r, g, b };
  }

  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  return { r, g, b };
}

function resolveAdaptiveStarCount({
  width,
  height,
}: {
  width: number;
  height: number;
}): number {
  const { minStars, numStars: maxStars, starsPerMegaPixel } = STARFIELD_CONFIG;
  const viewportMegaPixels = (width * height) / 1_000_000;
  const adaptiveCount = Math.round(viewportMegaPixels * starsPerMegaPixel);
  return Math.max(minStars, Math.min(maxStars, adaptiveCount));
}

type Star = {
  x: number;
  y: number;
  z: number;
  o: number;
  trailX: Float32Array;
  trailY: Float32Array;
  trailHead: number;
  trailLength: number;
};

const CELEBRATION_STARFIELD_BLUR_PX = 3;

export function CelebrationStarfieldBackground({
  state,
  className,
  starOpacityMultiplier = 1,
  maxFps = 60,
  maxDevicePixelRatio = 1,
}: {
  state?: "idle" | "active" | "blur";
  className?: string;
  starOpacityMultiplier?: number;
  maxFps?: number;
  maxDevicePixelRatio?: number;
}): React.ReactElement {
  const resolvedState = state ?? "active";
  const hostRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const activeRef = useRef(false);
  useEffect(() => {
    activeRef.current = resolvedState !== "idle";
  }, [resolvedState]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const reducedMotion = window.matchMedia?.(
      "(prefers-reduced-motion: reduce)",
    )?.matches;
    if (reducedMotion) {
      return;
    }

    const host = hostRef.current;
    const canvas = canvasRef.current;
    if (!host || !canvas) {
      return;
    }

    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) {
      return;
    }

    let isVisible = true;
    let isWindowFocused = document.hasFocus();
    let rafId = 0;
    let lastDraw = 0;
    let pressureScore = 0;

    const {
      activeMaxFps,
      baseTrailLength,
      clearAlphaWarpMultiplier,
      idleMaxFps,
      maxTrailLength,
      numStars,
      speedBase,
      speedWarpMultiplier,
      warpAlphaDamp,
      warpEasing,
      unfocusedFpsMultiplier,
      moderatePressureScore,
      highPressureScore,
      moderatePressureQualityMultiplier,
      highPressureQualityMultiplier,
      pressureOverrunMultiplier,
    } = STARFIELD_CONFIG;

    let centerX = 0;
    let centerY = 0;
    let focalLength = 1;
    let starCount: number = numStars;

    let stars: Array<Star> = [];
    let starColor: Rgb = { r: 209, g: 255, b: 255 };
    let clearColor: Rgb = { r: 255, g: 255, b: 255 };
    let starColorCss = "rgb(209, 255, 255)";
    let clearColorCss = "rgb(255, 255, 255)";

    // Persistent probe element for resolving CSS var() colors.
    const probe = document.createElement("div");
    probe.style.position = "absolute";
    probe.style.left = "-99999px";
    probe.style.top = "-99999px";
    probe.style.width = "1px";
    probe.style.height = "1px";
    document.body.appendChild(probe);

    const updateThemeColors = (): void => {
      probe.style.backgroundColor = "var(--color-token-text-link-foreground)";
      starColor = parseCssColorToRgb(
        getComputedStyle(probe).backgroundColor,
      ) ?? {
        r: 209,
        g: 255,
        b: 255,
      };

      probe.style.backgroundColor =
        "var(--color-token-main-surface-primary, var(--color-token-bg-primary))";
      clearColor = parseCssColorToRgb(
        getComputedStyle(probe).backgroundColor,
      ) ??
        parseCssColorToRgb(getComputedStyle(host).backgroundColor) ?? {
          r: 255,
          g: 255,
          b: 255,
        };
      starColorCss = `rgb(${String(starColor.r)}, ${String(
        starColor.g,
      )}, ${String(starColor.b)})`;
      clearColorCss = `rgb(${String(clearColor.r)}, ${String(
        clearColor.g,
      )}, ${String(clearColor.b)})`;
    };

    const initializeStars = (): void => {
      const width = canvas.width;
      const height = canvas.height;
      stars = [];
      for (let i = 0; i < starCount; i++) {
        stars.push({
          x: Math.random() * width,
          y: Math.random() * height,
          z: Math.random() * width,
          o: 0.5 + Math.random() * 0.5,
          trailX: new Float32Array(maxTrailLength),
          trailY: new Float32Array(maxTrailLength),
          trailHead: -1,
          trailLength: 0,
        });
      }
    };

    const resize = (): void => {
      const rect = host.getBoundingClientRect();
      const dpr = Math.min(
        maxDevicePixelRatio,
        Math.max(1, window.devicePixelRatio || 1),
      );
      canvas.width = Math.max(1, Math.floor(rect.width * dpr));
      canvas.height = Math.max(1, Math.floor(rect.height * dpr));
      centerX = canvas.width / 2;
      centerY = canvas.height / 2;
      focalLength = canvas.width * 2;
      starCount = resolveAdaptiveStarCount({
        width: canvas.width,
        height: canvas.height,
      });
      updateThemeColors();
      initializeStars();
    };

    let pendingResize = false;
    const requestResize = (): void => {
      if (pendingResize) {
        return;
      }
      pendingResize = true;
      requestAnimationFrame(() => {
        pendingResize = false;
        resize();
      });
    };

    const ro = new ResizeObserver(requestResize);
    ro.observe(host);

    const intersection = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          isVisible = entry.isIntersecting;
        }
      },
      { threshold: 0 },
    );
    intersection.observe(host);

    const onWindowFocus = (): void => {
      isWindowFocused = true;
      pressureScore = 0;
    };

    const onWindowBlur = (): void => {
      isWindowFocused = false;
    };

    window.addEventListener("focus", onWindowFocus);
    window.addEventListener("blur", onWindowBlur);

    resize();

    let themeUpdateQueued = false;
    const queueThemeUpdate = (): void => {
      if (themeUpdateQueued) {
        return;
      }
      themeUpdateQueued = true;
      requestAnimationFrame(() => {
        themeUpdateQueued = false;
        updateThemeColors();
      });
    };

    const themeObserver = new MutationObserver(queueThemeUpdate);
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class", "style", "data-theme"],
    });
    themeObserver.observe(document.body, {
      attributes: true,
      attributeFilter: ["class", "style", "data-theme"],
    });

    const prefersDarkQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const onPrefersColorSchemeChange = (): void => {
      queueThemeUpdate();
    };
    prefersDarkQuery.addEventListener("change", onPrefersColorSchemeChange);

    let warpSpeed = 0;
    const frame = (now: number): void => {
      rafId = requestAnimationFrame(frame);

      if (!isVisible) {
        return;
      }
      if (typeof document !== "undefined" && document.hidden) {
        return;
      }
      const effectiveMaxFps =
        activeRef.current || warpSpeed > 0.01 ? activeMaxFps : idleMaxFps;
      const focusedFpsCap = Math.min(maxFps, effectiveMaxFps);
      const targetFps = isWindowFocused
        ? focusedFpsCap
        : Math.max(1, Math.floor(focusedFpsCap * unfocusedFpsMultiplier));
      const minFrameMs = targetFps > 0 ? 1000 / targetFps : 0;
      if (minFrameMs > 0 && now - lastDraw < minFrameMs) {
        return;
      }

      const frameDeltaMs = lastDraw > 0 ? now - lastDraw : minFrameMs;
      if (frameDeltaMs > minFrameMs * pressureOverrunMultiplier) {
        pressureScore = Math.min(highPressureScore + 2, pressureScore + 1);
      } else {
        pressureScore = Math.max(0, pressureScore - 1);
      }
      lastDraw = now;

      const targetWarp = activeRef.current ? 1 : 0;
      warpSpeed += (targetWarp - warpSpeed) * warpEasing;

      // Clear canvas with the same fade effect as the reference.
      const clearAlpha = 1 - warpSpeed * clearAlphaWarpMultiplier;

      // Match the reference speed mapping (always forward).
      const speed = speedBase + warpSpeed * speedWarpMultiplier;

      // Trail length (in points) matches reference.
      const trailLength = Math.floor(
        baseTrailLength + warpSpeed * (maxTrailLength - baseTrailLength),
      );
      const alphaScale = 1 - warpSpeed * warpAlphaDamp;
      let qualityMultiplier = 1;
      if (!isWindowFocused) {
        qualityMultiplier *= unfocusedFpsMultiplier;
      }
      if (pressureScore >= highPressureScore) {
        qualityMultiplier *= highPressureQualityMultiplier;
      } else if (pressureScore >= moderatePressureScore) {
        qualityMultiplier *= moderatePressureQualityMultiplier;
      }
      const starsToDraw = Math.max(
        1,
        Math.min(stars.length, Math.floor(stars.length * qualityMultiplier)),
      );

      ctx.fillStyle = clearColorCss;
      ctx.globalAlpha = clearAlpha;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = starColorCss;
      ctx.strokeStyle = starColorCss;
      ctx.lineWidth = 1;

      for (let i = 0; i < starsToDraw; i++) {
        const star = stars[i];
        star.z -= speed;

        if (star.z < 1) {
          star.z = canvas.width;
          star.x = Math.random() * canvas.width;
          star.y = Math.random() * canvas.height;
          star.trailHead = -1;
          star.trailLength = 0;
        }

        const px = (star.x - centerX) * (focalLength / star.z) + centerX;
        const py = (star.y - centerY) * (focalLength / star.z) + centerY;

        const nextHead = (star.trailHead + 1) % maxTrailLength;
        star.trailHead = nextHead;
        star.trailX[nextHead] = px;
        star.trailY[nextHead] = py;
        star.trailLength = Math.min(maxTrailLength, star.trailLength + 1);

        const pointsToDraw = Math.min(trailLength, star.trailLength);
        if (pointsToDraw > 1) {
          ctx.beginPath();
          const startIdx =
            (star.trailHead - (pointsToDraw - 1) + maxTrailLength) %
            maxTrailLength;
          ctx.moveTo(star.trailX[startIdx], star.trailY[startIdx]);
          for (let j = 1; j < pointsToDraw; j++) {
            const idx = (startIdx + j) % maxTrailLength;
            ctx.lineTo(star.trailX[idx], star.trailY[idx]);
          }
          const alpha = star.o * alphaScale * starOpacityMultiplier;
          ctx.globalAlpha = alpha;
          ctx.stroke();
        }

        const alpha = star.o * alphaScale * starOpacityMultiplier;
        ctx.globalAlpha = alpha;
        ctx.fillRect(px, py, 1, 1);
      }
      ctx.globalAlpha = 1;
    };

    rafId = requestAnimationFrame(frame);

    return (): void => {
      cancelAnimationFrame(rafId);
      ro.disconnect();
      intersection.disconnect();
      window.removeEventListener("focus", onWindowFocus);
      window.removeEventListener("blur", onWindowBlur);
      themeObserver.disconnect();
      prefersDarkQuery.removeEventListener(
        "change",
        onPrefersColorSchemeChange,
      );
      probe.remove();
    };
  }, [maxDevicePixelRatio, maxFps, starOpacityMultiplier]);

  return (
    <div
      ref={hostRef}
      className={clsx(
        "pointer-events-none absolute inset-0 transition-[filter] duration-relaxed ease-basic",
        className,
      )}
      style={{
        backgroundColor:
          "var(--color-token-main-surface-primary, var(--color-token-bg-primary))",
        ...(resolvedState === "blur"
          ? { filter: `blur(${String(CELEBRATION_STARFIELD_BLUR_PX)}px)` }
          : {}),
      }}
      aria-hidden="true"
    >
      <canvas ref={canvasRef} className="h-full w-full" />
    </div>
  );
}
