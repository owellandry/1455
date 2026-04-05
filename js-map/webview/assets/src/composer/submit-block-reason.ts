import type { IntlShape } from "react-intl";

export type SubmitBlockReason =
  | "windows-sandbox-required"
  | "missing-workspace"
  | "loading-local-config"
  | "remote-disconnected"
  | "remote-unauthed"
  | "missing-remote-host"
  | "missing-remote-project-path"
  | "missing-cloud-config"
  | "unsupported-image-inputs"
  | "image-uploads"
  | "missing-cloud-turn"
  | "empty-message";

export function getSubmitBlockReason({
  disableSubmitForWindowsSandboxRequired,
  isMissingWorkspaceRoots,
  disableSubmitForMissingLocalConfig,
  disableSubmitForDisconnectedRemoteHost,
  disableSubmitForUnauthedRemoteHost,
  disableSubmitForMissingRemoteHost,
  disableSubmitForMissingRemoteProjectPath,
  disableSubmitForMissingCloudConfig,
  disableSubmitForUnsupportedImageInputs,
  disableSubmitForImageUploads,
  disableForMissingFollowUpCloudTurn,
  hasMessageContent,
}: {
  disableSubmitForWindowsSandboxRequired: boolean;
  isMissingWorkspaceRoots: boolean;
  disableSubmitForMissingLocalConfig: boolean;
  disableSubmitForDisconnectedRemoteHost: boolean;
  disableSubmitForUnauthedRemoteHost: boolean;
  disableSubmitForMissingRemoteHost: boolean;
  disableSubmitForMissingRemoteProjectPath: boolean;
  disableSubmitForMissingCloudConfig: boolean;
  disableSubmitForUnsupportedImageInputs: boolean;
  disableSubmitForImageUploads: boolean;
  disableForMissingFollowUpCloudTurn: boolean;
  hasMessageContent: boolean;
}): SubmitBlockReason | null {
  if (disableSubmitForWindowsSandboxRequired) {
    return "windows-sandbox-required";
  }
  if (isMissingWorkspaceRoots) {
    return "missing-workspace";
  }
  if (disableSubmitForMissingLocalConfig) {
    return "loading-local-config";
  }
  if (disableSubmitForDisconnectedRemoteHost) {
    return "remote-disconnected";
  }
  if (disableSubmitForUnauthedRemoteHost) {
    return "remote-unauthed";
  }
  if (disableSubmitForMissingRemoteHost) {
    return "missing-remote-host";
  }
  if (disableSubmitForMissingRemoteProjectPath) {
    return "missing-remote-project-path";
  }
  if (disableSubmitForMissingCloudConfig) {
    return "missing-cloud-config";
  }
  if (disableSubmitForUnsupportedImageInputs) {
    return "unsupported-image-inputs";
  }
  if (disableSubmitForImageUploads) {
    return "image-uploads";
  }
  if (disableForMissingFollowUpCloudTurn) {
    return "missing-cloud-turn";
  }
  if (!hasMessageContent) {
    return "empty-message";
  }
  return null;
}

export function getSubmitBlockMessage({
  submitBlockReason,
  intl,
  imageInputUnsupportedReason,
}: {
  submitBlockReason: SubmitBlockReason;
  intl: IntlShape;
  imageInputUnsupportedReason: string;
}): string {
  switch (submitBlockReason) {
    case "windows-sandbox-required":
      return intl.formatMessage({
        id: "composer.submit.windowsSandboxRequired",
        defaultMessage: "Set up Agent sandbox to continue",
        description:
          "Message shown when submitting is disabled until Windows sandbox setup finishes",
      });
    case "missing-workspace":
      return intl.formatMessage({
        id: "composer.submit.noWorkspace",
        defaultMessage: "Add a project to use Codex",
        description:
          "Message shown when the extension has no workspace folders available",
      });
    case "loading-local-config":
      return intl.formatMessage({
        id: "composer.submit.loadingLocalConfig",
        defaultMessage: "Loading…",
        description:
          "Message shown when the local composer is disabled while workspace information loads",
      });
    case "remote-disconnected":
      return intl.formatMessage({
        id: "composer.submit.remoteDisconnected",
        defaultMessage: "Remote connection is disconnected",
        description: "Message shown when the remote connection is disconnected",
      });
    case "remote-unauthed":
      return intl.formatMessage({
        id: "composer.submit.remoteUnauthed",
        defaultMessage: "Remote connection needs authentication",
        description:
          "Message shown when the remote connection is connected but unauthenticated",
      });
    case "missing-remote-host":
      return intl.formatMessage({
        id: "composer.submit.missingRemoteHost",
        defaultMessage: "Select a remote connection to continue",
        description:
          "Message shown when remote submission is disabled until a remote connection is selected",
      });
    case "missing-remote-project-path":
      return intl.formatMessage({
        id: "composer.submit.missingRemoteProjectPath",
        defaultMessage: "Set a remote project path to continue",
        description:
          "Message shown when remote submission is disabled until a mapped remote project path is selected",
      });
    case "missing-cloud-config":
      return intl.formatMessage({
        id: "composer.submit.missingCloudConfig",
        defaultMessage: "You must choose a cloud environment",
        description:
          "Message shown when cloud submission is disabled due to missing configuration",
      });
    case "unsupported-image-inputs":
      return imageInputUnsupportedReason;
    case "image-uploads":
      return intl.formatMessage({
        id: "composer.submit.waitForImageUploads",
        defaultMessage: "Images uploading…",
        description:
          "Message shown when the submit button is disabled because images are still uploading",
      });
    case "missing-cloud-turn":
      return intl.formatMessage({
        id: "composer.submit.missingCloudTurn",
        defaultMessage: "Cannot follow-up on this task",
        description:
          "Message shown when a follow-up cloud task requires a selected turn",
      });
    case "empty-message":
      return intl.formatMessage({
        id: "composer.submit.emptyMessage",
        defaultMessage: "Type a message and click send to get started",
        description:
          "Message shown when submitting is disabled because the composer is empty",
      });
  }
}
