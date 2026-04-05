import { useQueryClient } from "@tanstack/react-query";
import clsx from "clsx";
import { useAtomValue, useSetAtom } from "jotai";
import { useScope } from "maitai";
import {
  createConversationId,
  isHeartbeatAutomation,
  type InboxItem,
  type AutomationCreateInput as ProtocolAutomationCreateInput,
  type AutomationUpdateInput as ProtocolAutomationUpdateInput,
  formatWorkspaceRootLabel,
  getAutomationModelDetails,
  getAutomationReasoningEffort,
  type Automation,
} from "protocol";
import {
  type ComponentType,
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type ReactElement,
  type ReactNode,
} from "react";
import { FormattedMessage, useIntl, type IntlShape } from "react-intl";
import { useSearchParams } from "react-router";

import {
  useConversationsMeta,
  useDefaultAppServerManager,
} from "@/app-server/app-server-manager-hooks";
import { getDefaultAutomationModelSettings } from "@/automations/automation-model-settings";
import {
  EMPTY_AUTOMATION_DRAFT,
  applyAutomationDraftModelDefaults,
  applyAutomationTemplateToDraft,
  automationDirectiveDialogOpenAtom,
  automationDirectiveResultAtom,
  automationDirectiveSeedAtom,
  buildAutomationDraft,
  buildAutomationDraftFromDirectiveSeed,
  getDraftForAutomationKind,
  getAutomationDraftSaveState,
  isAutomationDraftUninitialized,
  resolveAutomationDraftRrule,
  type AutomationDraft,
} from "@/automations/automation-shared";
import { getAutomationSubmitTooltipContent } from "@/automations/automation-submit-tooltip";
import { useHeartbeatAutomationThreadOptions } from "@/automations/heartbeat-thread-options";
import { useRegisterCommand } from "@/commands/use-register-command";
import { AnimatedIcon } from "@/components/animated-icon";
import { AppHeader } from "@/components/app/app-header";
import { Badge } from "@/components/badge";
import { Button } from "@/components/button";
import { Dialog } from "@/components/dialog";
import {
  DIALOG_FOOTER_COMPACT,
  DialogBody,
  DialogFooter,
  DialogHeader,
  DialogSection,
} from "@/components/dialog-layout";
import { Spinner } from "@/components/spinner";
import { toast$ } from "@/components/toaster/toast-signal";
import { Tooltip } from "@/components/tooltip";
import { CODEX_APP_AUTOMATIONS_URL } from "@/constants/links";
import { useWindowType } from "@/hooks/use-window-type";
import ChevronRightIcon from "@/icons/chevron-right.svg";
import ClockIcon from "@/icons/clock.svg";
import CubeIcon from "@/icons/cube.svg";
import FolderIcon from "@/icons/folder.svg";
import InfoIcon from "@/icons/info.svg";
import LaptopIcon from "@/icons/laptop.svg";
import PauseCircleIcon from "@/icons/pause-circle.svg";
import PinIcon from "@/icons/pin.svg";
import PlayCircleIcon from "@/icons/play-circle.svg";
import PlayOutlineIcon from "@/icons/play-outline.svg";
import PlusIcon from "@/icons/plus.svg";
import ReasoningMediumIcon from "@/icons/reasoning-medium.svg";
import TrashIcon from "@/icons/trash.svg";
import {
  AutomationEmptyStatePrompts,
  AutomationEmptyStateTitle,
} from "@/inbox/automation-empty-state-prompts";
import { InboxRow } from "@/inbox/inbox-row";
import { isInboxArchived } from "@/inbox/inbox-status";
import { useInboxItems } from "@/inbox/use-inbox-items";
import { getLocalConversationTitle } from "@/local-conversation/get-local-conversation-title";
import { productEventLogger$ } from "@/product-event-signal";
import { useUserConfig } from "@/queries/config-queries";
import { useListModels } from "@/queries/model-queries";
import { AppScope } from "@/scopes/app-scope";
import {
  AutomationCreateFlow,
  AutomationExtraControlsDropdown,
  AutomationForm,
  AutomationKindDropdown,
  AutomationModelDropdown,
  AutomationReasoningEffortDropdown,
  AutomationSandboxTooltipButton,
  AutomationTitleInput,
  ExecutionEnvironmentDropdown,
  HeartbeatThreadDropdown,
  ProjectDropdown,
  ScheduleSummaryPopoverTrigger,
  AutomationDialogShell,
} from "@/settings/settings-content/automation-dialog";
import { useWorkspaceGroups } from "@/sidebar/use-repository-task-groups";
import { useGate } from "@/statsig/statsig";
import { QUERY_STALE_TIME } from "@/utils/query-stale-times";
import { useDebouncedValue } from "@/utils/use-debounced-value";
import { useNavigateToLocalConversation } from "@/utils/use-navigate-to-local-conversation";
import {
  getQueryKey,
  useFetchFromVSCode,
  useMutationFromVSCode,
} from "@/vscode-api";

import { buildAutomationRowSummaries } from "./automation-row-summary";
import { AutomationsOverview } from "./automations-overview";

type AutomationEditorLayout = "create" | "detail";

type AutomationUpdateMutationVariables = ProtocolAutomationUpdateInput;
type AutomationUpdateInput = ProtocolAutomationUpdateInput;

type AutomationUpdateContext = {
  previousAutomations?: {
    items: Array<Automation>;
  };
  previousDraftStatus: AutomationDraft["status"] | null;
};

const AUTOMATION_FORM_ID = "automation-form";

export function InboxLayoutPage(): ReactElement {
  const windowType = useWindowType();
  const { data: automationsData, isLoading: isAutomationsLoading } =
    useFetchFromVSCode("list-automations", {
      queryConfig: {
        enabled: windowType === "electron",
        intervalMs: QUERY_STALE_TIME.ONE_MINUTE,
        staleTime: QUERY_STALE_TIME.FIVE_SECONDS,
      },
    });

  return (
    <AutomationsPage
      automations={automationsData?.items ?? []}
      isAutomationsLoading={isAutomationsLoading}
    />
  );
}

