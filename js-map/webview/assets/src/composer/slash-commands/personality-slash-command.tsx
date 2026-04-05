import type * as AppServer from "app-server-types";
import type { ConversationId } from "protocol";
import { useIntl } from "react-intl";

import { useAppServerManagerForConversationId } from "@/app-server/app-server-manager-hooks";
import AvatarIcon from "@/icons/avatar.svg";
import CheckMdIcon from "@/icons/check-md.svg";

import { useCollaborationMode } from "../use-collaboration-mode";
import { usePersonality } from "../use-personality";
import { useProvideSlashCommand } from "./slash-command";
import { SlashCommandItem } from "./slash-command-item";

export function PersonalitySlashCommand({
  conversationId,
}: {
  conversationId: ConversationId | null;
}): null {
  const collaborationMode = useCollaborationMode(conversationId);
  const intl = useIntl();
  const mcpManager = useAppServerManagerForConversationId(conversationId);
  const { personality, setPersonality } = usePersonality();
  const currentModel = collaborationMode.activeMode.settings.model;

  const title = intl.formatMessage({
    id: "composer.personalitySlashCommand.title",
    defaultMessage: "Personality",
    description: "Title for the personality slash command",
  });
  const isPersonalityNotApplicable =
    currentModel === "gpt-5.2" || currentModel.startsWith("gpt-5.1");
  const description = isPersonalityNotApplicable
    ? intl.formatMessage({
        id: "composer.personalitySlashCommand.notApplicableSuffix",
        defaultMessage: "(Does not apply to current model)",
        description:
          "Suffix appended when personality switching does not apply to the current model",
      })
    : undefined;

  function Content({ onClose }: { onClose: () => void }): React.ReactElement {
    const options: Array<{
      id: AppServer.Personality;
      label: string;
      description: string;
    }> = [
      {
        id: "friendly",
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
        id: "pragmatic",
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
    return (
      <>
        {options.map((option) => (
          <SlashCommandItem
            key={option.id}
            value={option.label}
            title={option.label}
            description={option.description}
            onSelect={() => {
              if (option.id !== personality) {
                setPersonality(option.id);
                if (conversationId) {
                  mcpManager.addPersonalityChangeSyntheticItem(
                    conversationId,
                    option.id,
                  );
                }
              }
              onClose();
            }}
            RightIcon={option.id === personality ? CheckMdIcon : undefined}
          />
        ))}
      </>
    );
  }

  useProvideSlashCommand({
    id: "personality",
    title,
    description,
    requiresEmptyComposer: false,
    Icon: AvatarIcon,
    Content,
    dependencies: [personality, currentModel],
  });

  return null;
}
