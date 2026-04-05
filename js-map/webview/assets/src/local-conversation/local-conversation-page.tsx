import { createConversationId, type ConversationId } from "protocol";
import { useRef } from "react";
import { Navigate, useNavigate, useParams } from "react-router";

import { useLocalConversationSelector } from "@/app-server/app-server-manager-hooks";
import type { AppServerConversationTurn } from "@/app-server/app-server-manager-types";
import { getSubagentSourceMetadata } from "@/app-server/utils/get-subagent-source-metadata";
import { useRegisterCommand } from "@/commands/use-register-command";
import { SearchBar } from "@/content-search/search-bar";
import { useDebugPanel } from "@/debug/use-debug-panel";
import { Header } from "@/header/header";
import { useWindowType } from "@/hooks/use-window-type";
import { LoadingPage } from "@/loading-page/loading-page";
import { getLocalConversationTitle } from "@/local-conversation/get-local-conversation-title";
import { getSubagentHeaderAgentName } from "@/local-conversation/get-subagent-header-agent-name";
import { getAgentMentionColorCssValueForSessionId } from "@/local-conversation/items/multi-agent-mentions";
import {
  getConversationEditedFilePaths,
  getConversationReferencedFilePaths,
} from "@/review/review-conversation-files-model";

import { LocalConversationPageElectron } from "./local-conversation-page-electron";
import { LocalConversationRouteScopeProviders } from "./local-conversation-route-scope-providers";
import { LocalConversationThread } from "./local-conversation-thread";
import { useOpenThreadOverlay } from "./use-open-thread-overlay";
import { useResumeConversationIfNeeded } from "./use-resume-conversation-if-needed";

const EMPTY_TURNS: Array<AppServerConversationTurn> = [];

/**
 * LocalConversationPage is optimistically rendered after we submit our initial request.
 * AppServerManager will track both the state of the request and the compiled conversation for us.
 * Until we have a conversation, we'll render the first request.
 */
