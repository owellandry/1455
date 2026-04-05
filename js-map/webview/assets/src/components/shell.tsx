import clsx from "clsx";
import { AnimatePresence, motion } from "framer-motion";
import { EMBEDDED_SHELL_LABEL_TEXT } from "protocol";
import { useCallback, useEffect, useRef, useState } from "react";
import { useIntl } from "react-intl";

import { ACCORDION_TRANSITION } from "@/utils/animations";

import CheckIcon from "../icons/check-md.svg";
import CollapseIcon from "../icons/collapse.svg";
import CopyIcon from "../icons/copy.svg";
import ExpandIcon from "../icons/expand.svg";
import FolderIcon from "../icons/folder.svg";
import { AnsiBlock } from "./ansi-block";
import { Button } from "./button";
import { CopyButton } from "./copy-button";
import { getEmbeddedShellLabel } from "./shell-label";
import { Tooltip } from "./tooltip";

export function Shell({
  shellName: shellNameOverride,
  cwd,
  command,
  output,
  isInProgress = false,
  variant = "default",
  autoScrollToBottom = false,
}: {
  shellName?: string;
  cwd?: string;
  command: string;
  output: string;
  isInProgress?: boolean;
  variant?: "default" | "embedded";
  autoScrollToBottom?: boolean;
}): React.ReactElement {
  const intl = useIntl();
  const shellName =
    shellNameOverride ??
    intl.formatMessage({
      id: "codex.shell.name",
      defaultMessage: "Shell",
      description: "Default name used for a shell output block in the UI",
    });

  const [copied, setCopied] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);
  const [expandedCommand, setExpandedCommand] = useState<string | null>(null);
  const [scrollFade, setScrollFade] = useState({
    top: false,
    bottom: false,
  });
  const hasOutput = /\S/.test(output);
  const noOutputLabel = intl.formatMessage({
    id: "codex.shell.noOutput",
    defaultMessage: "No output",
    description:
      "Placeholder shown in a shell output block when there is no stdout/stderr",
  });
  const displayCommand = normalizeShellCommand(command);
  const embeddedShellLabel = getEmbeddedShellLabel(command);
  const shouldRenderCommand = displayCommand.trim().length > 0;
  const isCommandExpanded = expandedCommand === displayCommand;
  const commandLineClassName = clsx(
    "text-size-chat-sm text-token-description-foreground whitespace-pre-wrap break-words font-vscode-editor",
    !isCommandExpanded && "line-clamp-2",
  );

  const handleCopy = useCallback((): void => {
    const text = [`$ ${command}`, output].filter(Boolean).join("\n");
    void navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }, [command, output]);
  const handleExpandCommand = (): void => {
    setExpandedCommand(displayCommand);
  };
  const handleCommandKeyDown = (
    event: React.KeyboardEvent<HTMLDivElement>,
  ): void => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      handleExpandCommand();
    }
  };

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const gradientColor = "var(--color-token-editor-background)";
  const shouldRenderFade = variant === "default";

  const updateScrollFade = useCallback(() => {
    const node = scrollRef.current;
    if (!node) {
      setScrollFade((prev) =>
        prev.top || prev.bottom ? { top: false, bottom: false } : prev,
      );
      return;
    }
    const { scrollTop, scrollHeight, clientHeight } = node;
    const epsilon = 1;
    const canScroll = scrollHeight - clientHeight > epsilon;
    const atTop = scrollTop <= epsilon;
    const atBottom = scrollTop + clientHeight >= scrollHeight - epsilon;
    const nextState = {
      top: canScroll && !atTop,
      bottom: canScroll && !atBottom,
    };
    setScrollFade((prev) =>
      prev.top === nextState.top && prev.bottom === nextState.bottom
        ? prev
        : nextState,
    );
  }, []);

  useEffect(() => {
    let raf: number | null = null;
    const scheduleUpdate = (): void => {
      raf = requestAnimationFrame(() => {
        updateScrollFade();
      });
    };

    if (!autoScrollToBottom) {
      scheduleUpdate();
      return (): void => {
        if (raf != null) {
          cancelAnimationFrame(raf);
        }
      };
    }

    const node = scrollRef.current;
    if (!node) {
      scheduleUpdate();
      return (): void => {
        if (raf != null) {
          cancelAnimationFrame(raf);
        }
      };
    }

    node.scrollTop = node.scrollHeight;
    scheduleUpdate();

    return (): void => {
      if (raf != null) {
        cancelAnimationFrame(raf);
      }
    };
  }, [autoScrollToBottom, output, updateScrollFade]);

  let outputContents: string;
  if (hasOutput) {
    outputContents = output;
  } else if (!isInProgress) {
    outputContents = noOutputLabel;
  } else {
    outputContents = "";
  }

  const outputBlock = (
    <AnsiBlock
      className={clsx(
        variant === "embedded"
          ? "text-token-description-foreground"
          : "text-token-input-placeholder-foreground opacity-80",
      )}
    >
      {outputContents}
    </AnsiBlock>
  );

  const body = (
    <div className="relative">
      {variant === "embedded" && shouldRenderCommand && (
        <div className="px-2 pt-2">
          <div className="group/command relative pr-6">
            <div
              className="cursor-pointer"
              role="button"
              tabIndex={0}
              onClick={handleExpandCommand}
              onKeyDown={handleCommandKeyDown}
            >
              <AnsiBlock className={commandLineClassName}>
                {intl.formatMessage(
                  {
                    id: "codex.shell.commandLine",
                    defaultMessage: "$ {command}",
                    description: "Command line shown above shell output",
                  },
                  { command: displayCommand },
                )}
              </AnsiBlock>
            </div>
            <CopyButton
              className="absolute top-0 right-0 opacity-0 transition-opacity duration-200 group-hover/command:opacity-100"
              iconOnly
              iconClassName="icon-2xs"
              buttonText={intl.formatMessage({
                id: "codex.shell.copyCommand",
                defaultMessage: "Copy command",
                description: "Tooltip text for copying a shell command",
              })}
              onCopy={() => {
                void navigator.clipboard.writeText(displayCommand);
              }}
            />
          </div>
        </div>
      )}
      <div className={clsx("group/output relative pr-0 min-h-[1.25rem]")}>
        <div
          ref={scrollRef}
          onScroll={updateScrollFade}
          className={clsx(
            "vertical-scroll-fade-mask [--edge-fade-distance:2rem] box-border flex flex-col gap-1.5 overflow-x-auto overflow-y-auto whitespace-pre p-2 font-vscode-editor font-medium",
            variant === "embedded"
              ? "text-size-chat-sm text-token-description-foreground max-h-[140px]"
              : "text-size-code-sm text-token-description-foreground max-h-[140px]",
          )}
        >
          {outputBlock}
        </div>
        <CopyButton
          className="absolute top-0 right-2.5 opacity-0 transition-opacity duration-200 group-hover/output:opacity-100"
          iconOnly
          iconClassName="icon-2xs"
          buttonText={intl.formatMessage({
            id: "codex.shell.copyOutput",
            defaultMessage: "Copy output",
            description: "Tooltip text for copying shell output",
          })}
          onCopy={() => {
            void navigator.clipboard.writeText(output);
          }}
        />
      </div>
      {shouldRenderFade && scrollFade.top && (
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-6"
          style={{
            backgroundImage: `linear-gradient(to bottom, ${gradientColor}, transparent)`,
          }}
        />
      )}
      {shouldRenderFade && scrollFade.bottom && (
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 h-6"
          style={{
            backgroundImage: `linear-gradient(to top, ${gradientColor}, transparent)`,
          }}
        />
      )}
    </div>
  );

  const embeddedHeader =
    variant === "embedded" ? (
      <div className="flex items-center justify-between gap-2 px-2 py-1 font-sans text-sm text-token-description-foreground select-none">
        <span>{formatEmbeddedShellLabel(embeddedShellLabel)}</span>
      </div>
    ) : null;

  return (
    <div
      className={clsx(
        "flex flex-col overflow-clip",
        variant === "default"
          ? "border-token-border rounded-lg border"
          : "rounded-none border-none",
      )}
    >
      {embeddedHeader}
      {variant === "default" && (
        <div className="flex items-center justify-between bg-token-side-bar-background pl-2 text-sm font-medium text-ellipsis hover:bg-token-editor-background/40">
          <div className="flex items-center">
            {shellName}
            {cwd && (
              <Tooltip
                tooltipContent={
                  <span className="font-mono text-xs">
                    <span className="text-token-description-foreground">
                      {intl.formatMessage({
                        id: "codex.shell.cwdLabel",
                        defaultMessage: "cwd",
                        description:
                          "Label for the current working directory shown in the shell header tooltip",
                      })}
                    </span>
                    <br />
                    <span className="font-mono">{cwd}</span>
                  </span>
                }
              >
                <Button color="ghost" size="icon" disabled>
                  <FolderIcon className="icon-xxs" />
                </Button>
              </Tooltip>
            )}
          </div>
          <div className="flex items-center">
            <Tooltip
              tooltipContent={
                copied
                  ? intl.formatMessage({
                      id: "codex.shell.copy.copiedTooltip",
                      defaultMessage: "Copied shell contents",
                      description:
                        "Tooltip shown after the user copies the combined shell command and output",
                    })
                  : intl.formatMessage({
                      id: "codex.shell.copy.copyTooltip",
                      defaultMessage: "Copy shell contents",
                      description:
                        "Tooltip for the button that copies the combined shell command and output",
                    })
              }
            >
              <Button
                className="hover:bg-transparent hover:text-token-button-foreground"
                color="ghost"
                size="icon"
                onClick={handleCopy}
              >
                {copied ? (
                  <CheckIcon className="icon-xxs" />
                ) : (
                  <CopyIcon className="icon-xxs" />
                )}
              </Button>
            </Tooltip>
            <Tooltip
              tooltipContent={
                isExpanded
                  ? intl.formatMessage({
                      id: "codex.shell.collapse",
                      defaultMessage: "Collapse shell",
                      description:
                        "Tooltip for button that collapses the shell output block",
                    })
                  : intl.formatMessage({
                      id: "codex.shell.expand",
                      defaultMessage: "Expand shell",
                      description:
                        "Tooltip for button that expands the shell output block",
                    })
              }
            >
              <Button
                color="ghost"
                size="icon"
                className="hover:bg-transparent hover:text-token-button-foreground"
                onClick={() => setIsExpanded((e) => !e)}
              >
                {isExpanded ? (
                  <CollapseIcon className="icon-2xs" />
                ) : (
                  <ExpandIcon className="icon-2xs" />
                )}
              </Button>
            </Tooltip>
          </div>
        </div>
      )}
      {variant === "default" ? (
        <AnimatePresence initial={false}>
          {isExpanded && (
            <motion.div
              key="shell-content"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={ACCORDION_TRANSITION}
              className="relative overflow-hidden"
            >
              {body}
            </motion.div>
          )}
        </AnimatePresence>
      ) : (
        <div className="relative overflow-hidden">{body}</div>
      )}
    </div>
  );
}

