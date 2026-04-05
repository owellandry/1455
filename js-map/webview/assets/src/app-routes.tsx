import {
  HOTKEY_WINDOW_HOME_ROUTE,
  LOCAL_CONVERSATION_ROUTE_PATTERN,
} from "protocol";
import type { ReactElement } from "react";
import type { RouteObject } from "react-router";
import {
  createRoutesFromElements,
  matchRoutes,
  Navigate,
  Outlet,
  Route,
} from "react-router";

import {
  DEFAULT_SETTINGS_SECTION,
  SETTINGS_SECTIONS,
} from "@/constants/settings-sections.ts";
import { useGate } from "@/statsig/statsig";

import { AppConnectOAuthCallbackPage } from "./apps/app-connect-oauth-callback-page.tsx";
import { AuthedRoute } from "./auth/authed-route.tsx";
import { DebugPage } from "./debug/debug-page.tsx";
import { EditorDiffPage } from "./diff/editor-diff-page.tsx";
import { FilePreviewPage } from "./file-preview/file-preview-page.tsx";
import { HomePage } from "./home-page.tsx";
import { HotkeyWindowDetailLayout } from "./hotkey-window/hotkey-window-detail-layout";
import { HotkeyWindowHomePage } from "./hotkey-window/hotkey-window-home-page";
import { HotkeyWindowNewThreadPage } from "./hotkey-window/hotkey-window-new-thread-page";
import { HotkeyWindowThreadPage } from "./hotkey-window/hotkey-window-thread-page";
import { HotkeyWindowWorktreeInitPage } from "./hotkey-window/hotkey-window-worktree-init-page";
import { InboxLayoutPage } from "./inbox/inbox-page.tsx";
import { LocalConversationPage } from "./local-conversation/local-conversation-page.tsx";
import { PlanSummaryPage } from "./local-conversation/plan-summary-page.tsx";
import { ElectronOnboardingGate } from "./onboarding/electron-onboarding-gate.tsx";
import { LoginRoute } from "./onboarding/login-route.tsx";
import { SelectWorkspacePage } from "./onboarding/select-workspace-page.tsx";
import { WelcomePage } from "./onboarding/welcome-page.tsx";
import { NewThreadPanelPage } from "./panel/new-thread-panel-page.tsx";
import { PluginDetailPage } from "./plugins/plugin-detail-page.tsx";
import { PullRequestsPage } from "./pull-requests/review-board/pull-requests-page";
import { RemoteConnectionsPage } from "./remote-connections/remote-connections-page.tsx";
import { RemoteConversationPage } from "./remote-conversation/remote-conversation-page.tsx";
import { OpenSourceLicensesPage } from "./settings/open-source-licenses-page.tsx";
import { SettingsPage } from "./settings/settings-page.tsx";
import { SettingsSectionRoute } from "./settings/settings-routes.tsx";
import { FirstRunPage } from "./sign-in/first-run.tsx";
import { SkillsPage } from "./skills/skills-page";
import { ThreadOverlayPage } from "./thread-overlay/thread-overlay-page";
import { WorktreeInitPage } from "./worktrees-v2/worktree-init-v2-page.tsx";

/**
 * The single source of truth for the webview route tree.
 * Used both by `<Routes>` in `main.tsx` and by `matchRoutes()` for tracing.
 */
