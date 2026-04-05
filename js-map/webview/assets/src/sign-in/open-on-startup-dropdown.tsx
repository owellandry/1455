import clsx from "clsx";
import { useScope } from "maitai";
import { FormattedMessage, useIntl } from "react-intl";

import { Checkbox } from "@/components/checkbox";
import { DropdownItem } from "@/components/dropdown";
import { toast$ } from "@/components/toaster/toast-signal";
import { useConfiguration } from "@/hooks/use-configuration";
import { AppScope } from "@/scopes/app-scope";

export function OpenOnStartupDropdown(): React.ReactElement {
  const scope = useScope(AppScope);
  const intl = useIntl();
  const { data, setData, isLoading } = useConfiguration("openOnStartup");

  return (
    <DropdownItem
      disabled={isLoading}
      LeftIcon={({ className }) => (
        <Checkbox
          className={clsx("pointer-events-none", className)}
          checked={!!data}
          disabled={isLoading}
        />
      )}
      onSelect={async (event) => {
        event.preventDefault();
        try {
          await setData(!data);
        } catch {
          scope.get(toast$).danger(
            intl.formatMessage({
              id: "codex.profileDropdown.openOnStartupError",
              defaultMessage: "Failed to update setting",
              description: "Error message when failed to update setting",
            }),
          );
        }
      }}
    >
      <FormattedMessage
        id="codex.profileDropdown.openOnStartup"
        defaultMessage="Open on startup"
        description="Checkbox to control whether the Codex sidebar should focus when VS Code starts"
      />
    </DropdownItem>
  );
}
