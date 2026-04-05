import { useQueryClient } from "@tanstack/react-query";
import { useScope } from "maitai";
import type { ReactElement } from "react";
import { useState } from "react";
import { FormattedMessage, useIntl } from "react-intl";

import { Button } from "@/components/button";
import { BasicDropdown, Dropdown } from "@/components/dropdown";
import { Spinner } from "@/components/spinner";
import { toast$ } from "@/components/toaster/toast-signal";
import { usePersonality } from "@/composer/use-personality";
import { CODEX_GUIDES_AGENTS_MD_URL } from "@/constants/links";
import CheckIcon from "@/icons/check-md.svg";
import { useHotkey } from "@/keyboard-shortcuts/use-hotkey";
import { AppScope } from "@/scopes/app-scope";
import { SettingsContentLayout } from "@/settings/settings-content-layout";
import { SettingsGroup } from "@/settings/settings-group";
import { SettingsRow } from "@/settings/settings-row";
import {
  SettingsDropdownTrigger,
  SettingsSectionTitleMessage,
} from "@/settings/settings-shared";
import { SettingsSurface } from "@/settings/settings-surface";
import { useGate } from "@/statsig/statsig";
import {
  getQueryKey,
  useFetchFromVSCode,
  useMutationFromVSCode,
} from "@/vscode-api";

const STORYBOOK_AGENTS_PATH = "/Users/example/.codex/agents.md";
const STORYBOOK_AGENTS_CONTENTS = `# Custom instructions

Add instructions here to tailor Codex to your preferences.
`;

