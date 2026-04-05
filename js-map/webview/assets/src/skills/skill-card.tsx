import { useMutation, useQueryClient } from "@tanstack/react-query";
import type * as AppServer from "app-server-types";
import clsx from "clsx";
import { useScope } from "maitai";
import type { ReactElement, ReactNode } from "react";
import { useState } from "react";
import { defineMessages, FormattedMessage, useIntl } from "react-intl";

import { useDefaultAppServerManager } from "@/app-server/app-server-manager-hooks";
import { Badge } from "@/components/badge";
import { Button } from "@/components/button";
import { BasicDropdown, Dropdown } from "@/components/dropdown";
import { InstalledCardActions } from "@/components/installed-card-actions";
import { MoreMenuTrigger } from "@/components/more-menu-trigger";
import { toast$ } from "@/components/toaster/toast-signal";
import { Toggle } from "@/components/toggle";
import { Tooltip } from "@/components/tooltip";
import type { HomeLocationState } from "@/home-page";
import { useIsRemoteHost } from "@/hooks/use-is-remote-host";
import { useStartNewConversation } from "@/hooks/use-start-new-conversation";
import ChatsIcon from "@/icons/chats.svg";
import { productEventLogger$ } from "@/product-event-signal";
import { AppScope } from "@/scopes/app-scope";
import { getSkillDescription } from "@/skills/get-skill-description";
import { getSkillIcon } from "@/skills/get-skill-icon";
import { SkillPreviewCardShell } from "@/skills/skill-preview-card-shell";
import {
  SkillMarkdownPreviewBody,
  SkillPreviewModalTitle,
} from "@/skills/skill-preview-modal";
import { getSkillPrefillPrompt } from "@/skills/skill-utils";
import { logger } from "@/utils/logger";
import { getSkillIconClassName } from "@/utils/skill-icon-class";
import { getQueryKey, useMutationFromVSCode } from "@/vscode-api";

import type { InstalledCardAction } from "./installed-card-action";

const messages = defineMessages({
  disableSkill: {
    id: "skills.card.disableSkill",
    defaultMessage: "Disable skill",
    description: "Label for the disable skill toggle on skill cards",
  },
  enableSkill: {
    id: "skills.card.enableSkill",
    defaultMessage: "Enable skill",
    description: "Label for the enable skill toggle on skill cards",
  },
  enabledStatus: {
    id: "skills.card.enabledStatus",
    defaultMessage: "Skill enabled",
    description: "Status label for an installed skill that is enabled",
  },
  disabledStatus: {
    id: "skills.card.disabledStatus",
    defaultMessage: "Skill disabled",
    description: "Status label for an installed skill that is disabled",
  },
  enableButton: {
    id: "skills.card.enableButton",
    defaultMessage: "Enable",
    description: "Button label for enabling a disabled skill from a skill card",
  },
  uninstallSkill: {
    id: "skills.card.uninstallSkill",
    defaultMessage: "Uninstall skill",
    description: "Tooltip label for uninstalling a skill from a skill card",
  },
});

