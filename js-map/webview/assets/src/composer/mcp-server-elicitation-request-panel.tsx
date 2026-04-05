import type * as AppServer from "app-server-types";
import clsx from "clsx";
import startCase from "lodash/startCase";
import type { ConversationId, McpRequestId } from "protocol";
import type {
  Dispatch,
  KeyboardEvent as ReactKeyboardEvent,
  ReactElement,
  ReactNode,
  SetStateAction,
} from "react";
import { useState } from "react";
import { FormattedMessage, useIntl } from "react-intl";

import { useAppServerManagerForConversationId } from "@/app-server/app-server-manager-hooks";
import {
  buildMcpServerElicitationResponse,
  type McpServerElicitation as McpServerElicitationData,
  type McpServerElicitation,
  type McpToolCallMeta,
  type McpToolCallPersistMode,
} from "@/app-server/mcp-server-elicitation";
import { Badge } from "@/components/badge";
import { Button } from "@/components/button";
import { Checkbox } from "@/components/checkbox";
import { ConnectorLogo } from "@/components/connector-logo";
import { BasicDropdown, Dropdown } from "@/components/dropdown";
import { focusComposerInput } from "@/composer/focus-composer";
import ChevronIcon from "@/icons/chevron.svg";
import ConnectedAppsIcon from "@/icons/connected-apps.svg";
import { useAppsListWithResolvedConnectorLogos } from "@/queries/apps-queries";

import { ToolSuggestionRequestPanel } from "./tool-suggestion-request-panel";

const MAX_COLLAPSED_TEXT_PARAM_LINES = 4;
const MAX_COLLAPSED_TEXT_PARAM_CHARS = 120;
const DEFAULT_VISIBLE_TOOL_PARAM_COUNT = 4;

export function McpServerElicitationRequestPanel({
  conversationId,
  requestId,
  elicitation,
}: {
  conversationId: ConversationId;
  requestId: McpRequestId;
  elicitation: McpServerElicitation;
}): ReactElement {
  switch (elicitation.kind) {
    case "generic":
      return (
        <McpToolCallApprovalPanel
          key={requestId}
          conversationId={conversationId}
          requestId={requestId}
          elicitation={elicitation}
        />
      );
    case "mcpToolCall":
      return (
        <McpToolCallApprovalPanel
          key={requestId}
          conversationId={conversationId}
          requestId={requestId}
          elicitation={elicitation}
        />
      );
    case "toolSuggestion":
      return (
        <ToolSuggestionRequestPanel
          conversationId={conversationId}
          requestId={requestId}
          suggestion={elicitation.suggestion}
        />
      );
  }
}