export function PersonalizationSettings(): ReactElement {
  const intl = useIntl();
  const scope = useScope(AppScope);
  const queryClient = useQueryClient();
  const isStorybook = __STORYBOOK__ || __TEST__;
  const isPersonalityEnabled = useGate(
    __statsigName("codex_rollout_personality"),
  );
  const { personality, setPersonality } = usePersonality();
  const [draft, setDraft] = useState<string | null>(null);
  const { data, error, isFetching, refetch } = useFetchFromVSCode(
    "codex-agents-md",
    {
      queryConfig: isStorybook
        ? {
            enabled: false,
            initialData: {
              path: STORYBOOK_AGENTS_PATH,
              contents: STORYBOOK_AGENTS_CONTENTS,
            },
          }
        : undefined,
    },
  );
  const saveAgents = useMutationFromVSCode("codex-agents-md-save", {
    onSuccess: (response, variables) => {
      queryClient.setQueryData(getQueryKey("codex-agents-md"), {
        path: response.path,
        contents: variables.contents,
      });
      setDraft(null);
      scope.get(toast$).success(
        intl.formatMessage({
          id: "settings.personalization.agents.save.success",
          defaultMessage: "Saved agents.md",
          description: "Toast shown when agents.md is saved",
        }),
      );
    },
    onError: () => {
      scope.get(toast$).danger(
        intl.formatMessage({
          id: "settings.personalization.agents.save.error",
          defaultMessage: "Unable to save agents.md",
          description: "Toast shown when agents.md save fails",
        }),
      );
    },
  });
  const contents = data?.contents ?? "";
  const editorValue = draft ?? contents;
  const isDirty = draft != null && draft !== contents;
  const isReady = data != null;
  const isLoading = !isReady && isFetching;
  const isSaving = saveAgents.isPending;
  const showError = error != null && data == null;

  const handleSave = (): void => {
    if (!isReady || !isDirty || isSaving) {
      return;
    }
    saveAgents.mutate({ contents: editorValue });
  };
  useHotkey({
    accelerator: "CmdOrCtrl+S",
    enabled: isReady && isDirty && !isSaving,
    onKeyDown: (event) => {
      event.preventDefault();
      handleSave();
    },
  });

  const handleRetry = (): void => {
    void refetch();
  };

  const placeholder = intl.formatMessage({
    id: "settings.personalization.agents.placeholder",
    defaultMessage: "Add your custom instructions…",
    description: "Placeholder text for personal agents editor",
  });
  const customInstructionsLabel = intl.formatMessage({
    id: "settings.personalization.agents.title",
    defaultMessage: "Custom instructions",
    description: "Heading for personal agents settings section",
  });
  const personalityOptions: Array<{
    value: "friendly" | "pragmatic";
    label: string;
    description: string;
  }> = [
    {
      value: "friendly",
      label: intl.formatMessage({
        id: "composer.personalitySlashCommand.label.friendly",
        defaultMessage: "Friendly",
        description: "Label for the friendly personality",
      }),
      description: intl.formatMessage({
        id: "composer.personalitySlashCommand.description.friendly",
        defaultMessage: "Warm, collaborative, and helpful",
        description: "Description for the friendly personality option",
      }),
    },
    {
      value: "pragmatic",
      label: intl.formatMessage({
        id: "composer.personalitySlashCommand.label.pragmatic",
        defaultMessage: "Pragmatic",
        description: "Label for the pragmatic personality",
      }),
      description: intl.formatMessage({
        id: "composer.personalitySlashCommand.description.pragmatic",
        defaultMessage: "Concise, task-focused, and direct",
        description: "Description for the pragmatic personality option",
      }),
    },
  ];
  const selectedPersonality =
    personalityOptions.find((option) => option.value === personality) ??
    personalityOptions[0];

  return (
    <SettingsContentLayout
      title={<SettingsSectionTitleMessage slug="personalization" />}
      subtitle={
        <FormattedMessage
          id="settings.personalization.subtitle"
          defaultMessage="Tailor Codex's personality and instructions. {learnMore}"
          description="Subtitle for personalization settings page"
          values={{
            learnMore: (
              <a
                className="inline-flex items-center gap-1 text-base text-token-text-link-foreground"
                href={CODEX_GUIDES_AGENTS_MD_URL}
                target="_blank"
                rel="noreferrer"
              >
                <FormattedMessage
                  id="settings.personalization.agents.learnMore"
                  defaultMessage="Learn more."
                  description="Link label for agents.md docs"
                />
              </a>
            ),
          }}
        />
      }
    >
      {isPersonalityEnabled ? (
        <SettingsGroup className="gap-2">
          <SettingsGroup.Header
            title={
              <FormattedMessage
                id="settings.personalization.personality.title"
                defaultMessage="Change personality"
                description="Heading above the personality settings row"
              />
            }
          />
          <SettingsGroup.Content>
            <SettingsSurface>
              <SettingsRow
                label={
                  <FormattedMessage
                    id="settings.personalization.personality.label"
                    defaultMessage="Personality"
                    description="Label for personality selection in personalization settings"
                  />
                }
                description={
                  <FormattedMessage
                    id="settings.personalization.personality.description"
                    defaultMessage="Choose a default tone for Codex responses"
                    description="Description for personality selection in personalization settings"
                  />
                }
                control={
                  <BasicDropdown
                    triggerButton={
                      <SettingsDropdownTrigger disabled={!isReady || isSaving}>
                        <span className="flex items-center gap-1.5">
                          {selectedPersonality.label}
                        </span>
                      </SettingsDropdownTrigger>
                    }
                    align="end"
                  >
                    <div className="w-[260px] max-w-xs space-y-1">
                      {personalityOptions.map((option) => (
                        <Dropdown.Item
                          key={option.value}
                          onSelect={() => {
                            setPersonality(option.value);
                          }}
                          RightIcon={
                            personality === option.value ? CheckIcon : undefined
                          }
                        >
                          <div className="flex flex-col items-start gap-0.5">
                            <span className="text-sm">{option.label}</span>
                            <span className="text-xs text-token-text-secondary">
                              {option.description}
                            </span>
                          </div>
                        </Dropdown.Item>
                      ))}
                    </div>
                  </BasicDropdown>
                }
              />
            </SettingsSurface>
          </SettingsGroup.Content>
        </SettingsGroup>
      ) : null}
      <SettingsGroup className="gap-2">
        <SettingsGroup.Header
          title={
            <FormattedMessage
              id="settings.personalization.agents.title"
              defaultMessage="Custom instructions"
              description="Heading for personal agents settings section"
            />
          }
        />
        <SettingsGroup.Content>
          {showError ? (
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm text-token-text-secondary">
                <FormattedMessage
                  id="settings.personalization.agents.loadError"
                  defaultMessage="Unable to load agents.md."
                  description="Error message shown when agents.md fails to load"
                />
              </div>
              <Button
                className="shrink-0"
                color="secondary"
                onClick={handleRetry}
                size="toolbar"
              >
                <FormattedMessage
                  id="settings.personalization.agents.retry"
                  defaultMessage="Retry"
                  description="Button label to retry loading agents.md"
                />
              </Button>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {isLoading ? (
                <div className="flex items-center gap-2 text-sm text-token-text-secondary">
                  <Spinner className="icon-xs" />
                  <FormattedMessage
                    id="settings.personalization.agents.loading"
                    defaultMessage="Loading agents.md…"
                    description="Loading label for agents.md editor"
                  />
                </div>
              ) : (
                <textarea
                  aria-label={customInstructionsLabel}
                  id="personal-agents-editor"
                  className="focus-visible:ring-token-focus w-full rounded-md border border-token-border bg-token-input-background px-2.5 py-2 font-mono text-sm text-token-text-primary outline-none focus-visible:ring-2"
                  disabled={!isReady || isSaving}
                  placeholder={placeholder}
                  rows={12}
                  value={editorValue}
                  onChange={(event) => {
                    const nextValue = event.target.value;
                    setDraft(nextValue === contents ? null : nextValue);
                  }}
                />
              )}
              <div className="flex items-center justify-end gap-2">
                <Button
                  color="primary"
                  disabled={!isDirty || !isReady}
                  loading={isSaving}
                  onClick={handleSave}
                  size="toolbar"
                >
                  <FormattedMessage
                    id="settings.personalization.agents.save"
                    defaultMessage="Save"
                    description="Save button label for personal agents editor"
                  />
                </Button>
              </div>
            </div>
          )}
        </SettingsGroup.Content>
      </SettingsGroup>
    </SettingsContentLayout>
  );
}
