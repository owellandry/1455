import { useScope } from "maitai";
import type { ConversationId } from "protocol";
import { useEffect, useRef } from "react";
import { FormattedMessage } from "react-intl";

import { useAuth } from "@/auth/use-auth";
import { Button } from "@/components/button";
import { BasicDropdown, Dropdown } from "@/components/dropdown";
import { Tooltip } from "@/components/tooltip";
import { useModelSettings } from "@/hooks/use-model-settings";
import { useWindowType } from "@/hooks/use-window-type";
import CheckMdIcon from "@/icons/check-md.svg";
import ChevronIcon from "@/icons/chevron.svg";
import { formatAccelerator } from "@/keyboard-shortcuts/electron-menu-shortcuts";
import { useHotkey } from "@/keyboard-shortcuts/use-hotkey";
import { productEventLogger$ } from "@/product-event-signal";
import { hasListModelsLoaded, useListModels } from "@/queries/model-queries";
import { AppScope } from "@/scopes/app-scope";
import type { ReasoningEffortKey } from "@/types/models";

import { REASONING_PICKER_ACCELERATOR } from "./composer-shortcuts";
import { ReasoningEffortLabelMessage } from "./model-and-reasoning-effort-translations";
import { useComposerController } from "./prosemirror/use-composer-controller";
import { getReasoningEffortIcon } from "./reasoning-effort-icons";
import {
  getAvailableReasoningEffortOptions,
  getSelectedReasoningEffort,
} from "./reasoning-effort-options";
import { useDropdownTooltipSuppression } from "./use-dropdown-tooltip-suppression";

function requestFocusSelectedReasoningItem(): number {
  return window.requestAnimationFrame(() => {
    document
      .querySelector<HTMLElement>('[data-reasoning-selected="true"]')
      ?.focus();
  });
}

function RenderReasoningOption({
  effort,
}: {
  effort: ReasoningEffortKey;
}): React.ReactElement {
  return (
    <span className="flex min-w-0 items-center gap-1">
      <span className="truncate whitespace-nowrap">
        <ReasoningEffortLabelMessage effort={effort} />
      </span>
    </span>
  );
}

export function DynamicReasoningEffortDropdown({
  conversationId,
  hideLabel,
}: {
  conversationId: ConversationId | null;
  hideLabel?: boolean;
}): React.ReactElement | null {
  const isElectron = useWindowType() === "electron";
  const { authMethod } = useAuth();
  const scope = useScope(AppScope);
  const composerController = useComposerController();
  const { data: listModelsData, status: listModelsStatus } = useListModels();
  const modelsByType = listModelsData?.modelsByType;

  const hasLoadedModels = hasListModelsLoaded(listModelsStatus);
  const isLoading = !hasLoadedModels;
  const isUsingCopilotApi = authMethod === "copilot";
  const shortcutLabel = formatAccelerator(REASONING_PICKER_ACCELERATOR);
  const shouldFocusComposerOnCloseRef = useRef(false);

  const { modelSettings, setModelAndReasoningEffort } =
    useModelSettings(conversationId);
  const {
    isOpen,
    setIsOpen,
    tooltipOpen,
    triggerRef,
    onTriggerBlur,
    onTriggerPointerLeave,
    handleSelectAndClose,
  } = useDropdownTooltipSuppression();
  const triggerTooltipTextClassName = isElectron ? "text-left" : "text-center";
  const availableReasoningEfforts = getAvailableReasoningEffortOptions(
    modelsByType,
    modelSettings.model,
  );
  const selectedEffort = getSelectedReasoningEffort(
    modelSettings.reasoningEffort,
    availableReasoningEfforts,
  );
  const SelectedIcon = getReasoningEffortIcon(selectedEffort);

  useHotkey({
    accelerator: REASONING_PICKER_ACCELERATOR,
    enabled: !isUsingCopilotApi && !isLoading,
    ignoreWithin: "[data-codex-terminal]",
    onKeyDown: (event) => {
      if (!composerController.view.hasFocus()) {
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      if (isOpen) {
        requestFocusSelectedReasoningItem();
        return;
      }
      setIsOpen(true);
    },
  });

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    const frameId = requestFocusSelectedReasoningItem();
    return (): void => {
      window.cancelAnimationFrame(frameId);
    };
  }, [isOpen]);

  if (isLoading) {
    return null;
  }

  return (
    <BasicDropdown
      side="top"
      open={isOpen}
      disabled={isUsingCopilotApi}
      onOpenChange={setIsOpen}
      onCloseAutoFocus={(event) => {
        if (!shouldFocusComposerOnCloseRef.current) {
          return;
        }
        shouldFocusComposerOnCloseRef.current = false;
        event.preventDefault();
        composerController.focus();
      }}
      onEscapeKeyDown={() => {
        shouldFocusComposerOnCloseRef.current = true;
      }}
      triggerButton={
        <Tooltip
          open={tooltipOpen}
          triggerRef={triggerRef}
          shortcut={shortcutLabel}
          tooltipContent={
            <span className={triggerTooltipTextClassName}>
              <FormattedMessage
                id="composer.reasoningEffort.local.reasoning.tooltip"
                defaultMessage="Select reasoning effort"
                description="Tooltip for model reasoning effort dropdown trigger"
              />
            </span>
          }
        >
          <Button
            size="composer"
            color="ghost"
            className="min-w-0"
            disabled={isUsingCopilotApi}
            onPointerLeave={onTriggerPointerLeave}
            onBlur={onTriggerBlur}
          >
            {hideLabel ? <SelectedIcon className="icon-2xs" /> : null}
            {!hideLabel ? (
              <RenderReasoningOption effort={selectedEffort} />
            ) : null}
            <ChevronIcon className="icon-2xs text-token-input-placeholder-foreground" />
          </Button>
        </Tooltip>
      }
    >
      <div className="flex w-fit flex-col overflow-hidden">
        <Dropdown.Title>
          <FormattedMessage
            id="composer.mode.local.model.selecrReasoningEffort"
            defaultMessage="Select reasoning"
            description="Header label above model reasoning effort options in dropdown"
          />
        </Dropdown.Title>
        <div className="flex max-h-[250px] flex-col overflow-y-auto">
          {availableReasoningEfforts.map(({ reasoningEffort }) => {
            const Icon = getReasoningEffortIcon(reasoningEffort);
            return (
              <Dropdown.Item
                key={reasoningEffort}
                data-reasoning-selected={
                  reasoningEffort === selectedEffort ? "true" : undefined
                }
                LeftIcon={Icon}
                RightIcon={
                  reasoningEffort === selectedEffort ? CheckMdIcon : undefined
                }
                onClick={() => {
                  scope.get(productEventLogger$).log({
                    eventName: "codex_composer_reasoning_effort_changed",
                    metadata: { reasoning_effort: reasoningEffort },
                  });
                  void setModelAndReasoningEffort(
                    modelSettings.model,
                    reasoningEffort,
                  );
                  handleSelectAndClose();
                  composerController.focus();
                }}
              >
                <RenderReasoningOption effort={reasoningEffort} />
              </Dropdown.Item>
            );
          })}
        </div>
      </div>
    </BasicDropdown>
  );
}
