import { useQueryClient } from "@tanstack/react-query";
import type { ReactElement } from "react";
import { useState } from "react";
import { FormattedMessage } from "react-intl";

import { Dropdown } from "@/components/dropdown";
import { messageBus } from "@/message-bus";
import { getQueryKey } from "@/vscode-api";

export function WorkspaceRootRename({
  root,
  savedLabel,
  fallbackLabel,
  onSave,
  onCancel,
}: {
  root: string;
  savedLabel: string;
  fallbackLabel: string;
  onSave: () => void;
  onCancel: () => void;
}): ReactElement {
  const queryClient = useQueryClient();
  const [value, setValue] = useState(() => savedLabel || fallbackLabel);

  const handleSave = (): void => {
    const trimmedLabel = value.trim();
    messageBus.dispatchMessage("electron-rename-workspace-root-option", {
      root,
      label: trimmedLabel,
    });
    queryClient.setQueryData(
      getQueryKey("workspace-root-options"),
      (
        prev:
          | { roots?: Array<string>; labels?: Record<string, string> }
          | undefined,
      ) => {
        const nextRoots = prev?.roots ?? [];
        const nextLabels = { ...prev?.labels };
        if (trimmedLabel.length === 0) {
          delete nextLabels[root];
        } else {
          nextLabels[root] = trimmedLabel;
        }
        return { roots: nextRoots, labels: nextLabels };
      },
    );
    onSave();
  };

  const handleKeyDown = (
    event: React.KeyboardEvent<HTMLInputElement>,
  ): void => {
    if (event.key === "Enter") {
      event.preventDefault();
      handleSave();
      return;
    }
    if (event.key === "Escape") {
      event.preventDefault();
      onCancel();
    }
  };

  return (
    <div className="flex flex-col gap-1 pt-1 pb-1">
      <Dropdown.Title className="text-token-muted-foreground text-xs">
        <FormattedMessage
          id="sidebarElectron.renameWorkspaceRootOptionLabel"
          defaultMessage="Display name"
          description="Header shown when setting a display name for a workspace root option"
        />
      </Dropdown.Title>
      <Dropdown.Section className="px-[var(--padding-row-x)]">
        <Dropdown.Input
          value={value}
          placeholder={fallbackLabel}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={handleKeyDown}
        />
      </Dropdown.Section>
    </div>
  );
}
