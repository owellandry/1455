import clsx from "clsx";
import { useScope } from "maitai";
import { ConfigurationKeys } from "protocol";
import { FormattedMessage, useIntl } from "react-intl";

import { Checkbox } from "@/components/checkbox";
import { DropdownItem } from "@/components/dropdown";
import { toast$ } from "@/components/toaster/toast-signal";
import { useConfiguration } from "@/hooks/use-configuration";
import { AppScope } from "@/scopes/app-scope";

export function TodoCodeLensDropdown(): React.ReactElement {
  const scope = useScope(AppScope);
  const intl = useIntl();
  const { data, setData, isLoading } = useConfiguration(
    ConfigurationKeys.COMMENT_CODELENS_ENABLED,
  );

  return (
    <DropdownItem
      disabled={isLoading}
      LeftIcon={({ className }) => (
        <Checkbox
          className={clsx("pointer-events-none", className)}
          checked={data ?? true}
          disabled={isLoading}
        />
      )}
      onSelect={async (event) => {
        event.preventDefault();
        try {
          await setData(!(data ?? true));
        } catch {
          scope.get(toast$).danger(
            intl.formatMessage({
              id: "codex.profileDropdown.todoCodelensError",
              defaultMessage: "Failed to update setting",
              description:
                "Error toast shown when enabling or disabling the TODO CodeLens fails",
            }),
          );
        }
      }}
    >
      <FormattedMessage
        id="codex.profileDropdown.todoCodelens"
        defaultMessage="Fix TODO comments"
        description="Checkbox label that toggles whether the TODO CodeLens should be registered"
      />
    </DropdownItem>
  );
}
