import clsx from "clsx";
import type { ConversationId, GitCwd } from "protocol";
import type React from "react";

import { getSkillMentionIcon } from "@/composer/mention-icons";
import { isAppMentionPath, isPluginMentionPath } from "@/composer/mention-item";
import { findPluginForMention } from "@/composer/plugin-mention-utils";
import { useIsPluginsEnabled } from "@/hooks/use-is-plugins-enabled";
import { useOsInfo } from "@/hooks/use-os-info";
import AppsIcon from "@/icons/apps.svg";
import { getAgentMentionColorCssValueForSessionId } from "@/local-conversation/items/multi-agent-mentions";
import { usePlugins } from "@/plugins/use-plugins";
import { useAppsListWithResolvedConnectorLogos } from "@/queries/apps-queries";
import { getSkillDescription } from "@/skills/get-skill-description";
import { getSkillIcon } from "@/skills/get-skill-icon";
import { getSkillDisplayName } from "@/skills/skill-utils";
import { useSkills } from "@/skills/use-skills";
import { copyToClipboard } from "@/utils/copy-to-clipboard";
import { normalizeFsPath } from "@/utils/path";
import { useMutationFromVSCode } from "@/vscode-api";

import { ContextMenu } from "../context-menu";
import { InlineChip } from "../inline-chip";
import { Tooltip } from "../tooltip";
import type { ParsedFileReference } from "./file-reference";
import {
  formatFileReferenceDisplayLabel,
  formatFileReferenceLabel,
} from "./file-reference";

export function FileLink({
  reference,
  className,
  children,
  label,
  tooltipText,
  cwd,
}: {
  reference: ParsedFileReference;
  className?: string;
  children?: React.ReactNode;
  label?: string;
  tooltipText?: string;
  cwd: GitCwd | null;
}): React.ReactElement {
  const { path, line, column } = reference;
  const displayLabel = label ?? formatFileReferenceDisplayLabel(reference);
  const formattedLabel = tooltipText ?? formatFileReferenceLabel(reference);
  return (
    <FileReferenceButton
      className={clsx(
        "text-token-text-link-foreground hover:underline",
        className,
      )}
      title={formattedLabel}
      path={path}
      line={line}
      column={column}
      cwd={cwd}
    >
      {children ?? displayLabel}
    </FileReferenceButton>
  );
}

export function SkillChip({
  label,
  href,
  tooltipText,
}: {
  label: string;
  href?: string;
  tooltipText?: string;
}): React.ReactElement {
  const { skills } = useSkills();
  const normalizedHref = href ? normalizeFsPath(href) : null;
  const knownSkill =
    (normalizedHref
      ? skills.find((skill) => normalizeFsPath(skill.path) === normalizedHref)
      : null) ?? skills.find((skill) => skill.name === label);
  const resolvedSkill =
    knownSkill ?? skills.find((skill) => getSkillDisplayName(skill) === label);
  if (resolvedSkill == null) {
    // oxlint-disable-next-line formatjs/no-literal-string-in-jsx
    return <>${label}</>;
  }
  const displayName = getSkillDisplayName(resolvedSkill);
  const chip = (
    <InlineChip
      className={clsx("cursor-interaction")}
      text={displayName}
      icon={getSkillMentionIcon()}
      tooltipText={getSkillDescription(resolvedSkill) ?? tooltipText}
      interactive
      colorVariant="success"
    />
  );
  if (href == null) {
    return chip;
  }
  return (
    <FileReferenceButton title={tooltipText ?? href} path={href} cwd={null}>
      {chip}
    </FileReferenceButton>
  );
}

export function AppChip({
  label,
  href,
  tooltipText,
}: {
  label: string;
  href?: string;
  tooltipText?: string;
}): React.ReactElement {
  const { data: apps = [] } = useAppsListWithResolvedConnectorLogos();
  const appId =
    href && isAppMentionPath(href) ? href.slice("app://".length) : "";
  const resolvedApp =
    (appId.length > 0 ? apps.find((app) => app.id === appId) : undefined) ??
    apps.find((app) => app.name === label);
  if (resolvedApp == null) {
    // oxlint-disable-next-line formatjs/no-literal-string-in-jsx
    return <>${label}</>;
  }
  return (
    <ResolvedMentionChip
      displayName={resolvedApp.name}
      description={resolvedApp.description ?? undefined}
      iconSmall={resolvedApp.logoUrl ?? resolvedApp.logoUrlDark ?? ""}
      fallbackName={resolvedApp.id}
      href={href}
      tooltipText={tooltipText}
    />
  );
}

