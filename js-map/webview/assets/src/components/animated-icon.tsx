import type {
  Data,
  DotLottieWorkerReactProps,
} from "@lottiefiles/dotlottie-react";
import { setWasmUrl } from "@lottiefiles/dotlottie-react";
import clsx from "clsx";
import type { CSSProperties } from "react";
import {
  Activity,
  startTransition,
  Suspense,
  use,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { useReducedMotion } from "@/hooks/use-reduced-motion";

import {
  getLottieAnimationDefinition,
  type AnimationType,
} from "./animated-icon-map";

const DotLottieReact = import("@lottiefiles/dotlottie-react").then(
  (mod) => mod.DotLottieWorkerReact,
);

/**
 * Note, keep this in sync and download the latest wasm version from the file
 * and upload to our CDN when dotlottie-react is upgraded.
 *
 * Example: az storage blob upload \
 *  --account-name openaiassets \
 *  --container-name '$web' \
 *  --name "common/wasm/dotlottie-player-017-13.wasm" \
 *  --file "dotlottie-player-017-13.wasm" \
 *  --content-type 'application/wasm' \
 *  --content-cache-control 'public, max-age=31536000, immutable' \
 *  --overwrite \
 *  --auth-mode login
 */
setWasmUrl("https://cdn.openai.com/common/wasm/dotlottie-player-017-13.wasm");

const sizeMap = {
  xs: "w-3 h-3",
  sm: "w-4 h-4",
  md: "w-5 h-5",
  lg: "w-6 h-6",
};

const svgSizeMap = {
  xs: "w-3 h-3",
  sm: "w-4 h-4",
  md: "w-6 h-6",
  lg: "w-8 h-8",
};

function getColor(element: Element): Array<number> | null {
  const color = getComputedStyle(element)
    .color?.match(/\d+/g)
    ?.map(Number)
    .map((v) => v / 255);
  if (color) {
    color.push(1);
    return color;
  }
  return null;
}

function getColorKey(color: Array<number> | null): string | null {
  if (!color) {
    return null;
  }
  return color.join(",");
}

type ProcessedLottieAnimation = {
  size: { width: number; height: number };
  data: Data;
};

function processLottieAnimationData({
  animationData,
  color,
}: {
  animationData: Data;
  color: Array<number> | null;
}): ProcessedLottieAnimation {
  if (!color) {
    return { size: { width: 100, height: 100 }, data: animationData };
  }

  // oxlint-disable-next-line typescript/no-explicit-any
  const data = structuredClone(animationData) as any;

  const size: { width: number; height: number } =
    data?.w && data?.h
      ? { width: data.w, height: data.h }
      : { width: 100, height: 100 };

  // oxlint-disable-next-line typescript/no-explicit-any
  const processObject = (item: any): void => {
    if ((item.ty === "fl" || item.ty === "st") && item?.c?.k) {
      item.c.k = color;
    }
    if (Array.isArray(item.it)) {
      item.it.forEach(processObject);
    }
  };

  // oxlint-disable-next-line typescript/no-explicit-any
  const processLayer = (layer: any): void => {
    if (layer.ty === 4 && Array.isArray(layer.shapes)) {
      layer.shapes.forEach(processObject);
    }
    if (Array.isArray(layer.layers)) {
      layer.layers.forEach(processLayer);
    }
  };

  processLayer(data);

  if (Array.isArray(data.assets)) {
    data.assets.forEach(processLayer);
  }

  return { size, data };
}

export function AnimatedIcon({
  animation,
  animationData,
  fallbackSvg,
  animated = true,
  size = "md",
  color,
  tokenColor,
  matchTextColor = true,
  loop = true,
  className,
}: {
  animation?: AnimationType;
  animationData?: Data;
  fallbackSvg?: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  animated?: boolean;
  size?: "xs" | "sm" | "md" | "lg" | number;
  color?: string;
  tokenColor?: string; // New prop for Tailwind token colors
  matchTextColor?: boolean; // New prop to match text color automatically
  loop?: boolean;
  className?: string;
}): React.ReactElement {
  const containerRef = useRef<HTMLDivElement>(null);
  const [detectedColor, setDetectedColor] = useState<Array<number> | null>(
    null,
  );
  const { SvgFallback, animationJson } = useMemo(
    () =>
      getLottieAnimationDefinition({
        animation,
        animationData,
        fallback: fallbackSvg,
      }),
    [animation, animationData, fallbackSvg],
  );

  const [processedLottieData, setProcessedLottieData] =
    useState<ProcessedLottieAnimation | null>(null);
  const [lottieData, setLottieData] = useState<Data | null>(null);
  const lastColorKeyRef = useRef<string | null>(null);
  const prefersReducedMotion = useReducedMotion();

  const sizeClass = typeof size === "number" ? "" : sizeMap[size];
  const sizeStyle: CSSProperties =
    typeof size === "number" ? { width: size, height: size } : {};

  const parentSizeClass = typeof size === "number" ? "" : svgSizeMap[size];
  const parentSizeStyle = typeof size === "number" ? sizeStyle : {};

  useEffect(() => {
    const fetchController = new AbortController();

    async function getLottieData(): Promise<void> {
      const data = await animationJson;
      if (fetchController.signal.aborted) {
        return;
      }
      startTransition(() => {
        setLottieData(data);
      });
    }

    void getLottieData();

    return (): void => {
      fetchController.abort();
    };
  }, [animationJson]);

  const offscreenCanvasRef = useRef<OffscreenCanvas | null>(null);

  useEffect(() => {
    let tokenColorElement: HTMLDivElement | null = null;

    const updateColor = (): void => {
      let nextColor: Array<number> | null = null;
      if (color) {
        const tempEl = document.createElement("div");
        tempEl.style.color = color;
        document.body.appendChild(tempEl);
        const parsedColor = getColor(tempEl);
        document.body.removeChild(tempEl);
        nextColor = parsedColor;
      } else if (tokenColor) {
        if (!tokenColorElement) {
          tokenColorElement = document.createElement("div");
          tokenColorElement.className = tokenColor;
          document.body.appendChild(tokenColorElement);
        }
        nextColor = getColor(tokenColorElement);
      } else if (matchTextColor && containerRef.current) {
        nextColor = getColor(containerRef.current);
      }
      const nextKey = getColorKey(nextColor);
      if (lastColorKeyRef.current === nextKey) {
        return;
      }
      lastColorKeyRef.current = nextKey;
      startTransition(() => {
        setDetectedColor(nextColor);
      });
    };

    if (tokenColor) {
      tokenColorElement = document.createElement("div");
      tokenColorElement.className = tokenColor;
      document.body.appendChild(tokenColorElement);
    }

    const observer = new MutationObserver(updateColor);

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class", "style"],
    });

    if (matchTextColor && containerRef.current) {
      observer.observe(containerRef.current, {
        attributes: true,
        attributeFilter: ["class", "style"],
      });
    }

    updateColor();

    return (): void => {
      observer.disconnect();
      if (tokenColorElement && document.body.contains(tokenColorElement)) {
        document.body.removeChild(tokenColorElement);
      }
    };
  }, [color, tokenColor, matchTextColor]);

  useEffect(() => {
    if (!lottieData) {
      return;
    }

    startTransition(() => {
      setProcessedLottieData(
        processLottieAnimationData({
          animationData: lottieData,
          color: detectedColor,
        }),
      );
    });
  }, [detectedColor, lottieData]);

  const showFallback = prefersReducedMotion
    ? true
    : !animated || !processedLottieData;
  let fallbackComponent: React.ReactNode = null;

  if (!animated || showFallback) {
    const SvgComponent = SvgFallback;

    if (!SvgComponent) {
      throw new Error(
        "Either provide 'fallbackSvg' prop or use an 'animation' type when animated=false",
      );
    }

    const style: CSSProperties = { ...sizeStyle };
    if (color) {
      if (color === "white") {
        style.filter = "brightness(0) invert(1)";
      } else {
        style.filter = `hue-rotate(${color})`;
      }
    }

    fallbackComponent = (
      <div
        ref={containerRef}
        className={clsx(
          parentSizeClass,
          className,
          tokenColor,
          "flex items-center justify-center",
        )}
        style={parentSizeStyle}
      >
        <SvgComponent
          className="h-full w-full"
          style={color ? style : undefined}
        />
      </div>
    );

    if (!animated) {
      return fallbackComponent;
    }
  }

  return (
    <>
      <Activity mode={showFallback ? "visible" : "hidden"}>
        {fallbackComponent}
      </Activity>
      <Activity mode={!showFallback ? "visible" : "hidden"}>
        <div
          ref={containerRef}
          className={clsx(
            parentSizeClass,
            className,
            tokenColor,
            "flex items-center justify-center",
          )}
          style={parentSizeStyle}
        >
          <div
            className={clsx(sizeClass, "flex items-center justify-center")}
            style={sizeStyle}
          >
            <Suspense fallback={fallbackComponent}>
              <DotLottiePlayer
                data={processedLottieData?.data ?? undefined}
                dotLottieRefCallback={(instance) => {
                  if (!instance || !processedLottieData) {
                    return;
                  }
                  const hasOffscreenCanvasSupport =
                    typeof OffscreenCanvas !== "undefined";
                  if (!hasOffscreenCanvasSupport) {
                    return;
                  }
                  let canvas: OffscreenCanvas | null =
                    offscreenCanvasRef.current;
                  if (!canvas) {
                    canvas = new OffscreenCanvas(
                      processedLottieData.size.width,
                      processedLottieData.size.height,
                    );
                    offscreenCanvasRef.current = canvas;
                    const ctx = canvas.getContext("2d", {
                      alpha: true,
                      desynchronized: true,
                      willReadFrequently: false,
                    });
                    if (ctx) {
                      ctx.imageSmoothingEnabled = true;
                      ctx.imageSmoothingQuality = "high";
                      ctx.globalCompositeOperation = "source-over";
                    }
                  }

                  void instance.setCanvas(canvas);
                }}
                loop={loop}
                renderConfig={{
                  autoResize: true,
                  freezeOnOffscreen: true,
                  quality: 20,
                }}
                autoplay={!prefersReducedMotion}
                className="pointer-events-none h-full w-full contain-[paint_style_layout_inline-size]"
              />
            </Suspense>
          </div>
        </div>
      </Activity>
    </>
  );
}

// oxlint-disable-next-line codex/inline-component-props
function DotLottiePlayer(props: DotLottieWorkerReactProps): React.ReactNode {
  const DotLottieReactWorker = use(DotLottieReact);

  // oxlint-disable-next-line react-hooks-js/static-components
  return <DotLottieReactWorker {...props} />;
}