function McpServerApprovalPanel({
  conversationId,
  requestId,
  header,
  title,
  reason,
  toolParams,
  persist,
}: {
  conversationId: ConversationId;
  requestId: McpRequestId;
  header: ReactElement;
  title: ReactNode;
  reason: string | null;
  toolParams: McpToolCallMeta["tool_params"] | null;
  persist?: McpToolCallMeta["persist"];
}): ReactElement {
  const appServerManager = useAppServerManagerForConversationId(conversationId);
  const [shouldShowAllToolParams, setShouldShowAllToolParams] = useState(false);
  const [expandedToolParamKeys, setExpandedToolParamKeys] = useState<
    Record<string, boolean>
  >({});
  const persistModes = getPersistModes(persist);
  const [shouldPersist, setShouldPersist] = useState(false);
  const [selectedPersistMode, setSelectedPersistMode] =
    useState<McpToolCallPersistMode>(persistModes[0] ?? "session");
  const toolParamEntries = toolParams == null ? [] : Object.entries(toolParams);
  const persistMeta =
    shouldPersist && persistModes.length > 0
      ? { persist: selectedPersistMode }
      : null;

  const replyWithAction = (action: "accept" | "decline"): void => {
    appServerManager.replyWithMcpServerElicitationResponse(
      conversationId,
      requestId,
      buildMcpServerElicitationResponse(action, persistMeta),
    );
  };

  const handleApproveKeyDown = (
    event: ReactKeyboardEvent<HTMLButtonElement>,
  ): void => {
    if (event.key !== "Escape") {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    replyWithAction("decline");
  };

  return (
    <div className="text-size-chat flex flex-col overflow-hidden rounded-3xl border border-token-border bg-token-input-background text-token-foreground shadow-sm">
      <div className="flex flex-col gap-4 px-5 py-5">
        {header}
        <div className="flex flex-col gap-3">
          <div className="text-base">{title}</div>
          {reason != null ? (
            <div className="rounded-2xl border border-token-border/70 bg-token-editor-background/35 px-3.5 py-3">
              <div className="text-xs font-medium tracking-[0.08em] text-token-description-foreground uppercase">
                <FormattedMessage
                  id="composer.mcpToolCallApproval.reasonLabel"
                  defaultMessage="Reason"
                  description="Section label for the reason shown in MCP approval requests"
                />
              </div>
              <div className="mt-1 text-sm text-token-description-foreground">
                {reason}
              </div>
            </div>
          ) : null}
        </div>
        {toolParamEntries.length > 0 ? (
          <div className="flex flex-col">
            <ToolParamsSection
              toolParamEntries={toolParamEntries}
              shouldShowAllToolParams={shouldShowAllToolParams}
              setShouldShowAllToolParams={setShouldShowAllToolParams}
              expandedToolParamKeys={expandedToolParamKeys}
              setExpandedToolParamKeys={setExpandedToolParamKeys}
            />
          </div>
        ) : null}
      </div>
      <form
        className="flex flex-col gap-3 border-t border-token-border/70 px-5 py-3 sm:flex-row sm:items-center sm:justify-between"
        onSubmit={(event): void => {
          event.preventDefault();
          replyWithAction("accept");
          focusComposerInput();
        }}
      >
        <div className="flex items-center gap-2">
          {persistModes.length > 0 ? (
            <PersistControls
              shouldPersist={shouldPersist}
              setShouldPersist={setShouldPersist}
              persistModes={persistModes}
              selectedPersistMode={selectedPersistMode}
              setSelectedPersistMode={setSelectedPersistMode}
            />
          ) : null}
        </div>
        <div className="flex items-center justify-end gap-3 self-center">
          <Button
            color="outline"
            size="medium"
            onClick={(): void => {
              replyWithAction("decline");
            }}
          >
            <span>
              <FormattedMessage
                id="composer.mcpToolCallApproval.cancel"
                defaultMessage="Cancel"
                description="Secondary action label for declining an MCP tool call approval request"
              />
            </span>
            <span className="ml-0.5 pt-0.5 text-xs text-token-description-foreground/70">
              <FormattedMessage
                id="composer.mcpToolCallApproval.escapeKey"
                defaultMessage="ESC"
                description="Label for the escape key shown next to the cancel action in MCP approval requests"
              />
            </span>
          </Button>
          <Button
            autoFocus
            color="primary"
            size="medium"
            type="submit"
            onKeyDown={handleApproveKeyDown}
          >
            <span>
              <FormattedMessage
                id="composer.mcpToolCallApproval.approve"
                defaultMessage="Allow"
                description="Primary action label for approving an MCP tool call approval request"
              />
            </span>
            <Badge
              aria-hidden
              className="bg-token-dropdown-background/15 !px-1.5 !py-[1px] text-sm leading-none text-token-dropdown-background"
            >
              <span className="font-mono">
                {/* oxlint-disable-next-line formatjs/no-literal-string-in-jsx */}
                {"\u23CE"}
              </span>
            </Badge>
          </Button>
        </div>
      </form>
    </div>
  );
}

function McpToolCallApprovalPanel({
  conversationId,
  requestId,
  elicitation,
}: {
  conversationId: ConversationId;
  requestId: McpRequestId;
  elicitation:
    | Extract<McpServerElicitationData, { kind: "mcpToolCall" }>
    | Extract<McpServerElicitationData, { kind: "generic" }>;
}): ReactElement {
  const intl = useIntl();
  const { data: apps = [] } = useAppsListWithResolvedConnectorLogos();
  if (elicitation.kind === "generic") {
    const approvalCopy = getApprovalCopy({
      message: elicitation.message,
      metadata: elicitation.metadata,
    });
    const rawServerName = elicitation.serverName.trim();
    const serverName =
      formatConnectorNameFromId(elicitation.serverName) ??
      (rawServerName.length > 0
        ? rawServerName
        : intl.formatMessage({
            id: "composer.mcpServerElicitation.generic.serverFallbackName",
            defaultMessage: "Server",
            description:
              "Fallback name shown when an unknown MCP server elicitation does not include a usable server name",
          }));

    return (
      <McpServerApprovalPanel
        conversationId={conversationId}
        requestId={requestId}
        title={approvalCopy.title}
        reason={approvalCopy.reason}
        persist={elicitation.persist}
        toolParams={elicitation.toolParams}
        header={
          <div className="flex items-center gap-2 text-token-description-foreground">
            <ConnectedAppsIcon className="icon-sm text-token-text-secondary" />
            <span>{serverName}</span>
          </div>
        }
      />
    );
  }

  const approval = elicitation.approval;
  const fallbackConnectorName = intl.formatMessage({
    id: "composer.mcpToolCallApproval.connectorFallbackName",
    defaultMessage: "Connector",
    description:
      "Fallback connector name shown when an MCP tool call approval cannot be matched to connector metadata",
  });
  const connector =
    apps.find((app) => {
      return app.id === approval.connector_id;
    }) ?? null;
  const connectorName =
    connector?.name ?? approval.connector_name ?? fallbackConnectorName;
  const title = getFormattedToolCallApprovalTitle(
    elicitation.message,
    connectorName,
  );

  return (
    <McpServerApprovalPanel
      conversationId={conversationId}
      requestId={requestId}
      title={title}
      reason={null}
      toolParams={approval.tool_params}
      persist={approval.persist}
      header={
        <div className="flex items-center gap-2 text-token-description-foreground">
          <ConnectorLogo
            alt={intl.formatMessage(
              {
                id: "composer.mcpToolCallApproval.connectorLogoAlt",
                defaultMessage: "{name} logo",
                description:
                  "Alt text for connector logos in MCP tool call approvals",
              },
              { name: connectorName },
            )}
            className="icon-sm rounded-sm object-contain"
            logoUrl={connector?.logoUrl ?? null}
            logoDarkUrl={connector?.logoUrlDark ?? null}
            fallback={
              <ConnectedAppsIcon className="icon-sm text-token-text-secondary" />
            }
          />
          <span>{connectorName}</span>
        </div>
      }
    />
  );
}

function getFormattedToolCallApprovalTitle(
  message: string,
  connectorName: string,
): ReactNode {
  const match = /^Allow\s+(.+?)\s+to\s+run\s+tool\s+"([^"]+)"\?$/.exec(message);
  if (match == null) {
    return message;
  }

  return (
    <FormattedMessage
      id="composer.mcpToolCallApproval.formattedToolTitlePrefix"
      defaultMessage="Allow {connectorName} to run"
      description="Prefix for MCP tool call approval titles before the emphasized tool name"
      values={{ connectorName }}
    >
      {(prefix): ReactNode => {
        return (
          <>
            {prefix} <span className="font-medium">{match[2]}</span>{" "}
            <FormattedMessage
              id="composer.mcpToolCallApproval.formattedToolTitleSuffix"
              defaultMessage="tool ?"
              description="Suffix for MCP tool call approval titles after the emphasized tool name"
            />
          </>
        );
      }}
    </FormattedMessage>
  );
}

