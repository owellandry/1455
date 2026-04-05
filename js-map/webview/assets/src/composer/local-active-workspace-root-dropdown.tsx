import clsx from "clsx";
import { useScope } from "maitai";
import type { RemoteConnection, RemoteProject } from "protocol";
import { useState, type ReactElement } from "react";
import { FormattedMessage } from "react-intl";

import { useRemoteConnectionStates } from "@/app-server/use-remote-connection-states";
import { Button } from "@/components/button";
import { BasicDropdown } from "@/components/dropdown";
import { Tooltip } from "@/components/tooltip";
import { WorkspaceRootDropdownContent } from "@/components/workspace-root-dropdown-content";
import { WorkspaceRootIcon } from "@/components/workspace-root-icon";
import { useIsRemoteHost } from "@/hooks/use-is-remote-host";
import ChevronIcon from "@/icons/chevron.svg";
import { MessageBus } from "@/message-bus";
import { productEventLogger$ } from "@/product-event-signal";
import {
  openCreateRemoteProjectModal,
  openLocalProjectPicker,
} from "@/project-setup/open-project-setup-dialog";
import { useEnabledRemoteConnections } from "@/remote-connections/remote-connection-visibility";
import { useSelectedRemoteProject } from "@/remote-projects/remote-projects";
import { AppScope } from "@/scopes/app-scope";
import {
  type RepositoryTaskGroups,
  useWorkspaceGroups,
} from "@/sidebar/use-repository-task-groups";
import { useGate } from "@/statsig/statsig";
import { useFetchFromVSCode } from "@/vscode-api";

