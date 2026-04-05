import clsx from "clsx";
import { useScope } from "maitai";
import { FormattedMessage, useIntl } from "react-intl";

import { Checkbox } from "@/components/checkbox";
import { DropdownItem } from "@/components/dropdown";
import { toast$ } from "@/components/toaster/toast-signal";
import { useFollowUpQueueMode } from "@/hooks/use-follow-up-queue-mode";
import { AppScope } from "@/scopes/app-scope";

export function QueueFollowUpsDropdown(): React.ReactElement {
  const scope = useScope(AppScope);
  const intl = useIntl();
  const { isQueueingEnabled, setMode, isLoading } = useFollowUpQueueMode();

  return (
    <DropdownItem
      disabled={isLoading}
      LeftIcon={({ className }) => (
        <Checkbox
          className={clsx("pointer-events-none", className)}
          checked={isQueueingEnabled}
          disabled={isLoading}
        />
      )}
      onSelect={async (event) => {
        event.preventDefault();
        try {
          await setMode(isQueueingEnabled ? "steer" : "queue");
        } catch {
          scope.get(toast$).danger(
            intl.formatMessage({
              id: "codex.profileDropdown.queueFollowUpsError",
              defaultMessage: "Failed to update setting",
              description:
                "Error toast shown when updating queueing preference",
            }),
          );
        }
      }}
    >
      <FormattedMessage
        id="codex.profileDropdown.queueFollowUps"
        defaultMessage="Queue follow-ups"
        description="Checkbox label that toggles queued follow-up behavior"
      />
    </DropdownItem>
  );
}