function ToolParamsSection({
  toolParamEntries,
  shouldShowAllToolParams,
  setShouldShowAllToolParams,
  expandedToolParamKeys,
  setExpandedToolParamKeys,
}: {
  toolParamEntries: Array<[string, McpToolCallMeta["tool_params"][string]]>;
  shouldShowAllToolParams: boolean;
  setShouldShowAllToolParams: (value: boolean) => void;
  expandedToolParamKeys: Record<string, boolean>;
  setExpandedToolParamKeys: Dispatch<SetStateAction<Record<string, boolean>>>;
}): ReactElement {
  const displayedToolParamEntries = shouldShowAllToolParams
    ? toolParamEntries
    : toolParamEntries.slice(0, DEFAULT_VISIBLE_TOOL_PARAM_COUNT);
  const hiddenToolParamCount =
    toolParamEntries.length - displayedToolParamEntries.length;

  return (
    <div className="flex flex-col gap-1">
      {displayedToolParamEntries.map(([key, value]) => (
        <McpToolCallParamRow
          key={key}
          toolParamKey={key}
          value={value}
          isExpanded={expandedToolParamKeys[key] === true}
          onToggle={(): void => {
            setExpandedToolParamKeys((prev) => ({
              ...prev,
              [key]: !prev[key],
            }));
          }}
        />
      ))}
      {hiddenToolParamCount > 0 ? (
        <button
          type="button"
          className="mr-0 ml-auto flex w-fit items-center gap-1 text-base text-token-description-foreground opacity-70"
          onClick={(): void => {
            setShouldShowAllToolParams(true);
          }}
        >
          <span>
            <FormattedMessage
              id="composer.mcpToolCallApproval.toolParam.more"
              defaultMessage="Show {count} more items"
              description="Button label to reveal additional MCP tool call parameters in the compact approval UI"
              values={{ count: hiddenToolParamCount }}
            />
          </span>
          <ChevronIcon className="icon-2xs" />
        </button>
      ) : shouldShowAllToolParams &&
        toolParamEntries.length > DEFAULT_VISIBLE_TOOL_PARAM_COUNT ? (
        <button
          type="button"
          className="mr-0 ml-auto flex w-fit items-center gap-1 text-base text-token-description-foreground opacity-70"
          onClick={(): void => {
            setShouldShowAllToolParams(false);
          }}
        >
          <span>
            <FormattedMessage
              id="composer.mcpToolCallApproval.toolParam.less"
              defaultMessage="Show fewer items"
              description="Button label to collapse additional MCP tool call parameters in the compact approval UI"
            />
          </span>
          <ChevronIcon className="icon-2xs rotate-180" />
        </button>
      ) : null}
    </div>
  );
}

