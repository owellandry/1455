import clsx from "clsx";
import { motion } from "framer-motion";
import { useState } from "react";
import { FormattedMessage, useIntl } from "react-intl";

import { Button } from "@/components/button";
import { Tooltip } from "@/components/tooltip";
import ChevronRightIcon from "@/icons/chevron-right.svg";
import StopIcon from "@/icons/stop.svg";
import TerminalIcon from "@/icons/terminal.svg";
import { ACCORDION_TRANSITION } from "@/utils/animations";

import type { BackgroundTerminal } from "./background-terminals";

export function BackgroundTerminalsPanel({
  backgroundTerminals,
  isCleaningBackgroundTerminals,
  onCleanBackgroundTerminals,
  showRoundedTop,
}: {
  backgroundTerminals: Array<BackgroundTerminal>;
  isCleaningBackgroundTerminals: boolean;
  onCleanBackgroundTerminals: () => void;
  showRoundedTop: boolean;
}): React.ReactElement | null {
  const intl = useIntl();
  const [isExpanded, setIsExpanded] = useState(false);
  if (backgroundTerminals.length === 0) {
    return null;
  }

  return (
    <div
      className={clsx(
        "bg-token-input-background/70 text-token-foreground border-token-border/80 relative overflow-clip border-x border-t backdrop-blur-sm",
        showRoundedTop && "rounded-t-2xl",
      )}
    >
      <div className="flex items-center justify-between gap-2 px-3 py-row-y">
        <div className="flex min-w-0 items-center gap-2">
          <TerminalIcon
            className="icon-2xs shrink-0 text-token-input-placeholder-foreground/70"
            aria-hidden
          />
          <span className="text-size-chat min-w-0 truncate leading-4 text-token-description-foreground">
            <FormattedMessage
              id="composer.backgroundTerminals.runningLabel"
              defaultMessage="Running {count, plural, one {# terminal} other {# terminals}}"
              description="Header label for the background terminals panel above the composer."
              values={{ count: backgroundTerminals.length }}
            />
          </span>
        </div>
        <div className="flex items-center gap-1">
          <Tooltip
            side="top"
            tooltipContent={
              <FormattedMessage
                id="composer.backgroundTerminals.stopTooltip"
                defaultMessage="Stop background terminals"
                description="Tooltip for button that stops all background terminals."
              />
            }
          >
            <Button
              size="icon"
              color="ghost"
              className="[&>svg]:icon-2xs"
              loading={isCleaningBackgroundTerminals}
              onClick={onCleanBackgroundTerminals}
              aria-label={intl.formatMessage({
                id: "composer.backgroundTerminals.stop",
                defaultMessage: "Stop",
                description:
                  "Button label to stop all running background terminals.",
              })}
            >
              <StopIcon className="icon-2xs" aria-hidden />
            </Button>
          </Tooltip>
          <Button
            size="icon"
            color="ghost"
            className="[&>svg]:icon-2xs"
            onClick={() => {
              setIsExpanded(!isExpanded);
            }}
            aria-label={intl.formatMessage(
              isExpanded
                ? {
                    id: "composer.backgroundTerminals.collapse",
                    defaultMessage: "Collapse running terminals details",
                    description:
                      "Aria label for button that collapses background terminals details panel.",
                  }
                : {
                    id: "composer.backgroundTerminals.expand",
                    defaultMessage: "Expand running terminals details",
                    description:
                      "Aria label for button that expands background terminals details panel.",
                  },
            )}
          >
            <ChevronRightIcon
              className={clsx(
                "icon-2xs text-current transition-transform duration-300",
                isExpanded && "rotate-90",
              )}
              aria-hidden
            />
          </Button>
        </div>
      </div>
      <motion.div
        initial={false}
        animate={{
          height: isExpanded ? "auto" : 0,
          opacity: isExpanded ? 1 : 0,
        }}
        transition={ACCORDION_TRANSITION}
        className={clsx(isExpanded ? "overflow-visible" : "overflow-hidden")}
        style={{ pointerEvents: isExpanded ? "auto" : "none" }}
      >
        <div className="flex flex-col gap-2 px-3 pt-0.5 pb-3">
          {backgroundTerminals.map((terminal) => (
            <BackgroundTerminalRow key={terminal.id} terminal={terminal} />
          ))}
        </div>
      </motion.div>
    </div>
  );
}

function BackgroundTerminalRow({
  terminal,
}: {
  terminal: BackgroundTerminal;
}): React.ReactElement {
  return (
    <Tooltip
      side="top"
      align="start"
      interactive={true}
      disabled={terminal.command.length === 0 && terminal.previewLine == null}
      tooltipContent={
        <div className="max-h-40 max-w-[36rem] overflow-auto font-mono text-sm leading-5">
          <div className="break-all whitespace-pre-wrap">
            {terminal.command}
          </div>
          {terminal.previewLine ? (
            <div className="mt-1 break-all whitespace-pre-wrap text-token-description-foreground">
              {terminal.previewLine}
            </div>
          ) : null}
        </div>
      }
    >
      <div className="min-w-0">
        <div className="truncate font-mono text-sm">
          <span>{terminal.command}</span>
          {terminal.previewLine ? (
            <span className="ml-1 text-token-description-foreground">
              {terminal.previewLine}
            </span>
          ) : null}
        </div>
      </div>
    </Tooltip>
  );
}
