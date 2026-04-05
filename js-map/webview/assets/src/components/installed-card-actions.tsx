import type { ReactElement, ReactNode } from "react";
import { useState } from "react";

import { Button } from "@/components/button";
import { CardStatusIndicator } from "@/components/card-status-indicator";
import { BasicDropdown, Dropdown } from "@/components/dropdown";
import { MoreMenuTrigger } from "@/components/more-menu-trigger";
import CheckIcon from "@/icons/check-md.svg";
import TrashIcon from "@/icons/trash.svg";
import XIcon from "@/icons/x.svg";

export function InstalledCardActions({
  disableMenuLabel,
  enableButtonLabel,
  enabledStatusAriaLabel,
  isEnabled,
  isUninstalling,
  isUpdating,
  menuLabel,
  onDisable,
  onEnable,
  onUninstall,
  uninstallMenuLabel,
}: {
  disableMenuLabel?: ReactNode;
  enableButtonLabel?: ReactNode;
  enabledStatusAriaLabel: string;
  isEnabled: boolean;
  isUninstalling: boolean;
  isUpdating: boolean;
  menuLabel?: string;
  onDisable?: () => void;
  onEnable?: () => void;
  onUninstall?: () => void;
  uninstallMenuLabel?: ReactNode;
}): ReactElement {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const hasMenu = onUninstall != null || (isEnabled && onDisable != null);

  return (
    <div className="flex items-center gap-2">
      {hasMenu ? (
        <div
          className={
            isMenuOpen
              ? "visible opacity-100"
              : "invisible opacity-0 transition-opacity group-hover:visible group-hover:opacity-100"
          }
        >
          <BasicDropdown
            align="end"
            contentWidth="icon"
            open={isMenuOpen}
            onOpenChange={setIsMenuOpen}
            triggerButton={
              <MoreMenuTrigger
                label={menuLabel ?? enabledStatusAriaLabel}
                className="!cursor-pointer px-1"
                iconClassName="icon-sm text-token-description-foreground"
                size="icon"
                uniform={false}
              />
            }
          >
            {isEnabled && onDisable ? (
              <Dropdown.Item
                LeftIcon={XIcon}
                leftIconClassName="icon-xs"
                onSelect={onDisable}
              >
                {disableMenuLabel}
              </Dropdown.Item>
            ) : null}
            {onUninstall ? (
              <Dropdown.Item
                LeftIcon={TrashIcon}
                leftIconClassName="icon-xs"
                disabled={isUninstalling}
                onSelect={onUninstall}
              >
                {uninstallMenuLabel}
              </Dropdown.Item>
            ) : null}
          </BasicDropdown>
        </div>
      ) : null}
      {!isEnabled && onEnable ? (
        <Button
          color="outline"
          size="toolbar"
          disabled={isUpdating || isUninstalling}
          onClick={(event): void => {
            event.stopPropagation();
            onEnable();
          }}
        >
          {enableButtonLabel}
        </Button>
      ) : isEnabled ? (
        <CardStatusIndicator
          ariaLabel={enabledStatusAriaLabel}
          icon={<CheckIcon className="icon-sm opacity-60" />}
        />
      ) : (
        <span aria-hidden className="h-7 w-7 shrink-0" />
      )}
    </div>
  );
}
