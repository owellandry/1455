import type * as AppServer from "app-server-types";
import {
  createConversationId,
  type ConversationId,
  type LocalCustomAgentMetadata,
} from "protocol";

import type { InstalledPlugin } from "@/plugins/use-plugins";
import { getSkillDescription } from "@/skills/get-skill-description";
import { getSkillDisplayName } from "@/skills/skill-utils";

const APP_MENTION_PATH_PREFIX = "app://";
const AGENT_MENTION_PATH_PREFIX = "agent://";
const PLUGIN_MENTION_PATH_PREFIX = "plugin://";
const SUBAGENT_MENTION_PATH_PREFIX = "subagent://";

export type ComposerMentionKind = "skill" | "app" | "agent" | "plugin";
export type PromptLinkKind = ComposerMentionKind | "text";

export type ComposerMentionAttrs = {
  name: string;
  displayName: string;
  path: string;
  description: string;
  iconSmall: string;
};

export type ComposerMentionInsertItem = ComposerMentionAttrs & {
  kind: Exclude<ComposerMentionKind, "agent">;
};

export type AgentMentionAttrs = {
  name: string;
  displayName: string;
  path: string;
  conversationId?: ConversationId;
};

export type AgentMentionInsertItem = AgentMentionAttrs & {
  kind: Extract<ComposerMentionKind, "agent">;
};

export function appLinkName(name: string): string {
  const normalizedName = name
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "-")
    .replace(/^-+|-+$/g, "");
  if (normalizedName === "") {
    return "app";
  }
  return normalizedName;
}

export function getAppMentionPath(appId: string): string {
  return `${APP_MENTION_PATH_PREFIX}${appId}`;
}

export function getAgentMentionPath(conversationId: ConversationId): string {
  return `${AGENT_MENTION_PATH_PREFIX}${conversationId}`;
}

export function getConfiguredAgentMentionPath(roleName: string): string {
  return `${SUBAGENT_MENTION_PATH_PREFIX}${roleName}`;
}

export function getPluginMentionPath(pluginId: string): string {
  return `${PLUGIN_MENTION_PATH_PREFIX}${pluginId.trim()}`;
}

export function isAppMentionPath(path: string): boolean {
  return path.startsWith(APP_MENTION_PATH_PREFIX);
}

export function isAgentMentionPath(path: string): boolean {
  return path.startsWith(AGENT_MENTION_PATH_PREFIX);
}

export function isConfiguredAgentMentionPath(path: string): boolean {
  return path.startsWith(SUBAGENT_MENTION_PATH_PREFIX);
}

export function isPluginMentionPath(path: string): boolean {
  return path.startsWith(PLUGIN_MENTION_PATH_PREFIX);
}

export function getConversationIdFromAgentMentionPath(
  path: string,
): ConversationId | null {
  if (!isAgentMentionPath(path)) {
    return null;
  }

  const conversationId = path.slice(AGENT_MENTION_PATH_PREFIX.length).trim();
  if (conversationId.length === 0) {
    return null;
  }

  return createConversationId(conversationId);
}

export function getRoleNameFromConfiguredAgentMentionPath(
  path: string,
): string | null {
  if (!isConfiguredAgentMentionPath(path)) {
    return null;
  }

  const roleName = path.slice(SUBAGENT_MENTION_PATH_PREFIX.length).trim();
  if (roleName.length === 0) {
    return null;
  }

  return roleName;
}

export function getMentionKindFromPath(path: string): ComposerMentionKind {
  if (isAppMentionPath(path)) {
    return "app";
  }
  if (isPluginMentionPath(path)) {
    return "plugin";
  }
  return "skill";
}

export function getPromptLinkKind({
  href,
  label,
}: {
  href: string;
  label: string;
}): PromptLinkKind {
  if (isAgentMentionPath(href) || isConfiguredAgentMentionPath(href)) {
    return "agent";
  }
  if (isPluginMentionPath(href)) {
    return "plugin";
  }
  if (isAppMentionPath(href)) {
    return "app";
  }
  if (label.trim().startsWith("$")) {
    return "skill";
  }
  return "text";
}

export function getMentionLabelText(label: string): string {
  const trimmedLabel = label.trim();
  if (
    (trimmedLabel.startsWith("$[") || trimmedLabel.startsWith("@[")) &&
    trimmedLabel.endsWith("]")
  ) {
    return trimmedLabel.slice(2, -1);
  }
  if (trimmedLabel.startsWith("$") || trimmedLabel.startsWith("@")) {
    return trimmedLabel.slice(1);
  }
  return trimmedLabel;
}

export function getMentionAttrsFromSkill(
  skill: AppServer.v2.SkillMetadata,
): ComposerMentionAttrs {
  return {
    name: skill.name,
    displayName: getSkillDisplayName(skill),
    path: skill.path,
    description: getSkillDescription(skill),
    iconSmall: skill.interface?.iconSmall ?? "",
  };
}

export function getMentionAttrsFromApp(
  app: AppServer.v2.AppInfo,
): ComposerMentionAttrs {
  return {
    name: appLinkName(app.name),
    displayName: app.name,
    path: getAppMentionPath(app.id),
    description: app.description ?? "",
    iconSmall: app.logoUrl ?? app.logoUrlDark ?? "",
  };
}

export function getMentionAttrsFromPlugin(
  plugin: InstalledPlugin,
): ComposerMentionAttrs {
  return {
    name: plugin.plugin.name,
    displayName: plugin.displayName ?? plugin.plugin.name,
    path: getPluginMentionPath(plugin.plugin.id),
    description: plugin.description ?? "",
    iconSmall: plugin.logoPath ?? "",
  };
}

export function getMentionInsertItemFromSkill(
  skill: AppServer.v2.SkillMetadata,
): ComposerMentionInsertItem {
  return {
    kind: "skill",
    ...getMentionAttrsFromSkill(skill),
  };
}

export function getMentionInsertItemFromApp(
  app: AppServer.v2.AppInfo,
): ComposerMentionInsertItem {
  return {
    kind: "app",
    ...getMentionAttrsFromApp(app),
  };
}

export function getMentionInsertItemFromPlugin(
  plugin: InstalledPlugin,
): ComposerMentionInsertItem {
  return {
    kind: "plugin",
    ...getMentionAttrsFromPlugin(plugin),
  };
}

export function getAgentMentionInsertItem({
  conversationId,
  displayName,
}: {
  conversationId: ConversationId;
  displayName: string;
}): AgentMentionInsertItem {
  const displayNameWithoutMentionPrefix =
    getAgentDisplayNameWithoutMentionPrefix(displayName);
  return {
    kind: "agent",
    name: displayNameWithoutMentionPrefix.toLowerCase(),
    displayName: displayNameWithoutMentionPrefix,
    conversationId,
    path: getAgentMentionPath(conversationId),
  };
}

export function getConfiguredAgentMentionInsertItem(
  role: LocalCustomAgentMetadata,
): AgentMentionInsertItem {
  return {
    kind: "agent",
    name: role.roleName,
    displayName: role.roleName,
    path: getConfiguredAgentMentionPath(role.roleName),
  };
}

function getAgentDisplayNameWithoutMentionPrefix(displayName: string): string {
  const trimmedDisplayName = displayName.trim();
  if (trimmedDisplayName.startsWith("@")) {
    return trimmedDisplayName.slice(1).trim();
  }

  return trimmedDisplayName;
}
