import type { ReactNode } from "react";
import { FormattedMessage } from "react-intl";

import type { AppServerConversationTurn } from "@/app-server/app-server-manager-types";
import { WorkspaceDirectoryTree } from "@/components/workspace-directory-tree";

import { LocalConversationArtifacts } from "./local-conversation-artifacts";
import { getConversationReferencedArtifactsForSidebar } from "./local-conversation-artifacts-model";

export function NonGitSidePanelContent({
  onOpen,
  conversationTurns,
  workspaceBrowserRoot,
}: {
  onOpen: (path: string) => void;
  conversationTurns: Array<AppServerConversationTurn>;
  workspaceBrowserRoot: string | null;
}): ReactNode {
  const referencedFilePaths =
    getConversationReferencedArtifactsForSidebar(conversationTurns);

  return (
    <div className="h-full max-h-full overflow-y-auto bg-token-side-bar-background px-2">
      <Header>
        <FormattedMessage
          id="codex.localConversation.artifacts.title"
          defaultMessage="Artifacts"
          description="Title for the local conversation artifacts sidebar"
        />
      </Header>
      <LocalConversationArtifacts
        onOpen={onOpen}
        referencedFilePaths={referencedFilePaths}
      />
      <Header>
        <FormattedMessage
          id="codex.localConversation.context.title"
          defaultMessage="Context"
          description="Title for the local conversation artifacts sidebar"
        />
      </Header>
      {workspaceBrowserRoot && (
        <WorkspaceDirectoryTree
          includeHidden={false}
          root={workspaceBrowserRoot}
        />
      )}
    </div>
  );
}

function Header({ children }: { children: ReactNode }): ReactNode {
  return (
    <div className="sticky top-0 z-10 bg-token-side-bar-background px-2 py-3 text-base text-token-text-tertiary">
      <span>{children}</span>
    </div>
  );
}
