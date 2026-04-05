import { useMutation } from "@tanstack/react-query";
import { useScope } from "maitai";
import { GlobalStateKey } from "protocol";
import type { ReactElement } from "react";
import { useState } from "react";
import { FormattedMessage, useIntl } from "react-intl";

import {
  useConversations,
  useDefaultAppServerManager,
} from "@/app-server/app-server-manager-hooks";
import type { AppServerConversationState } from "@/app-server/app-server-manager-types";
import { shouldHideSubagentConversation } from "@/app-server/utils/is-subagent-conversation";
import { Button } from "@/components/button";
import { Dialog } from "@/components/dialog";
import {
  DialogBody,
  DialogFooter,
  DialogHeader,
  DialogSection,
} from "@/components/dialog-layout";
import { Spinner } from "@/components/spinner";
import { toast$ } from "@/components/toaster/toast-signal";
import { Toggle } from "@/components/toggle";
import {
  useCodexWorktrees,
  type CodexWorktreeResponse,
} from "@/git-rpc/use-codex-worktrees";
import { useGitStableMetadata } from "@/git-rpc/use-git-stable-metadata";
import { useGlobalState } from "@/hooks/use-global-state";
import { useIsBackgroundSubagentsEnabled } from "@/hooks/use-is-background-subagents-enabled";
import { getLocalConversationTitle } from "@/local-conversation/get-local-conversation-title";
import { AppScope } from "@/scopes/app-scope";
import { SettingsContentLayout } from "@/settings/settings-content-layout";
import { SettingsGroup } from "@/settings/settings-group";
import { SettingsRow } from "@/settings/settings-row";
import { SettingsSectionTitleMessage } from "@/settings/settings-shared";
import { SettingsSurface } from "@/settings/settings-surface";
import { useHostConfig } from "@/shared-objects/use-host-config";
import { getComparableFsPath } from "@/utils/path";
import { useNavigateToLocalConversation } from "@/utils/use-navigate-to-local-conversation";
import { fetchFromVSCode } from "@/vscode-api";
import { resolveRepoRootFromGitDir } from "@/worktrees/worktree-paths";

type WorktreeDirectory = CodexWorktreeResponse["worktrees"][number];

type WorktreeGroup = {
  key: string;
  repoRoot: string | null;
  worktrees: Array<WorktreeDirectory>;
};

