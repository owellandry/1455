import clsx from "clsx";
import { motion } from "framer-motion";
import startCase from "lodash/startCase";
import { useMemo, useState } from "react";
import { FormattedMessage, useIntl, type IntlShape } from "react-intl";

import { Button } from "@/components/button";
import { CodeSnippet } from "@/components/code-snippet";
import { Dialog } from "@/components/dialog";
import {
  DialogBody,
  DialogHeader,
  DialogSection,
} from "@/components/dialog-layout";
import { Alert } from "@/components/toaster/alert";
import { Tooltip } from "@/components/tooltip";
import ChevronRightIcon from "@/icons/chevron-right.svg";
import CodeIcon from "@/icons/code.svg";
import { ACCORDION_TRANSITION } from "@/utils/animations";
import { logger } from "@/utils/logger";

import { useMeasuredElementHeight } from "../use-measured-element-height";
import type {
  McpAnnotations,
  McpContentBlock,
  McpToolCallConversationItem,
} from "./local-conversation-item";
import {
  NON_ASSISTANT_BODY_DESCENDANTS_CLASS,
  NON_ASSISTANT_SUMMARY_LEADING_INTERACTIVE_TEXT_CLASS,
  NON_ASSISTANT_SUMMARY_TRAILING_INTERACTIVE_TEXT_CLASS,
} from "./non-assistant-tone";
import { TimelineItem } from "./timeline-item";

export function McpToolItemContent({
  item,
}: {
  item: McpToolCallConversationItem;
}): React.ReactElement {
  const [isExpanded, setIsExpanded] = useState(false);
  const { elementHeightPx: contentHeightPx, elementRef: contentRef } =
    useMeasuredElementHeight<HTMLDivElement>();
  const detailTextClassName =
    NON_ASSISTANT_SUMMARY_TRAILING_INTERACTIVE_TEXT_CLASS;
  const labelTextClassName =
    NON_ASSISTANT_SUMMARY_LEADING_INTERACTIVE_TEXT_CLASS;

  const content = item.result?.type === "success" ? item.result.content : null;
  const errorMessage = item.result?.type === "error" ? item.result.error : null;
  const toolDisplayName = formatIdentifierDisplayName(item.invocation.tool);
  const serverMcpDisplayName = formatMcpServerPhrase(item.invocation.server);

  const structuredContentJson = useMemo(() => {
    if (
      item.result?.type !== "success" ||
      item.result.structuredContent == null
    ) {
      return null;
    }
    return stringifyJsonSafe(item.result.structuredContent, 2);
  }, [item.result]);

  const rawPayloadJson = useMemo(
    () =>
      stringifyJsonSafe(
        {
          callId: item.callId,
          invocation: item.invocation,
          durationMs: item.durationMs,
          result: item.result,
        },
        2,
      ),
    [item.callId, item.invocation, item.durationMs, item.result],
  );
  const isBodyVisible = isExpanded;
  const targetHeight = isBodyVisible ? contentHeightPx : 0;

  return (
    <TimelineItem padding="offset">
      <div className="group flex flex-col">
        <div
          className="group/summary flex cursor-interaction items-center gap-1.5"
          onClick={() => {
            if (item.completed) {
              setIsExpanded((prev) => !prev);
            }
          }}
        >
          <span
            className={clsx(
              "text-size-chat flex min-w-0 items-center gap-1",
              !item.completed && "loading-shimmer-pure-text",
            )}
          >
            <span className={clsx(labelTextClassName, "flex-shrink-0")}>
              {item.completed ? (
                <FormattedMessage
                  id="codex.mcpTool.collapsedLabel.verb.called"
                  defaultMessage="Called"
                  description="Verb shown for completed MCP tool calls"
                />
              ) : (
                <FormattedMessage
                  id="codex.mcpTool.collapsedLabel.verb.calling"
                  defaultMessage="Calling"
                  description="Verb shown for in-progress MCP tool calls"
                />
              )}
            </span>
            <span className={clsx(detailTextClassName, "truncate")}>
              <FormattedMessage
                id="codex.mcpTool.collapsedLabel.details"
                defaultMessage="{tool} tool from {server}"
                description="Humanized server and tool details shown for MCP tool calls"
                values={{
                  server: serverMcpDisplayName,
                  tool: toolDisplayName,
                }}
              />
            </span>
          </span>
          {item.completed && (
            <ChevronRightIcon
              className={clsx(
                "text-token-input-placeholder-foreground icon-2xs flex-shrink-0 transition-all duration-300 opacity-0 group-hover/summary:opacity-100",
                isExpanded && "opacity-100",
                isExpanded ? "rotate-90" : "rotate-0",
              )}
            />
          )}
        </div>
        <motion.div
          initial={false}
          animate={{
            height: targetHeight,
            opacity: isBodyVisible ? 1 : 0,
          }}
          transition={ACCORDION_TRANSITION}
          className={clsx(
            isBodyVisible ? "overflow-visible" : "overflow-hidden",
          )}
          style={{ pointerEvents: isBodyVisible ? "auto" : "none" }}
        >
          <div ref={contentRef} className="flex flex-col gap-0.5 pt-1">
            {isBodyVisible ? (
              <>
                {content && content.length > 0 ? (
                  <div
                    className={clsx(
                      NON_ASSISTANT_BODY_DESCENDANTS_CLASS,
                      "flex flex-col gap-0.5",
                    )}
                  >
                    {content.map((block, index) => (
                      <ContentBlock block={block} key={index} />
                    ))}
                  </div>
                ) : errorMessage ? (
                  <Alert className="w-full" fullWidth level="danger">
                    <div className="text-size-chat max-h-48 overflow-auto whitespace-pre-wrap">
                      {errorMessage}
                    </div>
                  </Alert>
                ) : (
                  <p className="text-token-description-foreground/80">
                    <FormattedMessage
                      id="codex.mcpTool.noResult"
                      defaultMessage="Tool returned no content"
                      description="Message shown when an MCP tool call produced no content"
                    />
                  </p>
                )}

                {structuredContentJson && (
                  <CodeSnippet
                    codeContainerClassName="max-h-48 overflow-auto"
                    language="json"
                    content={structuredContentJson}
                    showStickyRightContent={false}
                  />
                )}
                <Dialog
                  triggerContent={
                    <Tooltip
                      side="top"
                      align="center"
                      tooltipContent={
                        <FormattedMessage
                          id="codex.mcpTool.rawOutputTriggerTooltip"
                          defaultMessage="Show raw tool call output"
                          description="Tooltip for the button that opens the raw MCP tool output dialog"
                        />
                      }
                    >
                      <div className="inline-flex w-fit">
                        <Button
                          color="ghost"
                          size="icon"
                          className="cursor-interaction opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100 focus-visible:opacity-100"
                        >
                          <CodeIcon className="icon-xxs" />
                        </Button>
                      </div>
                    </Tooltip>
                  }
                >
                  <DialogBody>
                    <DialogSection>
                      <DialogHeader
                        title={
                          <FormattedMessage
                            id="codex.mcpTool.rawOutputHeading"
                            defaultMessage="Raw {server}.{tool} tool call output"
                            description="Heading shown within the raw output dialog"
                            values={{
                              server: item.invocation.server,
                              tool: item.invocation.tool,
                            }}
                          />
                        }
                      />
                    </DialogSection>
                    <DialogSection>
                      <CodeSnippet
                        codeContainerClassName="max-h-128 overflow-auto"
                        language="json"
                        content={rawPayloadJson}
                        showStickyRightContent
                      />
                    </DialogSection>
                  </DialogBody>
                </Dialog>
              </>
            ) : null}
          </div>
        </motion.div>
      </div>
    </TimelineItem>
  );
}

