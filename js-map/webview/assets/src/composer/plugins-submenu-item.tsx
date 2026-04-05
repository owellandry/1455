import type React from "react";
import { FormattedMessage } from "react-intl";

import { Dropdown } from "@/components/dropdown";
import { useIsPluginsEnabled } from "@/hooks/use-is-plugins-enabled";
import AppsIcon from "@/icons/apps.svg";
import { selectEnabledInstalledPlugins } from "@/plugins/plugins-page-selectors";
import { usePlugins } from "@/plugins/use-plugins";

import {
  getPluginMentionIcon,
  getPluginMentionInsertItem,
} from "./plugin-mention-utils";
import { useComposerController } from "./prosemirror/use-composer-controller";

export function PluginsSubmenuItem({
  handleSelectAndClose,
}: {
  handleSelectAndClose: () => void;
}): React.ReactElement | null {
  const composerController = useComposerController();
  const isPluginsEnabled = useIsPluginsEnabled();
  const { plugins } = usePlugins();

  if (!isPluginsEnabled) {
    return null;
  }

  const enabledPlugins = selectEnabledInstalledPlugins(plugins);
  if (enabledPlugins.length === 0) {
    return null;
  }

  return (
    <>
      <Dropdown.Separator />
      <Dropdown.FlyoutSubmenuItem
        LeftIcon={AppsIcon}
        leftIconClassName="icon-xs"
        label={
          <FormattedMessage
            id="composer.pluginsDropdown"
            defaultMessage="Plugins"
            description="Dropdown item label for enabled plugins in the add context menu"
          />
        }
        contentClassName="min-w-[160px]"
      >
        <Dropdown.Title className="text-token-muted-foreground text-xs">
          <FormattedMessage
            id="composer.pluginsDropdown.installedCount"
            defaultMessage="{count, plural, one {# installed plugin} other {# installed plugins}}"
            description="Label at the top of the plugins submenu showing how many enabled installed plugins are available"
            values={{ count: enabledPlugins.length }}
          />
        </Dropdown.Title>
        <div className="max-h-40 overflow-y-auto" dir="ltr">
          {enabledPlugins.map((plugin) => {
            const mention = getPluginMentionInsertItem(plugin);
            const PluginIcon = getPluginMentionIcon(plugin);

            return (
              <Dropdown.Item
                key={mention.path}
                LeftIcon={PluginIcon}
                leftIconClassName="size-4 rounded-xs"
                onSelect={() => {
                  composerController.insertMentionAtSelection(mention);
                  handleSelectAndClose();
                }}
              >
                {mention.displayName}
              </Dropdown.Item>
            );
          })}
        </div>
      </Dropdown.FlyoutSubmenuItem>
    </>
  );
}
