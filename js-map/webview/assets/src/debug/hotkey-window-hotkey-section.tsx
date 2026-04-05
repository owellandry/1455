import { useQueryClient } from "@tanstack/react-query";
import type React from "react";
import { useState } from "react";

import { formatAccelerator } from "@/keyboard-shortcuts/electron-menu-shortcuts";
import {
  getQueryKey,
  useFetchFromVSCode,
  useMutationFromVSCode,
} from "@/vscode-api";

import { DebugLineItem } from "./debug-line-item";
import { DebugSection } from "./debug-section";

export function HotkeyWindowHotkeySection(): React.ReactElement | null {
  const queryClient = useQueryClient();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const { data: hotkeyState } = useFetchFromVSCode(
    "hotkey-window-hotkey-state",
  );
  const setDevOverride = useMutationFromVSCode(
    "hotkey-window-set-dev-hotkey-override",
    {
      onSuccess: (response) => {
        queryClient.setQueryData(
          getQueryKey("hotkey-window-hotkey-state"),
          response.state,
        );
      },
    },
  );

  if (
    hotkeyState == null ||
    hotkeyState.supported === false ||
    hotkeyState.isDevMode === false
  ) {
    return null;
  }

  const configuredHotkeyLabel =
    hotkeyState.configuredHotkey == null
      ? "Off"
      : formatAccelerator(hotkeyState.configuredHotkey);
  const gateLabel = hotkeyState.isGateEnabled ? "Enabled" : "Disabled";
  const activeLabel = hotkeyState.isActive ? "Active" : "Inactive";
  const overrideLabel = hotkeyState.isDevOverrideEnabled
    ? "Enabled"
    : "Disabled";
  const canToggleOverride =
    hotkeyState.configuredHotkey != null && !setDevOverride.isPending;

  return (
    <DebugSection
      title="Popout Window hotkey"
      storageKey="debug-hotkey-window-hotkey"
      variant="global"
    >
      <div className="flex flex-col py-1.5">
        <DebugLineItem
          label="Configured hotkey"
          value={configuredHotkeyLabel}
        />
        <DebugLineItem label="Gate" value={gateLabel} />
        <DebugLineItem label="Runtime" value={activeLabel} />
        <DebugLineItem label="Dev override" value={overrideLabel} />
      </div>
      <div className="flex flex-col gap-2 py-1.5">
        <button
          type="button"
          className="inline-flex w-fit items-center rounded border border-token-border px-3 py-1 text-xs text-token-foreground hover:bg-token-foreground/5 disabled:cursor-not-allowed disabled:opacity-50"
          disabled={!canToggleOverride}
          onClick={() => {
            setErrorMessage(null);
            void setDevOverride
              .mutateAsync({ enabled: !hotkeyState.isDevOverrideEnabled })
              .then((response) => {
                if (!response.success) {
                  setErrorMessage(response.error);
                }
              })
              .catch((error) => {
                setErrorMessage(
                  error instanceof Error
                    ? error.message
                    : "Failed to update dev override.",
                );
              });
          }}
        >
          {hotkeyState.isDevOverrideEnabled
            ? "Disable dev override"
            : "Enable hotkey in dev"}
        </button>
        {hotkeyState.configuredHotkey == null ? (
          <div className="text-xs text-token-description-foreground">
            Set a Popout Window hotkey in Settings to use dev override.
          </div>
        ) : null}
        {errorMessage ? (
          <div className="text-xs text-token-error-foreground">
            {errorMessage}
          </div>
        ) : null}
      </div>
    </DebugSection>
  );
}