export const APP_ROUTE_ELEMENTS = (
  <>
    <Route path="/debug" element={<DebugPage />} />
    <Route element={<ElectronOnboardingGate />}>
      <Route path="/login" element={<LoginRoute />} />
      <Route path="/welcome" element={<WelcomePage />} />
      <Route path="/select-workspace" element={<SelectWorkspacePage />} />
      <Route path="/diff" element={<EditorDiffPage />} />
      <Route path="/plan-summary" element={<PlanSummaryPage />} />
      <Route path="/file-preview" element={<FilePreviewPage />} />
      <Route element={<AuthedRoute />}>
        <Route path="/" element={<HomePage />} />
        {/* `/extension/panel/new` is opened by the VS Code `chatgpt.newCodexPanel` command. */}
        <Route path="/extension/panel/new" element={<NewThreadPanelPage />} />
        <Route path="/first-run" element={<FirstRunPage />} />
        <Route
          path={LOCAL_CONVERSATION_ROUTE_PATTERN}
          element={<LocalConversationPage />}
        />
        <Route
          path="/thread-overlay/:conversationId"
          element={<ThreadOverlayPage />}
        />
        <Route path={HOTKEY_WINDOW_HOME_ROUTE} element={<Outlet />}>
          <Route index element={<HotkeyWindowHomePage />} />
          <Route element={<HotkeyWindowDetailLayout />}>
            <Route path="new-thread" element={<HotkeyWindowNewThreadPage />} />
            <Route
              path="thread/:conversationId"
              element={<HotkeyWindowThreadPage />}
            />
            <Route
              path="remote/:taskId"
              element={<RemoteConversationPage variant="hotkey" />}
            />
            <Route
              path="worktree-init-v2/:pendingWorktreeId"
              element={<HotkeyWindowWorktreeInitPage />}
            />
          </Route>
        </Route>
        <Route path="/inbox" element={<InboxLayoutPage />} />
        <Route path="/pull-requests" element={<PullRequestsRoute />} />
        <Route
          path="/pull-requests/:pullRequestNumber"
          element={<Navigate to="/pull-requests" replace />}
        />
        <Route
          path="/worktree-init-v2/:pendingWorktreeId"
          element={<WorktreeInitPage />}
        />
        <Route
          path="/connector/oauth_callback"
          element={<AppConnectOAuthCallbackPage />}
        />
        <Route path="/remote/:taskId" element={<RemoteConversationPage />} />
        <Route path="/remote-connections" element={<RemoteConnectionsPage />} />
        <Route path="/settings" element={<SettingsPage />}>
          <Route
            index
            element={
              <Navigate to={`/settings/${DEFAULT_SETTINGS_SECTION}`} replace />
            }
          />
          {SETTINGS_SECTIONS.map((section) => (
            <Route
              key={section.slug}
              path={section.slug}
              element={<SettingsSectionRoute slug={section.slug} />}
            />
          ))}
          <Route
            path="open-source-licenses"
            element={<OpenSourceLicensesPage />}
          />
          <Route
            path="*"
            element={
              <Navigate to={`/settings/${DEFAULT_SETTINGS_SECTION}`} replace />
            }
          />
        </Route>
        <Route
          path="/skills/plugins/:pluginId"
          element={<PluginDetailPage />}
        />
        <Route path="/skills" element={<SkillsPage />} />
      </Route>
    </Route>
  </>
);

function PullRequestsRoute(): ReactElement {
  const pullRequestsEnabled = useGate(
    __statsigName("codex-app-github-pr-board"),
  );

  if (!pullRequestsEnabled) {
    return <Navigate to="/" replace />;
  }

  return <PullRequestsPage />;
}

const APP_ROUTE_OBJECTS = createRoutesFromElements(
  APP_ROUTE_ELEMENTS,
) as Array<RouteObject>;

/**
 * Returns the matched route template (e.g. `/inbox`) for a pathname.
 * Falls back to `/unknown` when no route matches.
 */
// oxlint-disable-next-line react/only-export-components -- Suppressed during the oxlint migration
export function getMatchedRouteTemplate(pathname: string): string {
  const matches = matchRoutes(APP_ROUTE_OBJECTS, pathname);
  if (!matches || matches.length === 0) {
    return "/unknown";
  }

  let template = "";
  for (const match of matches) {
    const segment = match.route.path;
    if (!segment) {
      continue;
    }
    if (segment.startsWith("/")) {
      template = segment;
      continue;
    }
    template = template.endsWith("/")
      ? `${template}${segment}`
      : `${template}/${segment}`;
  }

  return template;
}