export function WorktreesSettingsPage(): ReactElement {
  const intl = useIntl();
  const appServerManager = useDefaultAppServerManager();
  const hostConfig = useHostConfig(appServerManager.getHostId());
  const {
    data: worktreesData,
    isLoading: isWorktreesLoading,
    error: worktreesError,
    refetch: refetchWorktrees,
  } = useCodexWorktrees(hostConfig);
  const { data: conversationsData, isLoading: isConversationsLoading } =
    useConversations();
  const isBackgroundSubagentsEnabled = useIsBackgroundSubagentsEnabled();
  const worktrees = worktreesData?.worktrees ?? [];
  const allConversations = conversationsData ?? [];
  const visibleConversations = allConversations.filter(
    (conversation) =>
      !shouldHideSubagentConversation(
        conversation,
        isBackgroundSubagentsEnabled,
      ),
  );
  const groups = groupWorktreesByRepoRoot(worktrees);

  const emptyState = (
    <SettingsGroup>
      <SettingsGroup.Header
        title={
          <FormattedMessage
            id="settings.worktrees.empty.title"
            defaultMessage="No worktrees yet"
            description="Empty state title for worktrees settings"
          />
        }
      />
      <SettingsGroup.Content>
        <SettingsSurface>
          <div className="p-3 text-sm text-token-text-secondary">
            <FormattedMessage
              id="settings.worktrees.empty.body"
              defaultMessage="Worktrees created by Codex will appear here."
              description="Empty state body for worktrees settings"
            />
          </div>
        </SettingsSurface>
      </SettingsGroup.Content>
    </SettingsGroup>
  );

  if (isWorktreesLoading) {
    return (
      <SettingsContentLayout
        title={<SettingsSectionTitleMessage slug="worktrees" />}
      >
        <WorktreeKeepCountSettings />
        <SettingsGroup>
          <SettingsGroup.Header
            title={
              <FormattedMessage
                id="settings.worktrees.loading.title"
                defaultMessage="Loading worktrees"
                description="Loading state title for worktrees settings"
              />
            }
          />
          <SettingsGroup.Content>
            <SettingsSurface>
              <div className="flex items-center gap-2 p-3 text-sm text-token-text-secondary">
                <Spinner className="icon-xxs" />
                <FormattedMessage
                  id="settings.worktrees.loading.body"
                  defaultMessage="Fetching worktree details."
                  description="Loading state body for worktrees settings"
                />
              </div>
            </SettingsSurface>
          </SettingsGroup.Content>
        </SettingsGroup>
      </SettingsContentLayout>
    );
  }

  if (worktreesError) {
    return (
      <SettingsContentLayout
        title={<SettingsSectionTitleMessage slug="worktrees" />}
      >
        <WorktreeKeepCountSettings />
        <SettingsGroup>
          <SettingsGroup.Header
            title={
              <FormattedMessage
                id="settings.worktrees.error.title"
                defaultMessage="Unable to load worktrees"
                description="Error state title for worktrees settings"
              />
            }
            actions={
              <Button
                className="shrink-0"
                color="secondary"
                onClick={() => {
                  void refetchWorktrees();
                }}
                size="toolbar"
              >
                <FormattedMessage
                  id="settings.worktrees.error.retry"
                  defaultMessage="Retry"
                  description="Retry button for worktrees settings"
                />
              </Button>
            }
          />
          <SettingsGroup.Content>
            <SettingsSurface>
              <div className="p-3 text-sm text-token-text-secondary">
                {worktreesError.message ||
                  intl.formatMessage({
                    id: "settings.worktrees.error.body",
                    defaultMessage:
                      "Something went wrong while loading worktrees.",
                    description: "Error body for worktrees settings",
                  })}
              </div>
            </SettingsSurface>
          </SettingsGroup.Content>
        </SettingsGroup>
      </SettingsContentLayout>
    );
  }

  return (
    <SettingsContentLayout
      title={<SettingsSectionTitleMessage slug="worktrees" />}
    >
      <WorktreeKeepCountSettings />
      {groups.length === 0
        ? emptyState
        : groups.map((group) => (
            <WorktreeGroupSection
              key={group.key}
              allConversations={allConversations}
              visibleConversations={visibleConversations}
              isConversationsLoading={isConversationsLoading}
              onWorktreeDeleted={() => {
                void refetchWorktrees();
              }}
              repoRoot={group.repoRoot}
              worktrees={group.worktrees}
            />
          ))}
    </SettingsContentLayout>
  );
}

