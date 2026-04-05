import { useAtomValue } from "jotai";
import type { ReactElement } from "react";
import { useIntl } from "react-intl";

import { aAppUpdateReady } from "@/app-update-ready-atom";
import DownloadIcon from "@/icons/download.svg";
import { messageBus } from "@/message-bus";

export function AppUpdateButton(): ReactElement | null {
  const intl = useIntl();
  const isUpdateReady = useAtomValue(aAppUpdateReady);

  if (!isUpdateReady) {
    return null;
  }

  const label = intl.formatMessage({
    id: "appHeader.installUpdate",
    defaultMessage: "Update",
    description:
      "Button label in the desktop app header that installs a downloaded app update",
  });

  return (
    <button
      aria-label={label}
      className="no-drag flex h-5 min-w-5 shrink-0 cursor-interaction items-center justify-center overflow-hidden rounded-full bg-token-charts-blue px-1.5 text-[10px] leading-none font-semibold text-white shadow-sm transition-colors hover:bg-token-charts-blue/90 active:bg-token-charts-blue/80 @[180px]:px-2.5"
      onClick={(): void => {
        messageBus.dispatchMessage("install-app-update", {});
      }}
      title={label}
    >
      <DownloadIcon className="h-3 w-3 shrink-0 @[180px]:hidden" />
      <span className="hidden min-w-0 truncate @[180px]:inline">{label}</span>
    </button>
  );
}
