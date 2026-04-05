import { useEffect, useRef, useState } from "react";

import { logger } from "@/utils/logger";
import { transcribeAudio } from "@/utils/transcribe-audio";

import { MessageBus } from "../message-bus";
import { useRecordingWaveform } from "./use-recording-waveform";

export function useDictation({
  enabled,
  onTranscriptInsert,
  onTranscriptSend,
  onStartError,
  onTranscribeError,
  onUnsupported,
}: {
  enabled: boolean;
  onTranscriptInsert: (text: string) => void;
  onTranscriptSend: (text: string) => void;
  onStartError: (error: unknown) => void;
  onTranscribeError: (error: unknown) => void;
  onUnsupported: () => void;
}): {
  isDictating: boolean;
  isTranscribing: boolean;
  recordingDurationMs: number;
  waveformCanvasRef: React.RefObject<HTMLCanvasElement | null>;
  startDictation: () => Promise<void>;
  stopDictation: (action: "insert" | "send") => void;
} {
  const MIN_RECORDING_DURATION_MS = 250;
  const [isDictating, setIsDictating] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Array<Blob>>([]);
  const dictationActionRef = useRef<"insert" | "send" | null>(null);
  const handlersRef = useRef({
    onTranscriptInsert,
    onTranscriptSend,
    onStartError,
    onTranscribeError,
    onUnsupported,
  });
  const {
    getCurrentRecordingDurationMs,
    recordingDurationMs,
    waveformCanvasRef,
    startWaveformCapture,
    stopWaveformCapture,
    resetWaveformDisplay,
  } = useRecordingWaveform();
  handlersRef.current = {
    onTranscriptInsert,
    onTranscriptSend,
    onStartError,
    onTranscribeError,
    onUnsupported,
  };

  useEffect(() => {
    return (): void => {
      stopWaveformCapture();
      const recorder = mediaRecorderRef.current;
      if (recorder) {
        recorder.ondataavailable = null;
        recorder.onstop = null;
        if (recorder.state !== "inactive") {
          recorder.stop();
        }
      }
      mediaRecorderRef.current = null;

      const stream = mediaStreamRef.current;
      if (stream) {
        stream.getTracks().forEach((track) => {
          track.stop();
        });
      }
      mediaStreamRef.current = null;
      audioChunksRef.current = [];
    };
  }, [stopWaveformCapture]);

  const handleDictationStop = async (): Promise<void> => {
    const action = dictationActionRef.current ?? "insert";
    dictationActionRef.current = null;
    const effectiveDurationMs = Math.max(
      recordingDurationMs,
      getCurrentRecordingDurationMs(),
    );
    const recorder = mediaRecorderRef.current;
    const chunks = audioChunksRef.current;
    audioChunksRef.current = [];
    if (recorder) {
      recorder.ondataavailable = null;
      recorder.onstop = null;
    }
    mediaRecorderRef.current = null;
    stopWaveformCapture();

    const stream = mediaStreamRef.current;
    if (stream) {
      stream.getTracks().forEach((track) => {
        track.stop();
      });
    }
    mediaStreamRef.current = null;

    setIsDictating(false);
    resetWaveformDisplay();

    if (chunks.length === 0) {
      return;
    }

    if (effectiveDurationMs < MIN_RECORDING_DURATION_MS) {
      return;
    }

    const mimeType = recorder?.mimeType || chunks[0]?.type || "audio/webm";
    const blob = new Blob(chunks, { type: mimeType });
    setIsTranscribing(true);
    try {
      const text = await transcribeAudio(blob);
      const normalized = text.trim();
      if (normalized.length > 0) {
        if (action === "send") {
          handlersRef.current.onTranscriptSend(normalized);
        } else {
          handlersRef.current.onTranscriptInsert(normalized);
        }
      }
    } catch (error) {
      logger.error(`[Composer] dictation failed`, {
        safe: {},
        sensitive: { error: error },
      });
      handlersRef.current.onTranscribeError(error);
    } finally {
      setIsTranscribing(false);
    }
  };

  const stopDictation = (action: "insert" | "send"): void => {
    const recorder = mediaRecorderRef.current;
    dictationActionRef.current = action;
    if (!recorder) {
      void handleDictationStop();
      return;
    }
    if (recorder.state !== "inactive") {
      recorder.stop();
    } else {
      void handleDictationStop();
    }
  };

  const startDictation = async (): Promise<void> => {
    if (isDictating || isTranscribing) {
      return;
    }
    if (!enabled) {
      handlersRef.current.onUnsupported();
      return;
    }
    try {
      stopWaveformCapture();
      dictationActionRef.current = "insert";
      MessageBus.getInstance().dispatchMessage(
        "electron-request-microphone-permission",
        {},
      );
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
        },
      });
      mediaStreamRef.current = stream;
      startWaveformCapture(stream);
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];
      recorder.ondataavailable = (event: BlobEvent): void => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      recorder.onstop = (): void => {
        void handleDictationStop();
      };
      recorder.start();
      setIsDictating(true);
    } catch (error) {
      logger.error(`[Composer] unable to start dictation`, {
        safe: {},
        sensitive: {
          error: error,
        },
      });
      handlersRef.current.onStartError(error);

      const recorder = mediaRecorderRef.current;
      if (recorder) {
        recorder.ondataavailable = null;
        recorder.onstop = null;
      }
      mediaRecorderRef.current = null;
      stopWaveformCapture();
      resetWaveformDisplay();

      const stream = mediaStreamRef.current;
      if (stream) {
        stream.getTracks().forEach((track) => {
          track.stop();
        });
      }
      mediaStreamRef.current = null;
      audioChunksRef.current = [];
    }
  };

  return {
    isDictating,
    isTranscribing,
    recordingDurationMs,
    waveformCanvasRef,
    startDictation,
    stopDictation,
  };
}