function WorktreeKeepCountSettings(): ReactElement {
  const intl = useIntl();
  const scope = useScope(AppScope);
  const [isDisableDialogOpen, setIsDisableDialogOpen] = useState(false);
  const [keepCountDraft, setKeepCountDraft] = useState<string | null>(null);
  const {
    data: autoCleanupEnabled,
    setData: setAutoCleanupEnabled,
    isLoading: isAutoCleanupLoading,
  } = useGlobalState(GlobalStateKey.WORKTREE_AUTO_CLEANUP_ENABLED);
  const {
    data: keepCount,
    setData: setKeepCount,
    isLoading: isKeepCountLoading,
  } = useGlobalState(GlobalStateKey.WORKTREE_KEEP_COUNT);

  const saveAutoCleanupMutation = useMutation({
    mutationFn: (newValue: boolean) => setAutoCleanupEnabled(newValue),
    onSuccess: (_data, newValue) => {
      if (newValue) {
        scope.get(toast$).success(
          intl.formatMessage({
            id: "settings.worktrees.autoCleanup.save.enabled",
            defaultMessage: "Automatic deletion enabled",
            description:
              "Toast shown when automatic worktree deletion is enabled",
          }),
        );
        return;
      }
      scope.get(toast$).success(
        intl.formatMessage({
          id: "settings.worktrees.autoCleanup.save.disabled",
          defaultMessage: "Automatic deletion disabled",
          description:
            "Toast shown when automatic worktree deletion is disabled",
        }),
      );
    },
    onError: () => {
      scope.get(toast$).danger(
        intl.formatMessage({
          id: "settings.worktrees.autoCleanup.save.error",
          defaultMessage: "Failed to save automatic deletion setting",
          description:
            "Toast shown when saving the automatic worktree deletion setting fails",
        }),
      );
    },
  });
  const saveKeepCountMutation = useMutation({
    mutationFn: (newValue: number) => setKeepCount(newValue),
    onSuccess: () => {
      setKeepCountDraft(null);
      scope.get(toast$).success(
        intl.formatMessage({
          id: "settings.worktrees.keepCount.save.success",
          defaultMessage: "Saved auto-delete limit",
          description:
            "Toast shown when the worktree auto-delete limit is saved",
        }),
      );
    },
    onError: () => {
      scope.get(toast$).danger(
        intl.formatMessage({
          id: "settings.worktrees.keepCount.save.error",
          defaultMessage: "Failed to save auto-delete limit",
          description:
            "Toast shown when saving the worktree auto-delete limit fails",
        }),
      );
    },
  });

  const keepCountText = String(keepCount);
  const keepCountValue = keepCountDraft ?? keepCountText;
  const isAutoCleanupActionDisabled =
    isAutoCleanupLoading || saveAutoCleanupMutation.isPending;
  const isKeepCountDisabled =
    isKeepCountLoading ||
    saveKeepCountMutation.isPending ||
    isAutoCleanupActionDisabled ||
    !autoCleanupEnabled;

  const handleAutoCleanupToggle = (nextValue: boolean): void => {
    if (isAutoCleanupActionDisabled) {
      return;
    }
    if (nextValue) {
      saveAutoCleanupMutation.mutate(true);
      return;
    }
    setIsDisableDialogOpen(true);
  };

  const handleDisableAutoCleanupConfirm = (): void => {
    setKeepCountDraft(null);
    setIsDisableDialogOpen(false);
    saveAutoCleanupMutation.mutate(false);
  };

  const handleKeepCountSave = (): void => {
    if (isKeepCountDisabled || keepCountDraft == null) {
      return;
    }
    const trimmedDraft = keepCountDraft.trim();
    const parsed = Number.parseInt(trimmedDraft, 10);
    if (trimmedDraft.length === 0 || Number.isNaN(parsed)) {
      setKeepCountDraft(null);
      return;
    }
    const normalized = Math.max(1, Math.trunc(parsed));
    if (normalized === keepCount) {
      setKeepCountDraft(null);
      return;
    }
    saveKeepCountMutation.mutate(normalized);
  };

  return (
    <SettingsGroup>
      <SettingsGroup.Content>
        <SettingsSurface>
          <SettingsRow
            label={
              <FormattedMessage
                id="settings.worktrees.autoCleanup.label"
                defaultMessage="Automatically delete old worktrees"
                description="Label for the automatic worktree deletion toggle"
              />
            }
            description={
              <FormattedMessage
                id="settings.worktrees.autoCleanup.description"
                defaultMessage="Recommended for most users. Turn this off only if you want to manage old worktrees and disk usage yourself."
                description="Description for the automatic worktree deletion toggle"
              />
            }
            control={
              <Toggle
                checked={autoCleanupEnabled}
                disabled={isAutoCleanupActionDisabled}
                onChange={handleAutoCleanupToggle}
                ariaLabel={intl.formatMessage({
                  id: "settings.worktrees.autoCleanup.ariaLabel",
                  defaultMessage: "Automatically delete old worktrees",
                  description:
                    "Aria label for the automatic worktree deletion toggle",
                })}
              />
            }
          />
          <SettingsRow
            label={
              <FormattedMessage
                id="settings.worktrees.keepCount.label"
                defaultMessage="Auto-delete limit"
                description="Label for the worktree auto-delete limit setting"
              />
            }
            description={
              autoCleanupEnabled ? (
                <FormattedMessage
                  id="settings.worktrees.keepCount.description"
                  defaultMessage="Number of Codex-managed worktrees to keep before older ones are pruned automatically. Codex snapshots worktrees before deleting, so pruned worktrees should always be restorable."
                  description="Description for the worktree keep count setting"
                />
              ) : (
                <FormattedMessage
                  id="settings.worktrees.keepCount.description.disabled"
                  defaultMessage="Automatic deletion is disabled. Codex will not prune old worktrees automatically. Re-enable it to use this saved limit again."
                  description="Description for the worktree keep count setting when automatic deletion is disabled"
                />
              )
            }
            control={
              <div className="ml-6">
                <input
                  className="w-24 rounded-md border border-token-input-border bg-token-input-background px-2.5 py-1.5 text-base text-token-input-foreground outline-none placeholder:text-token-input-placeholder-foreground focus:border-token-focus-border"
                  value={keepCountValue}
                  onChange={(event) => {
                    if (isKeepCountDisabled) {
                      return;
                    }
                    const newValue = event.target.value;
                    setKeepCountDraft(
                      newValue === keepCountText ? null : newValue,
                    );
                  }}
                  onBlur={handleKeepCountSave}
                  onKeyDown={(event) => {
                    if (event.key !== "Enter") {
                      return;
                    }
                    event.preventDefault();
                    handleKeepCountSave();
                  }}
                  type="number"
                  inputMode="numeric"
                  min={1}
                  step={1}
                  aria-label={intl.formatMessage({
                    id: "settings.worktrees.keepCount.ariaLabel",
                    defaultMessage: "Auto-delete limit",
                    description:
                      "Aria label for the worktree auto-delete limit input",
                  })}
                  disabled={isKeepCountDisabled}
                />
              </div>
            }
          />
        </SettingsSurface>
      </SettingsGroup.Content>
      <WorktreeAutoCleanupConfirmDialog
        open={isDisableDialogOpen}
        onOpenChange={setIsDisableDialogOpen}
        onConfirm={handleDisableAutoCleanupConfirm}
      />
    </SettingsGroup>
  );
}

