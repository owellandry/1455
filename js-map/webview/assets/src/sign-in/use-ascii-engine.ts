import { makeNoise3D } from "open-simplex-noise";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export type Mode = "noise" | "video" | "composite";

export function useAsciiEngine(options?: {
  initialColumns?: number;
  initialRows?: number;
  initialMode?: Mode;
  preferredVideoKeyword?: string;
}): {
  mode: Mode;
  setMode: (mode: Mode) => void;
  asciiChars: string;
  setAsciiChars: (chars: string) => void;
  columns: number;
  setColumns: (cols: number) => void;
  rows: number;
  setRows: (rows: number) => void;
  lines: Array<string>;
  showControls: boolean;
  setShowControls: (show: boolean) => void;
} {
  const [mode, setMode] = useState<Mode>(options?.initialMode ?? "noise");
  const [asciiChars, setAsciiChars] = useState<string>("@%#*+=-:. ");
  const [asciiSetIndex, setAsciiSetIndex] = useState<number>(0);

  const [columns, setColumns] = useState<number>(options?.initialColumns ?? 50);
  const [rows, setRows] = useState<number>(options?.initialRows ?? 30);
  const [framesPerSecond] = useState<number>(20);

  const [showControls, setShowControls] = useState<boolean>(false);

  const asciiSets = useMemo(
    () => [
      // "@%#*+=-:. ",
      //"01",
      "█▓▒░ ",
      "■□▲△●○◆◇",
      "⎺⎻⎼⎽⎾⎿",
      "o p e n a i ",
      "█▉▊▋▌▍▎▏",
      "█▓▒░-=:. ",
      "█▇▆▅▄▃▂▁",
      "C O D E X",
      "█■▲●◉○. ",
      "WMBRXVIl. ",
      "█#A*-. ",
      "●◉○· ",
    ],
    [],
  );

  useEffect(() => {
    if (typeof options?.initialColumns === "number") {
      setColumns(options.initialColumns);
    }
  }, [options?.initialColumns]);

  useEffect(() => {
    if (typeof options?.initialRows === "number") {
      setRows(options.initialRows);
    }
  }, [options?.initialRows]);

  const videoElementRef = useRef<HTMLVideoElement | null>(null);
  const videoCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const videoContextRef = useRef<CanvasRenderingContext2D | null>(null);

  const [videoUrls, setVideoUrls] = useState<Array<string>>([]);
  const videoIndexRef = useRef<number>(0);
  const preferredKeywordRef = useRef<string | undefined>(
    options?.preferredVideoKeyword,
  );

  const noise3D = useMemo(() => makeNoise3D(Date.now()), []);
  const timeRef = useRef<number>(0);
  const rafIdRef = useRef<number | null>(null);
  const lastFrameTimeRef = useRef<number>(0);
  const lastSignatureRef = useRef<string>("");
  const currentObjectUrlRef = useRef<string | null>(null);

  const generateNoiseFrame = useCallback(
    (cols: number, rowsLocal: number, currentTime: number) => {
      const freq = 0.15;
      const frame: Array<Array<number>> = [];
      for (let y = 0; y < rowsLocal; y++) {
        const rowArr: Array<number> = [];
        for (let x = 0; x < cols; x++) {
          const noiseVal = noise3D(x * freq, y * freq, currentTime);
          const blockVal = ((noiseVal + 1) / 2) * 255;
          rowArr.push(Math.round(blockVal));
        }
        frame.push(rowArr);
      }
      return frame;
    },
    [noise3D],
  );

  const floydSteinbergDither = useCallback(
    (frame: Array<Array<number>>, levels: number): Array<Array<number>> => {
      const h = frame.length;
      const w = h > 0 ? frame[0].length : 0;
      const arr = frame.map((r) => r.slice());
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const oldVal = arr[y][x];
          const idx = Math.round((oldVal / 255) * (levels - 1));
          const newVal = idx * (255 / (levels - 1));
          arr[y][x] = newVal;
          const err = oldVal - newVal;
          if (x + 1 < w) {
            arr[y][x + 1] += (err * 7) / 16;
          }
          if (y + 1 < h && x > 0) {
            arr[y + 1][x - 1] += (err * 3) / 16;
          }
          if (y + 1 < h) {
            arr[y + 1][x] += (err * 5) / 16;
          }
          if (y + 1 < h && x + 1 < w) {
            arr[y + 1][x + 1] += (err * 1) / 16;
          }
        }
      }
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          arr[y][x] = Math.max(0, Math.min(255, arr[y][x]));
        }
      }
      return arr;
    },
    [],
  );

  const drawVideoFrameToCanvas = useCallback((): void => {
    const video = videoElementRef.current;
    const canvas = videoCanvasRef.current;
    const ctx = videoContextRef.current;
    if (!video || !canvas || !ctx) {
      return;
    }
    const videoW = video.videoWidth;
    const videoH = video.videoHeight;
    if (
      !Number.isFinite(videoW) ||
      !Number.isFinite(videoH) ||
      videoW < 2 ||
      videoH < 2
    ) {
      return;
    }
    const gridW = columns;
    const gridH = rows;
    const charWidth = 9;
    const charHeight = 18;
    const charAspect = charHeight / charWidth;
    const gridAspect = gridW / Math.max(1, gridH * charAspect);
    const videoAspect = videoW / videoH;
    let sx: number, sy: number, sw: number, sh: number;
    if (videoAspect > gridAspect) {
      sh = videoH;
      sw = Math.max(1, videoH * gridAspect);
      sx = Math.max(0, (videoW - sw) / 2);
      sy = 0;
    } else {
      sw = videoW;
      sh = Math.max(1, videoW / gridAspect);
      sx = 0;
      sy = Math.max(0, (videoH - sh) / 2);
    }
    try {
      ctx.drawImage(video, sx, sy, sw, sh, 0, 0, gridW, gridH);
    } catch {
      /* ignore */
    }
  }, [columns, rows]);

  const getVideoGrayFrame = useCallback((): Array<Array<number>> => {
    const canvas = videoCanvasRef.current;
    const ctx = videoContextRef.current;
    if (!canvas || !ctx) {
      return [] as Array<Array<number>>;
    }
    const imgData = ctx.getImageData(0, 0, columns, rows).data;
    const frame: Array<Array<number>> = [];
    for (let y = 0; y < rows; y++) {
      const row: Array<number> = [];
      for (let x = 0; x < columns; x++) {
        const idx = (y * columns + x) * 4;
        const r = imgData[idx];
        const g = imgData[idx + 1];
        const b = imgData[idx + 2];
        const gray = 0.299 * r + 0.587 * g + 0.114 * b;
        row.push(Math.round(gray));
      }
      frame.push(row);
    }
    return frame;
  }, [columns, rows]);

  const renderWebcamOrVideoFrame = useCallback(
    (invertAsciiMapping: boolean): Array<string> => {
      const canvas = videoCanvasRef.current;
      const ctx = videoContextRef.current;
      if (!canvas || !ctx) {
        return [] as Array<string>;
      }
      const imgData = ctx.getImageData(0, 0, columns, rows).data;
      const frame: Array<Array<number>> = [];
      for (let y = 0; y < rows; y++) {
        const row: Array<number> = [];
        for (let x = 0; x < columns; x++) {
          const idx = (y * columns + x) * 4;
          const r = imgData[idx];
          const g = imgData[idx + 1];
          const b = imgData[idx + 2];
          const gray = 0.299 * r + 0.587 * g + 0.114 * b;
          row.push(Math.round(gray));
        }
        frame.push(row);
      }
      const dithered = floydSteinbergDither(frame, asciiChars.length);
      const rowsAsAscii: Array<string> = [];
      for (let y = 0; y < rows; y++) {
        let rowStr = "";
        for (let x = 0; x < columns; x++) {
          let idx = invertAsciiMapping
            ? Math.round((dithered[y][x] / 255) * (asciiChars.length - 1))
            : Math.round((1 - dithered[y][x] / 255) * (asciiChars.length - 1));
          if (Number.isNaN(idx)) {
            idx = 0;
          }
          idx = Math.max(0, Math.min(asciiChars.length - 1, idx));
          rowStr += asciiChars[idx];
        }
        rowsAsAscii.push(rowStr);
      }
      return rowsAsAscii;
    },
    [asciiChars, columns, rows, floydSteinbergDither],
  );

  const isVideoReady = useCallback((): boolean => {
    const v = videoElementRef.current;
    if (!v) {
      return false;
    }
    const hasDims =
      Number.isFinite(v.videoWidth) &&
      Number.isFinite(v.videoHeight) &&
      v.videoWidth > 1 &&
      v.videoHeight > 1;
    const hasData = (v.readyState ?? 0) >= 2;
    return hasDims && hasData && !v.paused;
  }, []);

  const renderFrame = useCallback((): Array<string> => {
    if (!videoCanvasRef.current) {
      videoCanvasRef.current = document.createElement("canvas");
      videoCanvasRef.current.style.display = "none";
      document.body.appendChild(videoCanvasRef.current);
    }
    if (!videoContextRef.current) {
      videoContextRef.current = videoCanvasRef.current.getContext("2d", {
        willReadFrequently: true,
      });
    }
    if (videoCanvasRef.current) {
      videoCanvasRef.current.width = columns;
      videoCanvasRef.current.height = rows;
    }

    let asciiRowsData: Array<string> = [];

    if (mode === "video") {
      if (isVideoReady()) {
        drawVideoFrameToCanvas();
        asciiRowsData = renderWebcamOrVideoFrame(true);
      } else {
        const frame = generateNoiseFrame(columns, rows, timeRef.current);
        const dithered = floydSteinbergDither(frame, asciiChars.length);
        for (let y = 0; y < rows; y++) {
          let rowStr = "";
          for (let x = 0; x < columns; x++) {
            let idx = Math.round(
              (1 - dithered[y][x] / 255) * (asciiChars.length - 1),
            );
            if (Number.isNaN(idx)) {
              idx = 0;
            }
            idx = Math.max(0, Math.min(asciiChars.length - 1, idx));
            rowStr += asciiChars[idx];
          }
          asciiRowsData.push(rowStr);
        }
      }
    } else if (mode === "composite") {
      const noiseFrame = generateNoiseFrame(columns, rows, timeRef.current);
      const ditheredBg = floydSteinbergDither(noiseFrame, asciiChars.length);
      const bgAscii: Array<string> = [];
      for (let y = 0; y < rows; y++) {
        let rowStr = "";
        for (let x = 0; x < columns; x++) {
          let idx = Math.round(
            (1 - ditheredBg[y][x] / 255) * (asciiChars.length - 1),
          );
          if (Number.isNaN(idx)) {
            idx = 0;
          }
          idx = Math.max(0, Math.min(asciiChars.length - 1, idx));
          rowStr += asciiChars[idx];
        }
        bgAscii.push(rowStr);
      }

      if (isVideoReady()) {
        drawVideoFrameToCanvas();
        const overlayAscii = renderWebcamOrVideoFrame(true);
        const grayFrame = getVideoGrayFrame();
        const threshold = 110;
        const result: Array<string> = [];
        for (let y = 0; y < rows; y++) {
          let rowStr = "";
          for (let x = 0; x < columns; x++) {
            const useOverlay = (grayFrame[y]?.[x] ?? 0) > threshold;
            rowStr += useOverlay ? overlayAscii[y][x] : bgAscii[y][x];
          }
          result.push(rowStr);
        }
        asciiRowsData = result;
      } else {
        asciiRowsData = bgAscii;
      }
    } else {
      const frame = generateNoiseFrame(columns, rows, timeRef.current);
      const dithered = floydSteinbergDither(frame, asciiChars.length);
      for (let y = 0; y < rows; y++) {
        let rowStr = "";
        for (let x = 0; x < columns; x++) {
          let idx = Math.round(
            (1 - dithered[y][x] / 255) * (asciiChars.length - 1),
          );
          if (Number.isNaN(idx)) {
            idx = 0;
          }
          idx = Math.max(0, Math.min(asciiChars.length - 1, idx));
          rowStr += asciiChars[idx];
        }
        asciiRowsData.push(rowStr);
      }
    }

    if (!asciiRowsData.length || asciiRowsData.every((r) => !r.trim())) {
      asciiRowsData = Array.from({ length: rows }, () => "@".repeat(columns));
    }

    timeRef.current += 0.03;
    return asciiRowsData;
  }, [
    asciiChars,
    columns,
    rows,
    drawVideoFrameToCanvas,
    renderWebcamOrVideoFrame,
    generateNoiseFrame,
    floydSteinbergDither,
    mode,
    isVideoReady,
    getVideoGrayFrame,
  ]);

  const pickNextVideoUrl = useCallback((): string => {
    if (!videoUrls.length) {
      return "";
    }
    const index = videoIndexRef.current % videoUrls.length;
    videoIndexRef.current =
      (videoIndexRef.current + 1) % Math.max(1, videoUrls.length);
    return videoUrls[index];
  }, [videoUrls]);

  const ensureVideoPlaying = useCallback(
    async (forceAdvance = false): Promise<void> => {
      if (!videoElementRef.current) {
        const v = document.createElement("video");
        v.style.display = "none";
        v.loop = true;
        v.muted = true;
        v.setAttribute("playsinline", "");
        document.body.appendChild(v);
        videoElementRef.current = v;
      }
      const videoElement = videoElementRef.current!;
      videoElement.muted = true;
      videoElement.setAttribute("playsinline", "");
      const pickPreferred = (): string => {
        if (!preferredKeywordRef.current) {
          return "";
        }
        const lower = preferredKeywordRef.current.toLowerCase();
        const found = videoUrls.find((u) => u.toLowerCase().includes(lower));
        return found || "";
      };
      if (forceAdvance) {
        const preferred = pickPreferred();
        const url = preferred || pickNextVideoUrl();
        if (url) {
          try {
            const resp = await fetch(url);
            const blob = await resp.blob();
            const objUrl = URL.createObjectURL(blob);
            if (currentObjectUrlRef.current) {
              try {
                URL.revokeObjectURL(currentObjectUrlRef.current);
              } catch {
                /* ignore */
              }
            }
            currentObjectUrlRef.current = objUrl;
            videoElement.src = objUrl;
          } catch {
            /* ignore */
          }
          videoElement.loop = true;
        }
      } else if (!videoElement.src) {
        const preferred = pickPreferred();
        const url = preferred || pickNextVideoUrl();
        if (url) {
          try {
            const resp = await fetch(url);
            const blob = await resp.blob();
            const objUrl = URL.createObjectURL(blob);
            if (currentObjectUrlRef.current) {
              try {
                URL.revokeObjectURL(currentObjectUrlRef.current);
              } catch {
                /* ignore */
              }
            }
            currentObjectUrlRef.current = objUrl;
            videoElement.src = objUrl;
          } catch {
            /* ignore */
          }
          videoElement.loop = true;
        }
      }
      try {
        if ((videoElement.readyState ?? 0) < 2) {
          await new Promise<void>((resolve) => {
            const onReady = (): void => {
              videoElement.removeEventListener("loadeddata", onReady);
              resolve();
            };
            videoElement.addEventListener("loadeddata", onReady, {
              once: true,
            });
          });
        }
        if (videoElement.paused) {
          await videoElement.play();
        }
      } catch {
        /* ignore */
      }
      if (!videoCanvasRef.current) {
        videoCanvasRef.current = document.createElement("canvas");
        videoCanvasRef.current.style.display = "none";
        document.body.appendChild(videoCanvasRef.current);
      }
      if (!videoContextRef.current && videoCanvasRef.current) {
        videoContextRef.current = videoCanvasRef.current.getContext("2d", {
          willReadFrequently: true,
        });
      }
    },
    [pickNextVideoUrl, videoUrls],
  );

  const ensureVideoInfra = useCallback((): void => {
    if (!videoElementRef.current) {
      const v = document.createElement("video");
      v.style.display = "none";
      v.loop = true;
      v.muted = true;
      v.setAttribute("playsinline", "");
      document.body.appendChild(v);
      videoElementRef.current = v;
    }
    if (!videoCanvasRef.current) {
      videoCanvasRef.current = document.createElement("canvas");
      videoCanvasRef.current.style.display = "none";
      document.body.appendChild(videoCanvasRef.current);
    }
    if (!videoContextRef.current && videoCanvasRef.current) {
      videoContextRef.current = videoCanvasRef.current.getContext("2d", {
        willReadFrequently: true,
      });
    }
  }, []);

  const cycleToNextVideo = useCallback(async (): Promise<void> => {
    ensureVideoInfra();
    const videoElement = videoElementRef.current;
    if (!videoElement || !videoUrls.length) {
      return;
    }
    const currentSrc = videoElement.src || "";
    let currentIdx = videoUrls.findIndex(
      (u) =>
        currentSrc.endsWith(u) || currentSrc === u || currentSrc.includes(u),
    );
    if (currentIdx < 0) {
      currentIdx = videoIndexRef.current % Math.max(1, videoUrls.length);
    }
    const nextIdx = (currentIdx + 1) % videoUrls.length;
    videoIndexRef.current = nextIdx;
    const targetUrl = videoUrls[nextIdx];
    if (targetUrl) {
      try {
        const resp = await fetch(targetUrl);
        const blob = await resp.blob();
        const objUrl = URL.createObjectURL(blob);
        if (currentObjectUrlRef.current) {
          try {
            URL.revokeObjectURL(currentObjectUrlRef.current);
          } catch {
            /* ignore */
          }
        }
        currentObjectUrlRef.current = objUrl;
        videoElement.src = objUrl;
      } catch {
        /* ignore */
      }
    }
    videoElement.loop = true;
    videoElement.muted = true;
    try {
      await videoElement.play();
    } catch {
      /* ignore */
    }
  }, [ensureVideoInfra, videoUrls]);

  useEffect(() => {
    void (async (): Promise<void> => {
      try {
        // Prefer bundled assets in: webview/src/assets/videos/
        const assets = import.meta.glob(
          "../assets/videos/*.{mp4,mov,webm,avi,mkv}",
          { query: "?url", import: "default", eager: true },
        ) as Record<string, string>;
        const urls = Object.values(assets);
        setVideoUrls(urls);
      } catch {
        /* ignore */
      }
    })();
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent): void => {
      if (e.metaKey && (e.key === "/" || e.key === "?" || e.code === "Slash")) {
        e.preventDefault();
        if (e.repeat) {
          return;
        }
        const nextMode: Mode = mode === "video" ? "noise" : "video";
        setMode(nextMode);
        if (nextMode === "video") {
          void ensureVideoPlaying(true);
          lastFrameTimeRef.current = 0;
        }
        return;
      }
      if (e.metaKey && e.key === ".") {
        e.preventDefault();
        if (e.repeat) {
          return;
        }
        const next = (asciiSetIndex + 1) % asciiSets.length;
        setAsciiSetIndex(next);
        setAsciiChars(asciiSets[next]);
        return;
      }
      if (
        (e.metaKey && e.key.toLowerCase() === "m") ||
        (e.metaKey && e.shiftKey && e.key.toLowerCase() === "m") ||
        (e.altKey && e.key.toLowerCase() === "m")
      ) {
        e.preventDefault();
        if (e.repeat) {
          return;
        }
        if (mode !== "video") {
          setMode("video");
          void ensureVideoPlaying(true);
        } else {
          void cycleToNextVideo();
        }
        return;
      }
    };
    window.addEventListener("keydown", handler);
    return (): void => {
      window.removeEventListener("keydown", handler);
    };
  }, [
    asciiSetIndex,
    asciiSets,
    cycleToNextVideo,
    ensureVideoPlaying,
    mode,
    setMode,
  ]);

  useEffect(() => {
    const targetInterval = 1000 / framesPerSecond;
    const tick = (now: number): void => {
      try {
        if (document.hidden) {
          return;
        }
        if (now - lastFrameTimeRef.current >= targetInterval - 1) {
          const nextLines = renderFrame();
          const signature = nextLines.join("\n");
          if (signature !== lastSignatureRef.current) {
            lastSignatureRef.current = signature;
            setLines(nextLines);
          }
          lastFrameTimeRef.current = now;
        }
      } catch {
        /* ignore */
      } finally {
        rafIdRef.current = window.requestAnimationFrame(tick);
      }
    };
    rafIdRef.current = window.requestAnimationFrame(tick);
    const onVisibility = (): void => {
      if (!document.hidden) {
        lastFrameTimeRef.current = 0;
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    return (): void => {
      if (rafIdRef.current != null) {
        window.cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [renderFrame, framesPerSecond]);

  useEffect(() => {
    return (): void => {
      try {
        const video = videoElementRef.current;
        if (video) {
          try {
            if (!video.paused) {
              video.pause();
            }
          } catch {
            /* ignore */
          }
          (video as unknown as { srcObject: MediaStream | null }).srcObject =
            null;
          try {
            video.remove();
          } catch {
            /* ignore */
          }
        }
      } catch {
        /* ignore */
      }
      if (videoCanvasRef.current) {
        try {
          videoCanvasRef.current.remove();
        } catch {
          /* ignore */
        }
      }
      if (currentObjectUrlRef.current) {
        try {
          URL.revokeObjectURL(currentObjectUrlRef.current);
        } catch {
          /* ignore */
        }
        currentObjectUrlRef.current = null;
      }
      videoElementRef.current = null;
      videoCanvasRef.current = null;
      videoContextRef.current = null;
    };
  }, []);

  const prevModeRef = useRef<Mode>("noise");
  const [lines, setLines] = useState<Array<string>>([]);

  useEffect(() => {
    const previousMode = prevModeRef.current;
    if (mode === "video" || mode === "composite") {
      void ensureVideoPlaying(previousMode !== mode);
    }
    prevModeRef.current = mode;
  }, [mode, ensureVideoPlaying]);

  useEffect(() => {
    if ((mode === "video" || mode === "composite") && videoUrls.length) {
      void ensureVideoPlaying(true);
    }
  }, [videoUrls, mode, ensureVideoPlaying]);

  return {
    mode,
    setMode,
    asciiChars,
    setAsciiChars,
    columns,
    setColumns,
    rows,
    setRows,
    lines,
    showControls,
    setShowControls,
  } as const;
}
