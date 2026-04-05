import type { GitCwd } from "protocol";
import type { ReactElement, ReactNode } from "react";
import { defineMessage, FormattedMessage, useIntl } from "react-intl";

import { CompoundButton } from "@/components/compound-button";
import { Dropdown } from "@/components/dropdown";
import { useMediaQuery } from "@/hooks/use-media-query";

import {
  getAvailableTargetOptions,
  getPrimaryAvailableTarget,
} from "./open-target-selection";
import { useTargetApps } from "./use-target-apps";

const openPrimaryTargetMessage = defineMessage({
  id: "localConversationPage.openPrimaryTarget",
  defaultMessage: "Open",
  description: "Primary open button label",
});

export function OpenInTargetDropdown({
  cwd,
}: {
  cwd: GitCwd | null;
}): ReactElement | null {
  const intl = useIntl();
  const isCompactToolbar = useMediaQuery("(max-width: 920px)");
  const { preferredTarget, targets, availableTargets, open } = useTargetApps({
    cwd,
  });

  if (!cwd) {
    return null;
  }

  const availableOptions = getAvailableTargetOptions({
    targets,
    availableTargets,
  });
  const primaryTarget = getPrimaryAvailableTarget({
    preferredTarget,
    targets,
    availableTargets,
  });

  if (!primaryTarget) {
    return null;
  }

  const openTooltipLabel = intl.formatMessage(
    {
      id: "localConversationPage.openPrimaryTarget.tooltip",
      defaultMessage: "Open in {target}",
      description: "Tooltip for the primary open button",
    },
    { target: primaryTarget.label },
  );
  const hasPreferredPrimaryTarget = preferredTarget === primaryTarget.id;
  const shouldHidePrimaryLabel = hasPreferredPrimaryTarget || isCompactToolbar;

  return (
    <CompoundButton
      color="outline"
      size="toolbar"
      dropdownAlign="end"
      primaryAriaLabel={
        shouldHidePrimaryLabel ? openPrimaryTargetMessage : undefined
      }
      tooltipContent={shouldHidePrimaryLabel ? openTooltipLabel : undefined}
      dropdownContent={
        <>
          {availableOptions.map((target) => {
            return (
              <Dropdown.Item
                key={target.id}
                onSelect={() => {
                  open(target.id, {
                    persistPreferred: true,
                  });
                }}
              >
                <DropdownRow icon={target.icon} label={target.label} />
              </Dropdown.Item>
            );
          })}
        </>
      }
      onClick={() => {
        open(primaryTarget.id, {
          persistPreferred: false,
        });
      }}
    >
      <DropdownRow
        icon={primaryTarget.icon}
        label={
          shouldHidePrimaryLabel ? undefined : (
            <FormattedMessage {...openPrimaryTargetMessage} />
          )
        }
      />
    </CompoundButton>
  );
}

function DropdownRow({
  icon,
  iconSlot,
  label,
}: {
  icon?: string;
  iconSlot?: ReactNode;
  label?: ReactNode;
}): ReactElement {
  return (
    <span className="flex items-center gap-1.5">
      {icon ? (
        <img
          alt={typeof label === "string" ? label : ""}
          src={icon}
          className="icon-sm"
        />
      ) : (
        iconSlot
      )}
      {label != null ? <span className="truncate">{label}</span> : null}
    </span>
  );
}
