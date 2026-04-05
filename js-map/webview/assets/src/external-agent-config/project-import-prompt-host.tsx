import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type * as AppServer from "app-server-types";
import { useAtom } from "jotai";
import { useScope } from "maitai";
import { useEffect } from "react";
import { FormattedMessage, useIntl } from "react-intl";

import { useDefaultAppServerManager } from "@/app-server/app-server-manager-hooks";
import {
  detectExternalAgentConfig,
  importExternalAgentConfig,
} from "@/app-server/requests/external-agent-config";
import { toast$ } from "@/components/toaster/toast-signal";
import { AppScope } from "@/scopes/app-scope";

import { ExternalAgentConfigImportDialog } from "./external-agent-config-import-dialog";
import { sortExternalAgentConfigItems } from "./external-agent-config-utils";
import { aPendingProjectImportRoot } from "./project-import-prompt-atom";

export function ProjectImportPromptHost(): React.ReactElement | null {
  const appServerManager = useDefaultAppServerManager();
  const intl = useIntl();
  const scope = useScope(AppScope);
  const queryClient = useQueryClient();
  const [pendingRoot, setPendingRoot] = useAtom(aPendingProjectImportRoot);
  const {
    data: items = [],
    isError,
    isLoading,
    isSuccess,
  } = useQuery({
    queryKey: ["external-agent-config", "detect", "project", pendingRoot],
    staleTime: 0,
    enabled: pendingRoot != null,
    queryFn: async () => {
      if (pendingRoot == null) {
        return [];
      }
      const response = await detectExternalAgentConfig(appServerManager, {
        includeHome: false,
        cwds: [pendingRoot],
      });
      return sortExternalAgentConfigItems(
        response.items.filter(
          (item) => item.cwd != null && item.itemType !== "MCP_SERVER_CONFIG",
        ),
      );
    },
  });
  const importProjectMigration = useMutation({
    mutationFn: (
      migrationItems: Array<AppServer.v2.ExternalAgentConfigMigrationItem>,
    ) => importExternalAgentConfig(appServerManager, { migrationItems }),
    onSuccess: () => {
      queryClient.removeQueries({
        queryKey: ["external-agent-config", "detect", "project", pendingRoot],
        exact: true,
      });
      scope.get(toast$).success(
        intl.formatMessage({
          id: "externalAgentConfig.projectImport.success",
          defaultMessage: "Imported project settings",
          description:
            "Toast shown after importing repo-scoped external agent config items",
        }),
      );
      setPendingRoot(null);
    },
    onError: () => {
      scope.get(toast$).danger(
        intl.formatMessage({
          id: "externalAgentConfig.projectImport.error",
          defaultMessage: "Unable to import project settings",
          description:
            "Toast shown when importing repo-scoped external agent config items fails",
        }),
      );
    },
  });
  const isOpen = pendingRoot != null && items.length > 0;

  useEffect(() => {
    if (pendingRoot == null) {
      return;
    }
    if (isError) {
      setPendingRoot(null);
      return;
    }
    if (isSuccess && items.length === 0) {
      setPendingRoot(null);
    }
  }, [isError, isSuccess, items.length, pendingRoot, setPendingRoot]);

  if (pendingRoot == null) {
    return null;
  }

  return (
    <ExternalAgentConfigImportDialog
      open={isOpen}
      onOpenChange={(open) => {
        if (open) {
          return;
        }
        setPendingRoot(null);
      }}
      items={items}
      isPending={isLoading || importProjectMigration.isPending}
      title={
        <FormattedMessage
          id="externalAgentConfig.projectImport.title"
          defaultMessage="Import project settings"
          description="Dialog title for repo-scoped external agent config import"
        />
      }
      subtitle={
        <FormattedMessage
          id="externalAgentConfig.projectImport.subtitle"
          defaultMessage="We found settings from another agent that you can add to this project."
          description="Dialog subtitle for repo-scoped external agent config import"
        />
      }
      cancelLabel={
        <FormattedMessage
          id="externalAgentConfig.projectImport.cancel"
          defaultMessage="Not now"
          description="Cancel button label for repo-scoped external agent config import dialog"
        />
      }
      confirmLabel={
        <FormattedMessage
          id="externalAgentConfig.projectImport.confirm"
          defaultMessage="Import selected"
          description="Confirm button label for repo-scoped external agent config import dialog"
        />
      }
      onConfirm={async (migrationItems) => {
        await importProjectMigration.mutateAsync(migrationItems);
      }}
      onCancel={() => {
        setPendingRoot(null);
      }}
    />
  );
}
