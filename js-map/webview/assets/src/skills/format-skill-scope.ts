import type * as AppServer from "app-server-types";
import type { IntlShape, MessageDescriptor } from "react-intl";
import { defineMessages } from "react-intl";

const SCOPE_MESSAGES: Record<AppServer.v2.SkillScope, MessageDescriptor> =
  defineMessages({
    system: {
      id: "skills.scope.system",
      defaultMessage: "System",
      description: "Indicates a system scoped skill",
    },
    repo: {
      id: "skills.scope.repo",
      defaultMessage: "Repo",
      description: "Indicates a skill scoped to the current repository",
    },
    user: {
      id: "skills.scope.user",
      defaultMessage: "User",
      description: "Indicates a skill scoped to the user",
    },
    admin: {
      id: "skills.scope.admin",
      defaultMessage: "Admin",
      description: "Indicates a skill scoped to the admin",
    },
  });

export function formatSkillScope(
  scope: AppServer.v2.SkillScope,
  intl: IntlShape,
): string {
  return intl.formatMessage(SCOPE_MESSAGES[scope]);
}

function getBasename(value: string): string {
  const trimmed = value.replace(/[\\/]+$/, "");
  const lastSeparator = Math.max(
    trimmed.lastIndexOf("/"),
    trimmed.lastIndexOf("\\"),
  );
  return lastSeparator === -1 ? trimmed : trimmed.slice(lastSeparator + 1);
}

const CUSTOM_SCOPE_MESSAGES: Record<
  AppServer.v2.SkillScope,
  MessageDescriptor
> = defineMessages({
  system: {
    id: "skills.scope.builtIn",
    defaultMessage: "System",
    description: "Label for system skills",
  },
  repo: {
    id: "skills.scope.team",
    defaultMessage: "Team",
    description: "Label for team skills",
  },
  user: {
    id: "skills.scope.personal",
    defaultMessage: "Personal",
    description: "Label for personal skills",
  },
  admin: {
    id: "skills.scope.adminInstalled",
    defaultMessage: "Admin installed",
    description: "Label for admin installed skills",
  },
});

export function formatSkillScopeLabel({
  scope,
  intl,
  repoLabel,
  adminLabel,
}: {
  scope: AppServer.v2.SkillScope;
  intl: IntlShape;
  repoLabel?: string;
  adminLabel?: string;
}): string {
  if (scope === "repo") {
    return repoLabel ?? intl.formatMessage(CUSTOM_SCOPE_MESSAGES.repo);
  }
  if (scope === "admin") {
    return adminLabel ?? intl.formatMessage(CUSTOM_SCOPE_MESSAGES.admin);
  }
  const message = CUSTOM_SCOPE_MESSAGES[scope];
  return message ? intl.formatMessage(message) : formatSkillScope(scope, intl);
}

export function getRepoLabelFromRoots({
  skillPath,
  roots,
  fallbackLabel,
}: {
  skillPath: string;
  roots: Array<string>;
  fallbackLabel: string;
}): string {
  const bestRoot = roots.reduce<string | null>(
    (closest, root): string | null => {
      if (!skillPath.startsWith(root)) {
        return closest;
      }
      if (!closest || root.length > closest.length) {
        return root;
      }
      return closest;
    },
    null,
  );
  if (!bestRoot) {
    return fallbackLabel;
  }
  const repoSegment = getBasename(bestRoot);
  return repoSegment.length > 0 ? repoSegment : fallbackLabel;
}

export function getSkillScopeLabel({
  skill,
  roots,
  intl,
  fallbackRepoLabel,
  adminLabel,
}: {
  skill: AppServer.v2.SkillMetadata;
  roots: Array<string>;
  intl: IntlShape;
  fallbackRepoLabel?: string;
  adminLabel?: string;
}): string {
  return formatSkillScopeLabel({
    scope: skill.scope,
    intl,
    repoLabel: getRepoLabelFromRoots({
      skillPath: skill.path,
      roots,
      fallbackLabel:
        fallbackRepoLabel ?? formatSkillScopeLabel({ scope: "repo", intl }),
    }),
    adminLabel,
  });
}
