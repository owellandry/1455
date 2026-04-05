import clsx from "clsx";
import { FormattedMessage, useIntl } from "react-intl";

import { Button } from "@/components/button";
import { Spinner } from "@/components/spinner";
import { Tooltip } from "@/components/tooltip";
import ArrowUp from "@/icons/arrow-up.svg";
import MicIcon from "@/icons/mic.svg";
import StopIcon from "@/icons/stop.svg";

import { AddContextButton } from "./add-context-button";
import { formatRecordingDuration } from "./dictation-waveform";

type WaveformFooterAction = {
  ariaLabel: string;
  disabled?: boolean;
  onClick: () => void;
  tooltipContent: React.ReactNode;
};

type WaveformFooterPrimaryAction = WaveformFooterAction & {
  icon: React.ReactNode;
};

function WaveformFooter({
  recordingDurationMs,
  waveformCanvasRef,
  stopAction,
  primaryAction,
  noBottomMargin = false,
}: {
  recordingDurationMs: number;
  waveformCanvasRef: React.RefObject<HTMLCanvasElement | null>;
  stopAction: WaveformFooterAction;
  primaryAction?: WaveformFooterPrimaryAction;
  noBottomMargin?: boolean;
}): React.ReactElement {
  return (
    <div
      className={clsx(
        "composer-footer flex items-center gap-2 px-2",
        noBottomMargin ? "mb-0" : "mb-2",
      )}
    >
      <AddContextButton
        onAddImages={() => {}}
        onAddImageDataUrls={() => {}}
        getAttachmentGen={() => 0}
        fileAttachments={[]}
        setFileAttachments={() => {}}
        conversationId={null}
        isAutoContextOn={false}
        setIsAutoContextOn={() => {}}
        ideContextStatus="no-connection"
        disabled={true}
      />
      <div className="flex h-token-button-composer min-w-0 flex-1 items-center">
        <canvas
          ref={waveformCanvasRef}
          className="h-token-button-composer w-full text-token-foreground"
        />
      </div>
      <span className="text-sm text-token-foreground/70 tabular-nums">
        {formatRecordingDuration(recordingDurationMs)}
      </span>
      <Tooltip tooltipContent={stopAction.tooltipContent} sideOffset={4}>
        <Button
          size="composer"
          color="secondary"
          uniform
          aria-label={stopAction.ariaLabel}
          onClick={stopAction.onClick}
          disabled={stopAction.disabled}
        >
          <StopIcon className="icon-2xs" />
        </Button>
      </Tooltip>
      {primaryAction == null ? null : (
        <Tooltip tooltipContent={primaryAction.tooltipContent} sideOffset={4}>
          <button
            type="button"
            className={clsx(
              "bg-token-foreground focus-visible:outline-token-button-background cursor-interaction size-token-button-composer flex items-center justify-center rounded-full p-0.5 transition-opacity focus-visible:outline-2",
              primaryAction.disabled && "cursor-default opacity-50",
            )}
            aria-label={primaryAction.ariaLabel}
            onClick={primaryAction.onClick}
            disabled={primaryAction.disabled}
          >
            {primaryAction.icon}
          </button>
        </Tooltip>
      )}
    </div>
  );
}