function AutomationsPage({
  automations,
  isAutomationsLoading,
}: {
  automations: Array<Automation>;
  isAutomationsLoading: boolean;
}): ReactElement {
  const intl = useIntl();
  const scope = useScope(AppScope);
  const queryClient = useQueryClient();
  const appServerManager = useDefaultAppServerManager();
  const [searchParams, setSearchParams] = useSearchParams();
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [isSavePending, setIsSavePending] = useState(false);
  const lastFailedDetailPageAutoSaveRef = useRef<AutomationUpdateInput | null>(
    null,
  );
  const [automationDraft, setAutomationDraft] = useState<AutomationDraft>(
    () => EMPTY_AUTOMATION_DRAFT,
  );
  const modalAutomationId = searchParams.get("automationId");
  const modalMode = searchParams.get("automationMode");
  const isCreateAutomationModalOpen = modalMode === "create";
  const selectedAutomation =
    modalAutomationId != null
      ? (automations.find((item) => item.id === modalAutomationId) ?? null)
      : null;
  const automationDirectiveSeed = useAtomValue(automationDirectiveSeedAtom);
  const setAutomationDirectiveSeed = useSetAtom(automationDirectiveSeedAtom);
  const setAutomationDirectiveDialogOpen = useSetAtom(
    automationDirectiveDialogOpenAtom,
  );
  const setAutomationDirectiveResult = useSetAtom(
    automationDirectiveResultAtom,
  );
  const { data: listModelsData } = useListModels();
  const modelsByType = listModelsData?.modelsByType;
  const defaultAutomationModelSettings =
    getDefaultAutomationModelSettings(modelsByType);
  const directiveSeed =
    automationDirectiveSeed != null &&
    ((modalMode === "create" && selectedAutomation == null) ||
      (selectedAutomation != null &&
        automationDirectiveSeed.id === selectedAutomation.id))
      ? automationDirectiveSeed
      : null;
  const directiveSeedDraft =
    directiveSeed != null && isAutomationDraftUninitialized(automationDraft)
      ? buildAutomationDraftFromDirectiveSeed({
          seed: directiveSeed,
          targetAutomation: selectedAutomation,
          modelsByType,
        })
      : null;
  const activeAutomationDraft = applyAutomationDraftModelDefaults({
    draft:
      directiveSeedDraft ??
      (selectedAutomation != null &&
      automationDraft.id !== selectedAutomation.id
        ? buildAutomationDraft(selectedAutomation, modelsByType)
        : automationDraft),
    modelSettings: defaultAutomationModelSettings,
  });
  const setActiveAutomationDraft = (
    next: AutomationDraft | ((prev: AutomationDraft) => AutomationDraft),
  ): void => {
    setAutomationDraft((prev): AutomationDraft => {
      const base = applyAutomationDraftModelDefaults({
        draft:
          selectedAutomation != null && prev.id !== selectedAutomation.id
            ? buildAutomationDraft(selectedAutomation, modelsByType)
            : directiveSeed != null && isAutomationDraftUninitialized(prev)
              ? buildAutomationDraftFromDirectiveSeed({
                  seed: directiveSeed,
                  targetAutomation: selectedAutomation,
                  modelsByType,
                })
              : prev,
        modelSettings: defaultAutomationModelSettings,
      });
      if (typeof next === "function") {
        return next(base);
      }
      return next;
    });
  };
  const { data: workspaceRoots } = useFetchFromVSCode("workspace-root-options");
  const { data: conversations } = useConversationsMeta();
  const threadLabelById = new Map(
    (conversations ?? []).map((conversation) => [
      String(conversation.id),
      getLocalConversationTitle(conversation) ?? String(conversation.id),
    ]),
  );
  const roots = workspaceRoots?.roots ?? [];
  const workspaceGroups = useWorkspaceGroups();
  const formatRootLabel = (root: string): string => {
    return formatWorkspaceRootLabel({
      root,
      labels: workspaceRoots?.labels ?? {},
    });
  };
  const automationRowSummaries = buildAutomationRowSummaries({
    automations,
    intl,
    formatRootLabel,
    threadLabelById,
  });
  const isNewAutomationDisabled =
    workspaceRoots != null && workspaceRoots.roots.length === 0;
  const sortedAutomations = [...automations].sort((first, second) => {
    const firstNextRun = first.nextRunAt ?? Number.POSITIVE_INFINITY;
    const secondNextRun = second.nextRunAt ?? Number.POSITIVE_INFINITY;
    if (firstNextRun !== secondNextRun) {
      return firstNextRun - secondNextRun;
    }
    return first.name.localeCompare(second.name);
  });
  const {
    trimmedName,
    trimmedPrompt,
    canSave: canSaveAutomation,
  } = getAutomationDraftSaveState(activeAutomationDraft);
  const canSaveResolved =
    canSaveAutomation &&
    !(
      modalAutomationId != null &&
      selectedAutomation == null &&
      isAutomationsLoading
    );
  const resolvedRrule = resolveAutomationDraftRrule(activeAutomationDraft);
  const isAutomationDetailPageOpen =
    modalAutomationId != null && selectedAutomation != null;
  const isAutomationDetailMissing =
    modalAutomationId != null &&
    selectedAutomation == null &&
    !isAutomationsLoading;
  const detailPageUpdate =
    isAutomationDetailPageOpen &&
    canSaveAutomation &&
    resolvedRrule != null &&
    activeAutomationDraft.status !== "DELETED"
      ? buildAutomationUpdateFromDraft(
          activeAutomationDraft,
          trimmedName,
          trimmedPrompt,
          activeAutomationDraft.status,
          resolvedRrule,
        )
      : null;
  const debouncedDetailPageUpdateKey = useDebouncedValue(detailPageUpdate, 600);
  const hasFailedDetailPageAutoSave = areAutomationUpdatesEqual(
    lastFailedDetailPageAutoSaveRef.current,
    detailPageUpdate,
  );
  const hasPendingDetailPageChanges =
    detailPageUpdate != null &&
    selectedAutomation != null &&
    !doesAutomationMatchUpdate(selectedAutomation, detailPageUpdate);

  const clearAutomationDirectiveState = (): void => {
    setAutomationDirectiveSeed(null);
    setAutomationDirectiveDialogOpen(false);
  };

  const setAutomationRoute = ({
    automationId,
    automationMode,
    replace = false,
  }: {
    automationId?: string | null;
    automationMode?: "create" | null;
    replace?: boolean;
  }): void => {
    const next = new URLSearchParams(searchParams);
    if (automationId == null) {
      next.delete("automationId");
    } else {
      next.set("automationId", automationId);
    }
    if (automationMode == null) {
      next.delete("automationMode");
    } else {
      next.set("automationMode", automationMode);
    }
    if (replace) {
      setSearchParams(next, { replace: true });
      return;
    }
    setSearchParams(next);
  };

  const resetAutomationDraft = (): void => {
    setAutomationDraft(EMPTY_AUTOMATION_DRAFT);
    setIsSavePending(false);
  };

  const openCreateAutomationDialog = (): void => {
    resetAutomationDraft();
    clearAutomationDirectiveState();
    setAutomationRoute({ automationMode: "create" });
  };

  const openCreateAutomationWithDraft = ({
    name,
    prompt,
    scheduleConfig,
  }: {
    name: string;
    prompt: string;
    scheduleConfig: AutomationDraft["scheduleConfig"];
  }): void => {
    setActiveAutomationDraft(
      applyAutomationTemplateToDraft(EMPTY_AUTOMATION_DRAFT, {
        name,
        prompt,
        scheduleConfig,
      }),
    );
    clearAutomationDirectiveState();
    setAutomationRoute({ automationMode: "create" });
  };

  const openAutomationDetailPage = (automation: Automation): void => {
    setActiveAutomationDraft(buildAutomationDraft(automation, modelsByType));
    clearAutomationDirectiveState();
    setAutomationRoute({ automationId: automation.id });
  };

  const openDeleteAutomationConfirm = (automation: Automation): void => {
    setActiveAutomationDraft(buildAutomationDraft(automation, modelsByType));
    clearAutomationDirectiveState();
    setIsDeleteConfirmOpen(true);
  };

  const closeAutomationView = (): void => {
    clearAutomationDirectiveState();
    setAutomationRoute({ replace: true });
    resetAutomationDraft();
  };

  const invalidateAutomations = (): void => {
    void queryClient.invalidateQueries({
      queryKey: getQueryKey("list-automations"),
    });
  };

  const createAutomation = useMutationFromVSCode("automation-create", {
    onSuccess: (data): void => {
      invalidateAutomations();
      if (directiveSeed != null) {
        setAutomationDirectiveResult({
          directiveKey: directiveSeed.directiveKey,
          automationId: data.item.id,
        });
      }
      closeAutomationView();
      scope.get(productEventLogger$).log({
        eventName: "codex_automation_created",
      });
    },
    onError: (error): void => {
      scope.get(toast$).danger(
        intl.formatMessage({
          id: "inbox.automations.createError",
          defaultMessage: "Could not create automation",
          description: "Toast title when creating an automation fails",
        }),
        { description: error.message },
      );
    },
  });

  const updateAutomation = useMutationFromVSCode("automation-update", {
    onMutate: (nextAutomation) => {
      const queryKey = getQueryKey("list-automations");
      const previousAutomations = queryClient.getQueryData<{
        items: Array<Automation>;
      }>(queryKey);
      const previousDraftStatus =
        activeAutomationDraft.id === nextAutomation.id
          ? activeAutomationDraft.status
          : null;

      queryClient.setQueryData<{ items: Array<Automation> }>(
        queryKey,
        (current) => {
          if (current == null) {
            return current;
          }
          return {
            items: current.items.map((automation) =>
              automation.id === nextAutomation.id
                ? {
                    ...automation,
                    ...nextAutomation,
                    nextRunAt:
                      nextAutomation.status === "PAUSED"
                        ? null
                        : automation.nextRunAt,
                  }
                : automation,
            ),
          };
        },
      );

      return {
        previousAutomations,
        previousDraftStatus,
      };
    },
    onSuccess: (data): void => {
      lastFailedDetailPageAutoSaveRef.current = null;
      queryClient.setQueryData<{ items: Array<Automation> }>(
        getQueryKey("list-automations"),
        (current) => {
          if (current == null) {
            return current;
          }
          return {
            items: current.items.map((automation) =>
              automation.id === data.item.id ? data.item : automation,
            ),
          };
        },
      );
      invalidateAutomations();
      setIsSavePending(false);
      scope.get(productEventLogger$).log({
        eventName: "codex_automation_updated",
      });
    },
    onError: (error, nextAutomation, onMutateResult): void => {
      const mutationContext = parseAutomationUpdateContext(onMutateResult);
      lastFailedDetailPageAutoSaveRef.current =
        getAutomationUpdateInput(nextAutomation);
      const previousDraftStatus = mutationContext?.previousDraftStatus;
      if (mutationContext?.previousAutomations != null) {
        queryClient.setQueryData(
          getQueryKey("list-automations"),
          mutationContext.previousAutomations,
        );
      }
      if (
        previousDraftStatus != null &&
        activeAutomationDraft.id === nextAutomation.id
      ) {
        setActiveAutomationDraft(
          (prev): AutomationDraft => ({
            ...prev,
            status: previousDraftStatus,
          }),
        );
      }
      setIsSavePending(false);
      scope.get(toast$).danger(
        intl.formatMessage({
          id: "inbox.automations.updateError",
          defaultMessage: "Could not update automation",
          description: "Toast title when updating an automation fails",
        }),
        { description: error.message },
      );
    },
  });

  const deleteAutomation = useMutationFromVSCode("automation-delete", {
    onSuccess: (): void => {
      invalidateAutomations();
      setIsDeleteConfirmOpen(false);
      closeAutomationView();
    },
    onError: (error): void => {
      setIsDeleteConfirmOpen(false);
      scope.get(toast$).danger(
        intl.formatMessage({
          id: "inbox.automations.deleteError",
          defaultMessage: "Could not delete automation",
          description: "Toast title when deleting an automation fails",
        }),
        { description: error.message },
      );
    },
  });

  const runAutomationNow = useMutationFromVSCode("automation-run-now", {
    onSuccess: (): void => {
      scope.get(toast$).info(
        intl.formatMessage({
          id: "inbox.automations.runNowSuccess",
          defaultMessage: "Automation started",
          description: "Toast shown when an automation is run immediately",
        }),
      );
    },
    onError: (error): void => {
      scope.get(toast$).danger(
        intl.formatMessage({
          id: "inbox.automations.runNowError",
          defaultMessage: "Could not start automation",
          description:
            "Toast title when starting an automation immediately fails",
        }),
        { description: error.message },
      );
    },
  });

  const submitAutomation = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    if (!canSaveResolved) {
      return;
    }
    if (
      activeAutomationDraft.kind === "cron" &&
      activeAutomationDraft.model == null
    ) {
      return;
    }
    if (activeAutomationDraft.id != null) {
      if (activeAutomationDraft.status === "DELETED") {
        return;
      }
      setIsSavePending(true);
      updateAutomation.mutate(
        buildAutomationUpdateFromDraft(
          activeAutomationDraft,
          trimmedName,
          trimmedPrompt,
          activeAutomationDraft.status,
          resolvedRrule,
        ),
      );
      return;
    }
    createAutomation.mutate(
      buildAutomationCreateFromDraft(
        activeAutomationDraft,
        trimmedName,
        trimmedPrompt,
        resolvedRrule,
      ),
    );
  };

  const updateStatus = (
    automation: Automation,
    status: "ACTIVE" | "PAUSED",
  ): void => {
    updateAutomation.mutate(
      buildAutomationUpdateFromAutomation(automation, status),
    );
  };

  const handlePauseDraft = (): void => {
    if (activeAutomationDraft.id == null || resolvedRrule == null) {
      return;
    }
    setActiveAutomationDraft(
      (prev): AutomationDraft => ({
        ...prev,
        status: "PAUSED",
      }),
    );
    updateAutomation.mutate(
      buildAutomationUpdateFromDraft(
        activeAutomationDraft,
        trimmedName,
        trimmedPrompt,
        "PAUSED",
        resolvedRrule,
      ),
    );
  };

  const handleResumeDraft = (): void => {
    if (activeAutomationDraft.id == null || resolvedRrule == null) {
      return;
    }
    setActiveAutomationDraft(
      (prev): AutomationDraft => ({
        ...prev,
        status: "ACTIVE",
      }),
    );
    updateAutomation.mutate(
      buildAutomationUpdateFromDraft(
        activeAutomationDraft,
        trimmedName,
        trimmedPrompt,
        "ACTIVE",
        resolvedRrule,
      ),
    );
  };

  const handleConfirmDelete = (): void => {
    if (activeAutomationDraft.id == null) {
      setIsDeleteConfirmOpen(false);
      return;
    }
    deleteAutomation.mutate({ id: activeAutomationDraft.id });
  };

  const openDeleteConfirm = (): void => {
    setIsDeleteConfirmOpen(true);
  };

  const handleAutomationNameChange = (name: string): void => {
    setActiveAutomationDraft(
      (prev): AutomationDraft => ({
        ...prev,
        name,
      }),
    );
  };

  const handleRunNow = (): void => {
    if (activeAutomationDraft.id == null) {
      return;
    }
    const collaborationMode =
      activeAutomationDraft.kind === "heartbeat" &&
      activeAutomationDraft.targetThreadId != null
        ? (appServerManager.getConversation(
            createConversationId(activeAutomationDraft.targetThreadId),
          )?.latestCollaborationMode ?? null)
        : null;
    runAutomationNow.mutate({
      id: activeAutomationDraft.id,
      collaborationMode,
    });
  };

  const retryDetailPageAutoSave = (): void => {
    if (
      detailPageUpdate == null ||
      updateAutomation.isPending ||
      isSavePending
    ) {
      return;
    }
    setIsSavePending(true);
    updateAutomation.mutate(detailPageUpdate);
  };

  useRegisterCommand("manageTasks", openCreateAutomationDialog);

  useEffect(() => {
    if (
      !isAutomationDetailPageOpen ||
      detailPageUpdate == null ||
      !canSaveResolved ||
      !hasPendingDetailPageChanges ||
      debouncedDetailPageUpdateKey == null ||
      !areAutomationUpdatesEqual(
        debouncedDetailPageUpdateKey,
        detailPageUpdate,
      ) ||
      hasFailedDetailPageAutoSave ||
      isSavePending ||
      updateAutomation.isPending ||
      createAutomation.isPending ||
      deleteAutomation.isPending
    ) {
      return;
    }

    setIsSavePending(true);
    updateAutomation.mutate(detailPageUpdate);
  }, [
    canSaveResolved,
    createAutomation.isPending,
    debouncedDetailPageUpdateKey,
    deleteAutomation.isPending,
    detailPageUpdate,
    hasFailedDetailPageAutoSave,
    hasPendingDetailPageChanges,
    isAutomationDetailPageOpen,
    isSavePending,
    updateAutomation,
    updateAutomation.isPending,
  ]);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <AppHeader hideDivider={!isAutomationDetailPageOpen}>
        <AutomationsHeader
          automationName={
            isAutomationDetailPageOpen ? activeAutomationDraft.name : null
          }
          isDeletingAutomation={deleteAutomation.isPending}
          isNewAutomationDisabled={isNewAutomationDisabled}
          isPaused={activeAutomationDraft.status === "PAUSED"}
          isRetrySavePending={isSavePending || updateAutomation.isPending}
          isRunNowPending={runAutomationNow.isPending}
          isSaveRetryVisible={hasFailedDetailPageAutoSave}
          isShowingDetail={isAutomationDetailPageOpen}
          onBackToAutomations={closeAutomationView}
          onCreateAutomationClick={openCreateAutomationDialog}
          onDeleteAutomation={openDeleteConfirm}
          onPauseAutomation={handlePauseDraft}
          onRetrySave={retryDetailPageAutoSave}
          onResumeAutomation={handleResumeDraft}
          onRunNow={handleRunNow}
        />
      </AppHeader>
      <Dialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
        <DialogBody>
          <DialogSection>
            <DialogHeader
              title={
                <FormattedMessage
                  id="inbox.automations.deleteConfirm.title"
                  defaultMessage="Delete {name}?"
                  description="Title for the delete automation confirmation dialog"
                  values={{
                    name: (
                      <strong className="font-semibold text-token-text-primary">
                        {trimmedName ||
                          activeAutomationDraft.name ||
                          intl.formatMessage({
                            id: "settings.automations.dialog.newTitle",
                            defaultMessage: "New automation",
                            description:
                              "Header title for a new automation before it is named",
                          })}
                      </strong>
                    ),
                  }}
                />
              }
              subtitle={
                <FormattedMessage
                  id="inbox.automations.deleteConfirm.description"
                  defaultMessage="This will permanently delete the automation and stop any future runs."
                  description="Description for the delete automation confirmation dialog"
                />
              }
            />
          </DialogSection>
          <DialogSection>
            <DialogFooter>
              <Button
                color="outline"
                onClick={(): void => {
                  setIsDeleteConfirmOpen(false);
                }}
              >
                <FormattedMessage
                  id="inbox.automations.deleteConfirm.cancel"
                  defaultMessage="Cancel"
                  description="Cancel button label for delete automation confirmation dialog"
                />
              </Button>
              <Button
                color="danger"
                loading={deleteAutomation.isPending}
                onClick={handleConfirmDelete}
              >
                <FormattedMessage
                  id="inbox.automations.deleteConfirm.confirm"
                  defaultMessage="Delete automation"
                  description="Confirm button label for delete automation confirmation dialog"
                />
              </Button>
            </DialogFooter>
          </DialogSection>
        </DialogBody>
      </Dialog>
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        {isAutomationDetailPageOpen ? (
          <AutomationDetailPage
            draft={activeAutomationDraft}
            setDraft={setActiveAutomationDraft}
            canSave={canSaveResolved}
            isSaving={createAutomation.isPending || updateAutomation.isPending}
            isSavePending={isSavePending}
            selectedAutomation={selectedAutomation}
            roots={roots}
            formatRootLabel={formatRootLabel}
            workspaceGroups={workspaceGroups}
            onEditAutomationName={handleAutomationNameChange}
            onSubmit={submitAutomation}
            onCancel={closeAutomationView}
          />
        ) : isAutomationDetailMissing ? (
          <AutomationNotFoundState onBackToAutomations={closeAutomationView} />
        ) : automations.length === 0 ? (
          <AutomationsEmptyState
            isLoading={isAutomationsLoading}
            onSelectSuggestedTask={openCreateAutomationWithDraft}
          />
        ) : (
          <AutomationsOverview
            automations={sortedAutomations}
            automationRowSummaries={automationRowSummaries}
            selectedAutomationId={null}
            onSelectAutomation={openAutomationDetailPage}
            onPauseAutomation={(automation): void => {
              updateStatus(automation, "PAUSED");
            }}
            onResumeAutomation={(automation): void => {
              updateStatus(automation, "ACTIVE");
            }}
            onDeleteAutomation={(automation): void => {
              openDeleteAutomationConfirm(automation);
            }}
          />
        )}
      </div>
      <CreateAutomationDialog
        open={isCreateAutomationModalOpen && !isDeleteConfirmOpen}
        draft={activeAutomationDraft}
        setDraft={setActiveAutomationDraft}
        canSave={canSaveResolved}
        isSaving={createAutomation.isPending || updateAutomation.isPending}
        isSavePending={isSavePending}
        roots={roots}
        formatRootLabel={formatRootLabel}
        workspaceGroups={workspaceGroups}
        onSubmit={submitAutomation}
        onCancel={(): void => {
          closeAutomationView();
        }}
      />
    </div>
  );
}

