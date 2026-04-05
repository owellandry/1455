import clsx from "clsx";
import { useAtom } from "jotai";
import { useScope } from "maitai";
import type { AgentMode, ConversationId } from "protocol";
import { useEffect, useState } from "react";
import { defineMessage, FormattedMessage, useIntl } from "react-intl";

import type { AppServerManager } from "@/app-server/app-server-manager";
import { Button } from "@/components/button";
import { Dialog } from "@/components/dialog";
import {
  DialogBody,
  DialogFooter,
  DialogHeader,
  DialogSection,
} from "@/components/dialog-layout";
import { BasicDropdown, Dropdown } from "@/components/dropdown";
import { Tooltip } from "@/components/tooltip";
import { useWindowType } from "@/hooks/use-window-type";
import { useWindowsSandboxRequirement } from "@/hooks/use-windows-sandbox-requirement";
import CheckIcon from "@/icons/check-md.svg";
import ChevronIcon from "@/icons/chevron.svg";
import SettingsCogIcon from "@/icons/settings.cog.svg";
import ShieldCheckIcon from "@/icons/shield-check.svg";
import ShieldCodeIcon from "@/icons/shield-code.svg";
import ShieldExclamationIcon from "@/icons/shield-exclamation.svg";
import { productEventLogger$ } from "@/product-event-signal";
import { AppScope } from "@/scopes/app-scope";

import {
  aAgentMode,
  aHasSetInitialAgentMode,
  aSkipFullAccessConfirm,
} from "./composer-atoms";
import {
  getInitialAgentModeSelection,
  getNextAgentModeSelection,
  resolvePermissionsModeConfigState,
  resolvePermissionsModeSelectionState,
  shouldKeepCurrentAgentModeSelection,
} from "./permissions-mode-helpers";
import {
  usePermissionsModeConfigData,
  usePermissionsModeSelectionData,
} from "./use-permissions-mode";

const FULL_ACCESS_TEXT_COLOR_CLASS = "text-token-editor-warning-foreground";
const guardianApprovalLabelMessage = defineMessage({
  id: "composer.mode.agentMode.guardianApprovals",
  defaultMessage: "Guardian approvals",
  description: "Label for Guardian approvals mode",
});

