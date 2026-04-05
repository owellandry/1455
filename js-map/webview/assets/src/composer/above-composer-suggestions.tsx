import type * as AppServer from "app-server-types";
import clsx from "clsx";
import { atom, useAtom } from "jotai";
import type { ConversationId } from "protocol";
import type React from "react";
import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useIntl } from "react-intl";

import { Button } from "@/components/button";
import { ConnectorLogo } from "@/components/connector-logo";
import { aDismissedAboveComposerSuggestionIdsByScope } from "@/composer/composer-atoms";
import MpcIcon from "@/icons/mcp.svg";
import XIcon from "@/icons/x.svg";
import { getPluginDisplayName } from "@/plugins/get-plugin-display-name";
import { PluginInstallModal } from "@/plugins/plugin-install-modal";
import { useUpdatePluginEnabled } from "@/plugins/plugins-availability";
import { usePluginInstallFlow } from "@/plugins/use-plugin-install-flow";
import { usePlugins } from "@/plugins/use-plugins";
import { useAppsListWithResolvedConnectorLogos } from "@/queries/apps-queries";

import { selectFirstAboveComposerSuggestion } from "./above-composer-suggestion-producers";
import type {
  AboveComposerSuggestion,
  AboveComposerSuggestionMatchContext,
} from "./above-composer-suggestions-types";
import { hasRecommendedPluginKeywordSuggestionMatch } from "./above-composer-suggestions-utils";
import {
  useComposerController,
  useComposerControllerState,
} from "./prosemirror/use-composer-controller";

const NEW_THREAD_SUGGESTION_SCOPE = "__new-thread__";

export function AboveComposerSuggestions({
  portalTarget,
  conversationId,
  collaborationModes,
  activeCollaborationMode,
  setSelectedCollaborationMode,
}: {
  portalTarget: HTMLElement | null;
  conversationId: ConversationId | null;
  collaborationModes: Array<AppServer.CollaborationMode>;
  activeCollaborationMode: AppServer.CollaborationMode | null;
  setSelectedCollaborationMode: (mode: AppServer.ModeKind | null) => void;
}): React.ReactElement | null {
  if (portalTarget == null) {
    return null;
  }

  return (
    <AboveComposerFirstSuggestion
      portalTarget={portalTarget}
      conversationId={conversationId}
      activeCollaborationMode={activeCollaborationMode}
      collaborationModes={collaborationModes}
      setSelectedCollaborationMode={setSelectedCollaborationMode}
    />
  );
}

function AboveComposerFirstSuggestion({
  portalTarget,
  conversationId,
  activeCollaborationMode,
  collaborationModes,
  setSelectedCollaborationMode,
}: {
  portalTarget: HTMLElement;
  conversationId: ConversationId | null;
  activeCollaborationMode: AppServer.CollaborationMode | null;
  collaborationModes: Array<AppServer.CollaborationMode>;
  setSelectedCollaborationMode: (mode: AppServer.ModeKind | null) => void;
}): React.ReactElement | null {
  const intl = useIntl();
  const composerController = useComposerController();
  const composerText = useComposerControllerState(
    composerController,
    (controller) => controller.view.state.doc.textContent,
  );
  const { forceReload: forceReloadPlugins, plugins } = usePlugins(undefined, {
    enabled: true,
  });
  const shouldEnablePluginKeywordSuggestion =
    hasRecommendedPluginKeywordSuggestionMatch({
      composerText,
      plugins,
    });
  const { data: apps = [], hardRefetchAppsList } =
    useAppsListWithResolvedConnectorLogos();
  const { pendingPluginId, setPluginEnabled } = useUpdatePluginEnabled();
  const {
    closePluginInstall,
    connectRequiredApp,
    installPlugin,
    isInstalling: isInstallingPlugin,
    openPluginInstall,
    session: pluginInstallSession,
  } = usePluginInstallFlow({
    apps,
    forceReloadPlugins,
    hardRefetchAppsList,
  });
  const dismissalScope = getAboveComposerSuggestionScopeKey(conversationId);
  const dismissedSuggestionIdsForScopeAtom = useMemo(() => {
    return atom(
      (get) =>
        get(aDismissedAboveComposerSuggestionIdsByScope)[dismissalScope] ?? [],
      (
        _get,
        set,
        value: Array<string> | ((prev: Array<string>) => Array<string>),
      ) => {
        set(aDismissedAboveComposerSuggestionIdsByScope, (prev) => {
          const currentIds = prev[dismissalScope] ?? [];
          const nextIds =
            typeof value === "function" ? value(currentIds) : value;
          if (nextIds === currentIds) {
            return prev;
          }
          return {
            ...prev,
            [dismissalScope]: nextIds,
          };
        });
      },
    );
  }, [dismissalScope]);
  const [dismissedSuggestionIds, setDismissedSuggestionIdsForScope] = useAtom(
    dismissedSuggestionIdsForScopeAtom,
  );
  const dismissedSuggestionIdSet = new Set(dismissedSuggestionIds);
  const installingPluginId =
    isInstallingPlugin && pluginInstallSession.kind !== "closed"
      ? pluginInstallSession.plugin.plugin.id
      : null;
  const pluginKeywordSuggestionState = {
    isReady: shouldEnablePluginKeywordSuggestion,
    plugins,
    pendingPluginId: pendingPluginId ?? installingPluginId,
    openPluginInstall,
    enablePlugin: async (plugin): Promise<void> => {
      await setPluginEnabled({
        pluginDisplayName: getPluginDisplayName(plugin),
        pluginId: plugin.plugin.id,
        enabled: true,
      });
    },
  } satisfies AboveComposerSuggestionMatchContext["pluginKeywordSuggestionState"];

  const suggestion = selectFirstAboveComposerSuggestion({
    intl,
    composerText,
    collaborationModes,
    activeCollaborationMode,
    pluginKeywordSuggestionState,
    dismissedSuggestionIds: dismissedSuggestionIdSet,
    setSelectedCollaborationMode,
    setDismissedSuggestionIds: setDismissedSuggestionIdsForScope,
  });

  return (
    <>
      {suggestion
        ? createPortal(
            <div className="pointer-events-auto flex w-full max-w-full justify-center">
              <AboveComposerSuggestionCard
                key={suggestion.id}
                suggestion={suggestion}
              />
            </div>,
            portalTarget,
          )
        : null}
      <PluginInstallModal
        session={pluginInstallSession}
        isInstalling={isInstallingPlugin}
        onOpenChange={(nextOpen): void => {
          if (nextOpen) {
            return;
          }
          closePluginInstall();
        }}
        onInstall={async (appPersonalizationModes): Promise<void> => {
          await installPlugin(appPersonalizationModes);
        }}
        onConnectRequiredApp={async (appId): Promise<void> => {
          await connectRequiredApp(appId);
        }}
      />
    </>
  );
}

