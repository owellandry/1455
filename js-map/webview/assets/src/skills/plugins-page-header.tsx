import type { ReactElement } from "react";
import { FormattedMessage, useIntl } from "react-intl";

import { AppHeader } from "@/components/app/app-header";
import { Button } from "@/components/button";
import { BasicDropdown, Dropdown } from "@/components/dropdown";
import { MoreMenuTrigger } from "@/components/more-menu-trigger";
import { SegmentedToggle } from "@/components/segmented-toggle";
import { Spinner } from "@/components/spinner";
import AppsIcon from "@/icons/apps.svg";
import ChevronRightIcon from "@/icons/chevron-right.svg";
import ChevronDownIcon from "@/icons/chevron.svg";
import RegenerateIcon from "@/icons/regenerate.svg";
import SettingsCogIcon from "@/icons/settings.cog.svg";
import SkillsIcon from "@/icons/skills.svg";

export function PluginsPageHeader(
  props:
    | {
        mode: "browse";
        canCreatePlugin: boolean;
        canCreateSkill: boolean;
        currentBrowseTab: "plugins" | "skills";
        isRefreshDisabled: boolean;
        isRefreshingPage: boolean;
        isManageButtonVisible: boolean;
        needsSkillsRefresh: boolean;
        onBrowseTabSelect: (tab: "plugins" | "skills") => void;
        onCreatePlugin: () => void;
        onCreateSkill: () => void;
        onManage: () => void;
        onRefreshPage: () => void;
      }
    | {
        mode: "manage";
        canCreatePlugin: boolean;
        canCreateSkill: boolean;
        isRefreshDisabled: boolean;
        onCreatePlugin: () => void;
        onCreateSkill: () => void;
        onExitManageMode: () => void;
        onRefreshPage: () => void;
      },
): ReactElement {
  const intl = useIntl();

  if (props.mode === "manage") {
    return (
      <AppHeader hideDivider>
        <div className="draggable flex w-full min-w-0 items-center justify-between gap-2 electron:h-toolbar browser:h-toolbar extension:py-row-y">
          <div className="-ml-2 min-w-0 text-base">
            <div className="flex min-w-0 items-center gap-1 text-token-description-foreground">
              <Button
                color="ghost"
                size="toolbar"
                onClick={props.onExitManageMode}
              >
                <FormattedMessage
                  id="skills.appsPage.breadcrumb.root"
                  defaultMessage="Plugins"
                  description="Breadcrumb root label for the manage mode header on the Skills & Apps page"
                />
              </Button>
              <ChevronRightIcon className="icon-xs shrink-0" />
              <Button
                color="ghost"
                size="toolbar"
                className="pointer-events-none min-w-0 bg-transparent text-token-foreground hover:bg-transparent"
              >
                <span className="min-w-0 truncate text-token-foreground">
                  <FormattedMessage
                    id="skills.appsPage.breadcrumb.manage"
                    defaultMessage="Manage"
                    description="Breadcrumb label for manage mode on the Skills & Apps page"
                  />
                </span>
              </Button>
            </div>
          </div>
          <div className="-mr-2 flex min-w-0 items-center gap-2">
            <BasicDropdown
              align="end"
              contentWidth="icon"
              triggerButton={
                <Button
                  color="primary"
                  size="toolbar"
                  className="hidden md:inline-flex"
                >
                  <FormattedMessage
                    id="skills.appsPage.create"
                    defaultMessage="Create"
                    description="Button label for the create actions dropdown on the Skills & Apps page"
                  />
                  <ChevronDownIcon className="icon-2xs opacity-60" />
                </Button>
              }
            >
              <Dropdown.Item
                LeftIcon={AppsIcon}
                disabled={!props.canCreatePlugin}
                onSelect={props.onCreatePlugin}
              >
                <FormattedMessage
                  id="skills.appsPage.createPlugin"
                  defaultMessage="Create plugin"
                  description="Dropdown item label for creating a new plugin on the Skills & Apps page"
                />
              </Dropdown.Item>
              <Dropdown.Item
                LeftIcon={SkillsIcon}
                disabled={!props.canCreateSkill}
                onSelect={props.onCreateSkill}
              >
                <FormattedMessage
                  id="skills.appsPage.createSkill"
                  defaultMessage="Create skill"
                  description="Dropdown item label for creating a new skill on the Skills & Apps page"
                />
              </Dropdown.Item>
            </BasicDropdown>
            <BasicDropdown
              align="end"
              contentWidth="icon"
              triggerButton={
                <MoreMenuTrigger
                  label={intl.formatMessage({
                    id: "skills.appsPage.actionsMenu",
                    defaultMessage: "Page actions",
                    description:
                      "Aria label for the actions dropdown trigger in the Skills & Apps page header",
                  })}
                  className="hidden md:inline-flex"
                  iconClassName="icon-sm"
                />
              }
            >
              <Dropdown.Item
                LeftIcon={RegenerateIcon}
                leftIconClassName="icon-sm"
                disabled={props.isRefreshDisabled}
                onSelect={props.onRefreshPage}
              >
                <FormattedMessage
                  id="skills.page.refreshSkills"
                  defaultMessage="Refresh"
                  description="Button label for reloading skills list"
                />
              </Dropdown.Item>
            </BasicDropdown>
          </div>
        </div>
      </AppHeader>
    );
  }

  return (
    <AppHeader hideDivider>
      <div className="draggable flex w-full min-w-0 items-center justify-between gap-2 electron:h-toolbar browser:h-toolbar extension:py-row-y">
        <div className="-ml-2 flex min-w-0 items-center gap-2">
          <SegmentedToggle<"plugins" | "skills">
            ariaLabel={intl.formatMessage({
              id: "skills.appsPage.browseTabs.ariaLabel",
              defaultMessage: "Choose whether to browse plugins or skills",
              description:
                "Accessible label for the plugins and skills segmented control on the Skills & Apps page",
            })}
            options={[
              {
                id: "plugins",
                label: intl.formatMessage({
                  id: "skills.appsPage.browseTabs.plugins",
                  defaultMessage: "Plugins",
                  description:
                    "Label for the Plugins option in the browse segmented control on the Skills & Apps page",
                }),
              },
              {
                id: "skills",
                label: intl.formatMessage({
                  id: "skills.appsPage.skillsFilter.all",
                  defaultMessage: "Skills",
                  description:
                    "Label for the Skills option in the browse segmented control on the Skills & Apps page",
                }),
              },
            ]}
            selectedId={props.currentBrowseTab}
            onSelect={props.onBrowseTabSelect}
            size="toolbar"
          />
        </div>
        <div className="-mr-2 flex min-w-0 items-center gap-2">
          {props.needsSkillsRefresh ? (
            <Button
              color="ghost"
              size="toolbar"
              className="hidden shrink-0 md:inline-flex"
              disabled={props.isRefreshDisabled}
              onClick={props.onRefreshPage}
            >
              {props.isRefreshingPage ? (
                <Spinner className="icon-xs text-token-text-link-foreground" />
              ) : (
                <span className="icon-xs relative scale-50">
                  <span
                    className="absolute inset-0 rounded-full"
                    style={{
                      backgroundColor: "var(--vscode-textLink-foreground)",
                    }}
                  />
                </span>
              )}
              <FormattedMessage
                id="skills.page.refreshSkillsToUseNew"
                defaultMessage="Refresh to use new skill(s)"
                description="Button label shown when newly installed skills require a refresh before they can be used in the composer"
              />
            </Button>
          ) : null}
          {props.isManageButtonVisible ? (
            <Button
              color="secondary"
              size="toolbar"
              className="hidden md:inline-flex"
              onClick={props.onManage}
            >
              <SettingsCogIcon className="icon-sm" />
              <FormattedMessage
                id="skills.appsPage.managePlugins"
                defaultMessage="Manage"
                description="Button label for managing plugins from the Skills & Apps page header"
              />
            </Button>
          ) : null}
          <BasicDropdown
            align="end"
            contentWidth="icon"
            triggerButton={
              <Button
                color="primary"
                size="toolbar"
                className="hidden md:inline-flex"
              >
                <FormattedMessage
                  id="skills.appsPage.create"
                  defaultMessage="Create"
                  description="Button label for the create actions dropdown on the Skills & Apps page"
                />
                <ChevronDownIcon className="icon-2xs opacity-60" />
              </Button>
            }
          >
            <Dropdown.Item
              LeftIcon={AppsIcon}
              disabled={!props.canCreatePlugin}
              onSelect={props.onCreatePlugin}
            >
              <FormattedMessage
                id="skills.appsPage.createPlugin"
                defaultMessage="Create plugin"
                description="Dropdown item label for creating a new plugin on the Skills & Apps page"
              />
            </Dropdown.Item>
            <Dropdown.Item
              LeftIcon={SkillsIcon}
              disabled={!props.canCreateSkill}
              onSelect={props.onCreateSkill}
            >
              <FormattedMessage
                id="skills.appsPage.createSkill"
                defaultMessage="Create skill"
                description="Dropdown item label for creating a new skill on the Skills & Apps page"
              />
            </Dropdown.Item>
          </BasicDropdown>
          <BasicDropdown
            align="end"
            contentWidth="icon"
            triggerButton={
              <MoreMenuTrigger
                label={intl.formatMessage({
                  id: "skills.appsPage.actionsMenu",
                  defaultMessage: "Page actions",
                  description:
                    "Aria label for the actions dropdown trigger in the Skills & Apps page header",
                })}
                className="hidden md:inline-flex"
                iconClassName="icon-sm"
              />
            }
          >
            <Dropdown.Item
              LeftIcon={RegenerateIcon}
              leftIconClassName="icon-sm"
              disabled={props.isRefreshDisabled}
              onSelect={props.onRefreshPage}
            >
              <FormattedMessage
                id="skills.page.refreshSkills"
                defaultMessage="Refresh"
                description="Button label for reloading skills list"
              />
            </Dropdown.Item>
          </BasicDropdown>
        </div>
      </div>
    </AppHeader>
  );
}