function AutomationsHeader({
  automationName,
  isDeletingAutomation,
  isNewAutomationDisabled,
  isPaused,
  isRetrySavePending,
  isRunNowPending,
  isSaveRetryVisible,
  isShowingDetail,
  onBackToAutomations,
  onCreateAutomationClick,
  onDeleteAutomation,
  onPauseAutomation,
  onRetrySave,
  onResumeAutomation,
  onRunNow,
}: {
  automationName: string | null;
  isDeletingAutomation: boolean;
  isNewAutomationDisabled: boolean;
  isPaused: boolean;
  isRetrySavePending: boolean;
  isRunNowPending: boolean;
  isSaveRetryVisible: boolean;
  isShowingDetail: boolean;
  onBackToAutomations: () => void;
  onCreateAutomationClick: () => void;
  onDeleteAutomation: () => void;
  onPauseAutomation: () => void;
  onRetrySave: () => void;
  onResumeAutomation: () => void;
  onRunNow: () => void;
}): ReactElement {
  const intl = useIntl();

  return (
    <div className="draggable grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 electron:h-toolbar browser:h-toolbar extension:py-row-y">
      <div className="-ml-2 min-w-0 text-base">
        {isShowingDetail && automationName != null ? (
          <div className="flex min-w-0 items-center gap-1 text-token-description-foreground">
            <Button color="ghost" size="toolbar" onClick={onBackToAutomations}>
              <FormattedMessage
                id="inbox.automations.header.root"
                defaultMessage="Automations"
                description="Breadcrumb root label for the automations page"
              />
            </Button>
            <ChevronRightIcon className="icon-xs shrink-0" />
            <Button
              color="ghost"
              size="toolbar"
              className="pointer-events-none min-w-0 bg-transparent text-token-foreground hover:bg-transparent"
            >
              <span className="min-w-0 truncate text-token-foreground">
                {automationName}
              </span>
            </Button>
          </div>
        ) : null}
      </div>
      <div className="-mr-2 flex items-center justify-end">
        {isShowingDetail ? (
          <AutomationActions
            isPaused={isPaused}
            isDeleting={isDeletingAutomation}
            isRetrySavePending={isRetrySavePending}
            isRunNowPending={isRunNowPending}
            isSaveRetryVisible={isSaveRetryVisible}
            onDelete={onDeleteAutomation}
            onPause={onPauseAutomation}
            onRetrySave={onRetrySave}
            onResume={onResumeAutomation}
            onRunNow={onRunNow}
          />
        ) : (
          <Button
            className="gap-1"
            color="primary"
            size="toolbar"
            aria-label={intl.formatMessage({
              id: "inbox.automations.new",
              defaultMessage: "New automation",
              description: "Label for the create automation button",
            })}
            disabled={isNewAutomationDisabled}
            onClick={onCreateAutomationClick}
          >
            <PlusIcon className="icon-xs" />
            <FormattedMessage
              id="inbox.automations.new"
              defaultMessage="New automation"
              description="Label for the create automation button"
            />
          </Button>
        )}
      </div>
    </div>
  );
}

