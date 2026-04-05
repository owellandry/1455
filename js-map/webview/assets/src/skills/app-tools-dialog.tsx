import type * as AppServer from "app-server-types";
import type { ReactElement } from "react";
import { useRef, useState } from "react";
import { defineMessages, FormattedMessage, useIntl } from "react-intl";

import { getManageAppUrl } from "@/apps/app-connect-actions";
import type { AppToolDetails } from "@/apps/app-tools";
import { Badge } from "@/components/badge";
import { Button } from "@/components/button";
import { BasicDropdown, Dropdown } from "@/components/dropdown";
import { Markdown } from "@/components/markdown";
import { MoreMenuTrigger } from "@/components/more-menu-trigger";
import { Toggle } from "@/components/toggle";
import { Tooltip } from "@/components/tooltip";
import ChatsIcon from "@/icons/chats.svg";
import ChevronDownIcon from "@/icons/chevron.svg";
import ConnectedAppsIcon from "@/icons/connected-apps.svg";
import {
  SkillPreviewModal,
  SkillPreviewModalContent,
  SkillPreviewModalTitle,
} from "@/skills/skill-preview-modal";

const messages = defineMessages({
  disableApp: {
    id: "skills.appsPage.toolsDialog.disableApp",
    defaultMessage: "Disable app",
    description: "Tooltip label for disabling an app from the app tools modal",
  },
  enableApp: {
    id: "skills.appsPage.toolsDialog.enableApp",
    defaultMessage: "Enable app",
    description: "Tooltip label for enabling an app from the app tools modal",
  },
  moreActions: {
    id: "skills.appsPage.toolsDialog.moreActions",
    defaultMessage: "More actions",
    description: "Aria label for the more actions menu in the app tools modal",
  },
  open: {
    id: "skills.appsPage.toolsDialog.open",
    defaultMessage: "Manage on ChatGPT",
    description:
      "Menu item label to open app management from the app tools modal",
  },
  tryInChat: {
    id: "skills.appsPage.toolsDialog.tryInChat",
    defaultMessage: "Try in chat",
    description: "Footer action label to start a chat with the selected app",
  },
  tryInChatDisabled: {
    id: "skills.appsPage.toolsDialog.tryInChatDisabled",
    defaultMessage: "Enable and connect this app to try it in chat",
    description:
      "Tooltip shown when the selected app cannot be used in chat yet",
  },
  disabledBadge: {
    id: "skills.appsPage.toolsDialog.disabledBadge",
    defaultMessage: "Disabled",
    description:
      "Badge shown when the selected app is disabled in the app tools modal",
  },
  subtitle: {
    id: "skills.appsPage.toolsDialog.subtitle",
    defaultMessage: "Available tools for this app",
    description:
      "Fallback subtitle in the app tools dialog when the app has no description",
  },
});

