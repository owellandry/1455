import type React from "react";
import { FormattedMessage } from "react-intl";

import { Composer } from "@/composer/composer";
import { LocalActiveWorkspaceRootDropdown } from "@/composer/local-active-workspace-root-dropdown";
import { useGitCurrentBranch } from "@/git-rpc/use-git-current-branch";
import { useGitHeadChangeRefetch } from "@/git-rpc/use-git-head-change-refetch";
import HomeLogoIcon from "@/icons/homepage-logo.svg";
import {
  DEFAULT_HOST_ID,
  useHostConfig,
} from "@/shared-objects/use-host-config";
import { ThreadLayout } from "@/thread-layout/thread-layout";
import { useFetchFromVSCode } from "@/vscode-api";

import { useHotkeyWindowDetailLayout } from "./use-hotkey-window-detail-layout";

export function HotkeyWindowNewThreadPage(): React.ReactElement {
  const localHostConfig = useHostConfig(DEFAULT_HOST_ID);
  const { data: activeWorkspaceRoots } = useFetchFromVSCode(
    "active-workspace-roots",
  );
  const activeWorkspaceRoot = activeWorkspaceRoots?.roots[0] ?? null;
  const { data: currentBranch, refetch: refetchCurrentBranch } =
    useGitCurrentBranch(activeWorkspaceRoot, localHostConfig);
  useGitHeadChangeRefetch(
    activeWorkspaceRoot,
    localHostConfig,
    refetchCurrentBranch,
  );

  useHotkeyWindowDetailLayout({
    title: (
      <span className="max-w-full truncate">
        <FormattedMessage
          id="threadPage.newThread"
          defaultMessage="New thread"
          description="Header title for the home page"
        />
      </span>
    ),
    mainWindowPath: "/",
    canCollapseToHome: false,
  });

  return (
    <ThreadLayout
      className="h-full [--padding-panel:calc(var(--padding-panel-base)/2)]"
      footer={
        <Composer
          footerBranchName={currentBranch ?? null}
          showWorkspaceDropdownInFooter={false}
        />
      }
    >
      <div className="flex h-full items-center justify-center px-panel">
        <div className="flex flex-col items-center gap-3 text-center">
          <div aria-hidden="true">
            <HomeLogoIcon className="h-12 w-12 text-token-foreground/20" />
          </div>
          <div className="flex flex-col items-center gap-1">
            <div className="heading-xl mt-2 font-normal text-token-foreground select-none">
              <FormattedMessage
                id="home.hero.letsBuild"
                defaultMessage="Let’s build"
                description="Label above the workspace name on the electron home page"
              />
            </div>
            <LocalActiveWorkspaceRootDropdown variant="hero" />
          </div>
        </div>
      </div>
    </ThreadLayout>
  );
}
