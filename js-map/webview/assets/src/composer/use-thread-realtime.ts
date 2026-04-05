import { useScope } from "maitai";
import type { ConversationId } from "protocol";
import {
  useCallback,
  useEffect,
  useEffectEvent,
  useRef,
  useState,
} from "react";
import { useIntl } from "react-intl";

import { useAppServerManagerForConversationIdOrDefault } from "@/app-server/app-server-manager-hooks";
import type {
  ThreadRealtimeNotification,
  ThreadRealtimePhase,
} from "@/app-server/app-server-manager-types";
import {
  appendThreadRealtimeAudio,
  startThreadRealtime,
  stopThreadRealtime,
} from "@/app-server/realtime/thread-realtime-requests";
import { toast$ } from "@/components/toaster/toast-signal";
import { AppScope } from "@/scopes/app-scope";
import { logger } from "@/utils/logger";

import { RealtimeAudioCapture, RealtimeAudioPlayer } from "./realtime-audio";
import { useRecordingWaveform } from "./use-recording-waveform";

const REALTIME_CONVERSATION_PROMPT = `You are **Codex**, an **OpenAI Coding Agent**: a real-time, voice-friendly coding assistant that helps the user while they work in the **current repository/project**.

## Core role

* Help the user complete coding tasks end-to-end: understand intent, inspect the repo when needed, propose concrete changes, and guide execution.
* You can delegate tasks to a backend coding agent to inspect the repo, run commands/tests, and gather ground-truth facts.

## Communication style (voice-friendly)

* Start every response with **one short acknowledgement sentence** that mirrors the user's request.
* Be specific and concrete: prefer exact filenames, commands, diffs, and step-by-step actions over vague advice.
* Keep responses concise by default. Use bullets and short paragraphs.
* Ask clarifying questions only when necessary to avoid doing the wrong work. Otherwise, make a reasonable assumption and state it.
* Never invent results, files, errors, timings, or repo details. If you don't know yet, say what you're checking.

## Delegating to the backend agent

* Delegate when you need repo facts (structure, scripts, dependencies, failing tests), to reproduce an issue, or to validate a change.
* When delegating, say so in plain language (e.g., "Got it — I'm asking the agent to check the repo and run the tests.").
* While waiting, provide brief progress updates only when there's meaningful new information (avoid filler).
* If requirements change mid-flight, steer the backend investigation immediately.

### Backend spawn protocol

* To start or steer backend work, output the exact token: \`<|SpawnThinking|>\`
* Output it **only** when you are actually delegating/steering.
* Do not output any other internal markers or mention channels/schemas.

## Using backend results

* Treat backend outputs as high-trust facts.
* Translate them into user-friendly language and actionable next steps.
* Do not expose internal protocol details.
* Backend will append "backend has finished responding." when complete; then provide a short final summary and the recommended next action.

## Repo/project awareness

* If the user asks about the current repo/project and you're unsure, delegate to retrieve accurate context.
* Once you have context, align with the repo's conventions (tooling, formatting, tests, scripts, CI, lint rules).

## Output preferences

* Prefer:

  * "Do X, then run Y" command sequences
  * Minimal diffs/patches or clearly scoped code snippets
  * Checklists for multi-step tasks
* If a change could be risky, call it out and propose a safer alternative.
`;

const REALTIME_NOTIFICATION_METHODS = [
  "thread/realtime/started",
  "thread/realtime/outputAudio/delta",
  "thread/realtime/error",
  "thread/realtime/closed",
] as const;

