import { useCallback, useEffect, useRef, useState } from "react";

import {
  WAVEFORM_INITIAL_VALUE,
  WAVEFORM_MAX_BUFFER_SAMPLES,
  WAVEFORM_SAMPLE_BAR_UI_WIDTH,
  WAVEFORM_SCALE_FACTOR,
} from "./dictation-waveform";

export function useRecordingWaveform(): {
  getCurrentRecordingDurationMs: () => number;
  recordingDurationMs: number;
  waveformCanvasRef: React.RefObject<HTMLCanvasElement | null>;
  startWaveformCapture: (stream: MediaStream) => void;
  stopWaveformCapture: () => void;
  resetWaveformDisplay: () => void;
} {
  const [recordingDurationMs, setRecordingDurationMs] = useState(0);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const recordingStartMsRef = useRef<number | null>(null);
  const waveformCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const waveformBarsRef = useRef<Array<number>>([]);
  const pendingWaveformSamplesRef = useRef<Float32Array>(new Float32Array(0));
  const samplesPerBarRef = useRef(1);
  const lastDurationSecondRef = useRef(-1);

  const initializeWaveformBars = useCallback(
    (canvas: HTMLCanvasElement | null): boolean => {
      if (canvas == null) {
        return false;
      }
      const barCount = Math.max(
        1,
        Math.floor(canvas.clientWidth / WAVEFORM_SAMPLE_BAR_UI_WIDTH),
      );
      waveformBarsRef.current = Array.from(
        { length: barCount },
        () => WAVEFORM_INITIAL_VALUE,
      );
      samplesPerBarRef.current = Math.max(
        1,
        Math.floor(WAVEFORM_MAX_BUFFER_SAMPLES / barCount),
      );
      pendingWaveformSamplesRef.current = new Float32Array(0);
      return true;
    },
    [],
  );

  const clearWaveformCanvas = useCallback((): void => {
    const canvas = waveformCanvasRef.current;
    if (canvas == null) {
      return;
    }
    const context = canvas.getContext("2d");
    if (context == null) {
      return;
    }
    context.clearRect(0, 0, canvas.width, canvas.height);
  }, []);

  const stopWaveformCapture = useCallback((): void => {
    if (processorRef.current != null) {
      processorRef.current.onaudioprocess = null;
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    if (sourceRef.current != null) {
      sourceRef.current.disconnect();
      sourceRef.current = null;
    }
    if (audioContextRef.current != null) {
      void audioContextRef.current.close();
    }
    audioContextRef.current = null;
    recordingStartMsRef.current = null;
    waveformBarsRef.current = [];
    pendingWaveformSamplesRef.current = new Float32Array(0);
    samplesPerBarRef.current = 1;
    lastDurationSecondRef.current = -1;
    clearWaveformCanvas();
  }, [clearWaveformCanvas]);

  const resetWaveformDisplay = useCallback((): void => {
    waveformBarsRef.current = [];
    pendingWaveformSamplesRef.current = new Float32Array(0);
    samplesPerBarRef.current = 1;
    setRecordingDurationMs(0);
    lastDurationSecondRef.current = -1;
  }, []);

  const drawWaveform = useCallback((): void => {
    const canvas = waveformCanvasRef.current;
    if (canvas == null) {
      return;
    }
    const context = canvas.getContext("2d");
    if (context == null) {
      return;
    }
    const { clientHeight, clientWidth } = canvas;
    if (clientWidth === 0 || clientHeight === 0) {
      return;
    }
    const desiredBarCount = Math.max(
      1,
      Math.floor(clientWidth / WAVEFORM_SAMPLE_BAR_UI_WIDTH),
    );
    if (waveformBarsRef.current.length !== desiredBarCount) {
      initializeWaveformBars(canvas);
    }
    const soundBars = waveformBarsRef.current;
    if (soundBars.length === 0) {
      return;
    }
    let firstAudioBarIndex = -1;
    for (let index = 0; index < soundBars.length; index += 1) {
      if ((soundBars[index] ?? 0) > WAVEFORM_INITIAL_VALUE) {
        firstAudioBarIndex = index;
        break;
      }
    }
    const dpr = window.devicePixelRatio || 1;
    canvas.width = clientWidth * dpr;
    canvas.height = clientHeight * dpr;
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.save();
    const yOrigin = canvas.height * 0.5;
    context.translate(0, yOrigin);
    const dataPointWidth = canvas.width / soundBars.length;
    const activeColor = getComputedStyle(canvas).color || "#000";
    for (let index = 0; index < soundBars.length; index += 1) {
      let dataPoint = soundBars[index] ?? 0;
      dataPoint *= WAVEFORM_SCALE_FACTOR;
      const y = dataPoint * yOrigin;
      const x = index * dataPointWidth;
      const isSilent = firstAudioBarIndex === -1 || index < firstAudioBarIndex;
      context.globalAlpha = isSilent ? 0.35 : 1;
      context.fillStyle = activeColor;
      context.fillRect(x, -y, dataPointWidth / 2, y * 2);
    }
    context.restore();
  }, [initializeWaveformBars]);

  const startWaveformCapture = useCallback(
    (stream: MediaStream): void => {
      stopWaveformCapture();
      resetWaveformDisplay();
      initializeWaveformBars(waveformCanvasRef.current);
      drawWaveform();

      if (typeof AudioContext === "undefined") {
        return;
      }

      const audioContext = new AudioContext();
      audioContextRef.current = audioContext;
      const source = audioContext.createMediaStreamSource(stream);
      sourceRef.current = source;
      const processor = audioContext.createScriptProcessor(2048, 1, 1);
      processorRef.current = processor;
      recordingStartMsRef.current = performance.now();

      processor.onaudioprocess = (event): void => {
        const chunk = event.inputBuffer.getChannelData(0);
        for (let index = 0; index < chunk.length; index += 1) {
          const sample = Math.abs(chunk[index] ?? 0);
          chunk[index] =
            sample < WAVEFORM_INITIAL_VALUE ? WAVEFORM_INITIAL_VALUE : sample;
        }
        if (waveformBarsRef.current.length === 0) {
          initializeWaveformBars(waveformCanvasRef.current);
        }
        const pendingSamples = pendingWaveformSamplesRef.current;
        const mergedSamples = new Float32Array(
          pendingSamples.length + chunk.length,
        );
        mergedSamples.set(pendingSamples, 0);
        mergedSamples.set(chunk, pendingSamples.length);

        const barCount = waveformBarsRef.current.length;
        const samplesPerBar = samplesPerBarRef.current;
        let producedBars = false;
        let offset = 0;
        if (barCount > 0 && samplesPerBar > 0) {
          while (offset + samplesPerBar <= mergedSamples.length) {
            const end = offset + samplesPerBar;
            let sum = 0;
            for (let index = offset; index < end; index += 1) {
              sum += mergedSamples[index] ?? 0;
            }
            const avgHeight = sum / samplesPerBar;
            waveformBarsRef.current.push(avgHeight);
            if (waveformBarsRef.current.length > barCount) {
              waveformBarsRef.current.shift();
            }
            offset = end;
            producedBars = true;
          }
        }
        pendingWaveformSamplesRef.current = mergedSamples.slice(offset);
        if (producedBars) {
          drawWaveform();
        }
        if (recordingStartMsRef.current != null) {
          const elapsedSeconds = Math.max(
            0,
            Math.floor(
              (performance.now() - recordingStartMsRef.current) / 1000,
            ),
          );
          if (elapsedSeconds !== lastDurationSecondRef.current) {
            lastDurationSecondRef.current = elapsedSeconds;
            setRecordingDurationMs(elapsedSeconds * 1000);
          }
        }
      };

      source.connect(processor);
      processor.connect(audioContext.destination);
    },
    [
      drawWaveform,
      initializeWaveformBars,
      resetWaveformDisplay,
      stopWaveformCapture,
    ],
  );

  const getCurrentRecordingDurationMs = useCallback((): number => {
    if (recordingStartMsRef.current == null) {
      return recordingDurationMs;
    }
    return Math.max(0, performance.now() - recordingStartMsRef.current);
  }, [recordingDurationMs]);

  useEffect(() => {
    return (): void => {
      stopWaveformCapture();
    };
  }, [stopWaveformCapture]);

  return {
    getCurrentRecordingDurationMs,
    recordingDurationMs,
    waveformCanvasRef,
    startWaveformCapture,
    stopWaveformCapture,
    resetWaveformDisplay,
  };
}