export function LocalActiveWorkspaceRootDropdown({
  allowRemoteProjects = true,
  disabled = false,
  hideLabel = false,
  variant = "default",
}: {
  allowRemoteProjects?: boolean;
  disabled?: boolean;
  hideLabel?: boolean;
  variant?: "default" | "hero";
}): ReactElement | null {
  const workspaceGroups = useWorkspaceGroups();
  const groups = allowRemoteProjects
    ? workspaceGroups
    : workspaceGroups.filter((group) => {
        return group.projectKind === "local";
      });
  const scope = useScope(AppScope);
  const isRemoteHost = useIsRemoteHost();
  const remoteConnectionsEnabled = useGate(
    __statsigName("codex-app-enable-remote-connections"),
  );
  const {
    selectedRemoteProject,
    selectedRemoteProjectId,
    setSelectedRemoteProjectId,
  } = useSelectedRemoteProject();
  const { remoteConnections } = useEnabledRemoteConnections();
  const connectionStatesByHostId = useRemoteConnectionStates(remoteConnections);
  const { data: activeRoot } = useFetchFromVSCode("active-workspace-roots", {
    select: (data) => data.roots[0],
  });
  const [open, setOpen] = useState(false);
  const canAddRemoteProject =
    allowRemoteProjects &&
    remoteConnectionsEnabled &&
    !isRemoteHost &&
    remoteConnections.some((connection) => {
      return connectionStatesByHostId[connection.hostId] === "connected";
    });

  const handleSelect = (projectId: string): void => {
    scope.get(productEventLogger$).log({
      eventName: "codex_app_workspace_root_selected",
    });
    const selectedGroup = groups.find((group) => group.projectId === projectId);
    if (selectedGroup == null) {
      return;
    }
    if (selectedGroup.projectKind === "remote") {
      setSelectedRemoteProjectId(selectedGroup.projectId);
      return;
    }
    setSelectedRemoteProjectId(null);
    const messageBus = MessageBus.getInstance();
    messageBus.dispatchMessage("electron-set-active-workspace-root", {
      root: selectedGroup.path,
    });
  };

  const handleAddLocalProject = (): void => {
    scope.get(productEventLogger$).log({
      eventName: "codex_app_workspace_root_add_clicked",
    });
    openLocalProjectPicker();
    setOpen(false);
  };

  const handleAddRemoteProject = (): void => {
    scope.get(productEventLogger$).log({
      eventName: "codex_app_workspace_root_add_clicked",
    });
    openCreateRemoteProjectModal({ setActive: true });
    setOpen(false);
  };

  const activeProjectId = allowRemoteProjects
    ? (selectedRemoteProjectId ?? activeRoot ?? null)
    : (activeRoot ?? null);
  if (activeProjectId == null) {
    return null;
  }

  const activeRootGroup = getActiveWorkspaceRootGroup({
    activeProjectId,
    groups,
    remoteConnections,
    selectedRemoteProject,
  });
  const activeRootLabel =
    activeRootGroup?.hostDisplayName != null
      ? `${activeRootGroup.label} · ${activeRootGroup.hostDisplayName}`
      : (activeRootGroup?.label ?? activeRootGroup?.path ?? null);
  const renderDefaultTrigger = (): ReactElement => (
    <Tooltip
      tooltipContent={
        <FormattedMessage
          id="composer.localCwdDropdown.tooltip"
          defaultMessage="Select project"
          description="Tooltip for the active project selector in the composer footer"
        />
      }
    >
      <Button size="composerSm" color="ghost" className="min-w-0">
        <WorkspaceRootIcon
          isCodexWorktree={Boolean(activeRootGroup?.isCodexWorktree)}
          isRemoteProject={activeRootGroup?.projectKind === "remote"}
          className="icon-xs shrink-0"
        />
        {!hideLabel ? (
          <span className="max-w-[180px] truncate text-left">
            {activeRootLabel ?? (
              <FormattedMessage
                id="composer.localCwdDropdown.noActiveRoot"
                defaultMessage="Select your project"
                description="Shown when no active root is selected"
              />
            )}
          </span>
        ) : null}
        <ChevronIcon
          className={clsx(
            "icon-2xs text-token-input-placeholder-foreground shrink-0 transition-transform duration-150",
            open && "rotate-180",
          )}
        />
      </Button>
    </Tooltip>
  );
  const renderHeroTrigger = (): ReactElement => (
    <button
      className={clsx(
        "heading-xl text-token-text-tertiary ml-2 -mt-1 flex min-w-0 items-center gap-1 font-normal transition-colors transition-background-colors duration-100 hover:text-token-foreground select-none",
        disabled ? "cursor-default opacity-60" : "cursor-interaction",
      )}
      type="button"
      disabled={disabled}
    >
      <span className="inline-flex max-w-[420px] min-w-0 items-center">
        {activeRootLabel ? (
          <span className="min-w-0 truncate">{activeRootLabel}</span>
        ) : (
          <FormattedMessage
            id="composer.localCwdDropdown.noActiveRoot"
            defaultMessage="Select your project"
            description="Shown when no active root is selected"
          />
        )}
      </span>
      <ChevronIcon
        className={clsx(
          "icon-sm text-token-input-placeholder-foreground mt-1 shrink-0 self-center transition-transform duration-150",
          open && "rotate-180",
        )}
      />
    </button>
  );

  return (
    <BasicDropdown
      open={open}
      onOpenChange={setOpen}
      side={variant === "hero" ? "bottom" : "top"}
      align={variant === "hero" ? "center" : "start"}
      disabled={disabled}
      triggerButton={
        variant === "hero" ? renderHeroTrigger() : renderDefaultTrigger()
      }
      contentWidth="workspace"
      contentMaxHeight="tall"
    >
      <WorkspaceRootDropdownContent
        groups={groups}
        selectedProjectIds={activeProjectId ? [activeProjectId] : []}
        onSelectProjectId={(projectId) => {
          handleSelect(projectId);
          setOpen(false);
        }}
        onAddLocalProject={handleAddLocalProject}
        onAddRemoteProject={
          canAddRemoteProject ? handleAddRemoteProject : undefined
        }
      />
    </BasicDropdown>
  );
}

function getActiveWorkspaceRootGroup({
  activeProjectId,
  groups,
  remoteConnections,
  selectedRemoteProject,
}: {
  activeProjectId: string;
  groups: Array<RepositoryTaskGroups>;
  remoteConnections: Array<RemoteConnection>;
  selectedRemoteProject: RemoteProject | null;
}): RepositoryTaskGroups | null {
  const activeGroup =
    groups.find((group) => group.projectId === activeProjectId) ?? null;
  if (activeGroup != null) {
    return activeGroup;
  }
  if (
    selectedRemoteProject == null ||
    selectedRemoteProject.id !== activeProjectId
  ) {
    return null;
  }

  const activeConnection =
    remoteConnections.find((connection) => {
      return connection.hostId === selectedRemoteProject.hostId;
    }) ?? null;

  return {
    projectId: selectedRemoteProject.id,
    projectKind: "remote",
    hostId: selectedRemoteProject.hostId,
    hostDisplayName: activeConnection?.displayName ?? null,
    label: selectedRemoteProject.label,
    path: selectedRemoteProject.remotePath,
    repositoryData: null,
    isCodexWorktree: false,
    tasks: [],
  };
}
