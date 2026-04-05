import isEqual from "lodash/isEqual";
import uniqWith from "lodash/uniqWith";
import type { BuildStartConversationParamsInput } from "protocol";
import { buildPermissionsConfigForMode } from "protocol";

import type { StartConversationParams } from "@/app-server/app-server-manager-types";

export function buildStartConversationParams({
  agentMode,
  workspaceRoots,
  config,
  input,
  collaborationMode,
  serviceTier,
  cwd,
  fileAttachments,
  addedFiles,
}: BuildStartConversationParamsInput): StartConversationParams {
  const attachments = uniqWith([...fileAttachments, ...addedFiles], isEqual);
  const permissions = buildPermissionsConfigForMode(
    agentMode,
    workspaceRoots,
    config,
  );
  return {
    input: input,
    workspaceRoots: workspaceRoots,
    collaborationMode: collaborationMode,
    ...(serviceTier !== undefined ? { serviceTier } : {}),
    permissions,
    approvalsReviewer: permissions.approvalsReviewer,
    cwd: cwd,
    attachments,
  };
}
