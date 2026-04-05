import type { ReactElement } from "react";
import { defineMessages, FormattedMessage } from "react-intl";

import { Button } from "@/components/button";
import { Dialog, DialogTitle } from "@/components/dialog";
import {
  DialogBody,
  DialogFooter,
  DialogHeader,
  DialogSection,
} from "@/components/dialog-layout";

const messages = defineMessages({
  disable: {
    id: "plugins.card.uninstallConfirm.disable",
    defaultMessage: "Disable plugin",
    description: "Disable button label for the plugin remove dialog",
  },
  confirmTitle: {
    id: "plugins.card.uninstallConfirm.title",
    defaultMessage: "Uninstall {name} plugin?",
    description: "Title for the plugin uninstall confirmation dialog",
  },
  removeTitle: {
    id: "plugins.detail.removeDialog.title",
    defaultMessage: "Remove {name} plugin from Codex",
    description: "Title for the plugin remove dialog on the detail page",
  },
  confirmDescription: {
    id: "plugins.card.uninstallConfirm.description",
    defaultMessage:
      "This will uninstall the plugin, but it will not uninstall any bundled apps.",
    description: "Description for the plugin uninstall confirmation dialog",
  },
  removeDescription: {
    id: "plugins.detail.removeDialog.description",
    defaultMessage:
      "This removes the plugin from Codex. Bundled apps will remain installed.",
    description: "Description for the plugin remove dialog on the detail page",
  },
  cancel: {
    id: "plugins.card.uninstallConfirm.cancel",
    defaultMessage: "Cancel",
    description: "Cancel button label for the plugin uninstall dialog",
  },
  confirm: {
    id: "plugins.card.uninstallConfirm.confirm",
    defaultMessage: "Uninstall",
    description: "Confirm button label for the plugin uninstall dialog",
  },
  removeConfirm: {
    id: "plugins.detail.removeDialog.confirm",
    defaultMessage: "Remove from Codex",
    description:
      "Confirm button label for the plugin remove dialog on the detail page",
  },
});

export function PluginUninstallDialog({
  dialogMode = "card",
  isDisabling,
  isUninstalling,
  onDisable,
  onConfirm,
  onOpenChange,
  open,
  pluginDisplayName,
}: {
  dialogMode?: "card" | "detail";
  isDisabling?: boolean;
  isUninstalling: boolean;
  onDisable?: () => Promise<void>;
  onConfirm: () => Promise<void>;
  onOpenChange: (nextOpen: boolean) => void;
  open: boolean;
  pluginDisplayName: string;
}): ReactElement {
  const usesDetailCopy = dialogMode === "detail";
  const dialogTitle = usesDetailCopy ? (
    <FormattedMessage
      {...messages.removeTitle}
      values={{
        name: (
          <strong
            className="font-semibold text-token-text-primary"
            key="plugin-name"
          >
            {pluginDisplayName}
          </strong>
        ),
      }}
    />
  ) : (
    <FormattedMessage
      {...messages.confirmTitle}
      values={{
        name: (
          <strong
            className="font-semibold text-token-text-primary"
            key="plugin-name"
          >
            {pluginDisplayName}
          </strong>
        ),
      }}
    />
  );
  const dialogSubtitle = usesDetailCopy ? (
    <FormattedMessage {...messages.removeDescription} />
  ) : (
    <FormattedMessage {...messages.confirmDescription} />
  );

  return (
    <Dialog
      open={open}
      contentProps={{ "aria-describedby": undefined }}
      onOpenChange={onOpenChange}
    >
      <DialogBody>
        <DialogTitle className="sr-only">{dialogTitle}</DialogTitle>
        <DialogSection>
          <DialogHeader
            title={dialogTitle}
            subtitle={dialogSubtitle}
            subtitleClassName="mt-2"
          />
        </DialogSection>
        <DialogSection>
          <DialogFooter>
            <Button
              color="outline"
              onClick={(): void => {
                onOpenChange(false);
              }}
            >
              <FormattedMessage {...messages.cancel} />
            </Button>
            {onDisable != null ? (
              <Button
                color="outline"
                loading={isDisabling ?? false}
                onClick={(): void => {
                  void onDisable();
                }}
              >
                <FormattedMessage {...messages.disable} />
              </Button>
            ) : null}
            <Button
              color="danger"
              loading={isUninstalling}
              onClick={(): void => {
                void onConfirm();
              }}
            >
              <FormattedMessage
                {...(usesDetailCopy
                  ? messages.removeConfirm
                  : messages.confirm)}
              />
            </Button>
          </DialogFooter>
        </DialogSection>
      </DialogBody>
    </Dialog>
  );
}