export function SkillCard({
  actionLabel,
  cardIcon,
  cardIconContainer = true,
  cardClassName,
  skill,
  displayName,
  installedStateAction = "check",
  showModalUninstall = true,
  scopeBadges,
  repoRoot,
  onSkillsUpdated,
}: {
  actionLabel?: ReactNode;
  cardIcon?: ReactElement;
  cardIconContainer?: boolean;
  cardClassName?: string;
  skill: AppServer.v2.SkillMetadata;
  displayName?: string;
  installedStateAction?: InstalledCardAction;
  showModalUninstall?: boolean;
  scopeBadges: Array<ReactNode>;
  repoRoot?: string | null;
  onSkillsUpdated?: () => void;
}): ReactElement {
  const intl = useIntl();
  const startNewConversation = useStartNewConversation();
  const appServerManager = useDefaultAppServerManager();
  const queryClient = useQueryClient();
  const scope = useScope(AppScope);
  const openFile = useMutationFromVSCode("open-file");
  const [optimisticEnabled, setOptimisticEnabled] = useState<boolean | null>(
    null,
  );
  const [isModalSkillToggleTooltipOpen, setIsModalSkillToggleTooltipOpen] =
    useState(false);
  const isRemoteHost = useIsRemoteHost();
  const displayLabel = displayName ?? skill.name;
  const removeSkillMutation = useMutationFromVSCode("remove-skill", {
    onSettled: (): void => {
      onSkillsUpdated?.();
      void queryClient.invalidateQueries({
        queryKey: getQueryKey("recommended-skills", { refresh: false }),
      });
    },
    onSuccess: (): void => {
      scope.get(toast$).success(
        <FormattedMessage
          id="skills.card.removeSuccess"
          defaultMessage="{skillName} skill uninstalled"
          description="Toast shown after successfully uninstalling a skill"
          values={{
            skillName: <span className="font-medium">{displayLabel}</span>,
          }}
        />,
      );
    },
    onError: (): void => {
      scope.get(toast$).danger(
        intl.formatMessage({
          id: "skills.card.removeFailed",
          defaultMessage: "Failed to uninstall skill",
          description: "Toast message shown when uninstalling a skill fails",
        }),
      );
    },
  });
  const updateSkillEnabledMutation = useMutation({
    mutationFn: (enabled: boolean) =>
      appServerManager.writeSkillConfig(
        skill.name.includes(":")
          ? { name: skill.name, enabled }
          : { path: skill.path, enabled },
      ),
    onSuccess: (_response, enabled): void => {
      onSkillsUpdated?.();
      const toastMessage = enabled ? (
        <FormattedMessage
          id="skills.card.enableSuccess"
          defaultMessage="{skillName} skill enabled"
          description="Toast shown after successfully enabling a skill"
          values={{
            skillName: <span className="font-medium">{displayLabel}</span>,
          }}
        />
      ) : (
        <FormattedMessage
          id="skills.card.disableSuccess"
          defaultMessage="{skillName} skill disabled"
          description="Toast shown after successfully disabling a skill"
          values={{
            skillName: <span className="font-medium">{displayLabel}</span>,
          }}
        />
      );
      scope.get(toast$).success(toastMessage);
    },
    onError: (error) => {
      setOptimisticEnabled(null);
      logger.error(`Failed to update skill enabled state`, {
        safe: {},
        sensitive: {
          error: error,
        },
      });
      scope.get(toast$).danger(
        intl.formatMessage({
          id: "skills.card.toggleEnabledError",
          defaultMessage: "Failed to update skill",
          description:
            "Toast message shown when enabling or disabling a skill fails",
        }),
      );
    },
  });
  const isOptimisticEnabledActive =
    optimisticEnabled != null &&
    (updateSkillEnabledMutation.isPending ||
      skill.enabled !== optimisticEnabled);
  const effectiveSkillEnabled = isOptimisticEnabledActive
    ? optimisticEnabled
    : skill.enabled;

  const description = getSkillDescription(skill);
  const titleLabel = (
    <SkillPreviewModalTitle
      kind="Skill"
      title={displayLabel}
      badge={
        effectiveSkillEnabled ? null : (
          <Badge className="border border-token-border-default bg-transparent px-1.5 py-0.5 text-xs font-medium text-token-text-secondary">
            <FormattedMessage
              id="skills.card.disabledBadge"
              defaultMessage="Disabled"
              description="Label shown next to the skill name when a skill is disabled"
            />
          </Badge>
        )
      }
    />
  );
  const skillIcon = cardIcon ?? (
    <SkillCardIcon
      skill={skill}
      size={skill.interface?.iconLarge ? "large" : "small"}
    />
  );
  const canRemoveSkill = skill.scope !== "admin";
  const isRemoving =
    removeSkillMutation.isPending &&
    removeSkillMutation.variables?.skillPath === skill.path;
  const isUpdatingEnabled = updateSkillEnabledMutation.isPending;
  const isDisabledSkill = !effectiveSkillEnabled;

  const handleOpenSkillFiles = (): void => {
    openFile.mutate({ path: skill.path, cwd: null });
  };
  const handleTryInThread = (): void => {
    scope.get(productEventLogger$).log({
      eventName: "codex_skill_try_clicked",
    });
    const prompt = getSkillPrefillPrompt(skill);
    const state: HomeLocationState = {
      prefillPrompt: prompt,
    };
    if (skill.scope === "repo" && repoRoot) {
      state.prefillCwd = repoRoot;
    }
    // In VS Code settings webview, keep Settings open and prefill the sidebar composer.
    startNewConversation(state, { startInSidebar: true });
  };
  const modalSkillToggleMessage = effectiveSkillEnabled
    ? messages.disableSkill
    : messages.enableSkill;
  const openSkillFilesMenuItem = (
    <Dropdown.Item disabled={isRemoteHost} onSelect={handleOpenSkillFiles}>
      <FormattedMessage
        id="skills.card.open"
        defaultMessage="Open"
        description="Button label to open a skill's files"
      />
    </Dropdown.Item>
  );
  const modalTitle = (
    <div className="flex w-full items-center justify-between gap-2">
      <div className="min-w-0 flex-1">{titleLabel}</div>
      <div className="flex shrink-0 items-center gap-2">
        <Tooltip
          open={isModalSkillToggleTooltipOpen}
          tooltipContent={<FormattedMessage {...modalSkillToggleMessage} />}
        >
          <div
            onPointerEnter={(): void => {
              setIsModalSkillToggleTooltipOpen(true);
            }}
            onPointerLeave={(): void => {
              setIsModalSkillToggleTooltipOpen(false);
            }}
          >
            <Toggle
              checked={effectiveSkillEnabled}
              disabled={isUpdatingEnabled}
              ariaLabel={intl.formatMessage(modalSkillToggleMessage)}
              onChange={(nextEnabled): void => {
                setOptimisticEnabled(nextEnabled);
                updateSkillEnabledMutation.mutate(nextEnabled);
              }}
            />
          </div>
        </Tooltip>
        <BasicDropdown
          align="end"
          contentWidth="icon"
          triggerButton={
            <MoreMenuTrigger
              label={intl.formatMessage({
                id: "skills.card.moreActions",
                defaultMessage: "More actions",
                description:
                  "Aria label for the more actions menu in the skill preview modal",
              })}
              size="toolbar"
            />
          }
        >
          {openSkillFilesMenuItem}
        </BasicDropdown>
      </div>
    </div>
  );
  const skillToggleMessage = effectiveSkillEnabled
    ? messages.disableSkill
    : messages.enableSkill;
  const handleDisableFromMenu = effectiveSkillEnabled
    ? (): void => {
        setOptimisticEnabled(false);
        updateSkillEnabledMutation.mutate(false);
      }
    : undefined;
  const handleEnableFromMenu = isDisabledSkill
    ? (): void => {
        setOptimisticEnabled(true);
        updateSkillEnabledMutation.mutate(true);
      }
    : undefined;
  const handleUninstallFromMenu = canRemoveSkill
    ? (): void => {
        removeSkillMutation.mutate({ skillPath: skill.path });
      }
    : undefined;
  const actions =
    installedStateAction === "toggle" ? (
      ({
        ignoreNextPreview,
        openPreview,
      }: {
        ignoreNextPreview: () => void;
        openPreview: () => void;
      }): ReactElement => (
        <div className="flex items-center gap-2">
          {actionLabel ? (
            <div className="text-sm text-token-text-secondary">
              {actionLabel}
            </div>
          ) : null}
          <div className="invisible opacity-0 transition-opacity group-hover:visible group-hover:opacity-100">
            <BasicDropdown
              align="end"
              contentWidth="icon"
              triggerButton={
                <MoreMenuTrigger
                  label={intl.formatMessage({
                    id: "skills.card.moreActions",
                    defaultMessage: "More actions",
                    description:
                      "Aria label for the more actions menu in the skill preview modal",
                  })}
                  size="toolbar"
                />
              }
            >
              <Dropdown.Item
                disabled={isRemoteHost}
                onSelect={() => {
                  ignoreNextPreview();
                  handleOpenSkillFiles();
                }}
              >
                <FormattedMessage
                  id="skills.card.open"
                  defaultMessage="Open"
                  description="Button label to open a skill's files"
                />
              </Dropdown.Item>
              <Dropdown.Item
                onSelect={() => {
                  openPreview();
                }}
              >
                <FormattedMessage
                  id="skills.card.details"
                  defaultMessage="Details"
                  description="Dropdown item label to open the skill details modal"
                />
              </Dropdown.Item>
            </BasicDropdown>
          </div>
          <Tooltip
            tooltipContent={<FormattedMessage {...skillToggleMessage} />}
          >
            <Toggle
              checked={effectiveSkillEnabled}
              disabled={isUpdatingEnabled}
              ariaLabel={intl.formatMessage(skillToggleMessage)}
              onClick={(event): void => {
                event.stopPropagation();
              }}
              onChange={(nextEnabled): void => {
                setOptimisticEnabled(nextEnabled);
                updateSkillEnabledMutation.mutate(nextEnabled);
              }}
            />
          </Tooltip>
        </div>
      )
    ) : installedStateAction === "menu" ? (
      <InstalledCardActions
        disableMenuLabel={
          <FormattedMessage
            id="skills.card.disableMenuItem"
            defaultMessage="Disable"
            description="Menu item label for disabling a skill from a skill card"
          />
        }
        enableButtonLabel={<FormattedMessage {...messages.enableButton} />}
        enabledStatusAriaLabel={intl.formatMessage(messages.enabledStatus)}
        isEnabled={effectiveSkillEnabled}
        isUninstalling={isRemoving}
        isUpdating={isUpdatingEnabled}
        menuLabel={intl.formatMessage({
          id: "skills.card.actionsMenu",
          defaultMessage: "Skill actions",
          description: "Aria label for the skill card actions menu trigger",
        })}
        onDisable={handleDisableFromMenu}
        onEnable={handleEnableFromMenu}
        onUninstall={handleUninstallFromMenu}
        uninstallMenuLabel={
          <FormattedMessage
            id="skills.card.uninstallMenuItem"
            defaultMessage="Uninstall"
            description="Menu item label for uninstalling a skill from a skill card"
          />
        }
      />
    ) : (
      <InstalledCardActions
        enabledStatusAriaLabel={intl.formatMessage(messages.enabledStatus)}
        isEnabled={effectiveSkillEnabled}
        isUninstalling={isRemoving}
        isUpdating={isUpdatingEnabled}
      />
    );

  return (
    <SkillPreviewCardShell
      cardIcon={skillIcon}
      cardIconContainer={cardIconContainer}
      cardTitle={displayLabel}
      cardDescription={description}
      cardBadges={scopeBadges}
      cardActions={actions}
      cardClassName={clsx("group justify-center border-none", cardClassName)}
      cardContentClassName={isDisabledSkill ? "opacity-60" : undefined}
      modalTitle={modalTitle}
      modalTitleText={displayLabel}
      modalTitleClassName="w-full"
      modalDescription={description}
      modalBody={({ isOpen }) => (
        <SkillMarkdownPreviewBody
          isOpen={isOpen}
          skillPath={skill.path}
          titleText={displayLabel}
        />
      )}
      modalFooter={({ closePreview }) => (
        <SkillCardModalFooter
          canRemoveSkill={canRemoveSkill && showModalUninstall}
          isRemoving={isRemoving}
          isUpdatingEnabled={isUpdatingEnabled}
          effectiveSkillEnabled={effectiveSkillEnabled}
          onUninstall={() => {
            removeSkillMutation.mutate({ skillPath: skill.path });
            closePreview();
          }}
          onTryInThread={handleTryInThread}
        />
      )}
    />
  );
}

