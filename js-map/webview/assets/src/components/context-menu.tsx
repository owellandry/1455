import * as RadixContextMenu from "@radix-ui/react-context-menu";
import clsx from "clsx";
import React from "react";
import {
  FormattedMessage,
  type MessageDescriptor,
  type PrimitiveType,
  useIntl,
} from "react-intl";

import { useWindowType } from "@/hooks/use-window-type";
import ChevronRightIcon from "@/icons/chevron-right.svg";

export type AppContextMenuItem = {
  id: string;
  type?: "separator";
  message?: MessageDescriptor;
  messageValues?: Record<string, PrimitiveType | React.ReactNode>;
  icon?: string;
  enabled?: boolean;
  onSelect?: () => void;
  submenu?: Array<AppContextMenuItem>;
};

type NativeMenuItem = {
  id: string;
  type?: "separator";
  label: string;
  icon?: string;
  enabled?: boolean;
  submenu?: Array<NativeMenuItem>;
};

type PreparedMenuItem = AppContextMenuItem & {
  nativeLabel: string;
  icon?: string;
  submenu?: Array<PreparedMenuItem>;
};

function applyNativeLabels(
  menuItems: Array<AppContextMenuItem>,
  formatMessage: typeof useIntl.prototype.formatMessage,
): Array<PreparedMenuItem> {
  return menuItems.map((item) => {
    if (item.type === "separator") {
      return { ...item, nativeLabel: "", submenu: undefined };
    }
    const nextSubmenu = item.submenu
      ? applyNativeLabels(item.submenu, formatMessage)
      : undefined;
    const formatted = item.message
      ? formatMessage(item.message, item.messageValues)
      : item.id;
    return {
      ...item,
      nativeLabel: formatted,
      submenu: nextSubmenu,
      icon: item.icon,
    } as PreparedMenuItem;
  });
}

function toNativeItems(items: Array<PreparedMenuItem>): Array<NativeMenuItem> {
  return items.map((item, index) => ({
    id: item.id ?? `item-${index}`,
    type: item.type,
    label: item.type === "separator" ? "" : item.nativeLabel,
    icon: item.icon,
    enabled: item.enabled ?? true,
    submenu: item.submenu ? toNativeItems(item.submenu) : undefined,
  }));
}

function findItem(
  items: Array<PreparedMenuItem>,
  id: string,
): PreparedMenuItem | undefined {
  for (const item of items) {
    if (!item.id) {
      continue;
    }
    if (item.type === "separator") {
      continue;
    }
    if (item.id === id) {
      return item;
    }
    if (item.submenu) {
      const match = findItem(item.submenu, id);
      if (match) {
        return match;
      }
    }
  }
  return undefined;
}

/**
 * Unified context menu that renders native Electron menus when available or Radix otherwise.
 *
 * Native behavior: preload exposes `window.electronBridge.showContextMenu`, which pipes the menu
 * template to the main process so Electron renders a real OS menu (preserving separators/icons).
 * In browsers/extension, falls back to Radix context menu with matching structure.
 * Native labels auto-localize from `message` (or fall back to `id`); native icons are intentionally
 * passed through for Electron menus and still render in Radix.
 */