function WorktreeAutoCleanupConfirmDialog({
  open,
  onOpenChange,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}): ReactElement {
  return (
    <Dialog open={open} showDialogClose={false} onOpenChange={onOpenChange}>
      <DialogBody>
        <DialogSection>
          <DialogHeader
            title={
              <FormattedMessage
                id="settings.worktrees.autoCleanup.confirm.title"
                defaultMessage="Disable automatic worktree deletion?"
                description="Title for the automatic worktree deletion disable confirmation dialog"
              />
            }
          />
        </DialogSection>
        <DialogSection className="text-token-description-foreground">
          <p>
            <FormattedMessage
              id="settings.worktrees.autoCleanup.confirm.body"
              defaultMessage="We highly recommend keeping automatic deletion on so old worktrees do not build up and use unnecessary disk space. If you prefer to manage old worktrees yourself, you can turn this off and Codex will stop deleting them automatically."
              description="Body copy in the automatic worktree deletion disable confirmation dialog"
            />
          </p>
        </DialogSection>
        <DialogSection>
          <DialogFooter>
            <Button
              color="ghost"
              onClick={() => {
                onOpenChange(false);
              }}
            >
              <FormattedMessage
                id="settings.worktrees.autoCleanup.confirm.cancel"
                defaultMessage="Keep automatic deletion"
                description="Cancel button label for the automatic worktree deletion disable confirmation dialog"
              />
            </Button>
            <Button
              color="danger"
              onClick={() => {
                onConfirm();
              }}
            >
              <FormattedMessage
                id="settings.worktrees.autoCleanup.confirm.confirm"
                defaultMessage="Disable automatic deletion"
                description="Confirm button label for the automatic worktree deletion disable confirmation dialog"
              />
            </Button>
          </DialogFooter>
        </DialogSection>
      </DialogBody>
    </Dialog>
  );
}

