import { APPROVALS_REVIEWER_USER } from "protocol";

import type { AppServerManager } from "@/app-server/app-server-manager";
import { logger } from "@/utils/logger";

import { fetchFromVSCode } from "./vscode-api";

export async function implementTodo({
  fileName,
  line,
  comment,
  mcpManager,
  navigate,
}: {
  fileName: string;
  line: number;
  comment: string;
  mcpManager: AppServerManager;
  navigate: (path: string) => void;
}): Promise<void> {
  try {
    const workspaceRootsResponse = await fetchFromVSCode(
      "active-workspace-roots",
    );
    const cwd = workspaceRootsResponse.roots?.[0];

    if (!cwd) {
      throw new Error("No project root found");
    }

    let displayPath = fileName;
    if (cwd) {
      const normCwd = cwd.replaceAll("\\", "/");
      const normFile = fileName.replaceAll("\\", "/");
      const prefix = normCwd.endsWith("/") ? normCwd : `${normCwd}/`;
      if (normFile.startsWith(prefix)) {
        displayPath = normFile.slice(prefix.length);
      }
    }

    const fileAndLine = `${displayPath}:${line}`;
    const prompt = `Please implement the code as described by the comment on ${fileAndLine}

The comment is:
${comment?.trim() ?? ""}

Replace the comment with your implementation.
Optimize for speed. Don't over-explore or over-check your work other than what is absolutely necessary to implement the comment.
Once you are done, remove the comment.`;

    const conversationId = await mcpManager.startConversation({
      input: [{ type: "text", text: prompt, text_elements: [] }],
      cwd,
      workspaceRoots: [cwd],
      // Let the CLI decide the model from default and/or config.toml unless explicitly provided.
      collaborationMode: null,
      approvalsReviewer: APPROVALS_REVIEWER_USER,
    });
    navigate(`/local/${conversationId}`);
  } catch (error) {
    logger.error(`Failed to handle implement-todo`, {
      safe: {},
      sensitive: {
        error: error,
      },
    });
  }
}
