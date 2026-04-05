import { useMutation } from "@tanstack/react-query";
import { useScope } from "maitai";
import { GlobalStateKey, type GitPullRequestMergeMethod } from "protocol";
import type React from "react";
import { useState } from "react";
import { FormattedMessage, useIntl } from "react-intl";

import { Button } from "@/components/button";
import { SegmentedToggle } from "@/components/segmented-toggle";
import { toast$ } from "@/components/toaster/toast-signal";
import { Toggle } from "@/components/toggle";
import { useGlobalState } from "@/hooks/use-global-state";
import { useHotkey } from "@/keyboard-shortcuts/use-hotkey";
import { AppScope } from "@/scopes/app-scope";
import { SettingsContentLayout } from "@/settings/settings-content-layout";
import { SettingsGroup } from "@/settings/settings-group";
import { SettingsRow } from "@/settings/settings-row";
import { SettingsSectionTitleMessage } from "@/settings/settings-shared";
import { SettingsSurface } from "@/settings/settings-surface";
import { useGate } from "@/statsig/statsig";

export function GitSettings(): React.ReactElement {
  const intl = useIntl();
  const scope = useScope(AppScope);
  const pullRequestCompoundButtonEnabled = useGate(
    __statsigName("codex-app-pr-compound-button"),
  );
  const [branchPrefixDraft, setBranchPrefixDraft] = useState<string | null>(
    null,
  );
  const {
    data: branchPrefix,
    setData: setBranchPrefix,
    isLoading: isBranchPrefixLoading,
  } = useGlobalState(GlobalStateKey.GIT_BRANCH_PREFIX);
  const {
    data: alwaysForcePush,
    setData: setAlwaysForcePush,
    isLoading: isForcePushLoading,
  } = useGlobalState(GlobalStateKey.GIT_ALWAYS_FORCE_PUSH);
  const {
    data: createPullRequestAsDraft,
    setData: setCreatePullRequestAsDraft,
    isLoading: isCreatePullRequestAsDraftLoading,
  } = useGlobalState(GlobalStateKey.GIT_CREATE_PULL_REQUEST_AS_DRAFT);
  const {
    data: pullRequestMergeMethod,
    setData: setPullRequestMergeMethod,
    isLoading: isPullRequestMergeMethodLoading,
  } = useGlobalState(GlobalStateKey.GIT_PULL_REQUEST_MERGE_METHOD);
  const {
    data: showSidebarPrIcons,
    setData: setShowSidebarPrIcons,
    isLoading: isShowSidebarPrIconsLoading,
  } = useGlobalState(GlobalStateKey.GIT_SHOW_SIDEBAR_PR_ICONS);
  const {
    data: commitInstructions,
    setData: setCommitInstructions,
    isLoading: isCommitInstructionsLoading,
  } = useGlobalState(GlobalStateKey.GIT_COMMIT_INSTRUCTIONS);
  const {
    data: pullRequestInstructions,
    setData: setPullRequestInstructions,
    isLoading: isPullRequestInstructionsLoading,
  } = useGlobalState(GlobalStateKey.GIT_PR_INSTRUCTIONS);
  const saveBranchPrefixMutation = useMutation({
    mutationFn: (newValue: string) => setBranchPrefix(newValue),
    onSuccess: () => {
      setBranchPrefixDraft(null);
      scope.get(toast$).success(
        intl.formatMessage({
          id: "settings.git.branchPrefix.save.success",
          defaultMessage: "Saved branch prefix",
          description: "Toast shown when git branch prefix is saved",
        }),
      );
    },
    onError: () => {
      scope.get(toast$).danger(
        intl.formatMessage({
          id: "settings.git.branchPrefix.save.error",
          defaultMessage: "Failed to save branch prefix",
          description: "Toast shown when git branch prefix save fails",
        }),
      );
    },
  });
  const forcePushMutation = useMutation({
    mutationFn: (newValue: boolean) => setAlwaysForcePush(newValue),
    onSuccess: (_data, newValue) => {
      if (newValue) {
        scope.get(toast$).success(
          intl.formatMessage({
            id: "settings.git.forcePush.save.enabled",
            defaultMessage: "Always force push enabled",
            description:
              "Toast shown when the always force push toggle is enabled",
          }),
        );
      } else {
        scope.get(toast$).success(
          intl.formatMessage({
            id: "settings.git.forcePush.save.disabled",
            defaultMessage: "Always force push disabled",
            description:
              "Toast shown when the always force push toggle is disabled",
          }),
        );
      }
    },
    onError: () => {
      scope.get(toast$).danger(
        intl.formatMessage({
          id: "settings.git.forcePush.save.error",
          defaultMessage: "Failed to save force push setting",
          description:
            "Toast shown when saving the always force push toggle fails",
        }),
      );
    },
  });
  const pullRequestMergeMethodMutation = useMutation({
    mutationFn: (newValue: GitPullRequestMergeMethod) =>
      setPullRequestMergeMethod(newValue),
    onSuccess: () => {
      scope.get(toast$).success(
        intl.formatMessage({
          id: "settings.git.pullRequestMergeMethod.save.success",
          defaultMessage: "Saved pull request merge method",
          description:
            "Toast shown when the pull request merge method setting is saved",
        }),
      );
    },
    onError: () => {
      scope.get(toast$).danger(
        intl.formatMessage({
          id: "settings.git.pullRequestMergeMethod.save.error",
          defaultMessage: "Failed to save pull request merge method",
          description:
            "Toast shown when saving the pull request merge method setting fails",
        }),
      );
    },
  });
  const createPullRequestAsDraftMutation = useMutation({
    mutationFn: (newValue: boolean) => setCreatePullRequestAsDraft(newValue),
    onSuccess: (_data, newValue) => {
      if (newValue) {
        scope.get(toast$).success(
          intl.formatMessage({
            id: "settings.git.createDraftPullRequest.save.enabled",
            defaultMessage: "Create draft pull requests enabled",
            description:
              "Toast shown when the draft pull request toggle is enabled",
          }),
        );
      } else {
        scope.get(toast$).success(
          intl.formatMessage({
            id: "settings.git.createDraftPullRequest.save.disabled",
            defaultMessage: "Create draft pull requests disabled",
            description:
              "Toast shown when the draft pull request toggle is disabled",
          }),
        );
      }
    },
    onError: () => {
      scope.get(toast$).danger(
        intl.formatMessage({
          id: "settings.git.createDraftPullRequest.save.error",
          defaultMessage: "Failed to save draft pull request setting",
          description:
            "Toast shown when saving the draft pull request toggle fails",
        }),
      );
    },
  });
  const showSidebarPrIconsMutation = useMutation({
    mutationFn: (newValue: boolean) => setShowSidebarPrIcons(newValue),
    onSuccess: (_data, newValue) => {
      scope.get(toast$).success(
        intl.formatMessage(
          newValue
            ? {
                id: "settings.git.showSidebarPrIcons.save.enabled",
                defaultMessage: "Sidebar PR icons enabled",
                description: "Toast shown when sidebar PR icons are enabled",
              }
            : {
                id: "settings.git.showSidebarPrIcons.save.disabled",
                defaultMessage: "Sidebar PR icons disabled",
                description: "Toast shown when sidebar PR icons are disabled",
              },
        ),
      );
    },
    onError: () => {
      scope.get(toast$).danger(
        intl.formatMessage({
          id: "settings.git.showSidebarPrIcons.save.error",
          defaultMessage: "Failed to save sidebar PR icon setting",
          description:
            "Toast shown when saving the sidebar PR icon setting fails",
        }),
      );
    },
  });
  const [commitInstructionsDraft, setCommitInstructionsDraft] = useState<
    string | null
  >(null);
  const [pullRequestInstructionsDraft, setPullRequestInstructionsDraft] =
    useState<string | null>(null);
  const saveCommitInstructionsMutation = useMutation({
    mutationFn: (newValue: string) => setCommitInstructions(newValue),
    onSuccess: () => {
      setCommitInstructionsDraft(null);
      scope.get(toast$).success(
        intl.formatMessage({
          id: "settings.git.commitInstructions.save.success",
          defaultMessage: "Saved commit instructions",
          description: "Toast shown when commit instructions are saved",
        }),
      );
    },
    onError: () => {
      scope.get(toast$).danger(
        intl.formatMessage({
          id: "settings.git.commitInstructions.save.error",
          defaultMessage: "Failed to save commit instructions",
          description: "Toast shown when commit instructions save fails",
        }),
      );
    },
  });
  const savePullRequestInstructionsMutation = useMutation({
    mutationFn: (newValue: string) => setPullRequestInstructions(newValue),
    onSuccess: () => {
      setPullRequestInstructionsDraft(null);
      scope.get(toast$).success(
        intl.formatMessage({
          id: "settings.git.prInstructions.save.success",
          defaultMessage: "Saved pull request instructions",
          description: "Toast shown when pull request instructions are saved",
        }),
      );
    },
    onError: () => {
      scope.get(toast$).danger(
        intl.formatMessage({
          id: "settings.git.prInstructions.save.error",
          defaultMessage: "Failed to save pull request instructions",
          description: "Toast shown when pull request instructions save fails",
        }),
      );
    },
  });

  const resolvedBranchPrefix = branchPrefix;
  const branchPrefixValue = branchPrefixDraft ?? resolvedBranchPrefix;
  const isBranchPrefixDirty =
    branchPrefixDraft != null && branchPrefixDraft !== resolvedBranchPrefix;
  const isSavingBranchPrefix = saveBranchPrefixMutation.isPending;
  const isBranchPrefixActionDisabled =
    isSavingBranchPrefix || isBranchPrefixLoading;
  const isForcePushActionDisabled =
    isForcePushLoading || forcePushMutation.isPending;
  const isCreatePullRequestAsDraftActionDisabled =
    isCreatePullRequestAsDraftLoading ||
    createPullRequestAsDraftMutation.isPending;
  const isPullRequestMergeMethodActionDisabled =
    isPullRequestMergeMethodLoading || pullRequestMergeMethodMutation.isPending;
  const isShowSidebarPrIconsActionDisabled =
    isShowSidebarPrIconsLoading || showSidebarPrIconsMutation.isPending;
  const resolvedCommitInstructions = commitInstructions ?? "";
  const commitInstructionsValue =
    commitInstructionsDraft ?? resolvedCommitInstructions;
  const isCommitInstructionsDirty =
    commitInstructionsDraft != null &&
    commitInstructionsDraft !== resolvedCommitInstructions;
  const isCommitInstructionsActionDisabled =
    isCommitInstructionsLoading || saveCommitInstructionsMutation.isPending;
  const resolvedPullRequestInstructions = pullRequestInstructions ?? "";
  const pullRequestInstructionsValue =
    pullRequestInstructionsDraft ?? resolvedPullRequestInstructions;
  const isPullRequestInstructionsDirty =
    pullRequestInstructionsDraft != null &&
    pullRequestInstructionsDraft !== resolvedPullRequestInstructions;
  const isPullRequestInstructionsActionDisabled =
    isPullRequestInstructionsLoading ||
    savePullRequestInstructionsMutation.isPending;

  const handleBranchPrefixSave = (): void => {
    if (!isBranchPrefixDirty || isBranchPrefixActionDisabled) {
      return;
    }
    saveBranchPrefixMutation.mutate(branchPrefixValue);
  };
  const handleForcePushToggle = (newValue: boolean): void => {
    if (isForcePushActionDisabled) {
      return;
    }
    forcePushMutation.mutate(newValue);
  };
  const handleCreatePullRequestAsDraftToggle = (newValue: boolean): void => {
    if (isCreatePullRequestAsDraftActionDisabled) {
      return;
    }
    createPullRequestAsDraftMutation.mutate(newValue);
  };
  const handlePullRequestMergeMethodSelect = (
    newValue: GitPullRequestMergeMethod,
  ): void => {
    if (isPullRequestMergeMethodActionDisabled) {
      return;
    }
    if (newValue === pullRequestMergeMethod) {
      return;
    }
    pullRequestMergeMethodMutation.mutate(newValue);
  };
  const handleShowSidebarPrIconsToggle = (newValue: boolean): void => {
    if (isShowSidebarPrIconsActionDisabled) {
      return;
    }
    showSidebarPrIconsMutation.mutate(newValue);
  };
  const handleCommitInstructionsSave = (): void => {
    if (isCommitInstructionsActionDisabled || !isCommitInstructionsDirty) {
      return;
    }
    saveCommitInstructionsMutation.mutate(commitInstructionsValue);
  };
  const handlePullRequestInstructionsSave = (): void => {
    if (
      isPullRequestInstructionsActionDisabled ||
      !isPullRequestInstructionsDirty
    ) {
      return;
    }
    savePullRequestInstructionsMutation.mutate(pullRequestInstructionsValue);
  };
  const canSaveAnySetting =
    (isBranchPrefixDirty && !isBranchPrefixActionDisabled) ||
    (isCommitInstructionsDirty && !isCommitInstructionsActionDisabled) ||
    (isPullRequestInstructionsDirty &&
      !isPullRequestInstructionsActionDisabled);
  useHotkey({
    accelerator: "CmdOrCtrl+S",
    enabled: canSaveAnySetting,
    onKeyDown: (event) => {
      event.preventDefault();
      handleBranchPrefixSave();
      handleCommitInstructionsSave();
      handlePullRequestInstructionsSave();
    },
  });

  return (
    <SettingsContentLayout
      title={<SettingsSectionTitleMessage slug="git-settings" />}
    >
      <SettingsGroup>
        <SettingsGroup.Content>
          <SettingsSurface>
            <SettingsRow
              label={
                <FormattedMessage
                  id="settings.git.branchPrefix.label"
                  defaultMessage="Branch prefix"
                  description="Label for git branch prefix setting"
                />
              }
              description={
                <FormattedMessage
                  id="settings.git.branchPrefix.description"
                  defaultMessage="Prefix used when creating new branches in Codex"
                  description="Description for git branch prefix setting"
                />
              }
              control={
                <input
                  className="w-56 rounded-md border border-token-input-border bg-token-input-background px-2.5 py-1.5 text-base text-token-input-foreground outline-none placeholder:text-token-input-placeholder-foreground focus:border-token-focus-border"
                  value={branchPrefixValue}
                  onChange={(event) => {
                    if (isBranchPrefixActionDisabled) {
                      return;
                    }
                    const newValue = event.target.value;
                    setBranchPrefixDraft(
                      newValue === resolvedBranchPrefix ? null : newValue,
                    );
                  }}
                  onBlur={handleBranchPrefixSave}
                  placeholder={intl.formatMessage({
                    id: "settings.git.branchPrefix.placeholder",
                    defaultMessage: "codex/",
                    description: "Placeholder for git branch prefix input",
                  })}
                  aria-label={intl.formatMessage({
                    id: "settings.git.branchPrefix.ariaLabel",
                    defaultMessage: "Branch prefix",
                    description: "Aria label for git branch prefix input",
                  })}
                  disabled={isBranchPrefixActionDisabled}
                />
              }
            />
            {pullRequestCompoundButtonEnabled ? (
              <>
                <SettingsRow
                  label={
                    <FormattedMessage
                      id="settings.git.pullRequestMergeMethod.label"
                      defaultMessage="Pull request merge method"
                      description="Label for pull request merge method setting"
                    />
                  }
                  description={
                    <FormattedMessage
                      id="settings.git.pullRequestMergeMethod.description"
                      defaultMessage="Choose how Codex merges pull requests"
                      description="Description for pull request merge method setting"
                    />
                  }
                  control={
                    <SegmentedToggle<GitPullRequestMergeMethod>
                      ariaLabel={intl.formatMessage({
                        id: "settings.git.pullRequestMergeMethod.ariaLabel",
                        defaultMessage: "Pull request merge method",
                        description:
                          "Accessible label for pull request merge method selector",
                      })}
                      selectedId={pullRequestMergeMethod}
                      onSelect={handlePullRequestMergeMethodSelect}
                      options={[
                        {
                          id: "merge",
                          label: (
                            <FormattedMessage
                              id="settings.git.pullRequestMergeMethod.merge"
                              defaultMessage="Merge"
                              description="Merge option for pull request merge method"
                            />
                          ),
                          ariaLabel: intl.formatMessage({
                            id: "settings.git.pullRequestMergeMethod.merge",
                            defaultMessage: "Merge",
                            description:
                              "Merge option for pull request merge method",
                          }),
                          disabled: isPullRequestMergeMethodActionDisabled,
                        },
                        {
                          id: "squash",
                          label: (
                            <FormattedMessage
                              id="settings.git.pullRequestMergeMethod.squash"
                              defaultMessage="Squash"
                              description="Squash option for pull request merge method"
                            />
                          ),
                          ariaLabel: intl.formatMessage({
                            id: "settings.git.pullRequestMergeMethod.squash",
                            defaultMessage: "Squash",
                            description:
                              "Squash option for pull request merge method",
                          }),
                          disabled: isPullRequestMergeMethodActionDisabled,
                        },
                      ]}
                    />
                  }
                />
                <SettingsRow
                  label={
                    <FormattedMessage
                      id="settings.git.showSidebarPrIcons.label"
                      defaultMessage="Show PR icons in sidebar"
                      description="Label for the sidebar PR icon toggle"
                    />
                  }
                  description={
                    <FormattedMessage
                      id="settings.git.showSidebarPrIcons.description"
                      defaultMessage="Display PR status icons on thread rows in the sidebar"
                      description="Description for the sidebar PR icon toggle"
                    />
                  }
                  control={
                    <Toggle
                      checked={showSidebarPrIcons}
                      disabled={isShowSidebarPrIconsActionDisabled}
                      onChange={handleShowSidebarPrIconsToggle}
                      ariaLabel={intl.formatMessage({
                        id: "settings.git.showSidebarPrIcons.ariaLabel",
                        defaultMessage: "Show PR icons in sidebar",
                        description:
                          "Aria label for the sidebar PR icon toggle",
                      })}
                    />
                  }
                />
              </>
            ) : null}
            <SettingsRow
              label={
                <FormattedMessage
                  id="settings.git.forcePush.label"
                  defaultMessage="Always force push"
                  description="Label for always force push toggle"
                />
              }
              description={
                <FormattedMessage
                  id="settings.git.forcePush.description"
                  defaultMessage="Use --force-with-lease when pushing from Codex"
                  description="Description for always force push toggle"
                />
              }
              control={
                <Toggle
                  checked={alwaysForcePush}
                  disabled={isForcePushActionDisabled}
                  onChange={(newValue) => {
                    handleForcePushToggle(newValue);
                  }}
                  ariaLabel={intl.formatMessage({
                    id: "settings.git.forcePush.ariaLabel",
                    defaultMessage: "Always force push",
                    description: "Aria label for always force push toggle",
                  })}
                />
              }
            />
            <SettingsRow
              label={
                <FormattedMessage
                  id="settings.git.createDraftPullRequest.label"
                  defaultMessage="Create draft pull requests"
                  description="Label for create draft pull requests toggle"
                />
              }
              description={
                <FormattedMessage
                  id="settings.git.createDraftPullRequest.description"
                  defaultMessage="Use draft pull requests by default when creating PRs from Codex"
                  description="Description for create draft pull requests toggle"
                />
              }
              control={
                <Toggle
                  checked={createPullRequestAsDraft}
                  disabled={isCreatePullRequestAsDraftActionDisabled}
                  onChange={(newValue) => {
                    handleCreatePullRequestAsDraftToggle(newValue);
                  }}
                  ariaLabel={intl.formatMessage({
                    id: "settings.git.createDraftPullRequest.ariaLabel",
                    defaultMessage: "Create draft pull requests",
                    description:
                      "Aria label for create draft pull requests toggle",
                  })}
                />
              }
            />
          </SettingsSurface>
        </SettingsGroup.Content>
      </SettingsGroup>
      <SettingsGroup>
        <SettingsGroup.Header
          title={
            <FormattedMessage
              id="settings.git.commitInstructions.label"
              defaultMessage="Commit instructions"
              description="Label for commit instructions"
            />
          }
          subtitle={
            <FormattedMessage
              id="settings.git.commitInstructions.description"
              defaultMessage="Added to commit message generation prompts"
              description="Description for commit instructions"
            />
          }
          actions={
            <Button
              color="secondary"
              disabled={
                !isCommitInstructionsDirty || isCommitInstructionsActionDisabled
              }
              loading={saveCommitInstructionsMutation.isPending}
              onClick={handleCommitInstructionsSave}
              size="toolbar"
            >
              <FormattedMessage
                id="settings.git.commitInstructions.save"
                defaultMessage="Save"
                description="Button label to save commit instructions"
              />
            </Button>
          }
        />
        <SettingsGroup.Content>
          <textarea
            className="mt-1.5 w-full rounded-md border border-token-input-border bg-token-input-background px-2.5 py-2 text-sm text-token-input-foreground outline-none placeholder:text-token-input-placeholder-foreground focus:border-token-focus-border"
            value={commitInstructionsValue}
            onChange={(event) => {
              if (isCommitInstructionsActionDisabled) {
                return;
              }
              const nextValue = event.target.value;
              setCommitInstructionsDraft(
                nextValue === resolvedCommitInstructions ? null : nextValue,
              );
            }}
            placeholder={intl.formatMessage({
              id: "settings.git.commitInstructions.placeholder",
              defaultMessage: "Add commit message guidance…",
              description: "Placeholder for commit instructions textarea",
            })}
            aria-label={intl.formatMessage({
              id: "settings.git.commitInstructions.ariaLabel",
              defaultMessage: "Commit instructions",
              description: "Aria label for commit instructions textarea",
            })}
            disabled={isCommitInstructionsActionDisabled}
            rows={6}
          />
        </SettingsGroup.Content>
      </SettingsGroup>
      <SettingsGroup>
        <SettingsGroup.Header
          title={
            <FormattedMessage
              id="settings.git.prInstructions.label"
              defaultMessage="Pull request instructions"
              description="Label for pull request instructions"
            />
          }
          subtitle={
            <FormattedMessage
              id="settings.git.prInstructions.description"
              defaultMessage="Added to PR title/description generation prompts"
              description="Description for pull request instructions"
            />
          }
          actions={
            <Button
              color="secondary"
              disabled={
                !isPullRequestInstructionsDirty ||
                isPullRequestInstructionsActionDisabled
              }
              loading={savePullRequestInstructionsMutation.isPending}
              onClick={handlePullRequestInstructionsSave}
              size="toolbar"
            >
              <FormattedMessage
                id="settings.git.prInstructions.save"
                defaultMessage="Save"
                description="Button label to save pull request instructions"
              />
            </Button>
          }
        />
        <SettingsGroup.Content>
          <textarea
            className="mt-1.5 w-full rounded-md border border-token-input-border bg-token-input-background px-2.5 py-2 text-sm text-token-input-foreground outline-none placeholder:text-token-input-placeholder-foreground focus:border-token-focus-border"
            value={pullRequestInstructionsValue}
            onChange={(event) => {
              if (isPullRequestInstructionsActionDisabled) {
                return;
              }
              const nextValue = event.target.value;
              setPullRequestInstructionsDraft(
                nextValue === resolvedPullRequestInstructions
                  ? null
                  : nextValue,
              );
            }}
            placeholder={intl.formatMessage({
              id: "settings.git.prInstructions.placeholder",
              defaultMessage: "Add pull request guidance…",
              description: "Placeholder for pull request instructions textarea",
            })}
            aria-label={intl.formatMessage({
              id: "settings.git.prInstructions.ariaLabel",
              defaultMessage: "Pull request instructions",
              description: "Aria label for pull request instructions textarea",
            })}
            disabled={isPullRequestInstructionsActionDisabled}
            rows={6}
          />
        </SettingsGroup.Content>
      </SettingsGroup>
    </SettingsContentLayout>
  );
}