function formatMcpServerPhrase(serverName: string): string {
  const normalizedServerName = serverName.trim();
  if (normalizedServerName.length === 0) {
    return "MCP";
  }
  return `${formatIdentifierDisplayName(normalizedServerName)} MCP`;
}

function formatIdentifierDisplayName(identifier: string): string {
  const trimmedIdentifier = identifier.trim();
  if (trimmedIdentifier.length === 0) {
    return "";
  }
  return startCase(trimmedIdentifier);
}

function stringifyJsonSafe(value: unknown, space?: number): string {
  try {
    return (
      JSON.stringify(
        value,
        (_k, v) => (typeof v === "bigint" ? v.toString() : v),
        space,
      ) ?? "null"
    );
  } catch {
    logger.debug("Failed to stringify MCP tool call payload", {
      safe: { value },
      sensitive: {},
    });
    return "";
  }
}

function ContentBlock({
  block,
}: {
  block: McpContentBlock;
}): React.ReactElement {
  const intl = useIntl();

  switch (block.type) {
    case "image": {
      const annotationsText = formatAnnotations(block.annotations, intl);
      const image = (
        <img
          className="max-h-48 w-max max-w-full gap-0.5 rounded-md object-contain"
          src={`data:${block.mimeType};base64,${block.data}`}
        />
      );
      if (annotationsText == null) {
        return image;
      }
      return (
        <div className="flex flex-col gap-0.5">
          {image}
          <p className="text-size-chat whitespace-pre-wrap text-token-description-foreground/80">
            {annotationsText}
          </p>
        </div>
      );
    }

    case "audio": {
      const annotationsText = formatAnnotations(block.annotations, intl);
      return (
        <div className="flex flex-col gap-0.5">
          <audio
            className="w-full gap-0.5"
            controls
            src={`data:${block.mimeType};base64,${block.data}`}
            preload="metadata"
          />
          {annotationsText != null ? (
            <p className="text-size-chat whitespace-pre-wrap text-token-description-foreground/80">
              {annotationsText}
            </p>
          ) : null}
        </div>
      );
    }

    case "resource_link": {
      const annotationsText = formatAnnotations(block.annotations, intl);
      const resourceLinkName = block.title ?? block.name ?? block.uri;
      return (
        <div className="text-size-chat flex flex-col gap-0.5">
          <div className="break-words text-token-description-foreground/80">
            <FormattedMessage
              id="codex.mcpTool.resourceLink.reading"
              defaultMessage="Read {resourceLinkName}"
              description="Summary shown for MCP resource link content blocks"
              values={{
                resourceLinkName,
              }}
            />
          </div>
          {annotationsText != null ? (
            <div className="break-words whitespace-pre-wrap text-token-description-foreground/80">
              {annotationsText}
            </div>
          ) : null}
        </div>
      );
    }

    case "embedded_resource": {
      const resourceContent = block.resource.text ?? block.resource.blob ?? "";
      const hasContent = resourceContent !== "";
      const annotationsValue = formatAnnotationsValue(
        block.resource.annotations,
      );
      return (
        <div className="text-size-chat flex flex-col gap-0.5 text-token-description-foreground/80">
          <div className="flex gap-1">
            <span className="font-medium text-token-foreground">
              <FormattedMessage
                id="codex.mcpTool.embeddedResource.uriLabel"
                defaultMessage="URI"
                description="Label for the URI of an embedded resource"
              />
            </span>
            <span className="break-all">{block.resource.uri}</span>
          </div>
          {block.resource.mimeType != null ? (
            <div className="flex gap-1">
              <span className="font-medium text-token-foreground">
                <FormattedMessage
                  id="codex.mcpTool.embeddedResource.mimeTypeLabel"
                  defaultMessage="MIME type"
                  description="Label for the MIME type of an embedded resource"
                />
              </span>
              <span className="break-all">{block.resource.mimeType}</span>
            </div>
          ) : null}
          {annotationsValue != null ? (
            <div className="flex gap-1">
              <span className="font-medium text-token-foreground">
                <FormattedMessage
                  id="codex.mcpTool.embeddedResource.annotationsLabel"
                  defaultMessage="Annotations"
                  description="Label for annotations shown with an embedded resource"
                />
              </span>
              <span className="break-all">{annotationsValue}</span>
            </div>
          ) : null}
          {hasContent ? (
            <div className="flex flex-col gap-0.5">
              <span className="font-medium text-token-foreground">
                <FormattedMessage
                  id="codex.mcpTool.embeddedResource.contentLabel"
                  defaultMessage="Content"
                  description="Label for the content of an embedded resource"
                />
              </span>
              <pre className="max-h-48 overflow-auto rounded-md bg-token-input-background px-3 py-2 whitespace-pre-wrap text-token-description-foreground/80">
                {resourceContent}
              </pre>
            </div>
          ) : null}
        </div>
      );
    }

    case "unknown":
      return (
        <pre
          className={clsx(
            NON_ASSISTANT_BODY_DESCENDANTS_CLASS,
            "bg-token-input-background text-token-description-foreground/80 max-h-48 overflow-auto whitespace-pre-wrap rounded-md px-3 py-2 text-size-chat",
          )}
        >
          {stringifyJsonSafe(block.raw, 2)}
        </pre>
      );

    case "text": {
      const text = joinTextBlockParts([
        block.text,
        formatAnnotations(block.annotations, intl),
      ]);

      return (
        <div className="relative overflow-clip rounded-lg border border-token-input-background bg-token-text-code-block-background contain-inline-size">
          <div className="sticky top-0 z-10 flex items-center justify-between py-1 ps-2 pe-2 font-sans text-sm text-token-description-foreground select-none">
            <div className="min-w-0 truncate">
              <FormattedMessage
                id="codex.mcpTool.textBlock.plaintextTitle"
                defaultMessage="plaintext"
                description="Title shown for MCP text content blocks rendered in a code-style container"
              />
            </div>
            <div className="flex items-center" />
          </div>
          <div className="max-h-48 overflow-y-auto p-2">
            <pre
              className={clsx(
                NON_ASSISTANT_BODY_DESCENDANTS_CLASS,
                "text-token-description-foreground/80 m-0 whitespace-pre-wrap break-words font-sans text-size-chat leading-relaxed extension:leading-normal",
              )}
            >
              {text}
            </pre>
          </div>
        </div>
      );
    }
  }
}

function formatAnnotations(
  annotations: McpAnnotations | undefined,
  intl: IntlShape,
): string | null {
  const annotationsValue = formatAnnotationsValue(annotations);
  if (annotationsValue == null) {
    return null;
  }

  return intl.formatMessage(
    {
      id: "codex.mcpTool.contentBlock.annotationsLine",
      defaultMessage: "Annotations: {annotations}",
      description: "Line showing MCP content block annotations in text output",
    },
    { annotations: annotationsValue },
  );
}

function formatAnnotationsValue(
  annotations: McpAnnotations | undefined,
): string | null {
  if (annotations == null) {
    return null;
  }

  const parts = Array<string>();
  if (annotations.audience != null && annotations.audience.length > 0) {
    parts.push(`audience=${annotations.audience.join(", ")}`);
  }
  if (annotations.priority != null) {
    parts.push(`priority=${String(annotations.priority)}`);
  }
  if (annotations.lastModified != null) {
    parts.push(`lastModified=${annotations.lastModified}`);
  }

  if (parts.length === 0) {
    return null;
  }

  return parts.join("; ");
}

function joinTextBlockParts(parts: Array<string | null>): string {
  return parts.filter((part): part is string => part != null).join("\n");
}
