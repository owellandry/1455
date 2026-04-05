import { Provider } from "jotai";
import { ScopeProvider, useScope } from "maitai";
import { Suspense, lazy, useEffect, useEffectEvent, useRef } from "react";
import type React from "react";
import { MemoryRouter, Routes, useLocation } from "react-router";

import type { ProductEventPayload } from "@/product-events";

import { GlobalAnnouncements } from "./announcements/global-announcements";
import { APP_ROUTE_ELEMENTS, getMatchedRouteTemplate } from "./app-routes.tsx";
import { useDefaultAppServerManager } from "./app-server/app-server-manager-hooks";
import { RemoteConnectionManagerBootstrap } from "./app-server/remote-connection-manager-bootstrap.tsx";
import { ResumePinnedThreads } from "./app-server/resume-pinned-threads.tsx";
import { AppSunsetGate } from "./app-sunset-gate";
import { AppUpdateReadyStateBridge } from "./app-update-ready-state-bridge";
import { AppearanceProvider } from "./appearance/appearance-provider.tsx";
import { AuthProvider } from "./auth/auth-context-provider.tsx";
import { AuthNonceProvider } from "./auth/auth-nonce-provider.tsx";
import { AutomationDirectiveDialogHost } from "./automations/automation-directive-dialog-host";
import { HeartbeatAutomationTargetThreadsBridge } from "./automations/heartbeat-automation-target-threads-bridge";
import { CodexStatsigProvider } from "./codex-statsig-provider.tsx";
import { CommandMenu } from "./commands/command-menu.tsx";
import { isCompactWindowContextFromWindow } from "./compact-window/is-compact-window-context";
import { FullWindowCelebrationProvider } from "./components/app/full-window-celebration";
import { HostTitlebarTint } from "./components/app/host-titlebar-tint.tsx";
import { TraceRecordingIndicator } from "./components/app/trace-recording-indicator.tsx";
import { ErrorBoundary } from "./components/error-boundary.tsx";
import { ToastManager } from "./components/toaster/toaster.tsx";
import { TooltipProvider } from "./components/tooltip";
import { WithWindow } from "./components/with-window";
import { QueuedFollowUpRunner } from "./composer/queued-follow-up-runner.tsx";
import "./diff/register-pierre-themes";
import { ProjectImportPromptHost } from "./external-agent-config/project-import-prompt-host";
import { FatalErrorGate } from "./fatal-error-gate.tsx";
import { FeedbackSlashCommand } from "./feedback/feedback-command.tsx";
import { GitActionDirectiveSync } from "./git-action-directive-sync";
import { GitQueryInvalidationListener } from "./git-rpc/git-query-invalidation-listener.tsx";
import { useWindowType } from "./hooks/use-window-type";
import { HotkeyWindowTransitionProvider } from "./hotkey-window/hotkey-window-transition-provider";
import { InitialRouteHandler } from "./initial-route-handler.tsx";
import { AppIntlProvider } from "./intl/app-intl-provider.tsx";
import { AppIntlSignalBridge } from "./intl/app-intl-signal-bridge.tsx";
import { ThreadHandoffRunner } from "./local-conversation/move-thread/thread-handoff-runner.tsx";
import { messageBus } from "./message-bus.ts";
import { MessageHandlerAppServerHandlers } from "./message-handler-app-server-handlers.tsx";
import { MessageHandler } from "./message-handler.tsx";
import { NavigationHandler } from "./navigation-handler.tsx";
import { NavigationHistorySignalBridge } from "./navigation-history-signal-bridge";
import { NewChatHandler } from "./new-chat-handler.tsx";
import { UseAppBadgeCount } from "./notifications/use-app-badge-count.tsx";
import { UseNotificationService } from "./notifications/use-notification-service.tsx";
import { UsePowerSaveBlocker } from "./power-save-blocker/use-power-save-blocker";
import { productEventLogger$ } from "./product-event-signal";
import { ProductEventSignalBridge } from "./product-event-signal-bridge";
import { CreateRemoteProjectModal } from "./project-setup/remote-workspace-root-dialog";
import { useAppsList } from "./queries/apps-queries";
import { CodeCommentSync } from "./review/code-comment-sync.tsx";
import { AppScope } from "./scopes/app-scope";
import { MaitaiProvider } from "./scopes/maitai-provider.tsx";
import { RouteScope } from "./scopes/route-scope";
import { SettingsBackRouteTracker } from "./settings/settings-back-route-tracker.tsx";
import { useHostConfig } from "./shared-objects/use-host-config";
import { UseDefaultFeatureOverrides } from "./statsig/default-feature-overrides-bridge.tsx";
import { UseDesktopFeatureAvailabilityBridge } from "./statsig/desktop-feature-availability-bridge.tsx";
import { UseHeartbeatAutomationsEnabledGate } from "./statsig/heartbeat-automations-gate-bridge.tsx";
import { UseHotkeyWindowEnabledGate } from "./statsig/hotkey-window-gate-bridge.tsx";
import { tasksStore } from "./tasks-store.ts";
import { TelemetryUserReporter } from "./telemetry-user-reporter";
import { ThreadOverlayOpenCurrentHandler } from "./thread-overlay-open-current-handler.tsx";
import { TodoHandler } from "./todo-handler.tsx";
import { PersistedSignalsBridge } from "./utils/persisted-signals-bridge";
import { PersistedStateProvider } from "./utils/persisted-state-provider.tsx";
import { QueryProvider } from "./utils/query-provider.tsx";
import { PendingWorktreeConversationStarter } from "./worktrees-v2/pending-worktree-conversation-starter.tsx";
import { AutomationRunArchiver } from "./worktrees/automation-run-archiver.tsx";

