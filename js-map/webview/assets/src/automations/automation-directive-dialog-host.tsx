import { useQueryClient } from "@tanstack/react-query";
import { useAtomValue, useSetAtom } from "jotai";
import { useScope } from "maitai";
import { formatWorkspaceRootLabel, type Automation } from "protocol";
import { useState, type FormEvent, type ReactElement } from "react";
import { useIntl } from "react-intl";

import { toast$ } from "@/components/toaster/toast-signal";
import { useListModels } from "@/queries/model-queries";
import { AppScope } from "@/scopes/app-scope";
import { AutomationForm } from "@/settings/settings-content/automation-dialog";
import { useWorkspaceGroups } from "@/sidebar/use-repository-task-groups";
import {
  getQueryKey,
  useFetchFromVSCode,
  useMutationFromVSCode,
} from "@/vscode-api";

import { getDefaultAutomationModelSettings } from "./automation-model-settings";
import {
  EMPTY_AUTOMATION_DRAFT,
  applyAutomationDraftModelDefaults,
  automationDirectiveDialogOpenAtom,
  automationDirectiveResultAtom,
  automationDirectiveSeedAtom,
  buildAutomationDraftFromDirectiveSeed,
  getAutomationDraftSaveState,
  resolveAutomationDraftRrule,
  type AutomationDraft,
} from "./automation-shared";

export function AutomationDirectiveDialogHost(): ReactElement | null {
  const intl = useIntl();
  const scope = useScope(AppScope);
  const queryClient = useQueryClient();
  const dialogOpen = useAtomValue(automationDirectiveDialogOpenAtom);
  const directiveSeed = useAtomValue(automationDirectiveSeedAtom);
  const setDirectiveSeed = useSetAtom(automationDirectiveSeedAtom);
  const setDirectiveResult = useSetAtom(automationDirectiveResultAtom);
  const setDialogOpen = useSetAtom(automationDirectiveDialogOpenAtom);
  const isDialogOpen = dialogOpen && directiveSeed != null;
  const { data: automationsData } = useFetchFromVSCode("list-automations", {
    queryConfig: {
      enabled: isDialogOpen && directiveSeed?.id != null,
    },
  });
  const automations = automationsData?.items ?? [];
  const targetAutomation =
    directiveSeed?.id != null
      ? (automations.find((item) => item.id === directiveSeed.id) ?? null)
      : null;
  const { data: listModelsData } = useListModels();
  const modelsByType = listModelsData?.modelsByType;
  const defaultAutomationModelSettings =
    getDefaultAutomationModelSettings(modelsByType);
  const [draftState, setDraftState] = useState<{
    sessionKey: string | null;
    draft: AutomationDraft;
  }>(() => ({
    sessionKey: null,
    draft: EMPTY_AUTOMATION_DRAFT,
  }));
  const directiveKey = directiveSeed?.directiveKey ?? null;
  const seededDraft =
    directiveSeed != null && draftState.sessionKey !== directiveKey
      ? buildAutomationDraftFromDirectiveSeed({
          seed: directiveSeed,
          targetAutomation,
          modelsByType,
        })
      : null;
  const activeDraft = applyAutomationDraftModelDefaults({
    draft: seededDraft ?? draftState.draft,
    modelSettings: defaultAutomationModelSettings,
  });

  const setDraft = (
    next: AutomationDraft | ((prev: AutomationDraft) => AutomationDraft),
  ): void => {
    setDraftState((prev) => {
      const baseDraft =
        directiveSeed != null && prev.sessionKey !== directiveSeed.directiveKey
          ? buildAutomationDraftFromDirectiveSeed({
              seed: directiveSeed,
              targetAutomation,
              modelsByType,
            })
          : prev.draft;
      const resolvedBaseDraft = applyAutomationDraftModelDefaults({
        draft: baseDraft,
        modelSettings: defaultAutomationModelSettings,
      });
      const nextDraft =
        typeof next === "function" ? next(resolvedBaseDraft) : next;
      return {
        sessionKey: directiveKey ?? prev.sessionKey,
        draft: nextDraft,
      };
    });
  };

  const { data: workspaceRoots } = useFetchFromVSCode("workspace-root-options");
  const roots = workspaceRoots?.roots ?? [];
  const labels = workspaceRoots?.labels ?? {};
  const formatRootLabel = (root: string): string => {
    return formatWorkspaceRootLabel({ root, labels });
  };
  const workspaceGroups = useWorkspaceGroups();

  const invalidateAutomations = (): void => {
    void queryClient.invalidateQueries({
      queryKey: getQueryKey("list-automations"),
    });
  };

  const closeDialog = (): void => {
    setDialogOpen(false);
    setDirectiveSeed(null);
    setDraftState({
      sessionKey: null,
      draft: EMPTY_AUTOMATION_DRAFT,
    });
  };

  const handleSuccess = (automation: Automation): void => {
    invalidateAutomations();
    if (directiveSeed != null) {
      setDirectiveResult({
        directiveKey: directiveSeed.directiveKey,
        automationId: automation.id,
      });
    }
    closeDialog();
  };

  const createAutomation = useMutationFromVSCode("automation-create", {
    onSuccess: (data): void => {
      handleSuccess(data.item);
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
    onSuccess: (data): void => {
      handleSuccess(data.item);
    },
    onError: (error): void => {
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

  const {
    trimmedName,
    trimmedPrompt,
    canSave: canSaveAutomation,
  } = getAutomationDraftSaveState(activeDraft);
  const isAwaitingTargetAutomation =
    directiveSeed?.id != null &&
    targetAutomation == null &&
    automationsData == null;
  const canSaveResolved = canSaveAutomation && !isAwaitingTargetAutomation;
  const resolvedRrule = resolveAutomationDraftRrule(activeDraft);
  const isSavingAutomation =
    createAutomation.isPending || updateAutomation.isPending;
  const isEditingAutomation = activeDraft.id != null;
  const automationFormId = "automation-directive-form";

  const handleSubmit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    if (!canSaveResolved) {
      return;
    }
    const executionEnvironment = activeDraft.executionEnvironment;
    const model = activeDraft.model;
    if (executionEnvironment == null || model == null) {
      return;
    }
    if (activeDraft.id != null) {
      updateAutomation.mutate({
        id: activeDraft.id,
        kind: "cron",
        name: trimmedName,
        prompt: trimmedPrompt,
        status: activeDraft.status,
        cwds: activeDraft.cwds,
        executionEnvironment,
        model,
        reasoningEffort: activeDraft.reasoningEffort,
        rrule: resolvedRrule,
      });
      return;
    }
    createAutomation.mutate({
      kind: "cron",
      name: trimmedName,
      prompt: trimmedPrompt,
      cwds: activeDraft.cwds,
      executionEnvironment,
      model,
      reasoningEffort: activeDraft.reasoningEffort,
      rrule: resolvedRrule,
    });
  };

  if (!isDialogOpen) {
    return null;
  }

  return (
    <AutomationForm
      variant="dialog"
      open={isDialogOpen}
      onOpenChange={(nextOpen): void => {
        if (!nextOpen) {
          closeDialog();
        }
      }}
      draft={activeDraft}
      setDraft={setDraft}
      canSave={canSaveResolved}
      isEditing={isEditingAutomation}
      isSaving={isSavingAutomation}
      roots={roots}
      formatRootLabel={formatRootLabel}
      workspaceGroups={workspaceGroups}
      onSubmit={handleSubmit}
      onCancel={closeDialog}
      formId={automationFormId}
      forceShowNameInput
      allowedKinds={["cron"]}
      dialogSize="wide"
    />
  );
}
