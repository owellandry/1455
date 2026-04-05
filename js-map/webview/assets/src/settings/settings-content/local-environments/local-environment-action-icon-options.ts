import type { LocalEnvironmentActionIcon } from "protocol";
import { defineMessage, type MessageDescriptor } from "react-intl";

export const ACTION_ICON_OPTION_DESCRIPTORS: Array<{
  value: LocalEnvironmentActionIcon;
  message: MessageDescriptor;
}> = [
  {
    value: "tool",
    message: defineMessage({
      id: "settings.localEnvironments.actions.icon.tool",
      defaultMessage: "Tool",
      description: "Tool icon label for local environment actions",
    }),
  },
  {
    value: "run",
    message: defineMessage({
      id: "settings.localEnvironments.actions.icon.run",
      defaultMessage: "Run",
      description: "Run icon label for local environment actions",
    }),
  },
  {
    value: "debug",
    message: defineMessage({
      id: "settings.localEnvironments.actions.icon.debug",
      defaultMessage: "Debug",
      description: "Debug icon label for local environment actions",
    }),
  },
  {
    value: "test",
    message: defineMessage({
      id: "settings.localEnvironments.actions.icon.test",
      defaultMessage: "Test",
      description: "Test icon label for local environment actions",
    }),
  },
];
