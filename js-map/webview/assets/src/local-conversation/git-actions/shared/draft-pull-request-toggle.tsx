import type { ReactElement } from "react";
import { FormattedMessage, useIntl } from "react-intl";

import { Toggle } from "@/components/toggle";

export function DraftPullRequestToggle({
  checked,
  disabled = false,
  onChange,
}: {
  checked: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
}): ReactElement {
  const intl = useIntl();

  return (
    <div className="flex min-w-0 items-center gap-2">
      <Toggle
        checked={checked}
        disabled={disabled}
        size="sm"
        ariaLabel={intl.formatMessage({
          id: "localConversationPage.createPrModal.draft",
          defaultMessage: "Draft",
          description: "Label for the create PR draft toggle",
        })}
        onChange={onChange}
      />
      <span className="flex items-center gap-1.5 self-center text-[13px] leading-6 font-medium tracking-[-0.01em] text-token-foreground">
        <FormattedMessage
          id="localConversationPage.createPrModal.draft"
          defaultMessage="Draft"
          description="Label for the create PR draft toggle"
        />
      </span>
    </div>
  );
}
