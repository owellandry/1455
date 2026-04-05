import { defineMessage, type MessageDescriptor } from "react-intl";

type SelectedRemoteConnection = { displayName: string } | null;

export type SubmitBlocker =
  | { kind: "conflicting-remote-project" }
  | { kind: "invalid-path" }
  | { kind: "no-connected-remote" }
  | { kind: "selected-remote-unavailable" };

export type SubmitNotice = {
  message: MessageDescriptor;
  tone: "warning" | "danger";
  values?: Record<string, string>;
};

export type SubmitState =
  | { kind: "blocked"; notice: SubmitNotice }
  | { kind: "ready" };

export function getRemoteProjectPathSubmitBlocker({
  hasConnectedRemoteConnections,
  comparableRemoteProjectPath,
  selectedConnection,
}: {
  hasConnectedRemoteConnections: boolean;
  comparableRemoteProjectPath: string | null;
  selectedConnection: SelectedRemoteConnection;
}): SubmitBlocker | null {
  if (!hasConnectedRemoteConnections) {
    return { kind: "no-connected-remote" };
  }

  if (selectedConnection == null) {
    return { kind: "selected-remote-unavailable" };
  }

  if (comparableRemoteProjectPath == null) {
    return { kind: "invalid-path" };
  }

  return null;
}

export function getRemoteProjectSetupSubmitBlocker({
  hasConnectedRemoteConnections,
  comparableRemoteProjectPath,
  selectedConnection,
  isRemoteProjectAlreadySetUp,
}: {
  hasConnectedRemoteConnections: boolean;
  comparableRemoteProjectPath: string | null;
  selectedConnection: SelectedRemoteConnection;
  isRemoteProjectAlreadySetUp: boolean;
}): SubmitBlocker | null {
  const pathSubmitBlocker = getRemoteProjectPathSubmitBlocker({
    hasConnectedRemoteConnections,
    comparableRemoteProjectPath,
    selectedConnection,
  });
  if (pathSubmitBlocker != null) {
    return pathSubmitBlocker;
  }

  if (isRemoteProjectAlreadySetUp) {
    return { kind: "conflicting-remote-project" };
  }

  return null;
}

export function getRemoteProjectSubmitNotice({
  conflictingProjectName,
  remoteName,
  submitBlocker,
}: {
  conflictingProjectName: string | null;
  remoteName: string | null;
  submitBlocker: SubmitBlocker | null;
}): SubmitNotice | null {
  if (submitBlocker != null) {
    switch (submitBlocker.kind) {
      case "no-connected-remote":
        return {
          message: defineMessage({
            id: "projectSetupDialog.noConnectedRemotes",
            defaultMessage: "No remote hosts are connected right now.",
            description:
              "Message shown in the remote project setup dialog when no remote hosts are connected",
          }),
          tone: "warning",
        };
      case "selected-remote-unavailable":
        return {
          message: defineMessage({
            id: "projectSetupDialog.selectedRemoteUnavailable",
            defaultMessage: "Choose a connected remote host to continue.",
            description:
              "Message shown when the selected remote host is no longer available for project setup",
          }),
          tone: "warning",
        };
      case "invalid-path":
        return {
          message: defineMessage({
            id: "projectSetupDialog.invalidPath.missing",
            defaultMessage: "Choose an existing folder on this remote host.",
            description:
              "Message shown when the selected remote project path is missing or invalid",
          }),
          tone: "danger",
        };
      case "conflicting-remote-project":
        if (conflictingProjectName == null || remoteName == null) {
          return null;
        }

        return {
          message: defineMessage({
            id: "projectSetupDialog.conflict.remoteProjectAlreadyMapped.standalone",
            defaultMessage:
              "This remote project on {remoteName} is already set up for {projectName}. Choose a different folder or remove that setup first.",
            description:
              "Warning shown when the selected remote project is already set up for a different sidebar project on the same host while creating a standalone project",
          }),
          tone: "danger",
          values: {
            projectName: conflictingProjectName,
            remoteName,
          },
        };
    }
  }

  return null;
}