export function PermissionsModeDropdown({
  conversationId,
  appServerManagerOverride,
  cwdOverride,
}: {
  conversationId: ConversationId | null;
  appServerManagerOverride?: AppServerManager | null;
  cwdOverride?: string | null;
}): React.ReactElement | null {
  const isElectron = useWindowType() === "electron";
  const intl = useIntl();
  const scope = useScope(AppScope);
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useAtom(aAgentMode);
  const [hasSetInitialAgentMode, setHasSetInitialAgentMode] = useAtom(
    aHasSetInitialAgentMode,
  );
  const [skipFullAccessConfirm, setSkipFullAccessConfirm] = useAtom(
    aSkipFullAccessConfirm,
  );
  const [isFullAccessConfirmOpen, setIsFullAccessConfirmOpen] = useState(false);
  const { isRequired: isWindowsSandboxRequired } = useWindowsSandboxRequirement(
    appServerManagerOverride ?? undefined,
  );
  const permissionsModeConfigData = usePermissionsModeConfigData({
    conversationId,
    appServerManagerOverride,
    cwdOverride,
  });
  const {
    availableAgentModes,
    canShowCustom,
    canUnlock: canShowFullAccess,
    customEquivalentMode,
    isGuardianModeAvailable,
    isConfigDataPending,
    baseNonFullAccessMode,
    configNonFullAccessMode,
    showGuardianOption,
  } = resolvePermissionsModeConfigState(permissionsModeConfigData);
  const { preferredNonFullAccessMode, setPreferredNonFullAccessMode } =
    usePermissionsModeSelectionData();
  const {
    canSelectGuardianMode,
    resolvedNonFullAccessMode,
    validPreferredNonFullAccessMode,
    shouldClearPreferredNonFullAccessMode,
  } = resolvePermissionsModeSelectionState({
    availableAgentModes,
    preferredNonFullAccessMode,
    isGuardianModeAvailable,
    isConfigDataPending,
    configNonFullAccessMode,
  });
  const optionCount =
    1 +
    (canSelectGuardianMode ? 1 : 0) +
    (canShowFullAccess ? 1 : 0) +
    (canShowCustom ? 1 : 0);
  const isDisabled = isConfigDataPending || optionCount <= 1;
  const isDefaultSelected =
    mode !== "guardian-approvals" &&
    mode !== "full-access" &&
    mode !== "custom";
  const triggerLabel = isDefaultSelected ? (
    <FormattedMessage
      id="composer.permissionsDropdown.default.label"
      defaultMessage="Default permissions"
      description="Dropdown label for the default permissions mode"
    />
  ) : mode === "full-access" ? (
    <FormattedMessage
      id="composer.permissionsDropdown.fullAccess.label"
      defaultMessage="Full access"
      description="Dropdown label for the full access permissions mode"
    />
  ) : mode === "guardian-approvals" ? (
    <FormattedMessage {...guardianApprovalLabelMessage} />
  ) : (
    <FormattedMessage
      id="composer.permissionsDropdown.custom.label"
      defaultMessage="Custom (config.toml)"
      description="Dropdown label for the custom permissions mode"
    />
  );
  const triggerIcon = isDefaultSelected ? (
    <ShieldCodeIcon className="icon-xs shrink-0" />
  ) : mode === "full-access" ? (
    <ShieldExclamationIcon
      className={`icon-xs shrink-0 ${FULL_ACCESS_TEXT_COLOR_CLASS}`}
    />
  ) : mode === "guardian-approvals" ? (
    <ShieldCheckIcon className="icon-xs shrink-0" />
  ) : (
    <SettingsCogIcon className="icon-xs shrink-0" />
  );

  const logPermissionsModeChange = (endAgentMode: AgentMode): void => {
    scope.get(productEventLogger$).log({
      eventName: "codex_composer_permissions_mode_changed",
      metadata: {
        start_agent_mode: mode,
        end_agent_mode: endAgentMode,
      },
    });
  };

  useEffect(() => {
    if (shouldClearPreferredNonFullAccessMode) {
      setPreferredNonFullAccessMode(null);
    }
  }, [setPreferredNonFullAccessMode, shouldClearPreferredNonFullAccessMode]);

  const initialMode = getInitialAgentModeSelection(
    availableAgentModes,
    customEquivalentMode,
    resolvedNonFullAccessMode,
    validPreferredNonFullAccessMode,
  );
  const nextMode = getNextAgentModeSelection(
    mode,
    validPreferredNonFullAccessMode,
    resolvedNonFullAccessMode,
    availableAgentModes,
    customEquivalentMode,
  );
  const shouldPreserveCurrentModeOnFirstLoad =
    initialMode !== "custom" &&
    shouldKeepCurrentAgentModeSelection(
      mode,
      availableAgentModes,
      customEquivalentMode,
    );

  useEffect(() => {
    if (isConfigDataPending) {
      return;
    }
    if (!hasSetInitialAgentMode) {
      if (shouldPreserveCurrentModeOnFirstLoad) {
        setHasSetInitialAgentMode(true);
        return;
      }
      if (mode !== initialMode) {
        setMode(initialMode);
      }
      setHasSetInitialAgentMode(true);
      return;
    }
    const isCurrentModeValid = availableAgentModes.includes(mode);
    if ((mode === "full-access" || mode === "custom") && isCurrentModeValid) {
      return;
    }
    if (nextMode != null && mode !== nextMode) {
      setMode(nextMode);
    }
  }, [
    availableAgentModes,
    hasSetInitialAgentMode,
    initialMode,
    isConfigDataPending,
    mode,
    nextMode,
    shouldPreserveCurrentModeOnFirstLoad,
    setHasSetInitialAgentMode,
    setMode,
  ]);

  const handleSelectDefault = (): void => {
    const fallbackMode = isWindowsSandboxRequired
      ? "read-only"
      : baseNonFullAccessMode;
    logPermissionsModeChange(fallbackMode);
    if (mode !== fallbackMode) {
      if (!isWindowsSandboxRequired) {
        setPreferredNonFullAccessMode(fallbackMode);
      }
      setMode(fallbackMode);
    }
    setOpen(false);
  };

  const handleSelectGuardianApprovals = (): void => {
    if (!canSelectGuardianMode) {
      return;
    }
    logPermissionsModeChange("guardian-approvals");
    setPreferredNonFullAccessMode("guardian-approvals");
    setMode("guardian-approvals");
    setOpen(false);
  };

  const handleSelectFullAccess = (): void => {
    if (!canShowFullAccess) {
      return;
    }
    if (!skipFullAccessConfirm) {
      setIsFullAccessConfirmOpen(true);
      return;
    }
    logPermissionsModeChange("full-access");
    setMode("full-access");
    setOpen(false);
  };

  const handleSelectCustom = (): void => {
    if (!canShowCustom) {
      return;
    }
    logPermissionsModeChange("custom");
    setPreferredNonFullAccessMode(null);
    setMode("custom");
    setOpen(false);
  };

  const defaultTooltip = intl.formatMessage({
    id: "composer.permissionsDropdown.default.tooltip",
    defaultMessage: "Codex automatically runs\ncommands in a sandbox",
    description:
      "Tooltip describing the default permissions mode in the composer footer",
  });
  const guardianApprovalsTooltip = canSelectGuardianMode
    ? intl.formatMessage({
        id: "composer.permissionsDropdown.guardianApproval.tooltip",
        defaultMessage:
          "Codex automatically runs commands\nin a sandbox and uses Guardian\napprovals for elevated requests",
        description:
          "Tooltip describing the Guardian approvals permissions mode in the composer footer",
      })
    : intl.formatMessage({
        id: "composer.permissionsDropdown.guardianApproval.disabled",
        defaultMessage:
          "Guardian approvals requires default sandboxed permissions to be available in this workspace.",
        description:
          "Tooltip explaining why Guardian approvals is unavailable in the permissions dropdown",
      });
  const fullAccessTooltip = intl.formatMessage({
    id: "composer.permissionsDropdown.agentMode.tooltip.fullAccess",
    defaultMessage: "Codex has full access over your\ncomputer (elevated risk)",
    description:
      "Tooltip describing the Codex agent permissions when in full-access mode",
  });
  const customTooltip = intl.formatMessage({
    id: "composer.permissionsDropdown.agentMode.tooltip.custom",
    defaultMessage: "Codex uses the permission defined in config.toml.",
    description:
      "Tooltip describing the Codex agent permissions when sourced from config.toml",
  });
  const disabledTooltip = intl.formatMessage({
    id: "composer.permissionsDropdown.disabled.requirements",
    defaultMessage: "Permissions are locked by requirements.toml",
    description:
      "Tooltip shown when the permissions dropdown is disabled by requirements",
  });
  const triggerTooltip = (
    <span className={`block ${isElectron ? "text-left" : "text-center"}`}>
      <FormattedMessage
        id="composer.permissionsDropdown.trigger.tooltip"
        defaultMessage="Change permissions"
        description="Tooltip shown on the permissions dropdown trigger"
      />
    </span>
  );
  const itemTooltipTextClassName = isElectron
    ? "text-left whitespace-pre-line !max-w-none"
    : "text-center whitespace-pre-line";
  const triggerButton = (
    <Button size="composerSm" color="ghost" className="min-w-0">
      {triggerIcon}
      <span
        className={clsx(
          "composer-footer__label--xs max-w-[160px] truncate whitespace-nowrap text-left",
          mode === "full-access" && FULL_ACCESS_TEXT_COLOR_CLASS,
          isConfigDataPending && "loading-shimmer",
        )}
      >
        {triggerLabel}
      </span>
      <ChevronIcon
        className={clsx(
          "icon-2xs shrink-0",
          mode === "full-access"
            ? FULL_ACCESS_TEXT_COLOR_CLASS
            : "text-token-input-placeholder-foreground",
        )}
      />
    </Button>
  );
  const trigger = isDisabled ? (
    isConfigDataPending ? (
      triggerButton
    ) : (
      <Tooltip
        tooltipContent={
          <span className={`block ${isElectron ? "text-left" : "text-center"}`}>
            {disabledTooltip}
          </span>
        }
      >
        {triggerButton}
      </Tooltip>
    )
  ) : (
    <Tooltip tooltipContent={triggerTooltip}>{triggerButton}</Tooltip>
  );

  return (
    <>
      <BasicDropdown
        open={open}
        onOpenChange={setOpen}
        disabled={isDisabled}
        triggerButton={trigger}
      >
        <Dropdown.Item
          onClick={handleSelectDefault}
          tooltipText={defaultTooltip}
          tooltipTextClassName={itemTooltipTextClassName}
        >
          <span className="flex items-center gap-2">
            <span className="icon-2xs flex items-center justify-center">
              <ShieldCodeIcon className="icon-2xs" />
            </span>
            <FormattedMessage
              id="composer.permissionsDropdown.default.optionLabel"
              defaultMessage="Default permissions"
              description="Dropdown option for the default permissions mode"
            />
            <span className="icon-2xs ms-auto flex items-center justify-center">
              {isDefaultSelected ? <CheckIcon className="icon-2xs" /> : null}
            </span>
          </span>
        </Dropdown.Item>
        {/*
          TODO: If Guardian is unsupported on native Windows, hide this item
          before render instead of relying on the generic submit-time block.
        */}
        {showGuardianOption ? (
          <Dropdown.Item
            onClick={handleSelectGuardianApprovals}
            disabled={!canSelectGuardianMode}
            tooltipText={guardianApprovalsTooltip}
            tooltipTextClassName={itemTooltipTextClassName}
          >
            <span className="flex items-center gap-2">
              <span className="icon-2xs flex items-center justify-center">
                <ShieldCheckIcon className="icon-2xs" />
              </span>
              <FormattedMessage {...guardianApprovalLabelMessage} />
              <span className="icon-2xs ms-auto flex items-center justify-center">
                {mode === "guardian-approvals" ? (
                  <CheckIcon className="icon-2xs" />
                ) : null}
              </span>
            </span>
          </Dropdown.Item>
        ) : null}
        <Dropdown.Item
          onClick={handleSelectFullAccess}
          disabled={!canShowFullAccess}
          tooltipText={
            canShowFullAccess
              ? fullAccessTooltip
              : intl.formatMessage({
                  id: "composer.permissionsDropdown.fullAccess.disabled",
                  defaultMessage:
                    "Full access is disabled by requirements.toml",
                  description:
                    "Tooltip explaining why full access is unavailable in the permissions dropdown",
                })
          }
          tooltipTextClassName={itemTooltipTextClassName}
        >
          <span className="flex items-center gap-2">
            <span className="icon-2xs flex items-center justify-center">
              <ShieldExclamationIcon className="icon-2xs" />
            </span>
            <FormattedMessage
              id="composer.permissionsDropdown.fullAccess.optionLabel"
              defaultMessage="Full access"
              description="Dropdown option for the full access permissions mode"
            />
            <span className="icon-2xs ms-auto flex items-center justify-center">
              {mode === "full-access" ? (
                <CheckIcon className="icon-2xs" />
              ) : null}
            </span>
          </span>
        </Dropdown.Item>
        {canShowCustom ? (
          <Dropdown.Item
            onClick={handleSelectCustom}
            tooltipText={customTooltip}
            tooltipTextClassName={itemTooltipTextClassName}
          >
            <span className="flex items-center gap-2">
              <span className="icon-2xs flex items-center justify-center">
                <SettingsCogIcon className="icon-2xs" />
              </span>
              <FormattedMessage
                id="composer.permissionsDropdown.custom.optionLabel"
                defaultMessage="Custom (config.toml)"
                description="Dropdown option for the custom permissions mode"
              />
              <span className="icon-2xs ms-auto flex items-center justify-center">
                {mode === "custom" ? <CheckIcon className="icon-2xs" /> : null}
              </span>
            </span>
          </Dropdown.Item>
        ) : null}
      </BasicDropdown>
      <FullAccessConfirmDialog
        open={isFullAccessConfirmOpen}
        onOpenChange={(next) => {
          setIsFullAccessConfirmOpen(next);
        }}
        onConfirm={() => {
          logPermissionsModeChange("full-access");
          setMode("full-access");
          setSkipFullAccessConfirm(true);
          setIsFullAccessConfirmOpen(false);
        }}
      />
    </>
  );
}