export function ContextMenu({
  items,
  getItems,
  children,
  disableNative,
  onBeforeOpen,
}: {
  items?: Array<AppContextMenuItem>;
  getItems?: () => Array<AppContextMenuItem>;
  children: React.ReactElement;
  disableNative?: boolean;
  onBeforeOpen?: () => void;
}): React.ReactElement {
  const windowType = useWindowType();
  const intl = useIntl();
  const useNative =
    windowType === "electron" &&
    !disableNative &&
    window.electronBridge?.showContextMenu != null;
  const [preparedItems, setPreparedItems] = React.useState<
    Array<PreparedMenuItem>
  >(applyNativeLabels(items ?? [], intl.formatMessage));

  const prepareItems = (): Array<PreparedMenuItem> => {
    onBeforeOpen?.();
    const nextItems = applyNativeLabels(
      (getItems ? getItems() : items) ?? [],
      intl.formatMessage,
    );
    setPreparedItems(nextItems);
    return nextItems;
  };

  React.useEffect(() => {
    if (!getItems) {
      setPreparedItems(applyNativeLabels(items ?? [], intl.formatMessage));
    }
  }, [getItems, intl, items]);

  const handleSelect = (
    id: string,
    menuItems: Array<PreparedMenuItem> = preparedItems,
  ): void => {
    const item = findItem(menuItems, id);
    item?.onSelect?.();
  };

  const getDisplayLabel = (item: PreparedMenuItem): React.ReactNode =>
    item.message ? (
      <FormattedMessage {...item.message} values={item.messageValues} />
    ) : (
      item.id
    );

  const handleNativeContextMenu = async (
    event: React.MouseEvent,
  ): Promise<void> => {
    if (!useNative) {
      return;
    }
    event.preventDefault();
    const nextItems = prepareItems();
    const selection = await window.electronBridge?.showContextMenu?.(
      toNativeItems(nextItems),
    );
    const selectedId = selection?.id;
    if (!selectedId) {
      return;
    }
    handleSelect(selectedId, nextItems);
  };

  if (useNative) {
    // Native Electron context menus are rendered by the main process, so we need an `onContextMenu`
    // handler in the webview to ask Electron to show a menu. We must not wrap `children` in a
    // block-level element (like a `div`) because `ContextMenu` is often used around inline UI (file
    // reference chips), and a block wrapper would force unwanted line breaks. Instead, clone the
    // child and attach our handler while preserving any existing `onContextMenu` behavior.
    const child = children as React.ReactElement<{
      onContextMenu?: (event: React.MouseEvent) => void;
    }>;
    const existingOnContextMenu = child.props.onContextMenu;
    return React.cloneElement<{
      onContextMenu?: (event: React.MouseEvent) => void;
    }>(child, {
      onContextMenu: (event: React.MouseEvent) => {
        existingOnContextMenu?.(event);
        void handleNativeContextMenu(event);
      },
    });
  }

  const child = children as React.ReactElement<{
    onContextMenu?: (event: React.MouseEvent) => void;
  }>;
  const existingOnContextMenu = child.props.onContextMenu;
  const triggerChild = React.cloneElement<{
    onContextMenu?: (event: React.MouseEvent) => void;
  }>(child, {
    onContextMenu: (event: React.MouseEvent) => {
      existingOnContextMenu?.(event);
      event.stopPropagation();
    },
  });

  const renderItems = (menuItems: Array<PreparedMenuItem>): React.ReactNode =>
    menuItems.map((item, index) =>
      item.type === "separator" ? (
        <RadixContextMenu.Separator
          key={item.id ?? `separator-${index}`}
          className="mx-1 my-1 border-t border-token-border/60"
        />
      ) : item.submenu ? (
        <RadixContextMenu.Sub key={item.id ?? `submenu-${index}`}>
          <RadixContextMenu.SubTrigger
            className="flex cursor-interaction items-center justify-between gap-1.5 rounded-lg p-1.5 text-sm text-token-foreground outline-hidden hover:bg-token-list-hover-background focus:bg-token-list-hover-background"
            disabled={item.enabled === false}
          >
            <MenuRow
              icon={item.icon}
              label={getDisplayLabel(item)}
              showChevron
            />
          </RadixContextMenu.SubTrigger>
          <RadixContextMenu.Portal>
            <RadixContextMenu.SubContent
              className="z-50 m-px flex min-w-[200px] flex-col rounded-xl bg-token-dropdown-background/90 p-1 text-token-foreground shadow-lg ring-[0.5px] ring-token-border backdrop-blur-sm select-none"
              collisionPadding={6}
            >
              {renderItems(item.submenu)}
            </RadixContextMenu.SubContent>
          </RadixContextMenu.Portal>
        </RadixContextMenu.Sub>
      ) : (
        <RadixContextMenu.Item
          key={item.id ?? `item-${index}`}
          className={clsx(
            "text-token-foreground outline-hidden rounded-lg p-1.5 text-sm cursor-interaction hover:bg-token-list-hover-background focus:bg-token-list-hover-background",
            item.enabled === false && "cursor-default opacity-50",
          )}
          onSelect={() => {
            if (item.enabled === false) {
              return;
            }
            item.onSelect?.();
          }}
          disabled={item.enabled === false}
        >
          <MenuRow icon={item.icon} label={getDisplayLabel(item)} />
        </RadixContextMenu.Item>
      ),
    );

  return (
    <RadixContextMenu.Root
      onOpenChange={(open: boolean) => {
        if (open) {
          prepareItems();
        }
      }}
    >
      <RadixContextMenu.Trigger asChild>
        {triggerChild}
      </RadixContextMenu.Trigger>
      <RadixContextMenu.Portal>
        <RadixContextMenu.Content
          className="z-50 m-px flex min-w-[180px] flex-col rounded-xl bg-token-dropdown-background/90 p-1 text-token-foreground shadow-lg ring-[0.5px] ring-token-border backdrop-blur-sm select-none"
          collisionPadding={6}
        >
          {renderItems(preparedItems)}
        </RadixContextMenu.Content>
      </RadixContextMenu.Portal>
    </RadixContextMenu.Root>
  );
}

function MenuRow({
  icon,
  label,
  showChevron,
}: {
  icon?: string;
  label: React.ReactNode;
  showChevron?: boolean;
}): React.ReactElement {
  return (
    <span className="flex w-full items-center gap-1.5">
      {icon ? (
        <img
          alt={typeof label === "string" ? label : ""}
          src={icon}
          className="icon-sm"
        />
      ) : null}
      <span className="truncate">{label}</span>
      {showChevron ? (
        <ChevronRightIcon className="icon-xs ml-auto opacity-50" />
      ) : null}
    </span>
  );
}