const LazyShikiHighlightProvider = lazy(async () => {
  const module = await import("./diff/shiki-highlight-provider.tsx");
  return { default: module.ShikiHighlightProvider };
});

const IS_COMPACT_WINDOW = isCompactWindowContextFromWindow();
const IS_DEBUG_WINDOW = isDebugWindow();

export function FullApp(): React.ReactElement {
  return (
    <PersistedStateProvider>
      <AuthNonceProvider>
        <QueryProvider>
          <Provider store={tasksStore}>
            <MaitaiProvider>
              <ScopeProvider scope={AppScope}>
                <PersistedSignalsBridge />
                <MemoryRouter>
                  <NavigationHistorySignalBridge />
                  <HotkeyWindowTransitionProvider>
                    <FullWindowCelebrationProvider>
                      <AuthProvider>
                        <ResumePinnedThreads />
                        <MessageHandler>
                          <CodexStatsigProvider>
                            <MessageHandlerAppServerHandlers />
                            <UseDefaultFeatureOverrides />
                            <ProductEventSignalBridge />
                            {IS_COMPACT_WINDOW ? null : (
                              <WithWindow electron>
                                <UseHotkeyWindowEnabledGate />
                              </WithWindow>
                            )}
                            {IS_COMPACT_WINDOW ? null : (
                              <WithWindow electron>
                                <UseHeartbeatAutomationsEnabledGate />
                              </WithWindow>
                            )}
                            {IS_COMPACT_WINDOW ? null : (
                              <WithWindow electron>
                                <HeartbeatAutomationTargetThreadsBridge />
                              </WithWindow>
                            )}
                            {IS_COMPACT_WINDOW ? null : (
                              <WithWindow electron>
                                <UseDesktopFeatureAvailabilityBridge />
                              </WithWindow>
                            )}
                            <AppIntlProvider>
                              <AppIntlSignalBridge />
                              <AppearanceProvider>
                                <ToastManager>
                                  <TooltipProvider delayDuration={0}>
                                    <ShikiHighlightProviderGate>
                                      <AppSunsetGate>
                                        <FatalErrorGate>
                                          <ErrorBoundary name="AppRoutes">
                                            <NavigationHandler />
                                            <WithWindow extension>
                                              <TodoHandler />
                                            </WithWindow>
                                            <TelemetryUserReporter />
                                            <WithWindow electron>
                                              <PendingWorktreeConversationStarter />
                                            </WithWindow>
                                            <WithWindow electron>
                                              <GitQueryInvalidationListener />
                                            </WithWindow>
                                            <QueuedFollowUpRunner />
                                            {IS_COMPACT_WINDOW ? null : (
                                              <>
                                                <AppsListBootstrap />
                                                <NewChatHandler />
                                                <RemoteConnectionManagerBootstrap />
                                                <WithWindow electron>
                                                  <ThreadOverlayOpenCurrentHandler />
                                                </WithWindow>
                                                <UseNotificationService />
                                                <UseAppBadgeCount />
                                                <WithWindow electron>
                                                  <HostTitlebarTint />
                                                </WithWindow>
                                                <WithWindow electron>
                                                  <TraceRecordingIndicator />
                                                </WithWindow>
                                                <WithWindow electron>
                                                  <AutomationDirectiveDialogHost />
                                                </WithWindow>
                                                <WithWindow electron>
                                                  <AppUpdateReadyStateBridge />
                                                </WithWindow>
                                                <UsePowerSaveBlocker />
                                                <AppWindowAnalytics />
                                                <WithWindow electron>
                                                  <ThreadHandoffRunner />
                                                </WithWindow>
                                                <WithWindow electron>
                                                  {IS_DEBUG_WINDOW ? null : (
                                                    <AutomationRunArchiver />
                                                  )}
                                                </WithWindow>
                                                <CommandMenuGate />
                                                <CreateRemoteProjectModal />
                                                <ProjectImportPromptHost />
                                                <CodeCommentSync />
                                                <GitActionDirectiveSync />
                                                <FeedbackSlashCommand />
                                              </>
                                            )}
                                            <GlobalAnnouncements />
                                            <InitialRouteHandler>
                                              <AppRoutes />
                                            </InitialRouteHandler>
                                          </ErrorBoundary>
                                        </FatalErrorGate>
                                      </AppSunsetGate>
                                    </ShikiHighlightProviderGate>
                                  </TooltipProvider>
                                </ToastManager>
                              </AppearanceProvider>
                            </AppIntlProvider>
                          </CodexStatsigProvider>
                        </MessageHandler>
                      </AuthProvider>
                    </FullWindowCelebrationProvider>
                  </HotkeyWindowTransitionProvider>
                </MemoryRouter>
              </ScopeProvider>
            </MaitaiProvider>
          </Provider>
        </QueryProvider>
      </AuthNonceProvider>
    </PersistedStateProvider>
  );
}

