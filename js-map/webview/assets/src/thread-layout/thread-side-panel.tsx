import { createGitCwd, type ConversationId } from "protocol";
import {
  useState,
  type MutableRefObject,
  type ReactElement,
  type Ref,
} from "react";

import { useLocalConversationSelector } from "@/app-server/app-server-manager-hooks";
import { NonGitSidePanelContent } from "@/local-conversation/non-git-side-panel-content";
import { projectContext$ } from "@/project-context/project-context-signal";
import { Review } from "@/review/review";
import { useGate } from "@/statsig/statsig";
import { useFetchFromVSCode, useMutationFromVSCode } from "@/vscode-api";

import { useSignal } from "../../../maitai/src/maitai/react";

export function ThreadSidePanel({
  conversationId,
  ref,
}: {
  conversationId?: ConversationId;
  ref?: Ref<HTMLDivElement> | null;
}): ReactElement {
  const [expandedActionsPortalTarget, setExpandedActionsPortalTarget] =
    useState<HTMLDivElement | null>(null);
  const projectContext = useSignal(projectContext$);
  const artifactsPaneEnabled = useGate(
    __statsigName("codex-app-artifacts-pane"),
  );

  const openFile = useMutationFromVSCode("open-file");
  const conversationTurns =
    useLocalConversationSelector(
      conversationId ?? null,
      (conversation) => conversation?.turns,
    ) ?? [];

  const showArtifactsPanel =
    artifactsPaneEnabled && projectContext.kind === "plain";
  const { data: activeWorkspaceRoot } = useFetchFromVSCode(
    "active-workspace-roots",
    {
      select: (data): string | null => data.roots?.[0] ?? null,
    },
  );
  const workspaceBrowserRoot =
    projectContext.kind === "plain"
      ? (activeWorkspaceRoot ?? projectContext.cwd)
      : null;

  const openReferencedArtifact = (path: string): void => {
    const { cwd } = projectContext;
    openFile.mutate({ cwd: cwd ? createGitCwd(cwd) : null, path });
  };

  const lastTurnDiff = useLocalConversationSelector(
    conversationId ?? null,
    (conversation) => {
      for (let i = conversation?.turns.length ?? 0; i > 0; i -= 1) {
        const diff = conversation?.turns[i - 1]?.diff;
        if (diff) {
          return diff;
        }
      }
      return null;
    },
  );

  const isAgentWorking = useLocalConversationSelector(
    conversationId ?? null,
    (conversation) => conversation?.turns.at(-1)?.status === "inProgress",
  );
  const setExpandedActionsPortalTargetRef = (
    element: HTMLDivElement | null,
  ): void => {
    if (typeof ref === "function") {
      ref(element);
    } else if (ref) {
      const mutableRef = ref as MutableRefObject<HTMLDivElement | null>;
      mutableRef.current = element;
    }
    setExpandedActionsPortalTarget(element);
  };

  return (
    <div
      ref={setExpandedActionsPortalTargetRef}
      className="relative h-full min-h-0"
    >
      {showArtifactsPanel ? (
        <NonGitSidePanelContent
          onOpen={openReferencedArtifact}
          conversationTurns={conversationTurns}
          workspaceBrowserRoot={workspaceBrowserRoot}
        />
      ) : (
        <Review
          conversationTurns={conversationTurns}
          expandedActionsPortalTarget={expandedActionsPortalTarget}
          isAgentWorking={isAgentWorking}
          lastTurnDiff={lastTurnDiff}
        />
      )}
    </div>
  );
}
