import type * as AppServer from "app-server-types";
import clsx from "clsx";
import { useScope } from "maitai";
import type { ConversationId } from "protocol";
import { useEffect, useRef } from "react";
import { FormattedMessage, useIntl } from "react-intl";

import { useLocalConversationSelector } from "@/app-server/app-server-manager-hooks";
import { Button } from "@/components/button";
import { BasicDropdown, Dropdown } from "@/components/dropdown";
import { toast$ } from "@/components/toaster/toast-signal";
import { Tooltip } from "@/components/tooltip";
import {
  useModelSettings,
  type ModelSettingsChangeHandler,
} from "@/hooks/use-model-settings";
import { useServiceTierSettings } from "@/hooks/use-service-tier-settings";
import CheckMdIcon from "@/icons/check-md.svg";
import ChevronIcon from "@/icons/chevron.svg";
import CubeIcon from "@/icons/cube.svg";
import LightningBoltIcon from "@/icons/lightning-bolt.svg";
import { isEnglishLocaleCode } from "@/intl/locale-resolver";
import { formatAccelerator } from "@/keyboard-shortcuts/electron-menu-shortcuts";
import { useHotkey } from "@/keyboard-shortcuts/use-hotkey";
import { productEventLogger$ } from "@/product-event-signal";
import { hasListModelsLoaded, useListModels } from "@/queries/model-queries";
import { AppScope } from "@/scopes/app-scope";
import type { ModelsByType } from "@/types/models";
import { formatModelDisplayName } from "@/utils/format-model-display-name";
import { getModelFromModelsByType } from "@/utils/normalize-model-settings";
import { coerceServiceTier } from "@/utils/service-tier";

import { MODEL_PICKER_ACCELERATOR } from "./composer-shortcuts";
import { useComposerController } from "./prosemirror/use-composer-controller";
import { useDropdownTooltipSuppression } from "./use-dropdown-tooltip-suppression";

function requestFocusSelectedModelItem(): number {
  return window.requestAnimationFrame(() => {
    document
      .querySelector<HTMLElement>('[data-model-selected="true"]')
      ?.focus();
  });
}

function RenderModelOption({
  displayName,
  model,
  showFastModeIndicator = false,
}: {
  displayName: string | undefined;
  model: string;
  showFastModeIndicator?: boolean;
}): React.ReactElement {
  const label =
    displayName != null ? (
      formatModelDisplayName(displayName)
    ) : model ? (
      <FormattedMessage
        id="composer.mode.local.model.custom"
        defaultMessage="Custom"
        description="Custom model from config"
      />
    ) : (
      model
    );
  return (
    <span className="flex min-w-0 items-center gap-1 tabular-nums">
      {showFastModeIndicator ? (
        <LightningBoltIcon className="icon-2xs text-token-link-foreground shrink-0" />
      ) : null}
      <span className="truncate whitespace-nowrap">{label}</span>
    </span>
  );
}

function shouldShowFastModeIndicator(
  model: string,
  isFastModeOn: boolean,
): boolean {
  return isFastModeOn && model === "gpt-5.4";
}