function AppWindowAnalytics(): React.ReactElement | null {
  const windowType = useWindowType();
  const scope = useScope(AppScope);
  const appServerManager = useDefaultAppServerManager();
  const hostConfig = useHostConfig(appServerManager.getHostId());
  const logProductEventEvent = useEffectEvent(
    (payload: ProductEventPayload) => {
      scope.get(productEventLogger$).log(payload);
    },
  );
  const didLogRemoteHostWindowOpenedEventRef = useRef(false);

  useEffect(() => {
    if (windowType !== "electron") {
      return;
    }

    logProductEventEvent({ eventName: "codex_app_window_opened" });

    return (): void => {
      logProductEventEvent({ eventName: "codex_app_window_closed" });
    };
  }, [windowType]);

  useEffect(() => {
    if (windowType !== "electron") {
      return;
    }
    if (didLogRemoteHostWindowOpenedEventRef.current) {
      return;
    }

    if (hostConfig.kind === "local") {
      return;
    }

    didLogRemoteHostWindowOpenedEventRef.current = true;
    logProductEventEvent({
      eventName: "codex_app_remote_host_window_opened",
      metadata: {
        kind: hostConfig.kind,
      },
    });
  }, [hostConfig.kind, windowType]);

  return null;
}

function AppRoutes(): React.ReactElement {
  const { pathname } = useLocation();

  useEffect(() => {
    messageBus.dispatchMessage("log-message", {
      level: "info",
      message: `[startup][renderer] app routes mounted after ${Math.round(
        performance.now(),
      )}ms`,
    });
    messageBus.dispatchMessage("ready", {});
    const handleFocus = (): void => {
      messageBus.dispatchMessage("view-focused", {});
    };
    window.addEventListener("focus", handleFocus);
    if (document.hasFocus()) {
      handleFocus();
    }
    return (): void => {
      window.removeEventListener("focus", handleFocus);
    };
  }, []);

  return (
    <>
      <SettingsBackRouteTracker />
      <ScopeProvider
        scope={RouteScope}
        value={{
          pathname,
          routeTemplate: getMatchedRouteTemplate(pathname),
        }}
      >
        <Routes>{APP_ROUTE_ELEMENTS}</Routes>
      </ScopeProvider>
    </>
  );
}

function CommandMenuGate(): React.ReactElement | null {
  if (IS_COMPACT_WINDOW) {
    return null;
  }
  return <CommandMenu />;
}

function AppsListBootstrap(): React.ReactElement | null {
  useAppsList();
  return null;
}

function ShikiHighlightProviderGate({
  children,
}: {
  children: React.ReactNode;
}): React.ReactNode {
  if (IS_COMPACT_WINDOW) {
    return children;
  }
  return (
    <Suspense fallback={children}>
      <LazyShikiHighlightProvider>{children}</LazyShikiHighlightProvider>
    </Suspense>
  );
}

function isDebugWindow(): boolean {
  const url = new URL(window.location.href);
  if (url.pathname.startsWith("/debug")) {
    return true;
  }
  const initialRoute = url.searchParams.get("initialRoute");
  return initialRoute?.startsWith("/debug") ?? false;
}