function WorktreeGroupSection({
  repoRoot,
  worktrees,
  allConversations,
  visibleConversations,
  isConversationsLoading,
  onWorktreeDeleted,
}: {
  repoRoot: string | null;
  worktrees: Array<WorktreeDirectory>;
  allConversations: Array<AppServerConversationState>;
  visibleConversations: Array<AppServerConversationState>;
  isConversationsLoading: boolean;
  onWorktreeDeleted: () => void;
}): ReactElement {
  const metadataCwd = repoRoot;
  const appServerManager = useDefaultAppServerManager();
  const hostConfig = useHostConfig(appServerManager.getHostId());
  const { data: metadata, isLoading: metadataLoading } = useGitStableMetadata(
    metadataCwd,
    hostConfig,
  );
  const headingRoot = metadata?.root ?? repoRoot ?? worktrees[0]?.dir ?? null;
  const heading = headingRoot ? (
    <span className="truncate font-mono text-sm">{headingRoot}</span>
  ) : (
    <FormattedMessage
      id="settings.worktrees.repository.unknown"
      defaultMessage="Unknown repository"
      description="Fallback label when worktree repository cannot be resolved"
    />
  );
  const subtitle = metadataLoading && headingRoot == null;

  return (
    <SettingsGroup>
      <SettingsGroup.Header
        title={
          <div className="flex min-w-0 flex-col">
            <div className="min-w-0 truncate text-sm text-token-text-primary">
              {heading}
            </div>
            {subtitle ? (
              <div className="text-xs text-token-text-secondary">
                <FormattedMessage
                  id="settings.worktrees.repository.loading"
                  defaultMessage="Loading repository metadata…"
                  description="Subtitle while repository metadata is loading"
                />
              </div>
            ) : null}
          </div>
        }
      />
      <SettingsGroup.Content>
        <SettingsSurface>
          {getSortedWorktrees(worktrees, visibleConversations).map(
            (worktree) => (
              <WorktreeRow
                key={worktree.dir}
                allConversations={getConversationsForWorktree(
                  worktree.dir,
                  allConversations,
                )}
                visibleConversations={getConversationsForWorktree(
                  worktree.dir,
                  visibleConversations,
                )}
                isConversationsLoading={isConversationsLoading}
                onWorktreeDeleted={onWorktreeDeleted}
                worktree={worktree}
              />
            ),
          )}
        </SettingsSurface>
      </SettingsGroup.Content>
    </SettingsGroup>
  );
}

