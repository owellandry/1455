import { useIntl } from "react-intl";

import ClickIcon from "@/icons/click.svg";

import { useProvideSlashCommand } from "./slash-command";

export function IdeContextSlashCommand({
  isAutoContextOn,
  setIsAutoContextOn,
  ideContextStatus,
}: {
  isAutoContextOn: boolean;
  setIsAutoContextOn: (on: boolean) => void;
  ideContextStatus: "no-connection" | "connected" | "loading";
}): null {
  const intl = useIntl();
  const isIdeContextConnected = ideContextStatus === "connected";

  useProvideSlashCommand({
    id: "ide-context",
    title: intl.formatMessage({
      id: "composer.ideContextSlashCommand.title",
      defaultMessage: "IDE context",
      description: "Title for the IDE context slash command",
    }),
    description: isAutoContextOn
      ? intl.formatMessage({
          id: "composer.ideContextSlashCommand.disableDescription",
          defaultMessage: "Turn IDE context off",
          description:
            "Description for the IDE context slash command when it is on",
        })
      : intl.formatMessage({
          id: "composer.ideContextSlashCommand.enableDescription",
          defaultMessage:
            "Include current selection, open files, and other context from your IDE",
          description:
            "Description for the IDE context slash command when it is off",
        }),
    requiresEmptyComposer: false,
    Icon: ClickIcon,
    enabled: isIdeContextConnected,
    onSelect: async () => {
      setIsAutoContextOn(!isAutoContextOn);
    },
    dependencies: [isAutoContextOn, isIdeContextConnected, setIsAutoContextOn],
  });

  return null;
}