export function AppToolsDialog({
  app,
  errorMessage,
  isLoading,
  onOpenChange,
  onOpenAppUrl,
  onSetAppEnabled,
  showEnableToggle = true,
  onTryInChat,
  tools,
  updatingAppId,
}: {
  app: AppServer.v2.AppInfo | null;
  errorMessage: string | null;
  isLoading: boolean;
  onOpenChange: (nextOpen: boolean) => void;
  onOpenAppUrl: (url: string | null) => void;
  onSetAppEnabled: (params: {
    appId: string;
    enabled: boolean;
  }) => Promise<void>;
  showEnableToggle?: boolean;
  onTryInChat: (app: AppServer.v2.AppInfo) => void;
  tools: Array<AppToolDetails>;
  updatingAppId: string | null;
}): ReactElement {
  const intl = useIntl();
  const [isToggleTooltipOpen, setIsToggleTooltipOpen] = useState(false);
  const toolSections = getToolSections(tools);
  const manageUrl = app == null ? null : getManageAppUrl(app);
  const isUpdatingAppEnablement = app != null && updatingAppId === app.id;
  const canTryInChat = app?.isAccessible === true && app.isEnabled === true;
  const toggleMessage = app?.isEnabled
    ? messages.disableApp
    : messages.enableApp;
  const subtitle = app?.description ?? intl.formatMessage(messages.subtitle);
  const titleLabel = (
    <SkillPreviewModalTitle
      kind="App"
      title={app?.name ?? ""}
      badge={
        app != null && app.isAccessible && !app.isEnabled ? (
          <Badge className="border border-token-border-default bg-transparent px-1.5 py-0.5 text-xs font-medium text-token-text-secondary">
            <FormattedMessage {...messages.disabledBadge} />
          </Badge>
        ) : null
      }
    />
  );
  const title = (
    <div className="flex w-full items-center justify-between gap-2">
      <div className="min-w-0 flex-1">{titleLabel}</div>
      {app != null ? (
        <div className="flex shrink-0 items-center gap-2">
          {showEnableToggle && app.isAccessible ? (
            <Tooltip
              open={isToggleTooltipOpen}
              tooltipContent={<FormattedMessage {...toggleMessage} />}
            >
              <div
                onPointerEnter={(): void => {
                  setIsToggleTooltipOpen(true);
                }}
                onPointerLeave={(): void => {
                  setIsToggleTooltipOpen(false);
                }}
              >
                <Toggle
                  checked={app.isEnabled}
                  disabled={isUpdatingAppEnablement}
                  ariaLabel={intl.formatMessage(toggleMessage)}
                  onChange={(next): void => {
                    void onSetAppEnabled({
                      appId: app.id,
                      enabled: next,
                    });
                  }}
                />
              </div>
            </Tooltip>
          ) : null}
          <BasicDropdown
            align="end"
            contentWidth="icon"
            triggerButton={
              <MoreMenuTrigger
                label={intl.formatMessage(messages.moreActions)}
                size="toolbar"
              />
            }
          >
            <Dropdown.Item
              disabled={manageUrl == null}
              onSelect={() => {
                onOpenAppUrl(manageUrl);
              }}
            >
              <FormattedMessage {...messages.open} />
            </Dropdown.Item>
          </BasicDropdown>
        </div>
      ) : null}
    </div>
  );

  return (
    <SkillPreviewModal
      icon={app == null ? null : <ConnectedAppsIcon className="icon-sm" />}
      title={title}
      titleText={app?.name}
      description={subtitle}
      isOpen={app != null}
      onOpenChange={onOpenChange}
      footer={
        app == null ? null : (
          <div className="flex w-full items-center justify-end gap-2">
            <Tooltip
              tooltipContent={
                canTryInChat ? null : (
                  <FormattedMessage {...messages.tryInChatDisabled} />
                )
              }
            >
              <div>
                <Button
                  color="primary"
                  size="toolbar"
                  disabled={!canTryInChat}
                  onClick={() => {
                    if (!canTryInChat) {
                      return;
                    }
                    onTryInChat(app);
                  }}
                >
                  <ChatsIcon className="icon-xs" />
                  <FormattedMessage {...messages.tryInChat} />
                </Button>
              </div>
            </Tooltip>
          </div>
        )
      }
    >
      {app != null ? (
        <div className="text-base text-token-text-secondary">
          <FormattedMessage
            id="skills.appsPage.toolsDialog.summary"
            defaultMessage="The {appName} app contains {totalActions} actions ({actionTypes})"
            description="Summary shown above the app action sections in the app tools dialog"
            values={{
              appName: app.name,
              totalActions: tools.length,
              actionTypes: toolSections
                .map((section) => {
                  return `${section.tools.length} ${section.title.toLowerCase()}`;
                })
                .join(", "),
            }}
          />
        </div>
      ) : null}
      <SkillPreviewModalContent surfaceClassName="bg-transparent">
        {isLoading ? (
          <div className="flex h-full min-h-32 items-center justify-center text-base text-token-text-secondary">
            <FormattedMessage
              id="skills.appsPage.toolsDialog.loading"
              defaultMessage="Loading tools…"
              description="Loading label in the app tools dialog"
            />
          </div>
        ) : errorMessage != null ? (
          <div className="flex h-full min-h-32 items-center justify-center text-base text-token-text-secondary">
            <div>
              <div>
                <FormattedMessage
                  id="skills.appsPage.toolsDialog.error"
                  defaultMessage="Unable to load tools for this app."
                  description="Error state shown when connector actions could not be loaded for the selected app"
                />
              </div>
              <div>{errorMessage}</div>
            </div>
          </div>
        ) : tools.length === 0 ? (
          <div className="flex h-full min-h-32 items-center justify-center text-base text-token-text-secondary">
            <FormattedMessage
              id="skills.appsPage.toolsDialog.empty"
              defaultMessage="No tools available for this app."
              description="Empty state when no tools are available for the selected app"
            />
          </div>
        ) : (
          <AppToolsSections toolSections={toolSections} />
        )}
      </SkillPreviewModalContent>
    </SkillPreviewModal>
  );
}