function SkillCardModalFooter({
  canRemoveSkill,
  isRemoving,
  isUpdatingEnabled,
  effectiveSkillEnabled,
  onUninstall,
  onTryInThread,
}: {
  canRemoveSkill: boolean;
  isRemoving: boolean;
  isUpdatingEnabled: boolean;
  effectiveSkillEnabled: boolean;
  onUninstall: () => void;
  onTryInThread: () => void;
}): ReactElement {
  return (
    <div className="flex w-full items-center justify-between gap-2">
      <div className="flex items-center gap-2">
        {canRemoveSkill ? (
          <Button
            color="danger"
            size="toolbar"
            className="border-transparent bg-token-charts-red text-token-charts-red enabled:hover:bg-token-charts-red data-[state=open]:bg-token-charts-red"
            disabled={isRemoving}
            onClick={onUninstall}
          >
            <FormattedMessage
              id="skills.card.uninstall"
              defaultMessage="Uninstall"
              description="Button label to remove a skill"
            />
          </Button>
        ) : null}
      </div>
      <div className="flex items-center gap-2">
        <Button
          color="primary"
          size="toolbar"
          disabled={!effectiveSkillEnabled || isUpdatingEnabled}
          onClick={onTryInThread}
        >
          <ChatsIcon className="icon-xs" />
          <FormattedMessage
            id="skills.card.try"
            defaultMessage="Try in chat"
            description="Button label to start a new thread with a skill"
          />
        </Button>
      </div>
    </div>
  );
}

function SkillCardIcon({
  skill,
  size = "small",
}: {
  skill: AppServer.v2.SkillMetadata;
  size?: "small" | "large";
}): ReactElement {
  const hasLargeIcon = !!skill.interface?.iconLarge;
  const Icon = getSkillIcon(skill, { size });
  const className = `${getSkillIconClassName({
    size,
    hasLargeIcon,
    largeFallbackClassName: "h-5 w-5",
  })} text-token-text-secondary`;
  // oxlint-disable-next-line react-hooks-js/static-components
  return <Icon className={className} />;
}
