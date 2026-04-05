import { useCallback, useEffect, useRef } from "react";

export function AsciiShader({
  lines,
  columns,
  rows,
  scale = 0.75,
  foregroundColor = "var(--color-token-checkbox-border)",
  backgroundColor = "var(--color-token-side-bar-background)",
  autoCover = false,
}: {
  lines: Array<string>;
  columns: number;
  rows: number;
  scale?: number;
  foregroundColor?: string;
  backgroundColor?: string;
  autoCover?: boolean;
}): React.ReactElement {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const lastSignatureRef = useRef<string>("");
  const charWidthRef = useRef<number>(8);
  const charHeightRef = useRef<number>(16);
  const fontSizeRef = useRef<number>(12);
  const fontFamilyRef = useRef<string>("monospace");
  const linesRef = useRef<Array<string>>(lines);
  const renderRef = useRef<() => void>(() => {});

  const ensureCanvas = useCallback((): CanvasRenderingContext2D | null => {
    if (!containerRef.current) {
      return null;
    }
    if (!canvasRef.current) {
      const c = document.createElement("canvas");
      c.style.display = "block";
      c.style.borderRadius = autoCover ? "0px" : "10px";
      c.style.imageRendering = "crisp-edges";
      containerRef.current.appendChild(c);
      canvasRef.current = c;
    }
    const ctx = canvasRef.current.getContext("2d");
    return ctx;
  }, [autoCover]);

  const measureCharSize = (ctx: CanvasRenderingContext2D): void => {
    const fontSize = fontSizeRef.current;
    const fontFamily = fontFamilyRef.current;
    ctx.font = `${fontSize}px ${fontFamily}`;
    const metrics = ctx.measureText("M");
    const width = Math.max(1, Math.round(metrics.width));
    const height = Math.max(
      1,
      Math.round(
        (metrics.actualBoundingBoxAscent || fontSize) +
          (metrics.actualBoundingBoxDescent || Math.ceil(fontSize * 0.3)),
      ),
    );
    charWidthRef.current = width;
    charHeightRef.current = height;
  };

  const layoutCanvas = useCallback(
    (ctx: CanvasRenderingContext2D, coverScale: number): number => {
      const canvasEl = canvasRef.current;
      const containerEl = containerRef.current;
      if (!canvasEl) {
        return 1;
      }
      const safeScale =
        Number.isFinite(coverScale) && coverScale > 0 ? coverScale : 1;
      const dpr = Math.max(1, Math.floor(window.devicePixelRatio || 1));
      const logicalW = Math.max(1, columns * charWidthRef.current);
      const logicalH = Math.max(1, rows * charHeightRef.current);
      const styleWidth = logicalW * safeScale;
      const styleHeight = logicalH * safeScale;
      const pixelW = Math.max(1, Math.round(styleWidth * dpr));
      const pixelH = Math.max(1, Math.round(styleHeight * dpr));

      if (canvasEl.width !== pixelW || canvasEl.height !== pixelH) {
        canvasEl.width = pixelW;
        canvasEl.height = pixelH;
      }

      canvasEl.style.width = `${styleWidth}px`;
      canvasEl.style.height = `${styleHeight}px`;

      if (containerEl) {
        containerEl.style.width = `${styleWidth}px`;
        containerEl.style.height = `${styleHeight}px`;
      }

      ctx.setTransform(dpr * safeScale, 0, 0, dpr * safeScale, 0, 0);
      ctx.imageSmoothingEnabled = false;
      return safeScale;
    },
    [columns, rows],
  );

  const render = useCallback((): void => {
    const ctx = ensureCanvas();
    if (!ctx || !canvasRef.current) {
      return;
    }
    canvasRef.current.style.borderRadius = autoCover ? "0px" : "10px";
    try {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
    } catch {
      /* ignore */
    }
    measureCharSize(ctx);

    let coverScale = 1;
    if (autoCover && wrapperRef.current) {
      try {
        const parent = wrapperRef.current.parentElement;
        const parentRect = parent?.getBoundingClientRect();
        const logicalW = Math.max(1, columns * charWidthRef.current);
        const logicalH = Math.max(1, rows * charHeightRef.current);
        if (parentRect && logicalW > 0 && logicalH > 0) {
          const scaleW = parentRect.width / logicalW;
          const scaleH = parentRect.height / logicalH;
          coverScale = Math.max(scaleW, scaleH);
          if (!Number.isFinite(coverScale) || coverScale <= 0) {
            coverScale = 1;
          } else {
            coverScale *= 1.02;
          }
        }
      } catch {
        coverScale = 1;
      }
    }

    const effectiveScale = layoutCanvas(ctx, coverScale) || 1;
    const safeEffectiveScale = Math.max(effectiveScale, 0.001);
    const dpr = Math.max(1, Math.floor(window.devicePixelRatio || 1));
    const fillWidth = canvasRef.current.width / (dpr * safeEffectiveScale);
    const fillHeight = canvasRef.current.height / (dpr * safeEffectiveScale);
    ctx.save();
    const el = containerRef.current;
    const resolveColor = (
      propColor: string | undefined,
      which: "color" | "backgroundColor",
    ): string => {
      const resolveCssVar = (value: string): string => {
        try {
          const tmp = document.createElement("div");
          tmp.style.display = "none";
          (tmp.style as CSSStyleDeclaration)[which] = value as never;
          document.body.appendChild(tmp);
          const computed = getComputedStyle(tmp)[which] || "";
          tmp.remove();
          return computed;
        } catch {
          return "";
        }
      };
      if (propColor && propColor !== "") {
        if (propColor.trim().startsWith("var(")) {
          const resolved = resolveCssVar(propColor);
          if (resolved) {
            return resolved;
          }
        }
        return propColor;
      }
      if (!el) {
        return "";
      }
      const csSelf = getComputedStyle(el);
      let val = which === "color" ? csSelf.color : csSelf.backgroundColor;
      if (
        (val === "rgba(0, 0, 0, 0)" || val === "transparent") &&
        el.parentElement
      ) {
        const csParent = getComputedStyle(el.parentElement);
        val = which === "color" ? csParent.color : csParent.backgroundColor;
      }
      return val;
    };
    const bg = resolveColor(backgroundColor, "backgroundColor");
    const fg = resolveColor(foregroundColor, "color");
    if (bg) {
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, fillWidth, fillHeight);
    }

    if (fg) {
      ctx.fillStyle = fg;
    }
    ctx.textBaseline = "top";
    ctx.font = `${fontSizeRef.current}px ${fontFamilyRef.current}`;
    const lineHeight = charHeightRef.current;
    const maxLines = Math.min(rows, linesRef.current.length);
    for (let y = 0; y < maxLines; y++) {
      const text = linesRef.current[y] ?? "";
      if (text) {
        ctx.fillText(text, 0, y * lineHeight);
      }
    }
    ctx.restore();
    if (autoCover && wrapperRef.current && containerRef.current) {
      try {
        if (!wrapperRef.current.parentElement) {
          return;
        }
        const w = wrapperRef.current;
        w.style.position = "absolute";
        w.style.left = "50%";
        w.style.top = "50%";
        w.style.transform = "translate(-50%, -50%)";
        w.style.transformOrigin = "center";
        w.style.display = "block";
        w.style.width = containerRef.current.style.width;
        w.style.height = containerRef.current.style.height;
      } catch {
        /* ignore */
      }
    }
  }, [
    backgroundColor,
    rows,
    columns,
    foregroundColor,
    layoutCanvas,
    autoCover,
    ensureCanvas,
  ]);

  useEffect(() => {
    renderRef.current = render;
  }, [render]);

  useEffect(() => {
    let disposed = false;
    const containerEl = containerRef.current;
    const init = async (): Promise<void> => {
      if (!containerEl) {
        return;
      }
      try {
        // oxlint-disable-next-line typescript/no-explicit-any
        const anyDocument: any = document;
        if (anyDocument?.fonts?.ready?.then) {
          try {
            await anyDocument.fonts.ready;
          } catch {
            /* ignore */
          }
        }
      } catch {
        /* ignore */
      }
      if (disposed) {
        return;
      }
      renderRef.current();
    };
    void init();
    return (): void => {
      disposed = true;
      if (canvasRef.current) {
        try {
          canvasRef.current.remove();
        } catch {
          /* ignore */
        }
      }
      canvasRef.current = null;
      if (containerEl) {
        try {
          while (containerEl.firstChild) {
            containerEl.removeChild(containerEl.firstChild);
          }
        } catch {
          /* ignore */
        }
      }
    };
  }, []);

  useEffect((): void => {
    linesRef.current = lines;
    const signature = lines.join("\n");
    if (signature === lastSignatureRef.current) {
      return;
    }
    lastSignatureRef.current = signature;
    requestAnimationFrame(() => {
      requestAnimationFrame(() => renderRef.current());
    });
  }, [lines]);

  useEffect(() => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => renderRef.current());
    });
  }, [columns, rows, foregroundColor, backgroundColor]);

  useEffect(() => {
    if (!autoCover) {
      return;
    }
    const onResize = (): void => {
      requestAnimationFrame(() => renderRef.current());
    };
    window.addEventListener("resize", onResize);
    return (): void => {
      window.removeEventListener("resize", onResize);
    };
  }, [autoCover]);

  return (
    <div
      ref={wrapperRef}
      style={
        autoCover
          ? {
              position: "absolute",
              left: "50%",
              top: "50%",
              transform: "translate(-50%, -50%)",
              display: "block",
            }
          : {
              transform: `scale(${scale})`,
              transformOrigin: "center",
              display: "inline-block",
            }
      }
    >
      <div
        ref={containerRef}
        style={{
          display: "inline-block",
          lineHeight: 1,
          borderRadius: autoCover ? 0 : 10,
        }}
      />
    </div>
  );
}
