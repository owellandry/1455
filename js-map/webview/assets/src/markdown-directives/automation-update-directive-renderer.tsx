import { useAtomValue, useSetAtom } from "jotai";
import type React from "react";
import { FormattedMessage, useIntl } from "react-intl";

import { formatScheduleSummaryForRrule } from "@/automations/automation-schedule";
import {
  automationDirectiveDialogOpenAtom,
  automationDirectiveResultAtom,
  automationDirectiveSeedAtom,
  normalizeAutomationDirectiveText,
  parseAutomationDirectiveCwds,
  parseAutomationDirectiveMode,
  parseAutomationDirectiveStatus,
  resolveAutomationDirectiveAction,
} from "@/automations/automation-shared";
import { Button } from "@/components/button";
import { useWindowType } from "@/hooks/use-window-type";
import { toSidebarTitle } from "@/local-conversation/get-local-conversation-title";
import { messageBus } from "@/message-bus";
import { useFetchFromVSCode } from "@/vscode-api";

export function AutomationUpdateDirectiveRenderer({
  id,
  mode,
  name,
  prompt,
  rrule,
  cwds,
  status,
}: {
  id?: string;
  mode?: string;
  name?: string;
  prompt?: string;
  rrule?: string;
  cwds?: unknown;
  status?: string;
}): React.ReactElement {
  const intl = useIntl();
  const windowType = useWindowType();
  const directiveResult = useAtomValue(automationDirectiveResultAtom);
  const setDirectiveSeed = useSetAtom(automationDirectiveSeedAtom);
  const setDirectiveResult = useSetAtom(automationDirectiveResultAtom);
  const setDirectiveDialogOpen = useSetAtom(automationDirectiveDialogOpenAtom);
  const trimmedName = normalizeAutomationDirectiveText(name);
  const trimmedPrompt = normalizeAutomationDirectiveText(prompt);
  const trimmedRrule = normalizeAutomationDirectiveText(rrule);
  const trimmedId = normalizeAutomationDirectiveText(id);
  const directiveMode = parseAutomationDirectiveMode(mode);
  const parsedCwds = parseAutomationDirectiveCwds(cwds);
  const resolvedStatus = parseAutomationDirectiveStatus(status);
  const directiveKey = JSON.stringify({
    id: trimmedId,
    mode: directiveMode,
    name: trimmedName,
    prompt: trimmedPrompt,
    rrule: trimmedRrule,
    cwds: parsedCwds,
    status: resolvedStatus,
  });
  const createdAutomationId =
    directiveResult?.directiveKey === directiveKey
      ? directiveResult.automationId
      : null;
  const resolvedAutomationId = createdAutomationId ?? trimmedId;
  const isViewMode = directiveMode === "view" && trimmedId != null;
  const shouldLoadTargetAutomation =
    trimmedId != null && (isViewMode || directiveMode === "suggested-update");
  const automationsQuery = useFetchFromVSCode("list-automations", {
    queryConfig: { enabled: shouldLoadTargetAutomation },
  });
  const targetAutomation =
    trimmedId != null
      ? (automationsQuery.data?.items.find((item) => item.id === trimmedId) ??
        null)
      : null;
  const { resolvedName, resolvedRrule, resolvedPromptPreview, isLoadingView } =
    resolveAutomationDirectiveView({
      isViewMode,
      trimmedId,
      trimmedName,
      trimmedPrompt,
      trimmedRrule,
      automations: automationsQuery.data?.items ?? null,
      isLoading: automationsQuery.isLoading,
    });
  const scheduleFallbackMessage = intl.formatMessage({
    id: "settings.automations.rruleSummaryFallback",
    defaultMessage: "Custom schedule",
    description: "Fallback label when RRULE summary cannot be generated",
  });
  const scheduleSummary = formatScheduleSummaryForRrule({
    rrule: resolvedRrule,
    intl,
    fallbackMessage: scheduleFallbackMessage,
  });
  const loadingLabel = (
    <FormattedMessage
      id="settings.automations.loading"
      defaultMessage="Loading…"
      description="Loading state for workflows list"
    />
  );
  const untitledLabel = (
    <FormattedMessage
      id="automation.updateDirective.untitled"
      defaultMessage="Untitled automation"
      description="Fallback title when automation name is missing"
    />
  );
  const titleContent = isLoadingView
    ? loadingLabel
    : resolvedName
      ? resolvedName
      : untitledLabel;
  const scheduleContent = scheduleSummary
    ? scheduleSummary
    : isLoadingView
      ? loadingLabel
      : scheduleFallbackMessage;

  const canCreate =
    trimmedName != null &&
    trimmedPrompt != null &&
    trimmedRrule != null &&
    parsedCwds != null;
  const canUpdate = canCreate && trimmedId != null && resolvedStatus != null;
  const isSubmitting =
    directiveMode === "suggested-update" &&
    shouldLoadTargetAutomation &&
    automationsQuery.isLoading;
  const seedDirectiveAndOpenDialog = (fallbackPath: string): void => {
    if (!canCreate) {
      return;
    }
    setDirectiveResult(null);
    setDirectiveSeed({
      directiveKey,
      mode: directiveMode,
      id: trimmedId,
      name: trimmedName ?? "",
      prompt: trimmedPrompt ?? "",
      rrule: trimmedRrule ?? "",
      cwds: parsedCwds ?? [],
      status: resolvedStatus,
    });
    setDirectiveDialogOpen(true);
    if (windowType !== "electron") {
      messageBus.dispatchHostMessage({
        type: "navigate-to-route",
        path: fallbackPath,
      });
    }
  };
  const handleCreate = (): void => {
    if (!canCreate) {
      return;
    }
    seedDirectiveAndOpenDialog("/inbox?automationMode=create");
  };
  const handleUpdate = (): void => {
    if (!canUpdate) {
      return;
    }
    if (trimmedId != null && targetAutomation != null) {
      setDirectiveResult(null);
      setDirectiveSeed({
        directiveKey,
        mode: directiveMode,
        id: trimmedId,
        name: trimmedName ?? "",
        prompt: trimmedPrompt ?? "",
        rrule: trimmedRrule ?? "",
        cwds: parsedCwds ?? [],
        status: resolvedStatus,
      });
      setDirectiveDialogOpen(false);
      messageBus.dispatchHostMessage({
        type: "navigate-to-route",
        path: `/inbox?automationId=${trimmedId}`,
      });
      return;
    }
    seedDirectiveAndOpenDialog("/inbox?automationMode=create");
  };
  const handleOpen = (): void => {
    if (isSubmitting) {
      return;
    }
    if (resolvedAutomationId != null) {
      messageBus.dispatchHostMessage({
        type: "navigate-to-route",
        path: `/inbox?automationId=${resolvedAutomationId}`,
      });
      return;
    }
    messageBus.dispatchHostMessage({
      type: "navigate-to-route",
      path: "/inbox?automationMode=create",
    });
  };
  const actionKind = resolveAutomationDirectiveAction({
    directiveMode,
    canCreate,
    canUpdate,
    isViewMode,
    forceOpen: createdAutomationId != null,
  });
  const handleBannerClick = (event: React.MouseEvent<HTMLDivElement>): void => {
    if (isSubmitting || actionKind == null) {
      return;
    }
    const target = event.target as HTMLElement | null;
    if (target?.closest("button") != null) {
      return;
    }
    if (actionKind === "create") {
      handleCreate();
      return;
    }
    if (actionKind === "update") {
      handleUpdate();
      return;
    }
    handleOpen();
  };

  return (
    <div
      className="mt-1 mb-3 flex w-full cursor-pointer items-center justify-between gap-4 rounded-xl border border-token-input-border bg-token-bg-primary px-3 py-3 select-none"
      onClick={handleBannerClick}
    >
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-sm text-token-text-tertiary">
          {scheduleContent}
        </span>
        <span className="text-base font-semibold">{titleContent}</span>
        {resolvedPromptPreview && (
          <span className="line-clamp-3 text-sm text-token-text-secondary">
            {resolvedPromptPreview}
          </span>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-2 text-sm">
        {actionKind === "create" ? (
          <Button
            color="primary"
            size="toolbar"
            disabled={!canCreate || isSubmitting}
            onClick={handleCreate}
          >
            <FormattedMessage
              id="automation.updateDirective.create"
              defaultMessage="Create"
              description="Button label to create an automation"
            />
          </Button>
        ) : null}
        {actionKind === "update" ? (
          <Button
            color="primary"
            size="toolbar"
            disabled={!canUpdate || isSubmitting}
            onClick={handleUpdate}
          >
            <FormattedMessage
              id="automation.updateDirective.update"
              defaultMessage="Update"
              description="Button label to update an automation"
            />
          </Button>
        ) : null}
        {actionKind === "open" ? (
          <Button
            color="outline"
            size="toolbar"
            disabled={isSubmitting}
            onClick={handleOpen}
          >
            <FormattedMessage
              id="automation.updateDirective.open"
              defaultMessage="Open"
              description="Button label to open automations"
            />
          </Button>
        ) : null}
      </div>
    </div>
  );
}

function resolveAutomationDirectiveView({
  isViewMode,
  trimmedId,
  trimmedName,
  trimmedPrompt,
  trimmedRrule,
  automations,
  isLoading,
}: {
  isViewMode: boolean;
  trimmedId: string | null;
  trimmedName: string | null;
  trimmedPrompt: string | null;
  trimmedRrule: string | null;
  automations: Array<{
    id: string;
    name: string;
    prompt: string;
    rrule: string | null;
  }> | null;
  isLoading: boolean;
}): {
  resolvedName: string | null;
  resolvedRrule: string | null;
  resolvedPromptPreview: string | null;
  isLoadingView: boolean;
} {
  const viewAutomation =
    isViewMode && trimmedId != null && automations
      ? (automations.find((item) => item.id === trimmedId) ?? null)
      : null;
  const resolvedName = trimmedName ?? viewAutomation?.name ?? null;
  const resolvedRrule = trimmedRrule ?? viewAutomation?.rrule ?? null;
  const resolvedPrompt = trimmedPrompt ?? viewAutomation?.prompt ?? null;
  const resolvedPromptPreview = resolvedPrompt
    ? toSidebarTitle(resolvedPrompt)
    : null;
  const isLoadingView = isViewMode && isLoading && resolvedName == null;
  return {
    resolvedName,
    resolvedRrule,
    resolvedPromptPreview,
    isLoadingView,
  };
}
