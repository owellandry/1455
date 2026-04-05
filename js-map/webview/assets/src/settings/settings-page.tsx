import clsx from "clsx";
import { useAtomValue } from "jotai";
import { Suspense, useEffect, type ReactElement } from "react";
import {
  Navigate,
  Outlet,
  useLocation,
  useMatch,
  useNavigate,
} from "react-router";

import { AppSidebarShell } from "@/components/app/app-sidebar-shell";
import { useWindowsMenuBarEnabled } from "@/components/app/use-windows-menu-bar-enabled";
import { useWindowType } from "@/hooks/use-window-type";
import { useGate } from "@/statsig/statsig";

import { settingsBackRouteAtom } from "./settings-back-route";
import { SettingsNav } from "./settings-nav";
import { useVisibleSettingsSections } from "./use-visible-settings-sections";

export function SettingsPage(): ReactElement {
  const navigate = useNavigate();
  const location = useLocation();
  const windowType = useWindowType();
  const sectionMatch = useMatch("/settings/:section/*");
  const routeSection = sectionMatch?.params.section ?? null;
  const {
    activeSettingsSection,
    shouldRedirectToVisibleSettingsSection,
    visibleSettingsSections,
  } = useVisibleSettingsSections(routeSection);
  const isWindowsMenuBarEnabled = useWindowsMenuBarEnabled();
  const showFullSettingsLayout = useGate(
    __statsigName("codex_vsce_show_full_settings"),
  );
  const showSettingsNav =
    windowType === "electron" ||
    (windowType === "extension" && showFullSettingsLayout);
  const backRoute = useAtomValue(settingsBackRouteAtom);
  const handleBack = (): void => navigateBackFromSettings(navigate, backRoute);
  const handleSelectSection = (
    slug: (typeof visibleSettingsSections)[number]["slug"],
  ): void => {
    void navigate(`/settings/${slug}`, {
      replace: true,
      state: location.state,
    });
  };

  useEffect(() => {
    if (windowType === "extension") {
      return;
    }

    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key !== "Escape") {
        return;
      }
      if (event.defaultPrevented) {
        return;
      }
      if (event.target instanceof HTMLElement) {
        if (isEditableTarget(event.target)) {
          return;
        }
        if (
          event.target.closest('[role="dialog"][data-state="open"]') != null
        ) {
          return;
        }
      }
      navigateBackFromSettings(navigate, backRoute);
    };

    window.addEventListener("keydown", onKeyDown);
    return (): void => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [backRoute, navigate, windowType]);

  // We intentionally do not block the whole settings shell while visibility
  // checks load. Only routes with pending visibility checks (currently
  // /settings/usage) defer redirects so eligible users do not get bounced to
  // General.
  if (shouldRedirectToVisibleSettingsSection) {
    return <Navigate to={`/settings/${activeSettingsSection}`} replace />;
  }

  if (isWindowsMenuBarEnabled) {
    return (
      <AppSidebarShell
        sidebar={
          <div className="h-full">
            <SettingsNav
              canCollapse={windowType === "extension"}
              className="pt-2"
              settingsSections={visibleSettingsSections}
              activeSection={activeSettingsSection}
              onSelect={handleSelectSection}
              onBack={windowType === "electron" ? handleBack : undefined}
            />
          </div>
        }
      >
        <div className="h-full min-w-0 overflow-visible">
          <Suspense>
            <Outlet />
          </Suspense>
        </div>
      </AppSidebarShell>
    );
  }

  return (
    <div className="flex h-full min-h-0">
      {showSettingsNav ? (
        <div
          className={clsx(
            "window-fx-sidebar-surface flex shrink-0 flex-col",
            windowType === "electron" && "w-token-sidebar",
          )}
        >
          <div className="draggable h-toolbar w-full" />
          <SettingsNav
            canCollapse={windowType === "extension"}
            settingsSections={visibleSettingsSections}
            activeSection={activeSettingsSection}
            onSelect={handleSelectSection}
            onBack={windowType === "electron" ? handleBack : undefined}
          />
        </div>
      ) : null}

      <div className="min-w-0 flex-1 overflow-visible">
        <Suspense>
          <Outlet />
        </Suspense>
      </div>
    </div>
  );
}

function isEditableTarget(target: HTMLElement): boolean {
  const tagName = target.tagName.toLowerCase();
  if (tagName === "input" || tagName === "textarea" || tagName === "select") {
    return true;
  }
  if (target.isContentEditable) {
    return true;
  }
  return target.closest("[contenteditable='true']") != null;
}

function navigateBackFromSettings(
  navigate: ReturnType<typeof useNavigate>,
  backRoute: string | null,
): void {
  if (backRoute != null) {
    void navigate(backRoute);
    return;
  }
  void navigate("/", { replace: true });
}
