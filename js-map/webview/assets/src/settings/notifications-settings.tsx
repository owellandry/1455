import { GlobalStateKey } from "protocol";
import type React from "react";
import { useCallback, useMemo } from "react";
import { FormattedMessage, useIntl } from "react-intl";

import { Checkbox } from "@/components/checkbox";
import { BasicDropdown, Dropdown } from "@/components/dropdown";
import { useGlobalState } from "@/hooks/use-global-state";
import CheckIcon from "@/icons/check-md.svg";
import { SettingsRow } from "@/settings/settings-row";
import { SettingsDropdownTrigger } from "@/settings/settings-shared";

type NotificationTurnMode = "off" | "unfocused" | "always";
type NotificationTurnModeOption = {
  id: NotificationTurnMode;
  label: React.ReactElement;
  ariaLabel: string;
};

export function NotificationsSettings(): React.ReactElement {
  const intl = useIntl();
  const {
    data: turnMode,
    setData: setTurnMode,
    isLoading: turnModeLoading,
  } = useGlobalState(GlobalStateKey.NOTIFICATIONS_TURN_MODE);
  const {
    data: permissionsEnabled,
    setData: setPermissionsEnabled,
    isLoading: permissionsLoading,
  } = useGlobalState(GlobalStateKey.NOTIFICATIONS_PERMISSIONS_ENABLED);
  const {
    data: questionsEnabled,
    setData: setQuestionsEnabled,
    isLoading: questionsLoading,
  } = useGlobalState(GlobalStateKey.NOTIFICATIONS_QUESTIONS_ENABLED);
  const selectedTurnMode: NotificationTurnMode = turnMode ?? "unfocused";
  const turnModeOptions = useMemo<Array<NotificationTurnModeOption>>(
    () => [
      {
        id: "off",
        label: (
          <FormattedMessage
            id="notifications.turnMode.off"
            defaultMessage="Never"
            description="Turn notification mode: never show notifications"
          />
        ),
        ariaLabel: intl.formatMessage({
          id: "notifications.turnMode.off",
          defaultMessage: "Never",
          description: "Turn notification mode: never show notifications",
        }),
      },
      {
        id: "unfocused",
        label: (
          <FormattedMessage
            id="notifications.turnMode.unfocused"
            defaultMessage="Only when unfocused"
            description="Turn notification mode: only when app not focused"
          />
        ),
        ariaLabel: intl.formatMessage({
          id: "notifications.turnMode.unfocused",
          defaultMessage: "Only when unfocused",
          description: "Turn notification mode: only when app not focused",
        }),
      },
      {
        id: "always",
        label: (
          <FormattedMessage
            id="notifications.turnMode.always"
            defaultMessage="Always"
            description="Turn notification mode: always show notifications"
          />
        ),
        ariaLabel: intl.formatMessage({
          id: "notifications.turnMode.always",
          defaultMessage: "Always",
          description: "Turn notification mode: always show notifications",
        }),
      },
    ],
    [intl],
  );

  const handleTurnModeSelect = useCallback(
    (mode: NotificationTurnMode): void => {
      if (turnModeLoading) {
        return;
      }

      void setTurnMode(mode);
    },
    [setTurnMode, turnModeLoading],
  );

  const handlePermissionsChange = useCallback(
    (checked: boolean): void => {
      if (permissionsLoading) {
        return;
      }

      void setPermissionsEnabled(!!checked);
    },
    [permissionsLoading, setPermissionsEnabled],
  );

  const handleQuestionsChange = useCallback(
    (checked: boolean): void => {
      if (questionsLoading) {
        return;
      }

      void setQuestionsEnabled(!!checked);
    },
    [questionsLoading, setQuestionsEnabled],
  );

  return (
    <>
      <SettingsRow
        label={
          <FormattedMessage
            id="notifications.turnMode.label"
            defaultMessage="Turn completion notifications"
            description="Heading for turn completion notification settings"
          />
        }
        description={
          <FormattedMessage
            id="notifications.turnMode.description"
            defaultMessage="Set when Codex alerts you that it's finished"
            description="Description for turn completion notification settings"
          />
        }
        control={
          <BasicDropdown
            contentWidth="menuWide"
            disabled={turnModeLoading}
            align="end"
            triggerButton={
              <SettingsDropdownTrigger disabled={turnModeLoading}>
                <span className="truncate">
                  {
                    turnModeOptions.find(
                      (option) => option.id === selectedTurnMode,
                    )?.label
                  }
                </span>
              </SettingsDropdownTrigger>
            }
          >
            <div className="max-h-80 overflow-y-auto">
              {turnModeOptions.map((option) => {
                const isSelected = option.id === selectedTurnMode;
                return (
                  <Dropdown.Item
                    key={option.id}
                    disabled={turnModeLoading}
                    RightIcon={isSelected ? CheckIcon : undefined}
                    onSelect={() => handleTurnModeSelect(option.id)}
                    aria-label={option.ariaLabel}
                  >
                    <span className="truncate">{option.label}</span>
                  </Dropdown.Item>
                );
              })}
            </div>
          </BasicDropdown>
        }
      />

      <SettingsRow
        label={
          <FormattedMessage
            id="notifications.permissions.label"
            defaultMessage="Enable permission notifications"
            description="Toggle label for permission notifications"
          />
        }
        description={
          <FormattedMessage
            id="notifications.permissions.description"
            defaultMessage="Show alerts when notification permissions are required"
            description="Description for permission notification toggle"
          />
        }
        control={
          <Checkbox
            checked={permissionsEnabled ?? true}
            disabled={permissionsLoading}
            onCheckedChange={handlePermissionsChange}
            aria-label={intl.formatMessage({
              id: "notifications.permissions.label",
              defaultMessage: "Enable permission notifications",
              description: "Toggle label for permission notifications",
            })}
          />
        }
      />

      <SettingsRow
        label={
          <FormattedMessage
            id="notifications.questions.label"
            defaultMessage="Enable question notifications"
            description="Toggle label for question notifications"
          />
        }
        description={
          <FormattedMessage
            id="notifications.questions.description"
            defaultMessage="Show alerts when input is needed to continue"
            description="Description for question notification toggle"
          />
        }
        control={
          <Checkbox
            checked={questionsEnabled ?? true}
            disabled={questionsLoading}
            onCheckedChange={handleQuestionsChange}
            aria-label={intl.formatMessage({
              id: "notifications.questions.label",
              defaultMessage: "Enable question notifications",
              description: "Toggle label for question notifications",
            })}
          />
        }
      />
    </>
  );
}