function AutomationNameEditor({
  name,
  onChange,
}: {
  name: string;
  onChange: (name: string) => void;
}): ReactElement {
  return (
    <input
      className="min-w-0 flex-1 bg-transparent p-0 text-token-foreground outline-none"
      value={name}
      onChange={(event): void => {
        onChange(event.target.value);
      }}
    />
  );
}

function AutomationNotFoundState({
  onBackToAutomations,
}: {
  onBackToAutomations: () => void;
}): ReactElement {
  return (
    <div className="mx-auto flex w-full max-w-[var(--thread-content-max-width)] flex-1 flex-col items-start gap-3 px-panel pt-panel pb-panel">
      <div className="text-lg text-token-foreground">
        <FormattedMessage
          id="inbox.automations.missing"
          defaultMessage="Automation not found"
          description="Title shown when an automation detail page points to a missing automation"
        />
      </div>
      <div className="text-token-description-foreground">
        <FormattedMessage
          id="inbox.automations.missingSubtitle"
          defaultMessage="The automation may have been deleted or is no longer available on this machine."
          description="Subtitle shown when an automation detail page points to a missing automation"
        />
      </div>
      <Button color="outline" size="toolbar" onClick={onBackToAutomations}>
        <FormattedMessage
          id="inbox.automations.missingBack"
          defaultMessage="Back to automations"
          description="Button label to return to the automations list when an automation detail page is missing"
        />
      </Button>
    </div>
  );
}

