import type * as AppServer from "app-server-types";
import { useEffect, useState, type ReactElement } from "react";
import { FormattedMessage, useIntl } from "react-intl";

import { Button } from "@/components/button";
import { Checkbox } from "@/components/checkbox";
import { Dialog } from "@/components/dialog";
import {
  DialogBody,
  DialogFooter,
  DialogHeader,
  DialogSection,
} from "@/components/dialog-layout";

import {
  getExternalAgentConfigItemTitle,
  sortExternalAgentConfigItems,
} from "./external-agent-config-utils";

export function ExternalAgentConfigImportDialog({
  open,
  onOpenChange,
  items,
  title,
  subtitle,
  confirmLabel,
  cancelLabel,
  isPending = false,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: Array<AppServer.v2.ExternalAgentConfigMigrationItem>;
  title: ReactElement;
  subtitle: ReactElement;
  confirmLabel: ReactElement;
  cancelLabel: ReactElement;
  isPending?: boolean;
  onConfirm: (
    items: Array<AppServer.v2.ExternalAgentConfigMigrationItem>,
  ) => Promise<void> | void;
  onCancel?: () => void;
}): ReactElement | null {
  const intl = useIntl();
  const [selectedKeys, setSelectedKeys] = useState<Record<string, boolean>>({});
  const sortedItems = sortExternalAgentConfigItems(items);

  useEffect(() => {
    if (!open) {
      return;
    }
    setSelectedKeys(
      Object.fromEntries(
        sortExternalAgentConfigItems(items).map((item, index) => [
          [getItemKey(item, index)],
          true,
        ]),
      ),
    );
  }, [open, items]);

  const selectedItems = sortedItems.filter(
    (item, index) => selectedKeys[getItemKey(item, index)] ?? false,
  );

  if (sortedItems.length === 0) {
    return null;
  }

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      size="default"
      shouldIgnoreClickOutside={isPending}
    >
      <DialogBody>
        <DialogSection>
          <DialogHeader title={title} subtitle={subtitle} />
        </DialogSection>
        <DialogSection className="flex flex-col gap-3">
          <div className="text-sm text-token-text-secondary">
            <FormattedMessage
              id="externalAgentConfig.importDialog.selectionLabel"
              defaultMessage="Select what to import"
              description="Label above the list of detected external agent config items"
            />
          </div>
          <div className="flex flex-col gap-2">
            {sortedItems.map((item, index) => {
              const key = getItemKey(item, index);
              const checked = selectedKeys[key] ?? false;
              return (
                <label
                  key={key}
                  className="bg-token-surface-primary flex cursor-pointer items-start gap-3 rounded-2xl border border-token-border p-3"
                >
                  <Checkbox
                    className="mt-0.5 h-4 w-4 rounded-[3px]"
                    checked={checked}
                    disabled={isPending}
                    onCheckedChange={(nextChecked) => {
                      setSelectedKeys((prev) => ({
                        ...prev,
                        [key]: nextChecked,
                      }));
                    }}
                  />
                  <span className="flex min-w-0 flex-1 flex-col gap-1">
                    <span className="text-base font-medium text-token-text-primary">
                      {getExternalAgentConfigItemTitle(intl, item)}
                    </span>
                    <span className="text-sm text-token-text-secondary">
                      {item.description}
                    </span>
                  </span>
                </label>
              );
            })}
          </div>
        </DialogSection>
        <DialogSection>
          <DialogFooter>
            <Button
              color="ghost"
              disabled={isPending}
              onClick={() => {
                onCancel?.();
                onOpenChange(false);
              }}
            >
              {cancelLabel}
            </Button>
            <Button
              color="primary"
              loading={isPending}
              disabled={selectedItems.length === 0}
              onClick={() => {
                void onConfirm(selectedItems);
              }}
            >
              {confirmLabel}
            </Button>
          </DialogFooter>
        </DialogSection>
      </DialogBody>
    </Dialog>
  );
}

function getItemKey(
  item: AppServer.v2.ExternalAgentConfigMigrationItem,
  index: number,
): string {
  return `${item.itemType}:${item.cwd ?? "home"}:${index}`;
}
