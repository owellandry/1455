import clsx from "clsx";
import { useScope } from "maitai";
import {
  GlobalStateKey,
  isRemoteSshConnection,
  type RemoteConnection,
  type RemoteProject,
} from "protocol";
import {
  useState,
  type FormEvent,
  type ReactElement,
  type ReactNode,
} from "react";
import { FormattedMessage, useIntl } from "react-intl";

import { useRemoteConnectionStates } from "@/app-server/use-remote-connection-states";
import { Button } from "@/components/button";
import { Dialog } from "@/components/dialog";
import {
  DialogBody,
  DialogFooter,
  DialogHeader,
  DialogSection,
} from "@/components/dialog-layout";
import { BasicDropdown, Dropdown } from "@/components/dropdown";
import { RemoteCwdPicker } from "@/components/remote-cwd-picker";
import { RemoteHostGlobeIcon } from "@/components/remote-host-globe-icon";
import { toast$ } from "@/components/toaster/toast-signal";
import { useSelectedRemoteHostId } from "@/composer/use-selected-remote-host-id";
import { useGlobalState } from "@/hooks/use-global-state";
import { useIsRemoteHost } from "@/hooks/use-is-remote-host";
import AlertIcon from "@/icons/alert.svg";
import CheckMdIcon from "@/icons/check-md.svg";
import ChevronIcon from "@/icons/chevron.svg";
import WarningIcon from "@/icons/warning.svg";
import { messageBus, useMessage } from "@/message-bus";
import {
  getComparableRemoteProjectPath,
  getRemoteProjectLabel,
} from "@/remote-projects/remote-projects";
import { AppScope } from "@/scopes/app-scope";
import { useGate } from "@/statsig/statsig";
import { logger } from "@/utils/logger";

import {
  getRemoteProjectPathSubmitBlocker,
  getRemoteProjectSetupSubmitBlocker,
  getRemoteProjectSubmitNotice,
  type SubmitBlocker,
  type SubmitState,
} from "./open-project-setup-submit-state";

const REMOTE_CONNECTIONS_MAPPING_LOG_PREFIX = "[remote-connections/mapping]";

type ProjectSetupDialogState =
  | {
      mode: "choose-remote-folder";
      host: string;
      initialDirectoryPath: string | null;
      selectedHostId: string | null;
    }
  | {
      initialDirectoryPath: string | null;
      mode: "setup";
      selectedHostId: string | null;
      setActive?: boolean;
    };