function getAboveComposerSuggestionScopeKey(
  conversationId: ConversationId | null,
): string {
  if (conversationId == null) {
    return NEW_THREAD_SUGGESTION_SCOPE;
  }
  return `${conversationId}`;
}

function AboveComposerSuggestionCard({
  suggestion,
}: {
  suggestion: AboveComposerSuggestion;
}): React.ReactElement {
  const intl = useIntl();
  const [isActionPending, setIsActionPending] = useState(false);
  const Icon = suggestion.icon;
  const isActionDisabled =
    suggestion.actionDisabled === true || isActionPending;
  const shouldDismissOnAction = suggestion.dismissOnAction !== false;

  return (
    <div
      className="relative inline-flex max-w-full min-w-0 items-center justify-between gap-4 overflow-hidden rounded-3xl border border-token-border/80 bg-token-input-background/70 py-1.5 pr-2 pl-3 text-token-foreground shadow-md backdrop-blur-sm"
      data-codex-above-composer-suggestion={suggestion.id}
    >
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <div className="flex items-center justify-center text-token-foreground">
          {suggestion.logoUrl ? (
            <span className="flex size-4 shrink-0 items-center justify-center overflow-hidden rounded-xs">
              <ConnectorLogo
                alt={suggestion.logoAlt ?? ""}
                className="size-full object-contain"
                logoUrl={suggestion.logoUrl}
                fallback={<MpcIcon className="icon-xs shrink-0" />}
              />
            </span>
          ) : Icon ? (
            <Icon
              className={clsx("icon-xs shrink-0", suggestion.iconClassName)}
            />
          ) : null}
        </div>
        <span className="truncate text-sm leading-[18px] font-medium text-token-foreground">
          {suggestion.title}
        </span>
        {suggestion.meta ? (
          <span className="hidden text-sm leading-none text-token-description-foreground @[500px]:inline">
            {suggestion.meta}
          </span>
        ) : null}
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <Button
          className="px-2.5"
          color="secondary"
          size="default"
          disabled={isActionDisabled}
          loading={isActionPending}
          onClick={(event) => {
            event.stopPropagation();
            if (isActionDisabled) {
              return;
            }

            try {
              const result = suggestion.onAction();
              if (result && typeof result.then === "function") {
                setIsActionPending(true);
                void result
                  .then(() => {
                    if (shouldDismissOnAction) {
                      suggestion.onDismiss();
                    }
                  })
                  .catch(() => {
                    // Action handlers own error reporting and can keep the card visible.
                  })
                  .finally(() => {
                    setIsActionPending(false);
                  });
                return;
              }
            } catch {
              return;
            }

            if (shouldDismissOnAction) {
              suggestion.onDismiss();
            }
          }}
        >
          {suggestion.actionLabel}
        </Button>
        <Button
          color="ghost"
          size="icon"
          aria-label={intl.formatMessage({
            id: "composer.aboveSuggestion.dismiss",
            defaultMessage: "Dismiss suggestion",
            description:
              "Aria label for dismissing an above-composer suggestion",
          })}
          onClick={(event) => {
            event.stopPropagation();
            suggestion.onDismiss();
          }}
        >
          <XIcon className="icon-xs" />
        </Button>
      </div>
    </div>
  );
}
