import { electronMenuAccelerators } from "protocol";
import type React from "react";
import { useState } from "react";
import { Outlet } from "react-router";

import { useHotkey } from "@/keyboard-shortcuts/use-hotkey";
import { messageBus } from "@/message-bus";

import { HotkeyWindowPageHeader } from "./hotkey-window-page-header";
import {
  HotkeyWindowDetailLayoutContext,
  type HotkeyWindowDetailConfig,
} from "./use-hotkey-window-detail-layout";
import { useHotkeyWindowDismissOnEscape } from "./use-hotkey-window-dismiss-on-escape";

export function HotkeyWindowDetailLayout(): React.ReactElement {
  useHotkeyWindowDismissOnEscape();

  const [detail, setDetail] = useState<HotkeyWindowDetailConfig | null>(null);

  useHotkey({
    accelerator: electronMenuAccelerators.newThread,
    enabled: detail != null && detail.canCollapseToHome !== false,
    onKeyDown: (event) => {
      event.preventDefault();
      event.stopPropagation();
      messageBus.dispatchMessage("hotkey-window-collapse-to-home", {});
    },
  });

  return (
    <HotkeyWindowDetailLayoutContext.Provider value={setDetail}>
      <div className="flex h-full w-full flex-col overflow-hidden rounded-2xl border border-token-border-light bg-token-bg-primary">
        {detail == null ? null : (
          <HotkeyWindowPageHeader
            title={detail.title}
            mainWindowPath={detail.mainWindowPath}
            canCollapseToHome={detail.canCollapseToHome !== false}
          />
        )}
        <div className="min-h-0 flex-1">
          <Outlet />
        </div>
      </div>
    </HotkeyWindowDetailLayoutContext.Provider>
  );
}