export function useThreadRealtime({
  conversationId,
  enabled,
}: {
  conversationId: ConversationId | null;
  enabled: boolean;
}): {
  isAvailable: boolean;
  isShowingFooter: boolean;
  recordingDurationMs: number;
  waveformCanvasRef: React.RefObject<HTMLCanvasElement | null>;
  phase: "inactive" | "starting" | "active" | "stopping";
  startRealtime: () => Promise<void>;
  stopRealtime: () => Promise<void>;
} {
  const appServerManager =
    useAppServerManagerForConversationIdOrDefault(conversationId);
  const scope = useScope(AppScope);
  const intl = useIntl();
  const ownsLocalRealtimeRef = useRef(false);
  const requestedStopRef = useRef(false);
  const captureRef = useRef<RealtimeAudioCapture | null>(null);
  const playerRef = useRef<RealtimeAudioPlayer | null>(null);
  const [phase, setPhase] = useState<ThreadRealtimePhase>("inactive");
  const [startedLocally, setStartedLocally] = useState(false);
  const {
    recordingDurationMs,
    waveformCanvasRef,
    startWaveformCapture,
    stopWaveformCapture,
    resetWaveformDisplay,
  } = useRecordingWaveform();

  const isAvailable =
    enabled &&
    conversationId != null &&
    navigator.mediaDevices?.getUserMedia != null &&
    typeof AudioContext !== "undefined";

  const stopLocalAudio = useCallback((): void => {
    captureRef.current?.stop();
    captureRef.current = null;
    playerRef.current?.stop();
    playerRef.current = null;
    stopWaveformCapture();
    resetWaveformDisplay();
  }, [resetWaveformDisplay, stopWaveformCapture]);

  const ensurePlayer = (): RealtimeAudioPlayer | null => {
    if (playerRef.current != null) {
      return playerRef.current;
    }

    try {
      playerRef.current = new RealtimeAudioPlayer();
      return playerRef.current;
    } catch (error) {
      logger.warning("[Composer] failed to start realtime speaker output", {
        safe: {},
        sensitive: { error },
      });
      return null;
    }
  };

  const startLocalAudio = useEffectEvent(async () => {
    if (
      conversationId == null ||
      captureRef.current != null ||
      !ownsLocalRealtimeRef.current
    ) {
      return;
    }

    ensurePlayer();

    try {
      captureRef.current = await RealtimeAudioCapture.start((audio) => {
        if (!ownsLocalRealtimeRef.current) {
          return;
        }
        void appendThreadRealtimeAudio({
          manager: appServerManager,
          conversationId,
          audio,
        }).catch((error) => {
          logger.warning("[Composer] failed to send realtime audio chunk", {
            safe: {},
            sensitive: { error },
          });
        });
      });
      startWaveformCapture(captureRef.current.getStream());
    } catch (error) {
      stopLocalAudio();
      ownsLocalRealtimeRef.current = false;
      setStartedLocally(false);
      requestedStopRef.current = true;
      scope.get(toast$).danger(
        intl.formatMessage({
          id: "composer.realtime.startAudioError",
          defaultMessage: "Unable to start realtime audio",
          description:
            "Toast shown when the desktop app could not start local realtime audio capture",
        }),
      );
      logger.error("[Composer] failed to start realtime audio", {
        safe: {},
        sensitive: { error },
      });
      void stopThreadRealtime({
        manager: appServerManager,
        conversationId,
      }).catch((stopError) => {
        logger.warning("[Composer] failed to stop realtime after audio error", {
          safe: {},
          sensitive: { error: stopError },
        });
      });
    }
  });

  const handleRealtimeNotification = useEffectEvent(
    (notification: ThreadRealtimeNotification): void => {
      if (conversationId == null) {
        return;
      }

      if (notification.params.threadId !== conversationId) {
        return;
      }

      switch (notification.method) {
        case "thread/realtime/started": {
          setPhase("active");
          void startLocalAudio();
          break;
        }
        case "thread/realtime/outputAudio/delta": {
          if (!ownsLocalRealtimeRef.current) {
            break;
          }
          try {
            ensurePlayer()?.enqueueChunk(notification.params.audio);
          } catch (error) {
            logger.warning("[Composer] failed to play realtime audio", {
              safe: {},
              sensitive: { error },
            });
          }
          break;
        }
        case "thread/realtime/error": {
          setPhase("inactive");
          const shouldToast = ownsLocalRealtimeRef.current;
          stopLocalAudio();
          ownsLocalRealtimeRef.current = false;
          setStartedLocally(false);
          requestedStopRef.current = false;
          if (shouldToast) {
            scope.get(toast$).danger(
              intl.formatMessage(
                {
                  id: "composer.realtime.error",
                  defaultMessage: "Realtime voice error: {message}",
                  description:
                    "Toast shown when a realtime voice session reports an error",
                },
                { message: notification.params.message },
              ),
            );
          }
          break;
        }
        case "thread/realtime/closed": {
          setPhase("inactive");
          const shouldToast =
            ownsLocalRealtimeRef.current && !requestedStopRef.current;
          stopLocalAudio();
          ownsLocalRealtimeRef.current = false;
          setStartedLocally(false);
          requestedStopRef.current = false;
          if (shouldToast && notification.params.reason != null) {
            scope.get(toast$).info(
              intl.formatMessage(
                {
                  id: "composer.realtime.closed",
                  defaultMessage: "Realtime voice mode closed: {reason}",
                  description:
                    "Toast shown when a realtime voice session closes unexpectedly",
                },
                { reason: notification.params.reason },
              ),
            );
          }
          break;
        }
      }
    },
  );

  useEffect(() => {
    if (conversationId == null || !isAvailable) {
      return;
    }
    return appServerManager.addNotificationCallback(
      REALTIME_NOTIFICATION_METHODS,
      handleRealtimeNotification,
    );
  }, [appServerManager, conversationId, isAvailable]);

  useEffect(() => {
    if (isAvailable) {
      return;
    }
    setPhase("inactive");
    stopLocalAudio();
    ownsLocalRealtimeRef.current = false;
    setStartedLocally(false);
    requestedStopRef.current = false;
  }, [isAvailable, stopLocalAudio]);

  useEffect(() => {
    if (conversationId == null) {
      return;
    }
    return (): void => {
      if (!ownsLocalRealtimeRef.current) {
        setPhase("inactive");
        stopLocalAudio();
        setStartedLocally(false);
        requestedStopRef.current = false;
        return;
      }

      stopLocalAudio();
      setPhase("inactive");
      ownsLocalRealtimeRef.current = false;
      setStartedLocally(false);
      requestedStopRef.current = true;
      void stopThreadRealtime({
        manager: appServerManager,
        conversationId,
      }).catch((error) => {
        logger.warning("[Composer] failed to stop realtime on cleanup", {
          safe: {},
          sensitive: { error },
        });
      });
    };
  }, [appServerManager, conversationId, stopLocalAudio]);

  const startRealtime = async (): Promise<void> => {
    if (!isAvailable || conversationId == null) {
      return;
    }

    ownsLocalRealtimeRef.current = true;
    setStartedLocally(true);
    setPhase("starting");
    requestedStopRef.current = false;

    try {
      await startThreadRealtime({
        manager: appServerManager,
        conversationId,
        prompt: REALTIME_CONVERSATION_PROMPT,
      });
    } catch (error) {
      setPhase("inactive");
      ownsLocalRealtimeRef.current = false;
      setStartedLocally(false);
      stopLocalAudio();
      scope.get(toast$).danger(
        intl.formatMessage({
          id: "composer.realtime.startError",
          defaultMessage: "Unable to start realtime voice",
          description:
            "Toast shown when the desktop app could not start a realtime voice session",
        }),
      );
      logger.error("[Composer] failed to start realtime voice", {
        safe: {},
        sensitive: { error },
      });
    }
  };

  const stopRealtime = async (): Promise<void> => {
    if (conversationId == null || phase === "inactive") {
      return;
    }

    setPhase("stopping");
    requestedStopRef.current = true;
    ownsLocalRealtimeRef.current = false;

    try {
      await stopThreadRealtime({
        manager: appServerManager,
        conversationId,
      });
    } catch (error) {
      setPhase("active");
      ownsLocalRealtimeRef.current = true;
      requestedStopRef.current = false;
      scope.get(toast$).danger(
        intl.formatMessage({
          id: "composer.realtime.stopError",
          defaultMessage: "Unable to stop realtime voice",
          description:
            "Toast shown when the desktop app could not stop a realtime voice session",
        }),
      );
      logger.error("[Composer] failed to stop realtime voice", {
        safe: {},
        sensitive: { error },
      });
    }
  };

  return {
    isAvailable,
    isShowingFooter: startedLocally && phase === "active",
    recordingDurationMs,
    waveformCanvasRef,
    phase,
    startRealtime,
    stopRealtime,
  };
}
