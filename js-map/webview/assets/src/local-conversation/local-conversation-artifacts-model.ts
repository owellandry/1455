import type { AppServerConversationTurn } from "@/app-server/app-server-manager-types";

import {
  getLocalConversationTurnArtifacts,
  type LocalConversationTurnArtifacts,
} from "./items/artifacts";

export function getConversationReferencedArtifactsForSidebar(
  turns: Array<AppServerConversationTurn>,
): Array<string> {
  const orderedPaths: Array<string> = [];
  const seenPaths = new Set<string>();

  for (let turnIndex = turns.length - 1; turnIndex >= 0; turnIndex -= 1) {
    const turn = turns[turnIndex];
    const turnArtifacts = getLocalConversationTurnArtifacts(turn);
    appendTurnReferencedArtifacts({
      orderedPaths,
      seenPaths,
      turnArtifacts,
    });
  }

  return orderedPaths;
}

function appendTurnReferencedArtifacts({
  orderedPaths,
  seenPaths,
  turnArtifacts,
}: {
  orderedPaths: Array<string>;
  seenPaths: Set<string>;
  turnArtifacts: LocalConversationTurnArtifacts;
}): void {
  for (const path of turnArtifacts.referencedFilePaths) {
    if (seenPaths.has(path)) {
      continue;
    }

    seenPaths.add(path);
    orderedPaths.push(path);
  }
}
