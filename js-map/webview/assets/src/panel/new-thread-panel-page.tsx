import { createConversationId } from "protocol";
import type { ReactElement } from "react";
import { Navigate } from "react-router";

import { HomeLayout } from "@/components/home-layout";
import { HomeRouteScopeProviders } from "@/components/home-route-scope-providers";
import { Composer } from "@/composer/composer";
import { HomeAnnouncements } from "@/home-announcements";
import { useWebviewExecutionTarget } from "@/hooks/use-webview-execution-target";
import { useWindowType } from "@/hooks/use-window-type";
import { createThreadRouteScopeValue } from "@/scopes/thread-route-scope";
import { NuxGate } from "@/sign-in/nux-gate";
import { useFetchFromVSCode } from "@/vscode-api";

export function NewThreadPanelPage(): ReactElement {
  const homeExecutionTarget = useWebviewExecutionTarget();
  const windowType = useWindowType();
  const { data: codexHome } = useFetchFromVSCode("codex-home", {
    select: (data) => data.codexHome,
  });

  if (windowType !== "extension") {
    return <Navigate to="/" replace />;
  }

  return (
    <NuxGate>
      <HomeRouteScopeProviders
        threadId={createConversationId("panel-new-conversation")}
        threadRoute={createThreadRouteScopeValue({
          codexHome: codexHome ?? null,
          cwd: homeExecutionTarget.cwd,
          hostConfig: homeExecutionTarget.hostConfig,
          hostId: homeExecutionTarget.hostId,
        })}
      >
        <HomeLayout
          body={<div className="flex-1" />}
          footer={
            <>
              <div className="home-banners mt-2 flex flex-col gap-2">
                <HomeAnnouncements />
              </div>
              <Composer className="electron:hidden" footerBranchName={null} />
            </>
          }
        />
      </HomeRouteScopeProviders>
    </NuxGate>
  );
}