function McpToolCallParamRow({
  toolParamKey,
  value,
  isExpanded,
  onToggle,
}: {
  toolParamKey: string;
  value: McpToolCallMeta["tool_params"][string];
  isExpanded: boolean;
  onToggle: () => void;
}): ReactElement {
  const intl = useIntl();
  const label = startCase(toolParamKey.trim());
  const display = getToolParamDisplayText(value);
  const valueContent = isExpanded ? display.expandedText : display.previewText;
  const isExpandable = display.isExpandable;

  return (
    <div className="grid gap-1 py-1 sm:grid-cols-[120px_minmax(0,1fr)] sm:gap-3">
      <div className="text-token-description-foreground">{label}</div>
      <div className="min-w-0">
        {isExpandable ? (
          <div className="flex min-w-0 flex-col items-start gap-1">
            <div className="w-full min-w-0">
              <ToolParamValueContent
                displayKind={display.kind}
                isExpandable={isExpandable}
                isExpanded={isExpanded}
                valueContent={valueContent}
              />
            </div>
            <button
              type="button"
              aria-expanded={isExpanded}
              aria-label={intl.formatMessage(
                {
                  id: "composer.mcpToolCallApproval.toolParam.toggle",
                  defaultMessage: "{action} {label}",
                  description:
                    "Accessible label for expanding or collapsing an MCP tool call parameter value",
                },
                {
                  action: isExpanded
                    ? intl.formatMessage({
                        id: "composer.mcpToolCallApproval.toolParam.collapse",
                        defaultMessage: "Collapse",
                        description:
                          "Action label for collapsing an MCP tool call parameter value",
                      })
                    : intl.formatMessage({
                        id: "composer.mcpToolCallApproval.toolParam.expand",
                        defaultMessage: "Expand",
                        description:
                          "Action label for expanding an MCP tool call parameter value",
                      }),
                  label,
                },
              )}
              className="mt-auto shrink-0 cursor-interaction self-end"
              onClick={onToggle}
            >
              <span className="flex items-center gap-1 text-base text-token-description-foreground opacity-70">
                <span>
                  {isExpanded
                    ? intl.formatMessage({
                        id: "composer.mcpToolCallApproval.toolParam.collapse.short",
                        defaultMessage: "Collapse",
                        description:
                          "Short inline label for collapsing an MCP tool call parameter value",
                      })
                    : intl.formatMessage({
                        id: "composer.mcpToolCallApproval.toolParam.expand.short",
                        defaultMessage: "Expand",
                        description:
                          "Short inline label for expanding an MCP tool call parameter value",
                      })}
                </span>
                <ChevronIcon
                  className={clsx(
                    "icon-2xs transition-transform duration-200",
                    isExpanded && "rotate-180",
                  )}
                />
              </span>
            </button>
          </div>
        ) : (
          <ToolParamValueContent
            displayKind={display.kind}
            isExpandable={isExpandable}
            isExpanded={false}
            valueContent={valueContent}
          />
        )}
      </div>
    </div>
  );
}