export function DictationFooter({
  isTranscribing,
  recordingDurationMs,
  waveformCanvasRef,
  stopDictation,
  noBottomMargin = false,
}: {
  isTranscribing: boolean;
  recordingDurationMs: number;
  waveformCanvasRef: React.RefObject<HTMLCanvasElement | null>;
  stopDictation: (action: "insert" | "send") => void;
  noBottomMargin?: boolean;
}): React.ReactElement {
  const intl = useIntl();
  return (
    <WaveformFooter
      recordingDurationMs={recordingDurationMs}
      waveformCanvasRef={waveformCanvasRef}
      noBottomMargin={noBottomMargin}
      stopAction={{
        tooltipContent: (
          <FormattedMessage
            id="composer.dictation.cancel.tooltip"
            defaultMessage="Stop dictation"
            description="Tooltip for the dictation stop button"
          />
        ),
        ariaLabel: intl.formatMessage({
          id: "composer.dictation.cancel.aria",
          defaultMessage: "Stop dictation",
          description: "Aria label for the dictation stop button",
        }),
        onClick: () => stopDictation("insert"),
        disabled: isTranscribing,
      }}
      primaryAction={{
        tooltipContent: (
          <FormattedMessage
            id="composer.dictation.submit.tooltip"
            defaultMessage="Transcribe and send"
            description="Tooltip for the dictation send button"
          />
        ),
        ariaLabel: intl.formatMessage({
          id: "composer.dictation.submit.aria",
          defaultMessage: "Transcribe and send",
          description: "Aria label for the dictation send button",
        }),
        onClick: () => stopDictation("send"),
        disabled: isTranscribing,
        icon: <ArrowUp className="icon-sm text-token-dropdown-background" />,
      }}
    />
  );
}

export function RealtimeFooter({
  recordingDurationMs,
  waveformCanvasRef,
  stopRealtime,
  noBottomMargin = false,
}: {
  recordingDurationMs: number;
  waveformCanvasRef: React.RefObject<HTMLCanvasElement | null>;
  stopRealtime: () => void;
  noBottomMargin?: boolean;
}): React.ReactElement {
  const intl = useIntl();
  return (
    <WaveformFooter
      recordingDurationMs={recordingDurationMs}
      waveformCanvasRef={waveformCanvasRef}
      noBottomMargin={noBottomMargin}
      stopAction={{
        tooltipContent: (
          <FormattedMessage
            id="composer.realtime.stop.tooltip"
            defaultMessage="Stop realtime voice"
            description="Tooltip for the button that stops realtime voice mode in the composer"
          />
        ),
        ariaLabel: intl.formatMessage({
          id: "composer.realtime.stop.aria",
          defaultMessage: "Stop realtime voice",
          description:
            "Aria label for the button that stops realtime voice mode in the composer",
        }),
        onClick: stopRealtime,
      }}
      primaryAction={{
        tooltipContent: (
          <FormattedMessage
            id="composer.realtime.sendDisabled.tooltip"
            defaultMessage="Send is unavailable during realtime voice"
            description="Tooltip for the disabled send button while realtime voice mode is active"
          />
        ),
        ariaLabel: intl.formatMessage({
          id: "composer.realtime.sendDisabled.aria",
          defaultMessage: "Send unavailable during realtime voice",
          description:
            "Aria label for the disabled send button while realtime voice mode is active",
        }),
        onClick: () => {},
        disabled: true,
        icon: <ArrowUp className="icon-sm text-token-dropdown-background" />,
      }}
    />
  );
}

export function DictationButton({
  isDictationSupported,
  isTranscribing,
  disabled = false,
  shortcutLabel,
  startDictation,
}: {
  isDictationSupported: boolean;
  isTranscribing: boolean;
  disabled?: boolean;
  shortcutLabel: string | null;
  startDictation: () => Promise<void>;
}): React.ReactElement | null {
  const intl = useIntl();
  if (!isDictationSupported) {
    return null;
  }
  return (
    <Tooltip
      tooltipContent={
        <span className="text-token-foreground">
          <FormattedMessage
            id="composer.dictation.tooltip"
            defaultMessage="Click to dictate or hold"
            description="Tooltip for the dictation button"
          />
        </span>
      }
      shortcut={shortcutLabel}
      sideOffset={4}
    >
      <Button
        size="composer"
        color="ghost"
        uniform
        disabled={disabled}
        aria-label={intl.formatMessage({
          id: "composer.dictation.aria",
          defaultMessage: "Dictate",
          description: "Aria label for dictation button",
        })}
        onClick={() => {
          void startDictation();
        }}
      >
        {isTranscribing ? (
          <Spinner className="icon-xs" />
        ) : (
          <MicIcon className="icon-xs" />
        )}
      </Button>
    </Tooltip>
  );
}