function FullAccessConfirmDialog({
  open,
  onOpenChange,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}): React.ReactElement {
  return (
    <Dialog open={open} showDialogClose={false} onOpenChange={onOpenChange}>
      <DialogBody>
        <DialogSection>
          <DialogHeader
            title={
              <FormattedMessage
                id="composer.mode.agentMode.fullAccessConfirm.title"
                defaultMessage="Enable full access?"
                description="Title for confirmation dialog when switching to full-access"
              />
            }
          />
        </DialogSection>
        <DialogSection className="gap-3 text-token-description-foreground">
          <p>
            <FormattedMessage
              id="composer.mode.agentMode.fullAccessConfirm.description"
              defaultMessage="When Codex runs with full access, it can edit any file on your computer and run commands with network, without your approval."
              description="Description of implications when confirming full-access mode"
            />
          </p>
          <p>
            <FormattedMessage
              id="composer.mode.agentMode.fullAccessConfirm.caution"
              defaultMessage="Exercise caution when enabling full access. This significantly increases the risk of data loss, leaks, or unexpected behavior."
              description="Warning of dangers when confirming full-access mode"
            />
          </p>
        </DialogSection>
        <DialogSection>
          <DialogFooter>
            <Button
              color="primary"
              onClick={() => {
                onOpenChange(false);
              }}
            >
              <FormattedMessage
                id="composer.mode.agentMode.fullAccessConfirm.goBack"
                defaultMessage="Cancel"
                description="Button to cancel enabling full-access"
              />
            </Button>
            <Button
              color="danger"
              onClick={() => {
                onConfirm();
              }}
            >
              <FormattedMessage
                id="composer.mode.agentMode.fullAccessConfirm.confirm"
                defaultMessage="Yes, continue anyway"
                description="Button to confirm enabling full-access and that the user understands the implications of full-access mode"
              />
            </Button>
          </DialogFooter>
        </DialogSection>
      </DialogBody>
    </Dialog>
  );
}