export function CreateRemoteProjectModal(): ReactElement | null {
  const intl = useIntl();
  const scope = useScope(AppScope);
  const isRemoteHost = useIsRemoteHost();
  const remoteConnectionsEnabled = useGate(
    __statsigName("codex-app-enable-remote-connections"),
  );
  const { remoteConnections, selectedRemoteHostId } = useSelectedRemoteHostId();
  const connectionStatesByHostId = useRemoteConnectionStates(remoteConnections);
  const connectedRemoteConnections = remoteConnections.filter(
    (connection) => connectionStatesByHostId[connection.hostId] === "connected",
  );
  const remoteConnectionHostIds = remoteConnections.map(
    (connection) => connection.hostId,
  );
  const { data: remoteProjects, setData: setRemoteProjects } = useGlobalState(
    GlobalStateKey.REMOTE_PROJECTS,
  );
  const { setData: setActiveRemoteProjectId } = useGlobalState(
    GlobalStateKey.ACTIVE_REMOTE_PROJECT_ID,
  );
  const { data: projectOrder, setData: setProjectOrder } = useGlobalState(
    GlobalStateKey.PROJECT_ORDER,
  );
  const [dialogState, setDialogState] =
    useState<ProjectSetupDialogState | null>(null);
  const [path, setPath] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [portalContainer, setPortalContainer] = useState<HTMLElement | null>(
    null,
  );
  const trimmedPath = path.trim();
  const selectedConnectedRemoteHostId =
    connectedRemoteConnections.find((connection) => {
      return connection.hostId === selectedRemoteHostId;
    })?.hostId ??
    connectedRemoteConnections[0]?.hostId ??
    null;

  useMessage(
    "open-create-remote-project-modal",
    (message) => {
      if (!remoteConnectionsEnabled || isRemoteHost) {
        return;
      }
      setDialogState({
        mode: "setup",
        initialDirectoryPath: null,
        selectedHostId: selectedConnectedRemoteHostId,
        setActive: message.setActive,
      });
      setPath("");
    },
    [isRemoteHost, remoteConnectionsEnabled, selectedConnectedRemoteHostId],
  );

  useMessage(
    "remote-workspace-root-requested",
    (message) => {
      if (!remoteConnectionsEnabled) {
        return;
      }
      const trimmedHost = message.host.trim();
      const selectedHostId =
        message.hostId ??
        connectedRemoteConnections.find(
          (connection) => connection.displayName === trimmedHost,
        )?.hostId ??
        selectedConnectedRemoteHostId ??
        null;

      if (message.mode === "pick") {
        setDialogState({
          mode: "choose-remote-folder",
          host: trimmedHost,
          initialDirectoryPath: message.initialPath?.trim() ?? null,
          selectedHostId,
        });
        setPath("");
        return;
      }

      setDialogState({
        mode: "setup",
        initialDirectoryPath: message.initialPath?.trim() ?? null,
        selectedHostId,
        setActive: message.setActive,
      });
      setPath("");
    },
    [
      connectedRemoteConnections,
      isRemoteHost,
      remoteConnectionsEnabled,
      selectedConnectedRemoteHostId,
    ],
  );

  if (!dialogState) {
    return null;
  }

  const isChoosingRemoteFolder = dialogState.mode === "choose-remote-folder";
  const isSettingUpRemoteProject = dialogState.mode === "setup";

  const hasConnectedRemoteConnections = connectedRemoteConnections.length > 0;
  const comparableRemoteProjectPath =
    trimmedPath.length > 0 ? getComparableRemoteProjectPath(trimmedPath) : null;

  const selectedConnection =
    connectedRemoteConnections.find(
      (connection) => connection.hostId === dialogState.selectedHostId,
    ) ?? null;
  const conflictingRemoteProject =
    isSettingUpRemoteProject && comparableRemoteProjectPath != null
      ? (remoteProjects?.find((project) => {
          return (
            project.hostId === dialogState.selectedHostId &&
            getComparableRemoteProjectPath(project.remotePath) ===
              comparableRemoteProjectPath
          );
        }) ?? null)
      : null;

  const isRemoteProjectAlreadySetUp =
    conflictingRemoteProject != null && !isSubmitting;
  const remoteSubmitNoticeDetails = {
    conflictingProjectName: conflictingRemoteProject?.label ?? null,
    remoteName: selectedConnection?.displayName ?? null,
  };

  let submitBlocker: SubmitBlocker | null = null;
  let submitState: SubmitState = { kind: "ready" };

  if (isChoosingRemoteFolder) {
    submitBlocker = getRemoteProjectPathSubmitBlocker({
      hasConnectedRemoteConnections,
      comparableRemoteProjectPath,
      selectedConnection,
    });
    const submitNotice = getRemoteProjectSubmitNotice({
      conflictingProjectName: null,
      remoteName: null,
      submitBlocker,
    });

    if (submitNotice != null) {
      submitState = { kind: "blocked", notice: submitNotice };
    }
  } else if (isSettingUpRemoteProject) {
    submitBlocker = getRemoteProjectSetupSubmitBlocker({
      hasConnectedRemoteConnections,
      comparableRemoteProjectPath,
      selectedConnection,
      isRemoteProjectAlreadySetUp,
    });

    if (submitBlocker != null) {
      const submitNotice = getRemoteProjectSubmitNotice({
        ...remoteSubmitNoticeDetails,
        submitBlocker,
      });

      if (submitNotice != null) {
        submitState = { kind: "blocked", notice: submitNotice };
      }
    }
  }
  const isSubmitDisabled = submitBlocker != null;

  const handleClose = (): void => {
    setDialogState(null);
    setPath("");
  };

  const handleSubmit = async (
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> => {
    event.preventDefault();

    if (isChoosingRemoteFolder) {
      if (trimmedPath.length === 0) {
        return;
      }
      messageBus.dispatchHostMessage({
        type: "workspace-root-option-picked",
        root: trimmedPath,
      });
      handleClose();
      return;
    }

    if (
      dialogState.selectedHostId == null ||
      comparableRemoteProjectPath == null
    ) {
      return;
    }

    try {
      setIsSubmitting(true);

      const nextProject: RemoteProject = {
        id: crypto.randomUUID(),
        hostId: dialogState.selectedHostId,
        remotePath: comparableRemoteProjectPath,
        label: getRemoteProjectLabel(comparableRemoteProjectPath),
      };

      await setRemoteProjects([nextProject, ...(remoteProjects ?? [])]);
      await setProjectOrder([
        nextProject.id,
        ...(projectOrder ?? []).filter(
          (projectId) => projectId !== nextProject.id,
        ),
      ]);

      if (dialogState.setActive) {
        await setActiveRemoteProjectId(nextProject.id);
      }

      handleClose();
    } catch (error) {
      logger.error(`${REMOTE_CONNECTIONS_MAPPING_LOG_PREFIX} save_failed`, {
        safe: {},
        sensitive: {
          hostId: dialogState.selectedHostId,
          remoteProjectPath: comparableRemoteProjectPath,
          error,
        },
      });
      scope.get(toast$).danger(
        intl.formatMessage({
          id: "projectSetupDialog.saveError",
          defaultMessage: "Failed to save project",
          description: "Toast shown when project setup fails",
        }),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const dialogTitle = isChoosingRemoteFolder ? (
    <FormattedMessage
      id="workspaceRootDialog.title.pick"
      defaultMessage="Choose folder path"
      description="Title for the remote workspace path dialog when selecting a workspace"
    />
  ) : (
    <FormattedMessage
      id="projectSetupDialog.title"
      defaultMessage="Add remote project"
      description="Title for the remote project setup dialog"
    />
  );

  const dialogSubtitle = isChoosingRemoteFolder ? (
    <FormattedMessage
      id="workspaceRootDialog.description.pick"
      defaultMessage="Enter a folder path on {host} to use for this project."
      description="Description for the remote workspace path dialog"
      values={{
        host: (
          <span className="font-medium text-token-text-primary">
            {selectedConnection?.displayName ??
              (dialogState.mode === "choose-remote-folder"
                ? dialogState.host
                : "")}
          </span>
        ),
      }}
    />
  ) : hasConnectedRemoteConnections ? (
    <FormattedMessage
      id="projectSetupDialog.description"
      defaultMessage="Choose a connected remote host and enter the folder for this project."
      description="Description for the remote project setup dialog"
    />
  ) : (
    <FormattedMessage
      id="projectSetupDialog.description.noConnectedRemotes"
      defaultMessage="Set up a remote host first. Then you can choose a host and folder here."
      description="Description for the remote project setup dialog when no remote hosts are connected"
    />
  );

  return (
    <Dialog
      open
      onOpenChange={(nextOpen): void => {
        if (!nextOpen) {
          handleClose();
        }
      }}
    >
      <form className="flex flex-col gap-0" onSubmit={handleSubmit}>
        <DialogBody>
          <DialogSection>
            <DialogHeader title={dialogTitle} subtitle={dialogSubtitle} />
          </DialogSection>
          {isChoosingRemoteFolder || dialogState.mode === "setup" ? (
            <>
              <DialogSection className="gap-2">
                <label className="flex flex-col gap-2">
                  <span className="font-medium text-token-text-primary">
                    <FormattedMessage
                      id="workspaceRootDialog.remoteLabel"
                      defaultMessage="Remote host"
                      description="Label for the remote connection dropdown in the remote workspace path dialog"
                    />
                  </span>
                  <div
                    ref={(node) => {
                      if (typeof document === "undefined") {
                        setPortalContainer(null);
                        return;
                      }
                      const container =
                        node?.closest(".codex-dialog") ?? document.body;
                      setPortalContainer(container as HTMLElement | null);
                    }}
                  >
                    <BasicDropdown
                      align="start"
                      disabled={!hasConnectedRemoteConnections}
                      contentMaxHeight="list"
                      contentWidth="menuBounded"
                      portalContainer={portalContainer}
                      triggerButton={
                        <button
                          type="button"
                          disabled={!hasConnectedRemoteConnections}
                          className="flex h-10 w-full items-center justify-between gap-2 rounded-xl border border-token-border bg-token-dropdown-background px-3 text-sm text-token-foreground disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <span className="flex min-w-0 items-center gap-2">
                            {selectedConnection ? (
                              <RemoteHostGlobeIcon
                                className="icon-xs shrink-0"
                                hostId={selectedConnection.hostId}
                                hostIdsForColorAssignment={
                                  remoteConnectionHostIds
                                }
                              />
                            ) : null}
                            <span
                              className={
                                selectedConnection == null
                                  ? "truncate text-left text-token-description-foreground"
                                  : "truncate text-left"
                              }
                            >
                              {selectedConnection?.displayName ?? (
                                <FormattedMessage
                                  id="workspaceRootDialog.remotePlaceholder"
                                  defaultMessage="No connected remote"
                                  description="Placeholder shown when no connected remote is available in the remote workspace path dialog"
                                />
                              )}
                            </span>
                          </span>
                          <ChevronIcon className="icon-xs shrink-0 text-token-description-foreground" />
                        </button>
                      }
                    >
                      {connectedRemoteConnections.length === 0 ? (
                        <Dropdown.Item disabled>
                          <FormattedMessage
                            id="workspaceRootDialog.remoteEmpty"
                            defaultMessage="No connected remotes"
                            description="Label shown when no connected remotes are available in the remote workspace path dialog"
                          />
                        </Dropdown.Item>
                      ) : (
                        <Dropdown.Section className="flex max-h-40 flex-col overflow-y-auto">
                          {connectedRemoteConnections.map((connection) => {
                            const ColoredRemoteHostGlobeIcon = ({
                              className,
                            }: {
                              className?: string;
                            }): React.ReactElement => (
                              <RemoteHostGlobeIcon
                                className={className}
                                hostId={connection.hostId}
                                hostIdsForColorAssignment={
                                  remoteConnectionHostIds
                                }
                              />
                            );

                            return (
                              <Dropdown.Item
                                key={connection.hostId}
                                LeftIcon={ColoredRemoteHostGlobeIcon}
                                leftIconClassName="icon-xs"
                                RightIcon={
                                  dialogState.selectedHostId ===
                                  connection.hostId
                                    ? CheckMdIcon
                                    : undefined
                                }
                                SubText={
                                  <span className="text-xs whitespace-normal text-token-description-foreground">
                                    {getRemoteConnectionSubtext(connection)}
                                  </span>
                                }
                                onSelect={() => {
                                  if (
                                    dialogState.selectedHostId ===
                                    connection.hostId
                                  ) {
                                    return;
                                  }

                                  setPath("");
                                  setDialogState((previous) => {
                                    if (!previous) {
                                      return previous;
                                    }
                                    return {
                                      ...previous,
                                      initialDirectoryPath: null,
                                      selectedHostId: connection.hostId,
                                    };
                                  });
                                }}
                              >
                                <span className="block truncate">
                                  {connection.displayName}
                                </span>
                              </Dropdown.Item>
                            );
                          })}
                        </Dropdown.Section>
                      )}
                    </BasicDropdown>
                  </div>
                </label>
              </DialogSection>
              <DialogSection className="gap-2">
                <label className="flex flex-col gap-0.5">
                  <span className="font-medium text-token-text-primary">
                    <FormattedMessage
                      id="workspaceRootDialog.pathLabel"
                      defaultMessage="Select folder"
                      description="Label for the remote workspace path input"
                    />
                  </span>
                  {dialogState.selectedHostId != null ? (
                    <RemoteCwdPicker
                      key={dialogState.selectedHostId}
                      hostId={dialogState.selectedHostId}
                      initialDirectoryPath={dialogState.initialDirectoryPath}
                      selectedPath={path}
                      setSelectedPath={setPath}
                    />
                  ) : null}
                </label>
              </DialogSection>
            </>
          ) : null}
          {dialogState.mode === "setup" ? (
            <DialogSection>
              <div className="text-sm text-token-description-foreground">
                <FormattedMessage
                  id="projectSetupDialog.remoteMode.standalone.description"
                  defaultMessage="This remote folder will appear as its own project in the sidebar."
                  description="Description for saving a remote project as a standalone sidebar project"
                />
              </div>
            </DialogSection>
          ) : null}
          <DialogSection>
            <div className="min-h-5">
              {submitState.kind !== "ready" ? (
                <ProjectSetupNotice
                  Icon={
                    submitState.notice.tone === "warning"
                      ? WarningIcon
                      : AlertIcon
                  }
                  tone={submitState.notice.tone}
                >
                  <FormattedMessage
                    {...submitState.notice.message}
                    values={submitState.notice.values}
                  />
                </ProjectSetupNotice>
              ) : null}
            </div>
            <DialogFooter>
              <Button color="ghost" onClick={handleClose} type="button">
                <FormattedMessage
                  id="workspaceRootDialog.cancel"
                  defaultMessage="Cancel"
                  description="Cancel button label for the project setup dialog"
                />
              </Button>
              <Button
                color="primary"
                type="submit"
                loading={isSubmitting}
                disabled={isSubmitDisabled}
              >
                {isChoosingRemoteFolder ? (
                  <FormattedMessage
                    id="workspaceRootDialog.confirmPick"
                    defaultMessage="Use folder"
                    description="Confirm button label for selecting a remote workspace path"
                  />
                ) : (
                  <FormattedMessage
                    id="workspaceRootDialog.confirmAdd"
                    defaultMessage="Add project"
                    description="Confirm button label for saving project setup"
                  />
                )}
              </Button>
            </DialogFooter>
          </DialogSection>
        </DialogBody>
      </form>
    </Dialog>
  );
}

function getRemoteConnectionSubtext(connection: RemoteConnection): string {
  if (isRemoteSshConnection(connection)) {
    return connection.sshAlias ?? connection.sshHost;
  }
  return [connection.os, connection.arch]
    .filter((part) => part.trim().length > 0)
    .join(" / ");
}

function ProjectSetupNotice({
  children,
  Icon,
  tone,
}: {
  children: ReactNode;
  Icon: (props: { className?: string }) => ReactElement;
  tone: "warning" | "danger";
}): ReactElement {
  return (
    <div
      className={clsx(
        "mt-1 flex items-start gap-1.5 text-sm leading-5",
        tone === "warning"
          ? "text-token-editor-warning-foreground"
          : "text-token-error-foreground",
      )}
    >
      <Icon className={clsx("icon-xs mt-1 shrink-0")} />
      <div>{children}</div>
    </div>
  );
}