function AutomationsEmptyState({
  isLoading,
  onSelectSuggestedTask,
}: {
  isLoading: boolean;
  onSelectSuggestedTask: (draft: {
    name: string;
    prompt: string;
    scheduleConfig: AutomationDraft["scheduleConfig"];
  }) => void;
}): ReactElement {
  if (isLoading) {
    return (
      <div className="flex items-center gap-2 rounded-md px-2 py-2 text-sm text-token-description-foreground">
        <AnimatedIcon animation="automation" size="sm" />
        <FormattedMessage
          id="inbox.automations.loading"
          defaultMessage="Loading…"
          description="Loading state for automations page"
        />
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <div className="mx-auto flex w-full max-w-[var(--thread-content-max-width)] flex-col gap-1 px-panel pt-panel pb-6">
        <AutomationEmptyStateTitle />
        <div className="text-lg font-normal text-token-description-foreground">
          <FormattedMessage
            id="inbox.automations.emptySubtitle.learnMore"
            defaultMessage="Automate work by setting up scheduled threads. <link>Learn more</link>"
            description="Subtitle shown when no automations exist"
            values={{
              link: (chunks: ReactNode): ReactElement => (
                <a
                  className="text-token-link"
                  href={CODEX_APP_AUTOMATIONS_URL}
                  rel="noreferrer"
                  target="_blank"
                >
                  {chunks}
                </a>
              ),
            }}
          />
        </div>
      </div>
      <div className="mx-auto flex min-h-0 w-full max-w-[var(--thread-content-max-width)] flex-1 flex-col gap-4 px-panel pb-panel">
        <AutomationEmptyStatePrompts onSelectAction={onSelectSuggestedTask} />
      </div>
    </div>
  );
}

function AutomationDetailPage({
  draft,
  setDraft,
  canSave,
  isSaving,
  isSavePending,
  selectedAutomation,
  roots,
  formatRootLabel,
  workspaceGroups,
  onEditAutomationName,
  onSubmit,
  onCancel,
}: {
  draft: AutomationDraft;
  setDraft: (
    next: AutomationDraft | ((prev: AutomationDraft) => AutomationDraft),
  ) => void;
  canSave: boolean;
  isSaving: boolean;
  isSavePending: boolean;
  selectedAutomation: Automation;
  roots: Array<string>;
  formatRootLabel: (root: string) => string;
  workspaceGroups: ReturnType<typeof useWorkspaceGroups>;
  onEditAutomationName: (name: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onCancel: () => void;
}): ReactElement {
  return (
    <div className="flex h-full min-h-0 flex-1 flex-col self-stretch">
      <AutomationEditorContent
        layout="detail"
        draft={draft}
        setDraft={setDraft}
        canSave={canSave}
        isSaving={isSaving}
        isSavePending={isSavePending}
        selectedAutomation={selectedAutomation}
        roots={roots}
        formatRootLabel={formatRootLabel}
        workspaceGroups={workspaceGroups}
        onEditAutomationName={onEditAutomationName}
        onSubmit={onSubmit}
        onCancel={onCancel}
      />
    </div>
  );
}

function CreateAutomationDialog({
  open,
  draft,
  setDraft,
  canSave,
  isSaving,
  isSavePending,
  roots,
  formatRootLabel,
  workspaceGroups,
  onSubmit,
  onCancel,
}: {
  open: boolean;
  draft: AutomationDraft;
  setDraft: (
    next: AutomationDraft | ((prev: AutomationDraft) => AutomationDraft),
  ) => void;
  canSave: boolean;
  isSaving: boolean;
  isSavePending: boolean;
  roots: Array<string>;
  formatRootLabel: (root: string) => string;
  workspaceGroups: ReturnType<typeof useWorkspaceGroups>;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onCancel: () => void;
}): ReactElement {
  return (
    <AutomationDialogShell
      open={open}
      onOpenChange={(nextOpen): void => {
        if (!nextOpen) {
          onCancel();
        }
      }}
      showDialogClose={false}
      size="xxwide"
      contentClassName="flex max-h-[95vh] flex-col"
    >
      <AutomationCreateFlow
        composer={(templateToggleButton): ReactNode => {
          return (
            <AutomationEditorContent
              layout="create"
              draft={draft}
              setDraft={setDraft}
              canSave={canSave}
              isSaving={isSaving}
              isSavePending={isSavePending}
              roots={roots}
              formatRootLabel={formatRootLabel}
              workspaceGroups={workspaceGroups}
              onSubmit={onSubmit}
              onCancel={onCancel}
              templateToggleButton={templateToggleButton}
            />
          );
        }}
        open={open}
        onSelectTemplateDraft={(selectedTemplateDraft): void => {
          setDraft((prev): AutomationDraft => {
            return applyAutomationTemplateToDraft(prev, selectedTemplateDraft);
          });
        }}
      />
    </AutomationDialogShell>
  );
}

function AutomationEditorContent({
  layout,
  draft,
  setDraft,
  canSave,
  isSaving,
  isSavePending,
  selectedAutomation = null,
  roots,
  formatRootLabel,
  workspaceGroups,
  onEditAutomationName,
  onSubmit,
  onCancel,
  templateToggleButton = null,
}: {
  layout: AutomationEditorLayout;
  draft: AutomationDraft;
  setDraft: (
    next: AutomationDraft | ((prev: AutomationDraft) => AutomationDraft),
  ) => void;
  canSave: boolean;
  isSaving: boolean;
  isSavePending: boolean;
  selectedAutomation?: Automation | null;
  roots: Array<string>;
  formatRootLabel: (root: string) => string;
  workspaceGroups: ReturnType<typeof useWorkspaceGroups>;
  onEditAutomationName?: (name: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onCancel: () => void;
  templateToggleButton?: ReactNode;
}): ReactElement {
  const intl = useIntl();
  const { data: listModelsData } = useListModels();
  const modelsByType = listModelsData?.modelsByType;
  const [showModelDropdown, setShowModelDropdown] = useState(false);
  const [showReasoningDropdown, setShowReasoningDropdown] = useState(false);
  const isDetailLayout = layout === "detail";
  const isEditing = isDetailLayout;
  const Body = isDetailLayout ? "div" : DialogBody;
  const Section = isDetailLayout ? "div" : DialogSection;
  const hideExecutionEnvironmentLabel =
    showModelDropdown || showReasoningDropdown;
  const hideReasoningLabel = showModelDropdown && showReasoningDropdown;
  const { data: userConfigData } = useUserConfig();
  const heartbeatAutomationsEnabled = useGate(
    __statsigName("codex-app-automation-heartbeat"),
  );
  const { options: heartbeatThreadOptions, hasPinnedThreads } =
    useHeartbeatAutomationThreadOptions(draft.targetThreadId);
  const isReadOnlySandbox = userConfigData?.config.sandbox_mode === "read-only";
  const isDangerFullAccess =
    userConfigData?.config.sandbox_mode === "danger-full-access";
  const createTooltipContent =
    canSave || isSavePending
      ? null
      : getAutomationSubmitTooltipContent({
          draft,
          intl,
          action: "create",
        });
  const hasDraftText = draft.name.length > 0 || draft.prompt.length > 0;
  const localWorkspaceGroups = workspaceGroups?.filter((group) => {
    return group.projectKind === "local";
  });
  const projectOptions = localWorkspaceGroups
    ? localWorkspaceGroups.map((localGroup) => {
        const rootFolder = localGroup.repositoryData?.rootFolder ?? undefined;
        const isSubfolder = rootFolder && rootFolder !== localGroup.label;
        return {
          value: localGroup.path,
          label: localGroup.label,
          description: isSubfolder ? rootFolder : undefined,
          isCodexWorktree: localGroup.isCodexWorktree,
        };
      })
    : roots.map((root) => ({
        value: root,
        label: formatRootLabel(root),
      }));
  const nextRunLabel =
    draft.status === "PAUSED"
      ? "-"
      : selectedAutomation?.nextRunAt != null
        ? formatRelativeFutureDateTime({
            timestamp: selectedAutomation.nextRunAt,
            intl,
          })
        : intl.formatMessage({
            id: "inbox.automations.nextRun.none",
            defaultMessage: "Not scheduled",
            description:
              "Fallback label when an automation does not have a next run time",
          });
  const lastRunLabel =
    selectedAutomation?.lastRunAt != null
      ? formatRelativePastDateTime({
          timestamp: selectedAutomation.lastRunAt,
          intl,
        })
      : intl.formatMessage({
          id: "inbox.automations.lastRun.none",
          defaultMessage: "-",
          description: "Fallback label when an automation has not run yet",
        });
  const projectPlaceholder = intl.formatMessage({
    id: "settings.automations.projectDropdown.placeholder",
    defaultMessage: "Select project",
    description: "Placeholder text for automation project dropdown",
  });
  const detailRailControlClassName = "text-base";
  const isHeartbeatDraft = draft.kind === "heartbeat";

  const handleKindSelect = (nextKind: AutomationDraft["kind"]): void => {
    setDraft(
      (prev): AutomationDraft => getDraftForAutomationKind(prev, nextKind),
    );
  };

  const handleExecutionEnvironmentSelect = (
    nextEnvironment: AutomationDraft["executionEnvironment"],
  ): void => {
    setDraft(
      (prev): AutomationDraft => ({
        ...prev,
        executionEnvironment: nextEnvironment,
      }),
    );
  };

  const handleProjectChange = (
    nextRoots: Array<AutomationDraft["cwds"][number]>,
  ): void => {
    setDraft(
      (prev): AutomationDraft => ({
        ...prev,
        cwds: nextRoots,
      }),
    );
  };

  const handleTargetThreadChange = (nextThreadId: string): void => {
    setDraft(
      (prev): AutomationDraft => ({
        ...prev,
        targetThreadId: nextThreadId,
      }),
    );
  };

  const handleScheduleUpdate = (
    nextConfig: AutomationDraft["scheduleConfig"],
  ): void => {
    setDraft(
      (prev): AutomationDraft => ({
        ...prev,
        rawRrule: null,
        scheduleConfig: nextConfig,
        scheduleDirty: true,
      }),
    );
  };

  const handleModelSelect = (nextModel: string): void => {
    setDraft(
      (prev): AutomationDraft => ({
        ...prev,
        model: nextModel,
        reasoningEffort: getAutomationReasoningEffort({
          model: getAutomationModelDetails(
            modelsByType?.models ?? [],
            nextModel,
          ),
          reasoningEffort: prev.reasoningEffort,
        }),
      }),
    );
  };

  const handleReasoningSelect = (
    nextReasoningEffort: AutomationDraft["reasoningEffort"],
  ): void => {
    setDraft(
      (prev): AutomationDraft => ({
        ...prev,
        reasoningEffort: nextReasoningEffort,
      }),
    );
  };

  return (
    <Body
      className={clsx(
        "min-h-0 flex-1 overflow-hidden",
        isDetailLayout ? "px-0 py-0" : "pt-0",
      )}
    >
      {isDetailLayout ? null : (
        <Section className="gap-3">
          <div className="flex min-w-0 items-center justify-between gap-4 pt-5">
            <div className="min-w-0 flex-1">
              <AutomationTitleInput
                id="inbox-automation-title"
                autoFocus
                value={draft.name}
                onChange={(nextValue): void => {
                  setDraft(
                    (prev): AutomationDraft => ({
                      ...prev,
                      name: nextValue,
                    }),
                  );
                }}
              />
            </div>
            <div className="flex items-center gap-2">
              {hasDraftText ? (
                <Button
                  size="toolbar"
                  color="ghost"
                  onClick={(): void => {
                    setDraft(
                      (prev): AutomationDraft => ({
                        ...prev,
                        name: "",
                        prompt: "",
                      }),
                    );
                  }}
                >
                  <FormattedMessage
                    id="settings.automations.clear"
                    defaultMessage="Clear"
                    description="Button label for clearing the automation title and prompt"
                  />
                </Button>
              ) : null}
              <AutomationSandboxTooltipButton
                isReadOnlySandbox={isReadOnlySandbox}
                isDangerFullAccess={isDangerFullAccess}
              />
              {templateToggleButton}
            </div>
          </div>
        </Section>
      )}
      <Section
        className={clsx(
          "min-h-0 flex-1",
          isDetailLayout ? "!pt-0 h-full overflow-hidden" : "overflow-y-auto",
        )}
      >
        <div
          className={clsx(
            "flex min-h-0 flex-col gap-6",
            isDetailLayout && "h-full flex-1 flex-row items-stretch gap-0",
          )}
        >
          <div
            className={clsx(
              "min-h-0 min-w-0 flex flex-1 justify-center",
              isDetailLayout && "overflow-y-auto p-panel pb-8",
            )}
          >
            <div className="flex w-full max-w-[var(--thread-content-max-width)] flex-col gap-8">
              {isDetailLayout ? (
                <div className="px-3">
                  <div className="group heading-xl flex w-full min-w-0 items-center gap-1 font-normal text-token-foreground">
                    <AutomationNameEditor
                      name={draft.name}
                      onChange={(nextName): void => {
                        onEditAutomationName?.(nextName);
                      }}
                    />
                  </div>
                </div>
              ) : null}
              <div className={clsx(isDetailLayout && "pl-3 pb-8")}>
                <AutomationForm
                  draft={draft}
                  setDraft={setDraft}
                  canSave={canSave}
                  isEditing={isEditing}
                  isSaving={isSaving}
                  roots={roots}
                  formatRootLabel={formatRootLabel}
                  workspaceGroups={workspaceGroups}
                  onSubmit={onSubmit}
                  onCancel={onCancel}
                  formId={AUTOMATION_FORM_ID}
                  forceShowNameInput={false}
                  expandPrompt={isDetailLayout}
                  allowedKinds={
                    heartbeatAutomationsEnabled
                      ? ["cron", "heartbeat"]
                      : ["cron"]
                  }
                />
              </div>
            </div>
          </div>
          {isDetailLayout && selectedAutomation != null ? (
            <AutomationSettingsPanel className="flex border-l">
              <div className="px-1 py-2 text-base text-token-input-placeholder-foreground opacity-75">
                <FormattedMessage
                  id="inbox.automations.statusSection"
                  defaultMessage="Status"
                  description="Section label above the automation status section in the right rail"
                />
              </div>
              <AutomationSettingsRow
                icon={InfoIcon}
                label={intl.formatMessage({
                  id: "inbox.automations.status.label",
                  defaultMessage: "Status",
                  description:
                    "Label for the automation status row in the settings rail",
                })}
              >
                <AutomationStatusBadge status={draft.status} />
              </AutomationSettingsRow>
              <AutomationSettingsRow
                icon={ClockIcon}
                label={intl.formatMessage({
                  id: "inbox.automations.nextRun.label",
                  defaultMessage: "Next run",
                  description:
                    "Label for the automation next run time row in the settings rail",
                })}
              >
                <Badge className="rounded-full px-2.5 py-1 text-base">
                  {nextRunLabel}
                </Badge>
              </AutomationSettingsRow>
              <AutomationSettingsRow
                icon={ClockIcon}
                label={intl.formatMessage({
                  id: "inbox.automations.lastRun.label",
                  defaultMessage: "Last ran",
                  description:
                    "Label for the automation last run time row in the settings rail",
                })}
              >
                <Badge className="rounded-full px-2.5 py-1 text-base">
                  {lastRunLabel}
                </Badge>
              </AutomationSettingsRow>
              <div className="px-1 pt-6 pb-2 text-base text-token-input-placeholder-foreground opacity-75">
                <FormattedMessage
                  id="inbox.automations.details"
                  defaultMessage="Details"
                  description="Section label above the automation details rail"
                />
              </div>
              {heartbeatAutomationsEnabled ? (
                <AutomationSettingsRow
                  icon={ClockIcon}
                  label={intl.formatMessage({
                    id: "inbox.automations.kind.label",
                    defaultMessage: "Type",
                    description:
                      "Label for the automation kind row in the details rail",
                  })}
                >
                  <AutomationKindDropdown
                    selectedKind={draft.kind}
                    className={detailRailControlClassName}
                    disabled={selectedAutomation != null}
                    onSelect={handleKindSelect}
                  />
                </AutomationSettingsRow>
              ) : null}
              {isHeartbeatDraft ? (
                <AutomationSettingsRow
                  icon={PinIcon}
                  label={intl.formatMessage({
                    id: "inbox.automations.targetThread.label",
                    defaultMessage: "Thread",
                    description:
                      "Label for the heartbeat automation target thread row in the details rail",
                  })}
                >
                  <HeartbeatThreadDropdown
                    selectedThreadId={draft.targetThreadId}
                    options={heartbeatThreadOptions}
                    hasPinnedThreads={hasPinnedThreads}
                    className={detailRailControlClassName}
                    showIcon={false}
                    disabled={selectedAutomation != null}
                    onSelect={handleTargetThreadChange}
                  />
                </AutomationSettingsRow>
              ) : (
                <>
                  <AutomationSettingsRow
                    icon={LaptopIcon}
                    label={
                      <div className="flex min-w-0 items-center gap-2">
                        <span>
                          {intl.formatMessage({
                            id: "inbox.automations.executionEnvironment.label",
                            defaultMessage: "Runs in",
                            description:
                              "Label for the automation execution environment row in the details rail",
                          })}
                        </span>
                        <AutomationSandboxTooltipButton
                          isReadOnlySandbox={isReadOnlySandbox}
                          isDangerFullAccess={isDangerFullAccess}
                        />
                      </div>
                    }
                  >
                    <ExecutionEnvironmentDropdown
                      selectedId={draft.executionEnvironment ?? "worktree"}
                      className={detailRailControlClassName}
                      showIcon={false}
                      ariaLabel={intl.formatMessage({
                        id: "settings.automations.executionEnvironment.ariaLabel",
                        defaultMessage: "Execution environment",
                        description:
                          "Aria label for execution environment dropdown",
                      })}
                      onSelect={handleExecutionEnvironmentSelect}
                    />
                  </AutomationSettingsRow>
                  <AutomationSettingsRow
                    icon={FolderIcon}
                    label={intl.formatMessage({
                      id: "inbox.automations.folder.label",
                      defaultMessage: "Folder",
                      description:
                        "Label for the automation folder row in the details rail",
                    })}
                  >
                    <ProjectDropdown
                      selectedRoots={draft.cwds}
                      options={projectOptions}
                      placeholder={projectPlaceholder}
                      className={detailRailControlClassName}
                      showIcon={false}
                      onChange={handleProjectChange}
                    />
                  </AutomationSettingsRow>
                </>
              )}
              <AutomationSettingsRow
                icon={ClockIcon}
                label={
                  isHeartbeatDraft
                    ? intl.formatMessage({
                        id: "inbox.automations.interval.label",
                        defaultMessage: "Interval",
                        description:
                          "Label for the heartbeat automation interval control",
                      })
                    : intl.formatMessage({
                        id: "inbox.automations.repeats.label",
                        defaultMessage: "Repeats",
                        description: "Label for the automation repeats control",
                      })
                }
              >
                <ScheduleSummaryPopoverTrigger
                  scheduleMode={draft.scheduleConfig.mode}
                  scheduleConfig={draft.scheduleConfig}
                  className={detailRailControlClassName}
                  showIcon={false}
                  allowedModes={isHeartbeatDraft ? ["hourly"] : undefined}
                  intervalStyle={isHeartbeatDraft ? "heartbeat" : "default"}
                  onUpdateScheduleDraft={handleScheduleUpdate}
                />
              </AutomationSettingsRow>
              {!isHeartbeatDraft ? (
                <>
                  <AutomationSettingsRow
                    icon={CubeIcon}
                    label={intl.formatMessage({
                      id: "inbox.automations.model.label",
                      defaultMessage: "Model",
                      description:
                        "Label for the automation model row in the details rail",
                    })}
                  >
                    <AutomationModelDropdown
                      selectedModel={draft.model}
                      className={detailRailControlClassName}
                      showIcon={false}
                      onSelect={handleModelSelect}
                    />
                  </AutomationSettingsRow>
                  <AutomationSettingsRow
                    icon={ReasoningMediumIcon}
                    label={intl.formatMessage({
                      id: "inbox.automations.reasoning.label",
                      defaultMessage: "Reasoning",
                      description:
                        "Label for the automation reasoning row in the details rail",
                    })}
                  >
                    <AutomationReasoningEffortDropdown
                      model={draft.model}
                      reasoningEffort={draft.reasoningEffort}
                      className={detailRailControlClassName}
                      showIcon={false}
                      onSelect={handleReasoningSelect}
                    />
                  </AutomationSettingsRow>
                </>
              ) : null}
              {!isHeartbeatDraft ? (
                <>
                  <div className="px-1 pt-6 pb-2 text-base text-token-input-placeholder-foreground opacity-75">
                    <FormattedMessage
                      id="inbox.automations.history"
                      defaultMessage="Previous runs"
                      description="Section label above the automation history rail section"
                    />
                  </div>
                  <div className="min-h-0 flex-1">
                    <AutomationHistoryList
                      automationId={selectedAutomation.id}
                      formatRootLabel={formatRootLabel}
                    />
                  </div>
                </>
              ) : null}
            </AutomationSettingsPanel>
          ) : null}
        </div>
      </Section>
      {isDetailLayout ? null : (
        <Section className="shrink-0">
          <DialogFooter className={clsx(DIALOG_FOOTER_COMPACT, "w-full")}>
            <div className="flex shrink-0 items-center gap-1">
              {heartbeatAutomationsEnabled ? (
                <AutomationKindDropdown
                  selectedKind={draft.kind}
                  className="shrink-0"
                  onSelect={handleKindSelect}
                />
              ) : null}
              {isHeartbeatDraft ? (
                <HeartbeatThreadDropdown
                  selectedThreadId={draft.targetThreadId}
                  options={heartbeatThreadOptions}
                  hasPinnedThreads={hasPinnedThreads}
                  className="shrink-0"
                  disabled={selectedAutomation != null}
                  onSelect={handleTargetThreadChange}
                />
              ) : (
                <>
                  <ExecutionEnvironmentDropdown
                    selectedId={draft.executionEnvironment ?? "worktree"}
                    className="shrink-0"
                    showLabel={!hideExecutionEnvironmentLabel}
                    onSelect={handleExecutionEnvironmentSelect}
                    ariaLabel={intl.formatMessage({
                      id: "settings.automations.executionEnvironment.ariaLabel",
                      defaultMessage: "Execution environment",
                      description:
                        "Aria label for execution environment dropdown",
                    })}
                  />
                  <ProjectDropdown
                    selectedRoots={draft.cwds}
                    options={projectOptions}
                    placeholder={projectPlaceholder}
                    className="shrink-0"
                    onChange={handleProjectChange}
                  />
                </>
              )}
              <ScheduleSummaryPopoverTrigger
                scheduleMode={draft.scheduleConfig.mode}
                scheduleConfig={draft.scheduleConfig}
                className="shrink-0"
                allowedModes={isHeartbeatDraft ? ["hourly"] : undefined}
                intervalStyle={isHeartbeatDraft ? "heartbeat" : "default"}
                onUpdateScheduleDraft={handleScheduleUpdate}
              />
              {!isHeartbeatDraft && showModelDropdown ? (
                <AutomationModelDropdown
                  selectedModel={draft.model}
                  className="shrink-0"
                  onSelect={handleModelSelect}
                />
              ) : null}
              {!isHeartbeatDraft && showReasoningDropdown ? (
                <AutomationReasoningEffortDropdown
                  model={draft.model}
                  reasoningEffort={draft.reasoningEffort}
                  className="shrink-0"
                  showLabel={!hideReasoningLabel}
                  onSelect={handleReasoningSelect}
                />
              ) : null}
              {!isHeartbeatDraft ? (
                <AutomationExtraControlsDropdown
                  showModelDropdown={showModelDropdown}
                  showReasoningDropdown={showReasoningDropdown}
                  onToggleModelDropdown={setShowModelDropdown}
                  onToggleReasoningDropdown={setShowReasoningDropdown}
                />
              ) : null}
            </div>
            <div className="flex-1" />
            <div className="flex shrink-0 items-center gap-2">
              <Button size="toolbar" color="ghost" onClick={onCancel}>
                <FormattedMessage
                  id="settings.automations.cancel"
                  defaultMessage="Cancel"
                  description="Cancel button label for automations dialog"
                />
              </Button>
              <Tooltip
                tooltipContent={createTooltipContent}
                disabled={createTooltipContent == null}
              >
                <span className="inline-flex">
                  <Button
                    size="toolbar"
                    color="primary"
                    type="submit"
                    form={AUTOMATION_FORM_ID}
                    disabled={!canSave || isSavePending}
                    loading={isSavePending || isSaving}
                    className="disabled:cursor-default"
                  >
                    <FormattedMessage
                      id="settings.automations.create"
                      defaultMessage="Create"
                      description="Button label for creating a new automation"
                    />
                  </Button>
                </span>
              </Tooltip>
            </div>
          </DialogFooter>
        </Section>
      )}
    </Body>
  );
}

function AutomationSettingsPanel({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}): ReactElement {
  return (
    <aside
      className={clsx(
        "border-token-border flex h-full w-96 shrink-0 self-stretch flex-col",
        className,
      )}
    >
      <div className="flex min-h-0 w-full flex-1 flex-col p-panel">
        <div className="flex min-h-0 w-full flex-1 flex-col">{children}</div>
      </div>
    </aside>
  );
}

function AutomationHistoryList({
  automationId,
  formatRootLabel,
}: {
  automationId: string;
  formatRootLabel: (root: string) => string;
}): ReactElement {
  const intl = useIntl();
  const navigateToLocalConversation = useNavigateToLocalConversation();
  const { data: conversations } = useConversationsMeta();
  const {
    items: inboxItems,
    isLoading,
    markRead,
    markUnread,
  } = useInboxItems();
  const archiveAutomationRun = useMutationFromVSCode("automation-run-archive");
  const conversationTitleById = new Map(
    (conversations ?? []).map((conversation) => [
      String(conversation.id),
      getLocalConversationTitle(conversation),
    ]),
  );
  const historyItems = inboxItems
    .filter((item): boolean => item.automationId === automationId)
    .sort((first, second) => second.createdAt - first.createdAt);

  if (isLoading && historyItems.length === 0) {
    return (
      <div className="flex h-full min-h-0 items-start px-1">
        <Spinner className="icon-sm text-token-description-foreground" />
      </div>
    );
  }

  if (historyItems.length === 0) {
    return (
      <div className="px-1 py-1 text-base text-token-description-foreground opacity-50">
        <FormattedMessage
          id="sidebarElectron.noTasks"
          defaultMessage="No threads"
          description="Shown when a folder group has no threads"
        />
      </div>
    );
  }

  return (
    <div className="vertical-scroll-fade-mask flex h-full min-h-0 flex-col overflow-y-auto [--edge-fade-distance:1rem]">
      {historyItems.map((item) => (
        <AutomationHistoryRow
          key={item.id}
          item={item}
          conversationTitle={
            item.threadId != null
              ? (conversationTitleById.get(item.threadId) ?? null)
              : null
          }
          formatRootLabel={formatRootLabel}
          archiveLabel={intl.formatMessage({
            id: "inbox.automations.history.archive",
            defaultMessage: "Archive thread",
            description:
              "Label for archiving a thread from the automation history list",
          })}
          onArchive={(threadId): void => {
            void archiveAutomationRun.mutateAsync({
              threadId,
              archivedReason: "manual",
            });
          }}
          onMarkRead={markRead}
          onMarkUnread={markUnread}
          onSelect={(threadId): void => {
            navigateToLocalConversation(threadId);
          }}
        />
      ))}
    </div>
  );
}

function AutomationHistoryRow({
  item,
  conversationTitle,
  formatRootLabel,
  archiveLabel,
  onArchive,
  onMarkRead,
  onMarkUnread,
  onSelect,
}: {
  item: InboxItem;
  conversationTitle: string | null;
  formatRootLabel: (root: string) => string;
  archiveLabel: string;
  onArchive: (threadId: string) => void;
  onMarkRead: (id: string) => void;
  onMarkUnread: (id: string) => void;
  onSelect: (threadId: string) => void;
}): ReactElement {
  const intl = useIntl();
  const threadId = item.threadId;
  const isArchived = isInboxArchived(item.status);

  const row = (
    <InboxRow
      itemId={item.id}
      className="!pl-1"
      titleClassName="font-normal"
      showArchiveAction={false}
      title={
        conversationTitle ??
        item.title ??
        item.automationName ??
        intl.formatMessage({
          id: "inbox.automations.history.untitled",
          defaultMessage: "Untitled",
          description:
            "Fallback title for an automation history thread without a title",
        })
      }
      workspaceLabel={
        item.sourceCwd != null ? formatRootLabel(item.sourceCwd) : undefined
      }
      timestamp={new Date(item.createdAt)}
      threadId={threadId}
      isUnread={item.readAt == null}
      archiveLabel={archiveLabel}
      onMarkRead={onMarkRead}
      onMarkUnread={onMarkUnread}
      onArchive={onArchive}
      onSelect={
        threadId != null && !isArchived
          ? (): void => {
              onSelect(threadId);
            }
          : undefined
      }
      status={item.status}
    />
  );

  if (!isArchived) {
    return row;
  }

  return (
    <Tooltip
      tooltipContent={
        <FormattedMessage
          id="inbox.automations.history.archivedTooltip"
          defaultMessage="Run was archived"
          description="Tooltip shown for archived automation runs in the previous runs list"
        />
      }
    >
      <div>{row}</div>
    </Tooltip>
  );
}

function AutomationSettingsRow({
  icon: Icon,
  label,
  children,
}: {
  icon?: ComponentType<{ className?: string }>;
  label: ReactNode;
  children: ReactNode;
}): ReactElement {
  return (
    <div className="grid h-[1.875rem] w-full grid-cols-[auto_minmax(0,1fr)] items-center gap-x-6 overflow-x-hidden rounded-lg text-sm text-token-foreground electron:opacity-75">
      <div className="flex min-w-0 items-center pr-2 pl-1 text-left text-base text-token-foreground">
        {Icon ? <Icon className="icon-xs mr-2 shrink-0" /> : null}
        {label}
      </div>
      <div className="flex min-w-0 items-center justify-self-end">
        {children}
      </div>
    </div>
  );
}

function AutomationStatusBadge({
  status,
}: {
  status: Automation["status"];
}): ReactElement {
  const intl = useIntl();

  return (
    <Badge className="gap-2 rounded-full px-2.5 py-1 text-base">
      <span
        className={clsx(
          "size-2 rounded-full",
          status === "ACTIVE"
            ? "bg-token-charts-green"
            : status === "PAUSED"
              ? "bg-token-charts-orange"
              : "bg-token-charts-red",
        )}
      />
      <span>
        {status === "ACTIVE"
          ? intl.formatMessage({
              id: "inbox.automations.status.active",
              defaultMessage: "Active",
              description: "Label for active automation status",
            })
          : status === "PAUSED"
            ? intl.formatMessage({
                id: "inbox.automations.status.paused",
                defaultMessage: "Paused",
                description: "Label for paused automation status",
              })
            : intl.formatMessage({
                id: "inbox.automations.status.deleted",
                defaultMessage: "Deleted",
                description: "Label for deleted automation status",
              })}
      </span>
    </Badge>
  );
}

function AutomationActions({
  isPaused,
  isDeleting,
  isRetrySavePending,
  isRunNowPending,
  isSaveRetryVisible,
  onDelete,
  onPause,
  onRetrySave,
  onResume,
  onRunNow,
}: {
  isPaused: boolean;
  isDeleting: boolean;
  isRetrySavePending: boolean;
  isRunNowPending: boolean;
  isSaveRetryVisible: boolean;
  onDelete: () => void;
  onPause: () => void;
  onRetrySave: () => void;
  onResume: () => void;
  onRunNow: () => void;
}): ReactElement {
  const intl = useIntl();

  return (
    <div className="flex items-center gap-2">
      {isSaveRetryVisible ? (
        <Button
          size="toolbar"
          color="primary"
          disabled={isRetrySavePending}
          loading={isRetrySavePending}
          onClick={onRetrySave}
        >
          <FormattedMessage
            id="settings.automations.saveRetry"
            defaultMessage="Save"
            description="Button label for retrying a failed automation save"
          />
        </Button>
      ) : null}
      {isPaused ? (
        <Button
          size="toolbar"
          color="ghost"
          uniform
          onClick={onResume}
          aria-label={intl.formatMessage({
            id: "settings.automations.resumeAria",
            defaultMessage: "Resume automation",
            description: "Aria label for resuming an automation",
          })}
        >
          <PlayCircleIcon className="icon-sm" />
        </Button>
      ) : (
        <Button
          size="toolbar"
          color="ghost"
          uniform
          onClick={onPause}
          aria-label={intl.formatMessage({
            id: "settings.automations.pauseAria",
            defaultMessage: "Pause automation",
            description: "Aria label for pausing an automation",
          })}
        >
          <PauseCircleIcon className="icon-sm" />
        </Button>
      )}
      <Button
        size="toolbar"
        color="ghost"
        uniform
        loading={isDeleting}
        onClick={onDelete}
        aria-label={intl.formatMessage({
          id: "settings.automations.deleteAria",
          defaultMessage: "Delete automation",
          description: "Aria label for deleting an automation",
        })}
      >
        <TrashIcon className="icon-sm" />
      </Button>
      <Button
        size="toolbar"
        color="primary"
        disabled={isRunNowPending}
        onClick={onRunNow}
      >
        {isRunNowPending ? (
          <Spinner className="icon-sm" />
        ) : (
          <PlayOutlineIcon className="icon-sm" />
        )}
        <FormattedMessage
          id="settings.automations.runNow"
          defaultMessage="Run now"
          description="Button label for running an automation immediately"
        />
      </Button>
    </div>
  );
}

function buildAutomationUpdateFromDraft(
  draft: AutomationDraft,
  name: string,
  prompt: string,
  status: Extract<Automation["status"], "ACTIVE" | "PAUSED">,
  rrule: Automation["rrule"],
): AutomationUpdateInput {
  if (draft.id == null) {
    throw new Error("Automation draft is incomplete");
  }

  if (draft.kind === "heartbeat") {
    if (draft.targetThreadId == null) {
      throw new Error("Heartbeat automation draft is incomplete");
    }
    return {
      id: draft.id,
      kind: "heartbeat",
      name,
      prompt,
      status,
      targetThreadId: draft.targetThreadId,
      model: null,
      reasoningEffort: null,
      rrule,
    };
  }
  if (draft.executionEnvironment == null || draft.model == null) {
    throw new Error("Cron automation draft is incomplete");
  }

  return {
    id: draft.id,
    kind: "cron",
    name,
    prompt,
    status,
    cwds: draft.cwds,
    executionEnvironment: draft.executionEnvironment,
    model: draft.model,
    reasoningEffort: draft.reasoningEffort,
    rrule,
  };
}

function buildAutomationCreateFromDraft(
  draft: AutomationDraft,
  name: string,
  prompt: string,
  rrule: Automation["rrule"],
): ProtocolAutomationCreateInput {
  if (draft.kind === "heartbeat") {
    if (draft.targetThreadId == null) {
      throw new Error("Heartbeat automation draft is incomplete");
    }
    return {
      kind: "heartbeat",
      name,
      prompt,
      targetThreadId: draft.targetThreadId,
      model: null,
      reasoningEffort: null,
      rrule,
    };
  }
  if (draft.executionEnvironment == null || draft.model == null) {
    throw new Error("Cron automation draft is incomplete");
  }
  return {
    kind: "cron",
    name,
    prompt,
    cwds: draft.cwds,
    executionEnvironment: draft.executionEnvironment,
    model: draft.model,
    reasoningEffort: draft.reasoningEffort,
    rrule,
  };
}

function buildAutomationUpdateFromAutomation(
  automation: Automation,
  status: "ACTIVE" | "PAUSED",
): AutomationUpdateInput {
  if (isHeartbeatAutomation(automation)) {
    return {
      id: automation.id,
      kind: "heartbeat",
      name: automation.name,
      prompt: automation.prompt,
      status,
      targetThreadId: automation.targetThreadId,
      model: null,
      reasoningEffort: null,
      rrule: automation.rrule,
    };
  }
  return {
    id: automation.id,
    kind: "cron",
    name: automation.name,
    prompt: automation.prompt,
    status,
    cwds: automation.cwds,
    executionEnvironment: automation.executionEnvironment,
    model: automation.model,
    reasoningEffort: automation.reasoningEffort,
    rrule: automation.rrule,
  };
}

function getAutomationUpdateInput(
  variables: AutomationUpdateMutationVariables,
): AutomationUpdateInput | null {
  if (variables.status === "DELETED") {
    return null;
  }

  return variables;
}

function areAutomationUpdatesEqual(
  first: AutomationUpdateInput | null,
  second: AutomationUpdateInput | null,
): boolean {
  if (first == null || second == null) {
    return first === second;
  }

  return (
    first.id === second.id &&
    first.kind === second.kind &&
    first.name === second.name &&
    first.prompt === second.prompt &&
    first.status === second.status &&
    first.rrule === second.rrule &&
    (first.kind === "heartbeat"
      ? second.kind === "heartbeat" &&
        first.targetThreadId === second.targetThreadId
      : first.model === second.model &&
        first.reasoningEffort === second.reasoningEffort &&
        second.kind === "cron" &&
        first.executionEnvironment === second.executionEnvironment &&
        first.cwds.length === second.cwds.length &&
        first.cwds.every((cwd, index) => cwd === second.cwds[index]))
  );
}

function parseAutomationUpdateContext(
  value: unknown,
): AutomationUpdateContext | null {
  if (value == null || typeof value !== "object") {
    return null;
  }

  let previousAutomations: AutomationUpdateContext["previousAutomations"];
  let previousDraftStatus: AutomationDraft["status"] | null = null;

  if ("previousAutomations" in value) {
    const candidate = value.previousAutomations;
    if (
      candidate != null &&
      typeof candidate === "object" &&
      "items" in candidate &&
      Array.isArray(candidate.items)
    ) {
      previousAutomations = { items: candidate.items };
    }
  }

  if ("previousDraftStatus" in value) {
    const candidate = value.previousDraftStatus;
    if (
      candidate === "ACTIVE" ||
      candidate === "PAUSED" ||
      candidate === "DELETED"
    ) {
      previousDraftStatus = candidate;
    } else if (candidate == null) {
      previousDraftStatus = null;
    }
  }

  if (previousAutomations == null && previousDraftStatus == null) {
    return null;
  }

  return {
    previousAutomations,
    previousDraftStatus,
  };
}

function doesAutomationMatchUpdate(
  automation: Automation,
  update: AutomationUpdateInput,
): boolean {
  return (
    automation.id === update.id &&
    automation.kind === update.kind &&
    automation.name === update.name &&
    automation.prompt === update.prompt &&
    automation.status === update.status &&
    automation.rrule === update.rrule &&
    (isHeartbeatAutomation(automation)
      ? update.kind === "heartbeat" &&
        automation.targetThreadId === update.targetThreadId
      : automation.model === update.model &&
        automation.reasoningEffort === update.reasoningEffort &&
        update.kind === "cron" &&
        automation.executionEnvironment === update.executionEnvironment &&
        automation.cwds.length === update.cwds.length &&
        automation.cwds.every((cwd, index) => cwd === update.cwds[index]))
  );
}

function formatRelativeFutureDateTime({
  timestamp,
  intl,
}: {
  timestamp: number;
  intl: IntlShape;
}): string {
  const date = new Date(timestamp);
  const now = new Date();
  const dayDifference = differenceInCalendarDays(date, now);
  const timeLabel = intl.formatDate(date, { timeStyle: "short" });

  if (dayDifference === 0) {
    return intl.formatMessage(
      {
        id: "inbox.automations.relativeDate.today",
        defaultMessage: "Today at {time}",
        description: "Relative next-run label for a time later today",
      },
      { time: timeLabel },
    );
  }

  if (dayDifference === 1) {
    return intl.formatMessage(
      {
        id: "inbox.automations.relativeDate.tomorrow",
        defaultMessage: "Tomorrow at {time}",
        description: "Relative next-run label for a time tomorrow",
      },
      { time: timeLabel },
    );
  }

  if (dayDifference > 1 && dayDifference < 7) {
    return intl.formatMessage(
      {
        id: "inbox.automations.relativeDate.weekday",
        defaultMessage: "{weekday} at {time}",
        description: "Relative next-run label for a day later this week",
      },
      {
        weekday: intl.formatDate(date, { weekday: "long" }),
        time: timeLabel,
      },
    );
  }

  return intl.formatDate(date, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function formatRelativePastDateTime({
  timestamp,
  intl,
}: {
  timestamp: number;
  intl: IntlShape;
}): string {
  const date = new Date(timestamp);
  const now = new Date();
  const dayDifference = differenceInCalendarDays(date, now);
  const timeLabel = intl.formatDate(date, { timeStyle: "short" });

  if (dayDifference === 0) {
    return intl.formatMessage(
      {
        id: "inbox.automations.relativeDate.pastToday",
        defaultMessage: "Today at {time}",
        description: "Relative last-run label for a time earlier today",
      },
      { time: timeLabel },
    );
  }

  if (dayDifference === -1) {
    return intl.formatMessage(
      {
        id: "inbox.automations.relativeDate.yesterday",
        defaultMessage: "Yesterday at {time}",
        description: "Relative last-run label for a time yesterday",
      },
      { time: timeLabel },
    );
  }

  if (dayDifference < -1 && dayDifference > -7) {
    return intl.formatMessage(
      {
        id: "inbox.automations.relativeDate.pastWeekday",
        defaultMessage: "{weekday} at {time}",
        description: "Relative last-run label for a day earlier this week",
      },
      {
        weekday: intl.formatDate(date, { weekday: "long" }),
        time: timeLabel,
      },
    );
  }

  return intl.formatDate(date, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function differenceInCalendarDays(a: Date, b: Date): number {
  const aMidnight = new Date(a.getFullYear(), a.getMonth(), a.getDate());
  const bMidnight = new Date(b.getFullYear(), b.getMonth(), b.getDate());

  return Math.round(
    (aMidnight.getTime() - bMidnight.getTime()) / (24 * 60 * 60 * 1000),
  );
}
