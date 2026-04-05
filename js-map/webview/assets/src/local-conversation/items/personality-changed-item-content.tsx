import type * as AppServer from "app-server-types";
import { FormattedMessage, useIntl } from "react-intl";

import AvatarIcon from "@/icons/avatar.svg";

export function PersonalityChangedItemContent({
  personality,
}: {
  personality: AppServer.Personality;
}): React.ReactElement {
  const intl = useIntl();
  const personalityLabel =
    personality === "friendly"
      ? intl.formatMessage({
          id: "composer.personalitySlashCommand.label.friendly",
          defaultMessage: "Friendly",
          description: "Label for the friendly personality",
        })
      : intl.formatMessage({
          id: "composer.personalitySlashCommand.label.pragmatic",
          defaultMessage: "Pragmatic",
          description: "Label for the pragmatic personality",
        });

  return (
    <div className="text-size-chat my-2 flex items-center gap-2 text-token-text-secondary">
      <div className="flex-1 border-t border-current/20" />
      <div className="flex items-center gap-1 whitespace-nowrap">
        <AvatarIcon className="icon-xs" />
        <FormattedMessage
          id="localConversation.personalityChanged"
          defaultMessage="Switched to {personality} personality"
          description="Synthetic item shown when the personality changes."
          values={{
            personality: personalityLabel,
          }}
        />
      </div>
      <div className="flex-1 border-t border-current/20" />
    </div>
  );
}
