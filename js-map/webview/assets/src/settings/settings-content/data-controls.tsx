import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type * as AppServer from "app-server-types";
import { useScope } from "maitai";
import { createConversationId } from "protocol";
import type React from "react";
import { FormattedMessage, useIntl } from "react-intl";
import { useNavigate } from "react-router";

import { useDefaultAppServerManager } from "@/app-server/app-server-manager-hooks";
import { Button } from "@/components/button";
import { toast$ } from "@/components/toaster/toast-signal";
import { useWindowType } from "@/hooks/use-window-type";
import { toSidebarTitle } from "@/local-conversation/get-local-conversation-title";
import { AppScope } from "@/scopes/app-scope";
import { SettingsContentLayout } from "@/settings/settings-content-layout";
import { SettingsGroup } from "@/settings/settings-group";
import { SettingsRow } from "@/settings/settings-row";
import { SettingsSectionTitleMessage } from "@/settings/settings-shared";
import { SettingsSurface } from "@/settings/settings-surface";
import { getProjectName } from "@/thread-layout/get-project-name";
import { QUERY_STALE_TIME } from "@/utils/query-stale-times";
import { useNavigateToLocalConversation } from "@/utils/use-navigate-to-local-conversation";

export function DataControlsSettings(): React.ReactElement {
  const appServerManager = useDefaultAppServerManager();
  const {
    data: archivedThreads = [],
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["archived-threads"],
    queryFn: () => appServerManager.listArchivedThreads(),
    staleTime: QUERY_STALE_TIME.FIVE_SECONDS,
  });

  return (
    <SettingsContentLayout
      title={<SettingsSectionTitleMessage slug="data-controls" />}
    >
      <SettingsGroup className="gap-2">
        <SettingsGroup.Content>
          <ArchivedChatsList
            archivedThreads={archivedThreads}
            isLoading={isLoading}
            isError={isError}
          />
        </SettingsGroup.Content>
      </SettingsGroup>
    </SettingsContentLayout>
  );
}

function ArchivedChatsList({
  archivedThreads,
  isLoading,
  isError,
}: {
  archivedThreads: Array<AppServer.v2.Thread>;
  isLoading: boolean;
  isError: boolean;
}): React.ReactElement {
  const navigate = useNavigate();
  const navigateToConversation = useNavigateToLocalConversation();
  const windowType = useWindowType();

  const openConversation = (threadId: string): void => {
    if (windowType === "electron") {
      void navigate(`/local/${createConversationId(threadId)}`);
      return;
    }
    navigateToConversation(threadId);
  };

  if (isLoading) {
    return (
      <div className="px-1.5 py-1">
        <SettingsSurface>
          <SettingsRow
            label={
              <FormattedMessage
                id="settings.dataControls.archivedChats.loading"
                defaultMessage="Loading archived chats…"
                description="Loading state label for archived chats list"
              />
            }
            control={null}
          />
        </SettingsSurface>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="px-1.5 py-1">
        <SettingsSurface>
          <SettingsRow
            label={
              <FormattedMessage
                id="settings.dataControls.archivedChats.error"
                defaultMessage="Could not load archived chats."
                description="Error state label for archived chats list"
              />
            }
            control={null}
          />
        </SettingsSurface>
      </div>
    );
  }

  if (archivedThreads.length === 0) {
    return (
      <div className="px-1.5 py-1">
        <SettingsSurface>
          <SettingsRow
            label={
              <FormattedMessage
                id="settings.dataControls.archivedChats.empty"
                defaultMessage="No archived chats."
                description="Empty state label for archived chats list"
              />
            }
            control={null}
          />
        </SettingsSurface>
      </div>
    );
  }

  return (
    <div className="px-1.5 py-1">
      <SettingsSurface className="max-h-[min(80vh)] overflow-y-auto">
        {archivedThreads.map((thread) => {
          const conversationId = createConversationId(thread.id);

          return (
            <ArchivedChatRow
              key={thread.id}
              archivedThread={thread}
              conversationId={conversationId}
              onViewConversation={openConversation}
            />
          );
        })}
      </SettingsSurface>
    </div>
  );
}