function WorktreeRow({
  worktree,
  allConversations,
  visibleConversations,
  isConversationsLoading,
  onWorktreeDeleted,
}: {
  worktree: WorktreeDirectory;
  allConversations: Array<AppServerConversationState>;
  visibleConversations: Array<AppServerConversationState>;
  isConversationsLoading: boolean;
  onWorktreeDeleted: () => void;
}): ReactElement {
  const navigateToConversation = useNavigateToLocalConversation();
  const appServerManager = useDefaultAppServerManager();
  const scope = useScope(AppScope);
  const intl = useIntl();
  const [isDeleting, setIsDeleting] = useState(false);
  const hostConfig = useHostConfig(appServerManager.getHostId());

  const handleDelete = async (): Promise<void> => {
    if (isDeleting) {
      return;
    }
    setIsDeleting(true);
    try {
      if (allConversations.length > 0) {
        await Promise.all(
          allConversations.map((conversation) =>
            appServerManager.archiveConversation(conversation.id, {
              cleanupWorktree: false,
            }),
          ),
        );
      }
      await fetchFromVSCode("worktree-delete", {
        params: {
          hostId: hostConfig.id,
          worktree: worktree.dir,
          reason: "settings-delete-targeted",
        },
      });
      onWorktreeDeleted();
    } catch (_error) {
      scope.get(toast$).danger(
        intl.formatMessage({
          id: "settings.worktrees.delete.error",
          defaultMessage: "Failed to delete worktree",
          description: "Error message when deleting a worktree from settings",
        }),
      );
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="flex flex-col gap-2 p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm font-medium text-token-text-primary">
            <FormattedMessage
              id="settings.worktrees.row.title"
              defaultMessage="Worktree"
              description="Label for a worktree row"
            />
          </div>
          <div className="mt-1 truncate font-mono text-xs text-token-text-secondary">
            {worktree.dir}
          </div>
        </div>
        <Button
          className="shrink-0"
          color="danger"
          loading={isDeleting}
          onClick={() => {
            void handleDelete();
          }}
          size="toolbar"
        >
          <FormattedMessage
            id="settings.worktrees.row.delete"
            defaultMessage="Delete"
            description="Delete button label for a worktree row"
          />
        </Button>
      </div>
      <div className="flex flex-col gap-1">
        <div className="text-xs text-token-text-secondary">
          <FormattedMessage
            id="settings.worktrees.row.conversations"
            defaultMessage="Conversations"
            description="Label for conversations list within a worktree row"
          />
        </div>
        {isConversationsLoading ? (
          <div className="flex items-center gap-2 text-xs text-token-text-secondary">
            <Spinner className="icon-xxs" />
            <FormattedMessage
              id="settings.worktrees.row.conversations.loading"
              defaultMessage="Loading conversations…"
              description="Loading label for conversations list"
            />
          </div>
        ) : visibleConversations.length === 0 ? (
          <div className="text-xs text-token-text-secondary">
            <FormattedMessage
              id="settings.worktrees.row.conversations.empty"
              defaultMessage="No conversations linked to this worktree."
              description="Empty state for conversations list in worktree row"
            />
          </div>
        ) : (
          <div className="flex flex-col gap-1">
            {visibleConversations.map((conversation) => {
              const title = getLocalConversationTitle(conversation);
              return (
                <button
                  key={conversation.id}
                  className="focus-visible:outline-token-focus flex w-full items-center justify-between gap-2 rounded-lg px-row-x py-row-y text-left text-sm text-token-text-primary hover:bg-token-list-hover-background hover:text-token-text-primary/80 focus-visible:outline-1 focus-visible:outline-offset-[-2px]"
                  onClick={() => {
                    navigateToConversation(conversation.id);
                  }}
                  type="button"
                >
                  <span className="truncate">
                    {title ? (
                      title
                    ) : (
                      <FormattedMessage
                        id="settings.worktrees.conversation.untitled"
                        defaultMessage="Untitled conversation"
                        description="Fallback title for a conversation"
                      />
                    )}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function groupWorktreesByRepoRoot(
  worktrees: Array<WorktreeDirectory>,
): Array<WorktreeGroup> {
  const groups = new Map<string, WorktreeGroup>();
  for (const worktree of worktrees) {
    const repoRoot = resolveRepoRootFromGitDir(worktree.gitDir);
    const key = normalizePathForMatch(repoRoot ?? worktree.dir);
    const existing = groups.get(key);
    if (existing) {
      existing.worktrees.push(worktree);
      continue;
    }
    groups.set(key, { key, repoRoot, worktrees: [worktree] });
  }
  return Array.from(groups.values());
}

function getConversationsForWorktree(
  worktreeDir: string,
  conversations: Array<AppServerConversationState>,
): Array<AppServerConversationState> {
  if (conversations.length === 0) {
    return [];
  }
  const normalizedWorktree = normalizePathForMatch(worktreeDir);
  return conversations.filter((conversation) => {
    const cwd = conversation.cwd;
    if (!cwd) {
      return false;
    }
    const normalizedCwd = normalizePathForMatch(cwd);
    if (normalizedCwd === normalizedWorktree) {
      return true;
    }
    return normalizedCwd.startsWith(`${normalizedWorktree}/`);
  });
}

function getSortedWorktrees(
  worktrees: Array<WorktreeDirectory>,
  conversations: Array<AppServerConversationState>,
): Array<WorktreeDirectory> {
  if (conversations.length === 0) {
    return worktrees;
  }
  const worktreesWithIndex = worktrees.map((worktree, index) => ({
    worktree,
    index,
    conversationCount: getConversationsForWorktree(worktree.dir, conversations)
      .length,
  }));
  worktreesWithIndex.sort((a, b) => {
    const countDelta = b.conversationCount - a.conversationCount;
    if (countDelta !== 0) {
      return countDelta;
    }
    return a.index - b.index;
  });
  return worktreesWithIndex.map((entry) => entry.worktree);
}

function normalizePathForMatch(path: string): string {
  return getComparableFsPath(path).replace(/\/+$/, "");
}