function ToolParamValueContent({
  displayKind,
  isExpandable,
  isExpanded,
  valueContent,
}: {
  displayKind: "json" | "text";
  isExpandable: boolean;
  isExpanded: boolean;
  valueContent: string;
}): ReactElement {
  const collapsedFadeClassName =
    !isExpanded && isExpandable
      ? "after:pointer-events-none after:absolute after:right-0 after:bottom-0 after:left-0 after:h-6 after:bg-gradient-to-b after:from-transparent after:to-token-input-background after:content-['']"
      : null;

  if (displayKind === "json") {
    return (
      <div className={clsx("relative min-w-0", collapsedFadeClassName)}>
        <div
          className={clsx(
            "min-w-0 break-words font-mono text-[12px] leading-snug",
            !isExpanded && "line-clamp-12 whitespace-pre-wrap",
            isExpanded && "whitespace-pre-wrap",
          )}
        >
          {valueContent}
        </div>
      </div>
    );
  }

  return (
    <div className={clsx("relative min-w-0", collapsedFadeClassName)}>
      <div
        className={clsx(
          "min-w-0 break-words leading-snug whitespace-pre-wrap",
          !isExpanded && isExpandable && "line-clamp-4",
        )}
      >
        {valueContent}
      </div>
    </div>
  );
}

function PersistControls({
  shouldPersist,
  setShouldPersist,
  persistModes,
  selectedPersistMode,
  setSelectedPersistMode,
}: {
  shouldPersist: boolean;
  setShouldPersist: (checked: boolean) => void;
  persistModes: Array<McpToolCallPersistMode>;
  selectedPersistMode: McpToolCallPersistMode;
  setSelectedPersistMode: (mode: McpToolCallPersistMode) => void;
}): ReactElement {
  const intl = useIntl();
  const triggerLabel =
    selectedPersistMode === "session"
      ? intl.formatMessage({
          id: "composer.mcpToolCallApproval.persist.session",
          defaultMessage: "Allow for this chat",
          description:
            "Dropdown option label for persisting MCP tool call approvals only for the current chat",
        })
      : intl.formatMessage({
          id: "composer.mcpToolCallApproval.persist.always",
          defaultMessage: "Always allow",
          description:
            "Dropdown option label for persisting MCP tool call approvals across future sessions",
        });
  const persistCheckboxLabel = intl.formatMessage({
    id: "composer.mcpToolCallApproval.persist.toggle",
    defaultMessage: "Don't ask again",
    description:
      "Checkbox label to persist the user's MCP tool call approval choice",
  });

  return (
    <div className="flex items-center gap-2">
      <div className="relative flex items-center">
        <Checkbox
          aria-label={persistCheckboxLabel}
          checked={shouldPersist}
          onCheckedChange={setShouldPersist}
        />
      </div>
      <BasicDropdown
        align="end"
        alignOffset={-16}
        contentWidth="xs"
        triggerButton={
          <button
            type="button"
            aria-label={triggerLabel}
            className={clsx(
              "text-token-description-foreground data-[state=open]:bg-transparent hover:text-token-foreground flex items-center gap-1 rounded-lg border border-transparent whitespace-nowrap",
            )}
          >
            <PersistModeLabel mode={selectedPersistMode} />
            <ChevronIcon className="icon-2xs" />
          </button>
        }
      >
        {persistModes.map((mode) => (
          <Dropdown.Item
            key={mode}
            onSelect={(): void => {
              setSelectedPersistMode(mode);
            }}
          >
            <PersistModeLabel mode={mode} />
          </Dropdown.Item>
        ))}
      </BasicDropdown>
    </div>
  );
}

function PersistModeLabel({
  mode,
}: {
  mode: McpToolCallPersistMode;
}): ReactElement {
  switch (mode) {
    case "always":
      return (
        <FormattedMessage
          id="composer.mcpToolCallApproval.persist.always"
          defaultMessage="Always allow"
          description="Dropdown option label for persisting MCP tool call approvals across future sessions"
        />
      );
    case "session":
      return (
        <FormattedMessage
          id="composer.mcpToolCallApproval.persist.session"
          defaultMessage="Allow for this chat"
          description="Dropdown option label for persisting MCP tool call approvals only for the current chat"
        />
      );
  }
}

