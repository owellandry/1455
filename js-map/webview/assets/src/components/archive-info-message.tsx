import type React from "react";
import { FormattedMessage } from "react-intl";

import type { WindowType } from "@/hooks/use-window-type";

export function ArchiveInfoMessage({
  windowType,
  onOpenSettings,
}: {
  windowType: WindowType;
  onOpenSettings: () => void;
}): React.ReactElement {
  const dataControlsLink = (
    <button
      className="text-token-link underline-offset-2 hover:underline"
      type="button"
      onClick={onOpenSettings}
    >
      <FormattedMessage
        id="codex.archiveInfo.dataControlsLink"
        defaultMessage="Data Controls"
        description="Link label to open the Data Controls settings page"
      />
    </button>
  );
  const settingsLink = (
    <button
      className="text-token-link underline-offset-2 hover:underline"
      type="button"
      onClick={onOpenSettings}
    >
      <FormattedMessage
        id="codex.archiveInfo.settingsLink"
        defaultMessage="Settings"
        description="Link label to open the archived chats settings page"
      />
    </button>
  );

  if (windowType === "extension") {
    return (
      <FormattedMessage
        id="codex.archiveInfo.extension"
        defaultMessage="View archived chats in your .codex folder."
        description="Info message shown after archiving a Codex conversation or task in the extension"
      />
    );
  }

  if (windowType === "electron") {
    return (
      <FormattedMessage
        id="codex.archiveInfo.electron"
        defaultMessage="View archived chats in {settingsLink}"
        description="Info message shown after archiving a Codex conversation or task in the electron app"
        values={{ settingsLink }}
      />
    );
  }

  return (
    <FormattedMessage
      id="codex.archiveInfo"
      defaultMessage="View archived chats in {dataControlsLink}."
      description="Info message shown after archiving a Codex conversation or task"
      values={{ dataControlsLink }}
    />
  );
}
