import type { ExportLogsScope } from "protocol";
import type React from "react";
import { useCallback, useEffect, useState } from "react";

import { useAuth } from "@/auth/use-auth";
import { BasicDropdown, Dropdown } from "@/components/dropdown";
import { Spinner } from "@/components/spinner";
import ChevronIcon from "@/icons/chevron.svg";
import { logger } from "@/utils/logger";

import { ChildProcessesSection } from "./child-processes-section";
import { DebugEntry } from "./debug-entry";
import { DebugLineItem } from "./debug-line-item";
import { DebugSection } from "./debug-section";
import { HotkeyWindowHotkeySection } from "./hotkey-window-hotkey-section";
import { OnboardingSection } from "./onboarding-section";
import type { DebugPanelMessage } from "./use-debug-panel";
import { debugPanelChannel } from "./use-debug-panel";
import { WorkspaceRootsSection } from "./workspace-roots-section";

export function DebugPage(): React.ReactElement {
  type DebugEntry = Extract<DebugPanelMessage, { kind: "add" }>["entry"];
  const auth = useAuth();
  const [debugEntries, setDebugEntries] = useState<Array<DebugEntry>>([]);
  const [isTriggeringSentryTest, setIsTriggeringSentryTest] =
    useState<boolean>(false);
  const authMethodLabel = auth.authMethod ?? "none";
  const [isExportingLogs, setIsExportingLogs] = useState<boolean>(false);

  useEffect(() => {
    const channel = debugPanelChannel;
    if (!channel) {
      return;
    }
    const handleMessage = (event: MessageEvent<DebugPanelMessage>): void => {
      const message = event.data;
      if (message?.kind === "add") {
        setDebugEntries((existing) => {
          const next = existing.filter((item) => item.id !== message.id);
          next.push(message.entry);
          return next;
        });
      } else if (message?.kind === "remove") {
        setDebugEntries((existing) =>
          existing.filter((item) => item.id !== message.id),
        );
      } else if (message?.kind === "clear") {
        setDebugEntries([]);
      }
    };
    channel.addEventListener("message", handleMessage);
    channel.postMessage({ kind: "request-sync" });
    return (): void => {
      channel.removeEventListener("message", handleMessage);
    };
  }, [setDebugEntries]);

  const canShowSentryDebugSection =
    typeof window !== "undefined" &&
    Boolean(window.electronBridge?.getSentryInitOptions);

  const canTriggerSentryTest =
    typeof window !== "undefined" &&
    Boolean(window.electronBridge?.triggerSentryTestError);

  const canExportLogs =
    typeof window !== "undefined" &&
    Boolean(window.electronBridge?.sendMessageFromView);

  const codexAppSessionId =
    typeof window !== "undefined"
      ? window.electronBridge?.getSentryInitOptions?.()?.codexAppSessionId
      : undefined;

  const handleTriggerSentryTest = useCallback(async (): Promise<void> => {
    const triggerSentryTestError =
      window.electronBridge?.triggerSentryTestError;
    if (!triggerSentryTestError) {
      return;
    }
    setIsTriggeringSentryTest(true);
    try {
      await triggerSentryTestError();
    } finally {
      setIsTriggeringSentryTest(false);
    }
  }, []);

  const handleExportLogs = useCallback(
    async (scope: ExportLogsScope): Promise<void> => {
      const sendMessageFromView = window.electronBridge?.sendMessageFromView;
      if (!sendMessageFromView || isExportingLogs) {
        return;
      }
      setIsExportingLogs(true);
      try {
        await sendMessageFromView({ type: "export-logs", scope });
      } catch (error) {
        logger.error("Failed to export logs", {
          safe: { scope },
          sensitive: {
            error: error,
          },
        });
      } finally {
        setIsExportingLogs(false);
      }
    },
    [isExportingLogs],
  );

  return (
    <div className="fixed inset-0 text-sm">
      <div className="draggable fixed right-0 left-0 flex h-toolbar-sm items-center justify-center font-medium text-token-description-foreground">
        Debug
      </div>
      <div className="fixed inset-0 top-toolbar-sm flex flex-col gap-px overflow-scroll pb-4">
        {debugEntries.map((entry) => {
          const storageKey = `debug-entry-${entry.titleText}`;
          return (
            <DebugSection
              key={entry.id}
              title={entry.titleText ? entry.titleText : "Debug entry"}
              storageKey={storageKey}
              variant="selection"
            >
              <DebugEntry lines={entry.lines} />
            </DebugSection>
          );
        })}

        <ChildProcessesSection />
        <OnboardingSection />
        <WorkspaceRootsSection />
        <HotkeyWindowHotkeySection />

        <DebugSection
          storageKey="debug-user-section"
          title="User"
          variant="global"
        >
          <div className="flex flex-col py-1.5">
            <DebugLineItem label="Auth Method" value={authMethodLabel} />
            <DebugLineItem
              label="User ID"
              value={auth.userId ?? "Unavailable"}
            />
            <DebugLineItem
              label="Account ID"
              value={auth.accountId ?? "Unavailable"}
            />
            <DebugLineItem label="Email" value={auth.email ?? "Unavailable"} />
          </div>
        </DebugSection>

        {canShowSentryDebugSection ? (
          <DebugSection
            storageKey="debug-sentry-section"
            title="Diagnostics"
            variant="global"
          >
            <div className="flex flex-col py-1.5">
              <DebugLineItem
                label="App session ID"
                value={codexAppSessionId ?? "Unavailable"}
              />
            </div>
            <div className="flex flex-col gap-3 py-1.5">
              <div className="rounded border border-token-border bg-token-foreground/5 px-3 py-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-xs font-medium text-token-foreground">
                    Logs
                  </div>
                  {isExportingLogs ? (
                    <div className="inline-flex items-center justify-center rounded border border-token-border px-3 py-1 text-xs text-token-foreground">
                      <Spinner className="icon-xxs" />
                    </div>
                  ) : (
                    <BasicDropdown
                      align="end"
                      disabled={!canExportLogs}
                      triggerButton={
                        <button
                          type="button"
                          className="inline-flex items-center gap-2 rounded border border-token-border px-3 py-1 text-xs text-token-foreground hover:bg-token-foreground/5 disabled:cursor-not-allowed disabled:opacity-50"
                          disabled={!canExportLogs}
                        >
                          Export
                          <ChevronIcon className="icon-2xs opacity-70" />
                        </button>
                      }
                    >
                      <div className="flex min-w-[180px] flex-col gap-0.5">
                        <Dropdown.Item
                          onSelect={() => handleExportLogs("session")}
                        >
                          This session
                        </Dropdown.Item>
                        <Dropdown.Item
                          onSelect={() => handleExportLogs("today")}
                        >
                          Today’s logs
                        </Dropdown.Item>
                        <Dropdown.Item
                          onSelect={() => handleExportLogs("last7days")}
                        >
                          Last 7 days
                        </Dropdown.Item>
                      </div>
                    </BasicDropdown>
                  )}
                </div>
              </div>

              {canTriggerSentryTest ? (
                <div className="rounded border border-token-border bg-token-foreground/5 px-3 py-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-xs font-medium text-token-foreground">
                      Crash reporting
                    </div>
                    <button
                      type="button"
                      className="inline-flex items-center gap-2 rounded border border-token-border px-3 py-1 text-xs text-token-foreground hover:bg-token-foreground/5 disabled:cursor-not-allowed disabled:opacity-50"
                      onClick={handleTriggerSentryTest}
                      disabled={isTriggeringSentryTest}
                    >
                      Send test error
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          </DebugSection>
        ) : null}
      </div>
    </div>
  );
}