export function DynamicModelDropdown({
  conversationId,
  disabled = false,
  forcedModel = null,
  hideLabel,
}: {
  conversationId: ConversationId | null;
  disabled?: boolean;
  forcedModel?: string | null;
  hideLabel?: boolean;
}): React.ReactElement {
  const { data: listModelsData, status: listModelsStatus } = useListModels();
  const composerController = useComposerController();

  const modelsByType = listModelsData?.modelsByType;
  const hasLoadedModels = hasListModelsLoaded(listModelsStatus);
  const isLoading = !hasLoadedModels;
  const isDisabled = disabled || isLoading || listModelsStatus === "error";
  const shortcutLabel = formatAccelerator(MODEL_PICKER_ACCELERATOR);
  const shouldFocusComposerOnCloseRef = useRef(false);

  const { modelSettings: currentModelSettings, setModelAndReasoningEffort } =
    useModelSettings(conversationId);
  const { serviceTierSettings } = useServiceTierSettings(conversationId);
  const shouldWarnAboutModelChanges = useLocalConversationSelector(
    conversationId,
    (conversation) => (conversation?.turns.length ?? 0) > 0,
  );
  const isFastModeOn =
    coerceServiceTier(serviceTierSettings.serviceTier) === "fast";
  const {
    isOpen,
    setIsOpen,
    tooltipOpen,
    triggerRef,
    onTriggerBlur,
    onTriggerPointerLeave,
    handleSelectAndClose,
  } = useDropdownTooltipSuppression();
  const selectedModel = forcedModel ?? currentModelSettings.model;
  const selectedModelDisplayName =
    forcedModel ??
    getModelDisplayName(currentModelSettings.model, modelsByType);
  const shouldShowLoadingState = forcedModel == null && isLoading;

  const currentModelDropdownOptions = (
    <ModelDropdownOptions
      models={modelsByType?.models}
      modelSettings={currentModelSettings}
      isFastModeOn={isFastModeOn}
      setModelAndReasoningEffort={setModelAndReasoningEffort}
      conversationId={conversationId}
      shouldWarnAboutModelChanges={shouldWarnAboutModelChanges}
      focusComposer={() => {
        composerController.focus();
      }}
      onSelectComplete={handleSelectAndClose}
    />
  );

  useHotkey({
    accelerator: MODEL_PICKER_ACCELERATOR,
    enabled: !isDisabled,
    ignoreWithin: "[data-codex-terminal]",
    onKeyDown: (event) => {
      if (!composerController.view.hasFocus()) {
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      if (isOpen) {
        requestFocusSelectedModelItem();
        return;
      }
      setIsOpen(true);
    },
  });

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    const frameId = requestFocusSelectedModelItem();
    return (): void => {
      window.cancelAnimationFrame(frameId);
    };
  }, [isOpen]);

  return (
    <BasicDropdown
      side="top"
      open={isOpen}
      disabled={isDisabled}
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
          disabled={isDisabled}
          shortcut={shortcutLabel}
          tooltipContent={
            <span className="block max-w-[320px] text-center">
              {selectedModelDisplayName ? (
                <FormattedMessage
                  id="composer.mode.local.model.tooltip"
                  defaultMessage="Choose model"
                  description="Tooltip for model+reasoning dropdown trigger"
                />
              ) : (
                <span className="tabular-nums">{selectedModel}</span>
              )}
            </span>
          }
        >
          <Button
            size="composer"
            color="ghost"
            className="min-w-0"
            onPointerLeave={onTriggerPointerLeave}
            onBlur={onTriggerBlur}
          >
            {hideLabel ? <CubeIcon className="icon-2xs" /> : null}
            {!hideLabel ? (
              <div
                className={clsx(
                  "min-w-0",
                  shouldShowLoadingState && "loading-shimmer max-w-sm",
                )}
              >
                {shouldShowLoadingState ? (
                  <span className="block truncate whitespace-nowrap">
                    <FormattedMessage
                      id="composer.mode.local.model.loadingModel"
                      defaultMessage="Loading model"
                      description="Dropdown label for loading model"
                    />
                  </span>
                ) : (
                  <RenderModelOption
                    displayName={selectedModelDisplayName}
                    model={selectedModel}
                    showFastModeIndicator={shouldShowFastModeIndicator(
                      selectedModel,
                      isFastModeOn,
                    )}
                  />
                )}
              </div>
            ) : null}
            {forcedModel == null ? (
              <ChevronIcon className="icon-2xs text-token-input-placeholder-foreground" />
            ) : null}
          </Button>
        </Tooltip>
      }
    >
      <div className="flex w-fit min-w-40 flex-col overflow-hidden">
        <Dropdown.Title>
          <FormattedMessage
            id="composer.mode.local.model.selectModel"
            defaultMessage="Select model"
            description="Header label above model options in dropdown"
          />
        </Dropdown.Title>
        <div className="flex max-h-[250px] flex-col overflow-y-auto">
          {currentModelDropdownOptions}
        </div>
      </div>
    </BasicDropdown>
  );
}

function ModelDropdownOptions({
  models,
  modelSettings,
  isFastModeOn,
  setModelAndReasoningEffort,
  conversationId,
  shouldWarnAboutModelChanges,
  focusComposer,
  onSelectComplete,
}: ModelSettingsChangeHandler & {
  models: Array<AppServer.v2.Model> | undefined;
  isFastModeOn: boolean;
  conversationId: ConversationId | null;
  shouldWarnAboutModelChanges: boolean;
  focusComposer: () => void;
  onSelectComplete: () => void;
}): React.ReactElement | null {
  const { locale } = useIntl();
  const scope = useScope(AppScope);
  const showModelTooltips = isEnglishLocaleCode(locale);
  if (!models) {
    return null;
  }

  return (
    <>
      {models.map(
        ({
          model,
          displayName,
          description,
          supportedReasoningEfforts,
          defaultReasoningEffort,
        }) => {
          return (
            <Dropdown.Item
              key={model}
              data-model-selected={
                model === modelSettings.model ? "true" : undefined
              }
              RightIcon={
                model === modelSettings.model ? CheckMdIcon : undefined
              }
              tooltipText={showModelTooltips ? description : undefined}
              onClick={() => {
                scope.get(productEventLogger$).log({
                  eventName: "codex_composer_model_changed",
                  metadata: { model },
                });
                if (
                  shouldWarnAboutModelChanges &&
                  model !== modelSettings.model
                ) {
                  scope
                    .get(toast$)
                    .info(
                      <FormattedMessage
                        id="composer.modelChangeDuringConversationWarning.toast"
                        defaultMessage="Changing models mid-conversation will degrade performance."
                        description="Warning toast shown when user changes model during an ongoing conversation"
                      />,
                      {
                        id: `composer.modelChangeDuringConversationWarning.${conversationId}`,
                      },
                    );
                }
                const reasoningEffort =
                  supportedReasoningEfforts.find(
                    ({ reasoningEffort }: AppServer.v2.ReasoningEffortOption) =>
                      reasoningEffort === modelSettings.reasoningEffort,
                  )?.reasoningEffort ?? defaultReasoningEffort;
                void setModelAndReasoningEffort(model, reasoningEffort);
                onSelectComplete();
                focusComposer();
              }}
            >
              <RenderModelOption
                displayName={displayName}
                model={model}
                showFastModeIndicator={shouldShowFastModeIndicator(
                  model,
                  isFastModeOn,
                )}
              />
            </Dropdown.Item>
          );
        },
      )}
    </>
  );
}

function getModelDisplayName(
  model: string,
  modelsByType: ModelsByType | undefined,
): string | undefined {
  return getModelFromModelsByType(model, modelsByType)?.displayName;
}
