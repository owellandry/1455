import type { AppServerConversationTurn } from "@/app-server/app-server-manager-types";
import { normalizePath } from "@/utils/path";

const FILE_CITATION_REGEX = /【F:([^†]+)†L\d+(?:-L\d+)?】/g;

export type LocalConversationTurnArtifacts = {
  editedFilePaths: Array<string>;
  referencedFilePaths: Array<string>;
};

export type LocalConversationTurnArtifactsCollector = {
  editedFilePaths: Array<string>;
  editedPaths: Set<string>;
  referencedFilePaths: Array<string>;
  referencedPaths: Set<string>;
};

export function createLocalConversationTurnArtifactsCollector(): LocalConversationTurnArtifactsCollector {
  return {
    editedFilePaths: [],
    editedPaths: new Set<string>(),
    referencedFilePaths: [],
    referencedPaths: new Set<string>(),
  };
}

export function addEditedArtifactsForFileChange(
  artifacts: LocalConversationTurnArtifactsCollector,
  changes: Extract<
    AppServerConversationTurn["items"][number],
    { type: "fileChange" }
  >["changes"],
): void {
  for (const change of changes) {
    const rawPath =
      change.kind.type === "update"
        ? (change.kind.move_path ?? change.path)
        : change.path;
    addArtifactPath(artifacts.editedPaths, artifacts.editedFilePaths, rawPath);
  }
}

export function addReferencedArtifactsForAgentMessage(
  artifacts: LocalConversationTurnArtifactsCollector,
  text: string,
): void {
  for (const referencedPath of extractReferencedFilePathsFromAgentMessage(
    text,
  )) {
    addArtifactPath(
      artifacts.referencedPaths,
      artifacts.referencedFilePaths,
      referencedPath,
    );
  }
}

export function finalizeLocalConversationTurnArtifacts(
  artifacts: LocalConversationTurnArtifactsCollector,
): LocalConversationTurnArtifacts {
  return {
    editedFilePaths: artifacts.editedFilePaths,
    referencedFilePaths: artifacts.referencedFilePaths,
  };
}

export function getLocalConversationTurnArtifacts(
  turn: AppServerConversationTurn,
): LocalConversationTurnArtifacts {
  const artifacts = createLocalConversationTurnArtifactsCollector();

  for (const item of turn.items) {
    if (item.type === "fileChange") {
      addEditedArtifactsForFileChange(artifacts, item.changes);
    } else if (item.type === "agentMessage") {
      addReferencedArtifactsForAgentMessage(artifacts, item.text);
    }
  }

  return finalizeLocalConversationTurnArtifacts(artifacts);
}

function extractReferencedFilePathsFromAgentMessage(
  text: string,
): Array<string> {
  const referencedPaths: Array<string> = [];
  for (const match of text.matchAll(FILE_CITATION_REGEX)) {
    const rawPath = match[1]?.trim() ?? "";
    if (rawPath.length === 0) {
      continue;
    }
    referencedPaths.push(rawPath);
  }

  return referencedPaths;
}

function addArtifactPath(
  paths: Set<string>,
  orderedPaths: Array<string>,
  rawPath: string,
): void {
  const normalizedPath = normalizePath(rawPath);
  if (normalizedPath.length === 0 || paths.has(normalizedPath)) {
    return;
  }

  paths.add(normalizedPath);
  orderedPaths.push(normalizedPath);
}