export function LocalConversationPage(): React.ReactElement {
  const windowType = useWindowType();
  const navigate = useNavigate();
  const { conversationId } = useParams<{
    conversationId: ConversationId;
  }>();
  const hasConversation = useLocalConversationSelector(
    conversationId ?? null,
    (conversation) => conversation != null,
  );
  const debugConversationId = useLocalConversationSelector(
    conversationId ?? null,
    (conversation) => conversation?.id ?? null,
  );
  const latestModel = useLocalConversationSelector(
    conversationId ?? null,
    (conversation) => conversation?.latestModel ?? null,
  );
  const latestReasoningEffort = useLocalConversationSelector(
    conversationId ?? null,
    (conversation) => conversation?.latestReasoningEffort ?? null,
  );
  const rolloutPath = useLocalConversationSelector(
    conversationId ?? null,
    (conversation) => conversation?.rolloutPath ?? null,
  );
  const resumeState = useLocalConversationSelector(
    conversationId ?? null,
    (conversation) => conversation?.resumeState ?? null,
  );
  const conversationCwd = useLocalConversationSelector(
    conversationId ?? null,
    (conversation) => conversation?.cwd ?? null,
  );
  const conversationTurns = useLocalConversationSelector(
    conversationId ?? null,
    (conversation) => conversation?.turns ?? EMPTY_TURNS,
  );
  const shouldResumeInPageShell = windowType === "extension";
  const { isResuming } = useResumeConversationIfNeeded(
    shouldResumeInPageShell ? (conversationId ?? null) : null,
  );
  const subagentParentThreadId = useLocalConversationSelector(
    conversationId ?? null,
    (conversation) =>
      getSubagentSourceMetadata(conversation?.source ?? null)?.parentThreadId ??
      null,
  );
  const handleOpenThreadOverlay = useOpenThreadOverlay({
    conversationId: conversationId ?? null,
  });
  const previousConversationIdRef = useRef<ConversationId | null>(
    conversationId ?? null,
  );
  const hadConversationRef = useRef(false);
  const lastKnownCwdRef = useRef<string | null>(null);

  if (previousConversationIdRef.current !== (conversationId ?? null)) {
    previousConversationIdRef.current = conversationId ?? null;
    hadConversationRef.current = false;
    lastKnownCwdRef.current = null;
  }

  if (hasConversation) {
    hadConversationRef.current = true;
  }
  if (conversationCwd != null) {
    lastKnownCwdRef.current = conversationCwd;
  }

  useRegisterCommand("openThreadOverlay", handleOpenThreadOverlay);
  const editedFilePaths = getConversationEditedFilePaths(conversationTurns);
  const referencedFilePaths =
    getConversationReferencedFilePaths(conversationTurns);
  const debugLines = [
    { label: "id", value: debugConversationId ?? conversationId ?? "none" },
    {
      label: "model",
      value: latestModel ?? "unknown",
    },
    {
      label: "reasoning",
      value: latestReasoningEffort ?? "unknown",
    },
    {
      label: "rolloutPath",
      value: rolloutPath ?? "unknown",
    },
    {
      label: "resumeState",
      value: resumeState ?? "unknown",
    },
    {
      label: "cwd",
      value: conversationCwd ?? "unknown",
    },
    {
      label: "editedFileCount",
      value: String(editedFilePaths.length),
    },
    ...editedFilePaths.map((path, index) => ({
      label: `editedFile[${index}]`,
      value: path,
    })),
    {
      label: "referencedFileCount",
      value: String(referencedFilePaths.length),
    },
    ...referencedFilePaths.map((path, index) => ({
      label: `referencedFile[${index}]`,
      value: path,
    })),
  ];

  useDebugPanel({
    title: "Local conversation",
    lines: debugLines,
  });

  if (!conversationId) {
    return <Navigate to="/" />;
  } else if (hadConversationRef.current && !hasConversation && !isResuming) {
    return (
      <Navigate
        to="/"
        replace
        state={{
          focusComposerNonce: Date.now(),
          prefillCwd: lastKnownCwdRef.current,
        }}
      />
    );
  }

  const pageContent =
    windowType === "extension" ? (
      <LocalConversationThread
        key={conversationId}
        conversationId={conversationId}
        header={
          subagentParentThreadId == null ? undefined : (
            <LocalConversationExtensionHeader
              conversationId={conversationId}
              parentConversationId={createConversationId(
                subagentParentThreadId,
              )}
              onBack={() => {
                void navigate(`/local/${subagentParentThreadId}`);
              }}
            />
          )
        }
      />
    ) : isResuming || !hasConversation ? (
      <LoadingPage debugName="LocalConversationPage" />
    ) : (
      <LocalConversationPageElectron conversationId={conversationId} />
    );

  return (
    <LocalConversationRouteScopeProviders conversationId={conversationId}>
      <SearchBar.Surface />
      {pageContent}
    </LocalConversationRouteScopeProviders>
  );
}

function LocalConversationExtensionHeader({
  conversationId,
  parentConversationId,
  onBack,
}: {
  conversationId: ConversationId;
  parentConversationId: ConversationId;
  onBack: () => void;
}): React.ReactElement | null {
  const conversation = useLocalConversationSelector(
    conversationId,
    (currentConversation) => currentConversation ?? null,
  );
  const parentConversation = useLocalConversationSelector(
    parentConversationId,
    (currentConversation) => currentConversation ?? null,
  );

  if (conversation == null) {
    return null;
  }

  return (
    <Header
      onBack={onBack}
      title={
        <span className="flex min-w-0 items-center gap-1">
          <span className="truncate">
            {getLocalConversationTitle(conversation, parentConversation)}
          </span>
          <span
            className="shrink-0 font-medium"
            style={{
              color: getAgentMentionColorCssValueForSessionId(conversationId),
            }}
          >
            {getSubagentHeaderAgentName({
              agentNickname:
                getSubagentSourceMetadata(conversation.source)?.agentNickname ??
                null,
              conversationId,
            })}
          </span>
        </span>
      }
    />
  );
}