function getPersistModes(
  persist: McpToolCallMeta["persist"],
): Array<McpToolCallPersistMode> {
  if (persist == null) {
    return [];
  }
  if (Array.isArray(persist)) {
    return Array.from(new Set(persist));
  }
  return [persist];
}

function formatConnectorNameFromId(connectorId: string): string | null {
  const trimmedConnectorId = connectorId.trim().replace(/^connector[_-]/, "");
  if (trimmedConnectorId.length === 0) {
    return null;
  }
  return startCase(trimmedConnectorId);
}

function getApprovalCopy({
  message,
  metadata,
}: {
  message: string;
  metadata: Extract<McpServerElicitationData, { kind: "generic" }>["metadata"];
}): {
  title: string;
  reason: string | null;
} {
  const metadataReason = getMetadataReason(metadata);
  const title = getApprovalTitle(message, metadataReason);
  const effectiveReason = metadataReason;
  if (effectiveReason != null && isGenericApprovalPlaceholderTitle(title)) {
    return {
      title: effectiveReason,
      reason: null,
    };
  }
  return {
    title,
    reason: effectiveReason,
  };
}

function getApprovalTitle(
  message: string,
  metadataReason: string | null,
): string {
  const trimmedMessage = message.trim();
  if (metadataReason == null) {
    return trimmedMessage;
  }
  const reasonSuffix = `Reason: ${metadataReason}`;
  if (!trimmedMessage.endsWith(reasonSuffix)) {
    return trimmedMessage;
  }
  const title = trimmedMessage.slice(0, -reasonSuffix.length).trim();
  return title.length > 0 ? title : trimmedMessage;
}

function getMetadataReason(
  metadata: AppServer.v2.McpServerElicitationRequestParams["_meta"],
): string | null {
  if (
    metadata == null ||
    Array.isArray(metadata) ||
    typeof metadata !== "object"
  ) {
    return null;
  }
  const reason = metadata.reason;
  if (typeof reason !== "string") {
    return null;
  }
  const trimmedReason = reason.trim();
  return trimmedReason.length > 0 ? trimmedReason : null;
}

function isGenericApprovalPlaceholderTitle(title: string): boolean {
  const normalizedTitle = title.trim().toLowerCase();
  return (
    normalizedTitle === "tool call needs your approval." ||
    normalizedTitle === "tool call needs your approval"
  );
}

function getToolParamDisplayText(
  value: McpToolCallMeta["tool_params"][string],
): {
  expandedText: string;
  previewText: string;
  kind: "json" | "text";
  isExpandable: boolean;
} {
  if (typeof value === "string") {
    const preview = getToolParamTextPreview(value);
    return {
      expandedText: value,
      previewText: preview.text,
      kind: "text",
      isExpandable: preview.isTruncated,
    };
  }
  if (
    typeof value === "number" ||
    typeof value === "boolean" ||
    value == null
  ) {
    const text = String(value);
    return {
      expandedText: text,
      previewText: text,
      kind: "text",
      isExpandable: false,
    };
  }
  const singleLineJson = JSON.stringify(value) ?? "";
  const preview = truncateToolParamPreview(singleLineJson);

  return {
    expandedText: JSON.stringify(value, null, 2) ?? "",
    previewText: preview.text,
    kind: "json",
    isExpandable: preview.truncated,
  };
}

function getToolParamTextPreview(value: string): {
  text: string;
  isTruncated: boolean;
} {
  return {
    text: value,
    isTruncated: shouldCollapseTextParam(value),
  };
}

function shouldCollapseTextParam(value: string): boolean {
  let lineCount = 1;
  for (const character of value) {
    if (character !== "\n") {
      continue;
    }
    lineCount += 1;
    if (lineCount > MAX_COLLAPSED_TEXT_PARAM_LINES) {
      return true;
    }
  }
  if (value.length > MAX_COLLAPSED_TEXT_PARAM_CHARS) {
    return true;
  }
  return false;
}

function truncateToolParamPreview(value: string): {
  text: string;
  truncated: boolean;
} {
  const maxPreviewLength = 48;
  if (value.length <= maxPreviewLength) {
    return {
      text: value,
      truncated: false,
    };
  }
  return {
    text: `${value.slice(0, maxPreviewLength - 1)}…`,
    truncated: true,
  };
}