export function PluginChip({
  label,
  href,
  tooltipText,
}: {
  label: string;
  href?: string;
  tooltipText?: string;
}): React.ReactElement {
  const isPluginsEnabled = useIsPluginsEnabled();
  const { plugins } = usePlugins();
  if (!isPluginsEnabled) {
    // oxlint-disable-next-line formatjs/no-literal-string-in-jsx
    return <>@{label}</>;
  }
  const pluginPath = href && isPluginMentionPath(href) ? href : "";
  const resolvedPlugin = findPluginForMention({
    label,
    path: pluginPath,
    plugins,
  });
  if (resolvedPlugin == null) {
    // oxlint-disable-next-line formatjs/no-literal-string-in-jsx
    return <>@{label}</>;
  }
  return (
    <ResolvedMentionChip
      displayName={resolvedPlugin.displayName ?? resolvedPlugin.plugin.name}
      description={resolvedPlugin.description ?? undefined}
      fallbackIcon={AppsIcon}
      iconSmall={resolvedPlugin.logoPath ?? ""}
      fallbackName={resolvedPlugin.plugin.id}
      href={href}
      tooltipText={tooltipText}
    />
  );
}

export function AgentChip({
  conversationId,
  label,
  tooltipText,
}: {
  conversationId?: ConversationId;
  label: string;
  tooltipText?: string;
}): React.ReactElement {
  const mentionColor =
    conversationId == null
      ? null
      : getAgentMentionColorCssValueForSessionId(conversationId);
  return (
    <InlineChip
      className="cursor-default"
      text={label.startsWith("@") ? label : `@${label}`}
      tooltipText={tooltipText}
      interactive
      colorVariant={mentionColor == null ? "link" : undefined}
      style={
        mentionColor == null
          ? undefined
          : {
              color: mentionColor,
              backgroundColor: `color-mix(in srgb, ${mentionColor} 16%, transparent)`,
            }
      }
    />
  );
}

function FileReferenceButton({
  className,
  title,
  children,
  path,
  line,
  column,
  cwd,
}: {
  className?: string;
  title?: string;
  children: React.ReactNode;
  path: string;
  line?: number;
  column?: number;
  cwd: GitCwd | null;
}): React.ReactElement {
  const openFile = useMutationFromVSCode("open-file");
  const osInfo = useOsInfo();
  const handleActivate = (): void => {
    const resolvedColumn = line == null ? undefined : (column ?? 1);
    openFile.mutate({
      path,
      line,
      column: resolvedColumn,
      cwd,
    });
  };
  const copyPathMessage = {
    id: "markdown.fileReference.copyPath",
    defaultMessage: "Copy path",
    description: "Context menu item to copy a referenced file path",
  };
  const revealPathMessage =
    osInfo.data?.platform === "darwin"
      ? {
          id: "markdown.fileReference.openInFinder",
          defaultMessage: "Open in Finder",
          description:
            "Context menu item to reveal a referenced file in Finder",
        }
      : osInfo.data?.platform === "win32"
        ? {
            id: "markdown.fileReference.openInExplorer",
            defaultMessage: "Open in Explorer",
            description:
              "Context menu item to reveal a referenced file in File Explorer",
          }
        : {
            id: "markdown.fileReference.openInFileManager",
            defaultMessage: "Open in File Manager",
            description:
              "Context menu item to reveal a referenced file in the system file manager",
          };
  return (
    <ContextMenu
      items={[
        {
          id: "copy-path",
          message: copyPathMessage,
          onSelect: () => void copyToClipboard(path),
        },
        {
          id: "reveal-path",
          message: revealPathMessage,
          onSelect: () =>
            openFile.mutate({
              path,
              cwd,
              target: "fileManager",
            }),
        },
      ]}
    >
      <button
        type="button"
        className={clsx(
          "cursor-interaction inline-block max-w-full appearance-none border-0 bg-transparent p-0 text-left align-baseline whitespace-normal",
          className,
        )}
        style={{ font: "inherit" }}
        onClick={handleActivate}
      >
        <Tooltip delayDuration={0} tooltipContent={title ?? path}>
          <span className="break-words whitespace-normal">{children}</span>
        </Tooltip>
      </button>
    </ContextMenu>
  );
}

function ResolvedMentionChip({
  description,
  displayName,
  fallbackIcon,
  fallbackName,
  href,
  iconSmall,
  tooltipText,
}: {
  description?: string;
  displayName: string;
  fallbackIcon?: React.ComponentType<{ className?: string }>;
  fallbackName: string;
  href?: string;
  iconSmall: string;
  tooltipText?: string;
}): React.ReactElement {
  return (
    <InlineChip
      className={clsx("cursor-interaction")}
      text={displayName}
      icon={getSkillIcon(null, {
        size: "small",
        smallOnly: true,
        alt: displayName,
        iconSmall,
        basePath: href ?? "",
        fallbackName,
        fallbackDescription: description,
        fallbackIcon: fallbackIcon ?? getSkillMentionIcon(),
      })}
      tooltipText={description ?? tooltipText}
      interactive
      colorVariant="success"
    />
  );
}