function normalizeShellCommand(command: string): string {
  const unwrapQuotes = (value: string): string => {
    let nextValue = value.trim();
    let changed = true;
    while (changed) {
      changed = false;
      if (nextValue.startsWith("$'") && nextValue.endsWith("'")) {
        nextValue = nextValue.slice(2, -1).replace(/\\'/g, "'");
        changed = true;
        continue;
      }
      if (
        (nextValue.startsWith("'") && nextValue.endsWith("'")) ||
        (nextValue.startsWith('"') && nextValue.endsWith('"'))
      ) {
        nextValue = nextValue
          .slice(1, -1)
          .replace(/'"'"'/g, "'")
          .replace(/\\"/g, '"');
        changed = true;
      }
    }
    return nextValue;
  };

  const normalizeQuotedCommand = (value: string): string => {
    let nextValue = value.trim().replace(/^\$\s+/, "");
    nextValue = nextValue.replace(/'"'"'/g, "'").replace(/\\'/g, "'");
    nextValue = nextValue.replace(/\\"/g, '"');
    let changed = true;
    while (changed) {
      changed = false;
      if (
        (nextValue.startsWith("'") && nextValue.endsWith("'")) ||
        (nextValue.startsWith('"') && nextValue.endsWith('"'))
      ) {
        nextValue = nextValue.slice(1, -1).trim();
        changed = true;
      }
    }
    nextValue = nextValue
      .replace(/^['"]+/, "")
      .replace(/['"]+$/, "")
      .trim();
    return nextValue;
  };
  const trimmed = unwrapQuotes(normalizeQuotedCommand(command));

  const shellMatch = trimmed.match(
    /^(?:\/bin\/zsh|\/bin\/bash|zsh|bash)\s+-lc\s+([\s\S]+)$/,
  );
  if (shellMatch) {
    const payload = shellMatch[1]?.trim() ?? "";
    return normalizeQuotedCommand(unwrapQuotes(payload));
  }

  const embeddedMatch = command.match(
    /(?:\/bin\/zsh|\/bin\/bash|zsh|bash)\s+-lc\s+([\s\S]+)$/,
  );
  if (!embeddedMatch) {
    return normalizeQuotedCommand(trimmed);
  }
  const payload = embeddedMatch[1]?.trim() ?? "";
  return normalizeQuotedCommand(unwrapQuotes(payload));
}

function formatEmbeddedShellLabel(
  label: ReturnType<typeof getEmbeddedShellLabel>,
): string {
  if (label == null) {
    return "Shell";
  }

  return EMBEDDED_SHELL_LABEL_TEXT[label];
}