function AppToolsSections({
  toolSections,
}: {
  toolSections: Array<{
    title: string;
    tools: Array<AppToolDetails>;
  }>;
}): ReactElement {
  const [collapsedSections, setCollapsedSections] = useState<
    Record<string, boolean>
  >({});

  return (
    <div className="flex flex-col">
      {toolSections.map((section) => {
        const isCollapsed = collapsedSections[section.title] === true;

        return (
          <div
            key={section.title}
            className="border-b border-token-border-default/70 last:border-b-0"
          >
            <button
              type="button"
              className="sticky top-0 z-10 flex w-full items-center justify-between bg-token-bg-secondary p-2.5 text-left text-base text-token-foreground"
              aria-expanded={!isCollapsed}
              onClick={() => {
                setCollapsedSections((value) => ({
                  ...value,
                  [section.title]: !isCollapsed,
                }));
              }}
            >
              <span>
                {section.title}
                <span className="ml-2 text-token-input-placeholder-foreground">
                  {section.tools.length}
                </span>
              </span>
              <ChevronDownIcon
                className={
                  isCollapsed
                    ? "icon-xs shrink-0 -rotate-90 text-token-input-placeholder-foreground transition-transform"
                    : "icon-xs shrink-0 text-token-input-placeholder-foreground transition-transform"
                }
              />
            </button>
            {!isCollapsed ? (
              <div className="divide-y divide-token-border-default/70">
                {section.tools.map((tool) => (
                  <div
                    key={tool.name}
                    className="grid grid-cols-[minmax(0,220px)_minmax(0,1fr)] gap-x-3 p-2.5"
                  >
                    <div className="min-w-0 text-token-foreground">
                      <AppToolName name={tool.name} />
                    </div>
                    <div className="text-base text-token-text-secondary">
                      <Markdown className="text-base" cwd={null}>
                        {tool.description}
                      </Markdown>
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

function AppToolName({ name }: { name: string }): ReactElement {
  const nameRef = useRef<HTMLDivElement | null>(null);
  const [showTooltip, setShowTooltip] = useState(false);

  const updateTooltipVisibility = (): void => {
    const element = nameRef.current;
    setShowTooltip(
      element != null && element.scrollWidth > element.clientWidth,
    );
  };

  return (
    <Tooltip tooltipContent={name} disabled={!showTooltip}>
      <div
        ref={nameRef}
        className="truncate text-base"
        onPointerEnter={updateTooltipVisibility}
        onFocus={updateTooltipVisibility}
      >
        {name}
      </div>
    </Tooltip>
  );
}

function getToolSections(tools: Array<AppToolDetails>): Array<{
  title: string;
  tools: Array<AppToolDetails>;
}> {
  const readTools = tools.filter((tool) => tool.accessBadges.includes("READ"));
  return [
    {
      title: "Write",
      tools: tools.filter((tool) => !tool.accessBadges.includes("READ")),
    },
    {
      title: "Read",
      tools: readTools,
    },
  ].flatMap((section) => (section.tools.length === 0 ? [] : [section]));
}
