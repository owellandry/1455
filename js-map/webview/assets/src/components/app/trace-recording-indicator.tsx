import { useScope } from "maitai";
import type { TraceRecordingState } from "protocol";
import { useId, useState, type FormEvent, type ReactElement } from "react";
import { FormattedMessage, useIntl } from "react-intl";
import { useMatch } from "react-router";

import { Button } from "@/components/button";
import { Dialog } from "@/components/dialog";
import {
  DialogBody,
  DialogFooter,
  DialogHeader,
  DialogSection,
} from "@/components/dialog-layout";
import { Spinner } from "@/components/spinner";
import { toast$ } from "@/components/toaster/toast-signal";
import { messageBus, useMessage } from "@/message-bus";
import { AppScope } from "@/scopes/app-scope";
import { fetchFromVSCode } from "@/vscode-api";

export function TraceRecordingIndicator(): ReactElement | null {
  const intl = useIntl();
  const scope = useScope(AppScope);
  const noteInputId = useId();
  const [recordingState, setRecordingState] =
    useState<TraceRecordingState>("idle");
  const [isConfirmingStart, setIsConfirmingStart] = useState(false);
  const [isCancellingStart, setIsCancellingStart] = useState(false);
  const [traceRecordingNote, setTraceRecordingNote] = useState("");
  const [isSubmittingDetails, setIsSubmittingDetails] = useState(false);
  const localConversationId =
    useMatch("/local/:conversationId")?.params?.conversationId ?? null;
  const threadOverlayConversationId =
    useMatch("/thread-overlay/:conversationId")?.params?.conversationId ?? null;
  const hotkeyWindowConversationId =
    useMatch("/hotkey-window/thread/:conversationId")?.params?.conversationId ??
    null;
  const traceConversationId =
    localConversationId ??
    threadOverlayConversationId ??
    hotkeyWindowConversationId;

  useMessage("trace-recording-state-changed", (message) => {
    if (message.state === "awaiting-start-confirmation") {
      setIsConfirmingStart(false);
      setIsCancellingStart(false);
    }
    if (message.state === "awaiting-upload-details") {
      setTraceRecordingNote("");
      setIsSubmittingDetails(false);
    }
    setRecordingState(message.state);
  });
  useMessage("trace-recording-uploaded", () => {
    scope
      .get(toast$)
      .success(
        <FormattedMessage
          id="traceRecording.upload.successToast"
          defaultMessage="Profile trace sent."
          description="Success toast shown after a recorded profile trace has been sent"
        />,
      );
  });

  if (recordingState === "idle") {
    return null;
  }

  const isStartModalVisible = recordingState === "awaiting-start-confirmation";
  const isDetailsModalVisible = recordingState === "awaiting-upload-details";
  const isProgressModalVisible =
    recordingState === "saving" || recordingState === "uploading";

  const handleConfirmTraceStart = async (
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> => {
    event.preventDefault();
    setIsConfirmingStart(true);
    try {
      const response = await fetchFromVSCode("confirm-trace-recording-start");
      if (!response.success) {
        setIsConfirmingStart(false);
      }
    } catch {
      setIsConfirmingStart(false);
    }
  };

  const handleSubmitUploadDetails = async (
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> => {
    event.preventDefault();
    setIsSubmittingDetails(true);
    try {
      const response = await fetchFromVSCode("submit-trace-recording-details", {
        params: {
          note: traceRecordingNote.trim(),
          conversationId: traceConversationId,
        },
      });
      if (!response.success) {
        setIsSubmittingDetails(false);
      }
    } catch {
      setIsSubmittingDetails(false);
    }
  };

  const handleCancelTraceStart = async (): Promise<void> => {
    setIsCancellingStart(true);
    try {
      const response = await fetchFromVSCode("cancel-trace-recording-start");
      if (!response.success) {
        setIsCancellingStart(false);
      }
    } catch {
      setIsCancellingStart(false);
    }
  };

  const stopTraceRecordingLabel = intl.formatMessage({
    id: "traceRecording.stopButton.ariaLabel",
    defaultMessage: "Stop trace recording",
    description:
      "Accessible label for the floating button that stops a trace recording",
  });

  return (
    <>
      {isStartModalVisible ? (
        <Dialog
          open
          onOpenChange={(): undefined => undefined}
          shouldIgnoreClickOutside
          showDialogClose={false}
          contentProps={{
            onEscapeKeyDown: (event): void => {
              event.preventDefault();
            },
          }}
        >
          <form onSubmit={handleConfirmTraceStart}>
            <DialogBody>
              <DialogSection>
                <DialogHeader
                  title={
                    <FormattedMessage
                      id="traceRecording.startDetails.title"
                      defaultMessage="How Trace Recording Works"
                      description="Title shown before a new trace recording starts"
                    />
                  }
                  titleSize="base"
                  subtitle={
                    <FormattedMessage
                      id="traceRecording.startDetails.subtitle"
                      defaultMessage="After you click OK, reproduce the performance issue, then click the floating red indicator to stop and review the trace."
                      description="Subtitle shown before a new trace recording starts"
                    />
                  }
                  subtitleSize="sm"
                />
              </DialogSection>
              <DialogSection>
                <DialogFooter>
                  <Button
                    disabled={isConfirmingStart}
                    loading={isCancellingStart}
                    onClick={handleCancelTraceStart}
                    type="button"
                  >
                    <FormattedMessage
                      id="traceRecording.startDetails.cancel"
                      defaultMessage="Cancel"
                      description="Cancel action in the trace recording start modal"
                    />
                  </Button>
                  <Button
                    color="primary"
                    disabled={isCancellingStart}
                    loading={isConfirmingStart}
                    type="submit"
                  >
                    <FormattedMessage
                      id="traceRecording.startDetails.submit"
                      defaultMessage="OK, Start Recording"
                      description="Confirmation button that starts trace recording"
                    />
                  </Button>
                </DialogFooter>
              </DialogSection>
            </DialogBody>
          </form>
        </Dialog>
      ) : null}
      {isDetailsModalVisible ? (
        <Dialog
          open
          onOpenChange={(): undefined => undefined}
          shouldIgnoreClickOutside
          showDialogClose={false}
          contentProps={{
            onEscapeKeyDown: (event): void => {
              event.preventDefault();
            },
          }}
        >
          <form onSubmit={handleSubmitUploadDetails}>
            <DialogBody>
              <DialogSection>
                <DialogHeader
                  title={
                    <FormattedMessage
                      id="traceRecording.details.title"
                      defaultMessage="Send profile trace?"
                      description="Title shown in the trace recording details modal before a recorded profile trace upload begins"
                    />
                  }
                  titleSize="base"
                  subtitle={
                    <FormattedMessage
                      id="traceRecording.details.subtitle"
                      defaultMessage="We can send this profile trace to help diagnose performance issues."
                      description="Subtitle shown in the trace recording details modal before a recorded profile trace upload begins"
                    />
                  }
                  subtitleSize="sm"
                />
              </DialogSection>
              <DialogSection className="gap-2">
                <label
                  className="text-xs font-medium tracking-wide text-token-text-secondary uppercase"
                  htmlFor={noteInputId}
                >
                  <FormattedMessage
                    id="traceRecording.details.noteLabel"
                    defaultMessage="What were you doing when this happened? (optional)"
                    description="Label for optional freeform context input in the trace recording details modal"
                  />
                </label>
                <textarea
                  id={noteInputId}
                  className="focus-visible:ring-token-focus min-h-32 w-full resize-y rounded-md border border-token-border bg-token-input-background px-2.5 py-2 text-sm text-token-text-primary outline-none placeholder:text-token-input-placeholder-foreground focus-visible:ring-2"
                  placeholder={intl.formatMessage({
                    id: "traceRecording.details.notePlaceholder",
                    defaultMessage:
                      "Navigated to a large thread, then switched tabs repeatedly…",
                    description:
                      "Placeholder for optional freeform context input in the trace recording details modal",
                  })}
                  value={traceRecordingNote}
                  onChange={(event) => {
                    setTraceRecordingNote(event.target.value);
                  }}
                />
              </DialogSection>
              <DialogSection>
                <DialogFooter>
                  <Button
                    color="primary"
                    loading={isSubmittingDetails}
                    type="submit"
                  >
                    <FormattedMessage
                      id="traceRecording.details.submit"
                      defaultMessage="Send trace"
                      description="Submit action for the trace recording details modal"
                    />
                  </Button>
                </DialogFooter>
              </DialogSection>
            </DialogBody>
          </form>
        </Dialog>
      ) : null}
      {isProgressModalVisible ? (
        <Dialog
          open
          onOpenChange={(): undefined => undefined}
          shouldIgnoreClickOutside
          showDialogClose={false}
          contentProps={{
            onEscapeKeyDown: (event): void => {
              event.preventDefault();
            },
          }}
        >
          <DialogBody>
            <DialogSection className="items-center gap-3 text-center">
              <Spinner className="size-5 text-token-text-secondary" />
              <DialogHeader
                className="items-center gap-1"
                title={
                  recordingState === "uploading" ? (
                    <FormattedMessage
                      id="traceRecording.uploading.title"
                      defaultMessage="Uploading trace…"
                      description="Title shown in the trace recording progress modal while the saved trace is being uploaded"
                    />
                  ) : (
                    <FormattedMessage
                      id="traceRecording.saving.title"
                      defaultMessage="Saving trace…"
                      description="Title shown in the trace recording progress modal while the trace file is being saved"
                    />
                  )
                }
                titleSize="base"
                subtitle={
                  <FormattedMessage
                    id="traceRecording.progress.subtitle"
                    defaultMessage="Keep Codex open while this completes."
                    description="Subtitle shown in the trace recording progress modal while save or upload is in progress"
                  />
                }
                subtitleSize="sm"
              />
            </DialogSection>
          </DialogBody>
        </Dialog>
      ) : null}
      {recordingState !== "awaiting-start-confirmation" ? (
        <div className="fixed right-4 bottom-4 z-[80]">
          {recordingState === "recording" ? (
            <button
              type="button"
              aria-label={stopTraceRecordingLabel}
              title={stopTraceRecordingLabel}
              className="pointer-events-auto cursor-pointer rounded-full border border-token-border-default bg-token-bg-primary p-2 shadow-lg"
              onClick={() => {
                messageBus.dispatchMessage("toggle-trace-recording", {});
              }}
            >
              <span className="relative block size-3">
                <span className="absolute inset-0 animate-ping rounded-full bg-[var(--vscode-charts-red)] opacity-75" />
                <span className="relative block size-3 rounded-full bg-[var(--vscode-charts-red)]" />
              </span>
            </button>
          ) : (
            <div
              aria-hidden="true"
              className="pointer-events-none rounded-full border border-token-border-default bg-token-bg-primary p-2 shadow-lg"
            >
              <span className="relative block size-3">
                <span className="absolute inset-0 animate-ping rounded-full bg-[var(--vscode-charts-red)] opacity-75" />
                <span className="relative block size-3 rounded-full bg-[var(--vscode-charts-red)]" />
              </span>
            </div>
          )}
        </div>
      ) : null}
    </>
  );
}
