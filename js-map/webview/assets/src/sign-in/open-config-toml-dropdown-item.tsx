import { ConfigurationKeys } from "protocol";
import type React from "react";
import { FormattedMessage } from "react-intl";

import { DropdownItem } from "@/components/dropdown";
import { useConfiguration } from "@/hooks/use-configuration";
import { useOsInfo } from "@/hooks/use-os-info";
import EditIcon from "@/icons/edit.svg";
import { messageBus } from "@/message-bus";
import { openConfigTomlMessages } from "@/sign-in/open-config-toml-messages";

export function OpenConfigTomlDropdownItem({
  onClick,
}: {
  onClick: () => void;
}): React.ReactElement {
  const { data: osInfo } = useOsInfo();
  const { data: runInWslEnabled } = useConfiguration(
    ConfigurationKeys.RUN_CODEX_IN_WSL,
  );

  const usingWslConfigToml =
    osInfo?.platform === "win32" && osInfo?.hasWsl && runInWslEnabled;
  const openConfigTomlMessage = usingWslConfigToml ? (
    <FormattedMessage {...openConfigTomlMessages.openConfigTomlWsl} />
  ) : (
    <FormattedMessage {...openConfigTomlMessages.openConfigToml} />
  );

  return (
    <DropdownItem
      LeftIcon={EditIcon}
      onClick={() => {
        onClick();
        messageBus.dispatchMessage("open-config-toml", {});
      }}
    >
      {openConfigTomlMessage}
    </DropdownItem>
  );
}