function ArchivedChatRow({
  archivedThread,
  conversationId,
  onViewConversation,
}: {
  archivedThread: AppServer.v2.Thread;
  conversationId: ReturnType<typeof createConversationId>;
  onViewConversation: (threadId: string) => void;
}): React.ReactElement {
  const appServerManager = useDefaultAppServerManager();
  const queryClient = useQueryClient();
  const scope = useScope(AppScope);
  const intl = useIntl();
  const unarchiveMutation = useMutation({
    mutationKey: ["unarchive-thread", archivedThread.id],
    mutationFn: async () =>
      appServerManager.unarchiveConversation(conversationId),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ["archived-threads"] });
      const previousThreads =
        queryClient.getQueryData<Array<AppServer.v2.Thread>>([
          "archived-threads",
        ]) ?? [];
      queryClient.setQueryData<Array<AppServer.v2.Thread>>(
        ["archived-threads"],
        previousThreads.filter((thread) => thread.id !== archivedThread.id),
      );
      return { previousThreads };
    },
    onError: (_error, _variables, context) => {
      if (context?.previousThreads) {
        queryClient.setQueryData<Array<AppServer.v2.Thread>>(
          ["archived-threads"],
          context.previousThreads,
        );
      }
      scope.get(toast$).danger(
        intl.formatMessage({
          id: "settings.dataControls.archivedChats.unarchiveError",
          defaultMessage: "Failed to unarchive chat",
          description: "Error message when unarchiving a chat",
        }),
      );
    },
    onSuccess: () => {
      scope.get(toast$).info(
        <span>
          <FormattedMessage
            id="settings.dataControls.archivedChats.unarchiveSuccessPlain"
            defaultMessage="Unarchived thread."
            description="Success toast after unarchiving a chat"
          />
          <button
            className="pointer-events-auto ml-1 cursor-interaction text-token-link underline-offset-2 hover:underline"
            type="button"
            onClick={() => {
              onViewConversation(archivedThread.id);
            }}
          >
            <FormattedMessage
              id="settings.dataControls.archivedChats.viewNow"
              defaultMessage="View now"
              description="Action label to open an unarchived chat from the success toast"
            />
          </button>
        </span>,
        { id: `unarchive-thread-${archivedThread.id}` },
      );
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ["archived-threads"] });
    },
  });

  const title = toSidebarTitle(archivedThread.preview).trim();
  const updatedAt = new Date(Number(archivedThread.updatedAt) * 1000);
  const createdAt = new Date(Number(archivedThread.createdAt) * 1000);
  const subtitleDate = Number.isFinite(updatedAt.getTime())
    ? updatedAt
    : Number.isFinite(createdAt.getTime())
      ? createdAt
      : null;
  const repoName =
    getProjectName(archivedThread.cwd) ?? getProjectName(archivedThread.path);
  const hasSubtitleDate = subtitleDate != null;
  const dateValue = hasSubtitleDate
    ? intl.formatDate(subtitleDate, {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : "";
  const timeValue = hasSubtitleDate
    ? intl.formatTime(subtitleDate, {
        hour: "numeric",
        minute: "2-digit",
      })
    : "";

  return (
    <div className="flex w-full items-center justify-between gap-3 px-4 py-3 hover:bg-token-list-hover-background">
      <div className="min-w-0 flex-1 text-left text-token-text-primary">
        <div className="truncate text-base font-medium">
          {title.length > 0 ? (
            title
          ) : (
            <FormattedMessage
              id="settings.dataControls.archivedChats.untitled"
              defaultMessage="Untitled chat"
              description="Fallback title for an archived chat"
            />
          )}
        </div>
        <div className="mt-1 flex min-w-0 flex-col gap-0.5 text-sm">
          <div className="truncate text-token-text-secondary">
            {hasSubtitleDate ? (
              repoName ? (
                <FormattedMessage
                  id="settings.dataControls.archivedChats.dateTimeWithRepo"
                  defaultMessage="{date}, {time} • {repo}"
                  description="Date, time, and repo name for an archived chat"
                  values={{ date: dateValue, time: timeValue, repo: repoName }}
                />
              ) : (
                <FormattedMessage
                  id="settings.dataControls.archivedChats.dateTime"
                  defaultMessage="{date}, {time}"
                  description="Date and time for an archived chat"
                  values={{ date: dateValue, time: timeValue }}
                />
              )
            ) : null}
          </div>
        </div>
      </div>
      <Button
        className="shrink-0"
        color="secondary"
        size="toolbar"
        disabled={unarchiveMutation.isPending}
        loading={unarchiveMutation.isPending}
        onClick={() => {
          if (unarchiveMutation.isPending) {
            return;
          }
          unarchiveMutation.mutate();
        }}
      >
        <FormattedMessage
          id="settings.dataControls.archivedChats.unarchive"
          defaultMessage="Unarchive"
          description="Button label to unarchive a chat"
        />
      </Button>
    </div>
  );
}
