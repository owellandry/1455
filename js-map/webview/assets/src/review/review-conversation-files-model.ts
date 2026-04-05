import { derived, signal, type Scope } from "maitai";

import type { AppServerConversationTurn } from "@/app-server/app-server-manager-types";
import { getLocalConversationTurnArtifacts } from "@/local-conversation/items/artifacts";
import { ThreadRouteScope } from "@/scopes/thread-route-scope";

const reviewConversationTurns$ = signal<
  typeof ThreadRouteScope,
  Array<AppServerConversationTurn>
>(ThreadRouteScope, []);

export const reviewConversationEditedFilePaths$ = derived(
  ThreadRouteScope,
  ({ get }) => {
    return getConversationEditedFilePaths(get(reviewConversationTurns$));
  },
);

export const reviewConversationReferencedFilePaths$ = derived(
  ThreadRouteScope,
  ({ get }) => {
    return getConversationReferencedFilePaths(get(reviewConversationTurns$));
  },
);

export function setReviewConversationTurns(
  scope: Scope<typeof ThreadRouteScope>,
  turns: Array<AppServerConversationTurn>,
): void {
  scope.set(reviewConversationTurns$, turns);
}

export function getConversationEditedFilePaths(
  turns: Array<AppServerConversationTurn>,
): Array<string> {
  return collectConversationArtifactPaths(turns, "editedFilePaths");
}

export function getConversationReferencedFilePaths(
  turns: Array<AppServerConversationTurn>,
): Array<string> {
  return collectConversationArtifactPaths(turns, "referencedFilePaths");
}

function collectConversationArtifactPaths(
  turns: Array<AppServerConversationTurn>,
  key: "editedFilePaths" | "referencedFilePaths",
): Array<string> {
  const orderedPaths: Array<string> = [];
  const seenPaths = new Set<string>();

  for (const turn of turns) {
    for (const path of getLocalConversationTurnArtifacts(turn)[key]) {
      if (seenPaths.has(path)) {
        continue;
      }

      seenPaths.add(path);
      orderedPaths.push(path);
    }
  }

  return orderedPaths;
}
