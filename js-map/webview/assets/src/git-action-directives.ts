import type { QueryClient } from "@tanstack/react-query";
import { createGitCwd, type ConversationId, type HostConfig } from "protocol";
import { z } from "zod";

import type { AppServerManager } from "@/app-server/app-server-manager";
import { extractDirectives } from "@/directives/parse-directives";
import { refetchGitWorktreeQueries } from "@/git-rpc/git-api";
import { getHostKey } from "@/git-rpc/host-config-utils";
import {
  gitStableMetadataQueryOptions,
  type GitStableMetadata,
} from "@/git-rpc/use-git-stable-metadata";
import {
  setCreatedPrStatusQueryData,
  type CreatedPrStatusPayload,
} from "@/local-conversation/git-actions/create-pull-request/use-gh-create-pr";
import {
  GIT_COMMIT_DIRECTIVE_NAME,
  GIT_CREATE_BRANCH_DIRECTIVE_NAME,
  GIT_CREATE_PR_DIRECTIVE_NAME,
  GIT_PUSH_DIRECTIVE_NAME,
  GIT_STAGE_DIRECTIVE_NAME,
} from "@/markdown-directives/codex-remark-directive";
import { getQueryKey } from "@/vscode-api";

const gitActionDirectiveSchema = z.object({
  cwd: z.string().trim().min(1),
  branch: z.string().trim().min(1).optional(),
  url: z.string().trim().min(1).optional(),
  isDraft: z.preprocess((value) => {
    if (typeof value === "boolean") {
      return value;
    }
    if (typeof value === "string") {
      const trimmed = value.trim().toLowerCase();
      if (trimmed === "true") {
        return true;
      }
      if (trimmed === "false") {
        return false;
      }
    }
    return undefined;
  }, z.boolean().optional()),
});

type GitDirectiveType =
  | "stage"
  | "commit"
  | "create-branch"
  | "push"
  | "create-pr";

export type GitActionDirective = {
  type: GitDirectiveType;
  cwd: string;
  branch?: string;
  url?: string;
  isDraft?: boolean;
};

const GIT_DIRECTIVE_NAMES = new Set<string>([
  GIT_STAGE_DIRECTIVE_NAME,
  GIT_COMMIT_DIRECTIVE_NAME,
  GIT_CREATE_BRANCH_DIRECTIVE_NAME,
  GIT_PUSH_DIRECTIVE_NAME,
  GIT_CREATE_PR_DIRECTIVE_NAME,
]);

function mapDirectiveNameToType(name: string): GitDirectiveType | null {
  switch (name) {
    case GIT_STAGE_DIRECTIVE_NAME:
      return "stage";
    case GIT_COMMIT_DIRECTIVE_NAME:
      return "commit";
    case GIT_CREATE_BRANCH_DIRECTIVE_NAME:
      return "create-branch";
    case GIT_PUSH_DIRECTIVE_NAME:
      return "push";
    case GIT_CREATE_PR_DIRECTIVE_NAME:
      return "create-pr";
    default:
      return null;
  }
}

export function parseGitActionDirectives(
  markdown: string,
): Array<GitActionDirective> {
  if (markdown.trim().length === 0) {
    return [];
  }

  const directives = extractDirectives(markdown);
  const actions: Array<GitActionDirective> = [];
  for (const directive of directives) {
    if (!GIT_DIRECTIVE_NAMES.has(directive.name)) {
      continue;
    }
    const type = mapDirectiveNameToType(directive.name);
    if (type == null) {
      continue;
    }
    const parsed = gitActionDirectiveSchema.safeParse(directive.attributes);
    if (!parsed.success) {
      continue;
    }
    actions.push({
      type,
      cwd: parsed.data.cwd,
      branch: parsed.data.branch,
      url: parsed.data.url,
      isDraft: parsed.data.isDraft,
    });
  }
  return actions;
}

export function parseGitActionDirectivesFromMessages(
  messages: Array<string>,
): Array<GitActionDirective> {
  const dedupedActions = new Map<string, GitActionDirective>();

  for (const message of messages) {
    for (const action of parseGitActionDirectives(message)) {
      const key = JSON.stringify([
        action.type,
        action.cwd,
        action.branch ?? null,
        action.url ?? null,
        action.isDraft ?? null,
      ]);
      dedupedActions.set(key, action);
    }
  }

  return Array.from(dedupedActions.values());
}

async function getGitMetadataForCwd({
  cwd,
  hasGitRpc,
  hostConfig,
  queryClient,
}: {
  cwd: string;
  hasGitRpc: boolean;
  hostConfig: HostConfig;
  queryClient: QueryClient;
}): Promise<GitStableMetadata | null> {
  if (!hasGitRpc) {
    return null;
  }
  try {
    return await queryClient.fetchQuery(
      gitStableMetadataQueryOptions(
        cwd,
        hasGitRpc,
        getHostKey(hostConfig),
        hostConfig,
      ),
    );
  } catch {
    return null;
  }
}

export async function applyGitActionDirectives({
  conversationId,
  directives,
  hasGitRpc,
  hostConfig,
  manager,
  queryClient,
}: {
  conversationId: ConversationId;
  directives: Array<GitActionDirective>;
  hasGitRpc: boolean;
  hostConfig: HostConfig;
  manager: AppServerManager;
  queryClient: QueryClient;
}): Promise<void> {
  if (directives.length === 0) {
    return;
  }

  const hostKey = getHostKey(hostConfig);
  let nextThreadBranch: string | null = null;
  const prStatusInvalidations: Array<Promise<void>> = [];
  const refetchCwds = new Set<string>();

  for (const directive of directives) {
    if (directive.type === "create-pr" && directive.branch) {
      const payload: CreatedPrStatusPayload = {
        cwd: createGitCwd(directive.cwd),
        headBranch: directive.branch,
        hostId: hostConfig.id,
        url: directive.url ?? null,
        isDraft: directive.isDraft ?? false,
      };
      setCreatedPrStatusQueryData(queryClient, payload);
      prStatusInvalidations.push(
        queryClient.invalidateQueries({
          queryKey: getQueryKey("gh-pr-status"),
        }),
        queryClient.invalidateQueries({
          queryKey: getQueryKey("gh-pr-status", {
            cwd: createGitCwd(directive.cwd),
            headBranch: directive.branch,
            hostId: hostConfig.id,
          }),
        }),
      );
    }

    if (directive.type === "create-branch" && directive.branch) {
      nextThreadBranch = directive.branch;
    }

    if (
      directive.type !== "stage" &&
      directive.type !== "commit" &&
      directive.type !== "create-branch" &&
      directive.type !== "push" &&
      directive.type !== "create-pr"
    ) {
      continue;
    }
    refetchCwds.add(directive.cwd);
  }

  await Promise.all(prStatusInvalidations);

  const gitMetadataByCwd = await Promise.all(
    Array.from(refetchCwds).map(async (cwd) => {
      return {
        cwd,
        metadata: await getGitMetadataForCwd({
          cwd,
          hasGitRpc,
          hostConfig,
          queryClient,
        }),
      };
    }),
  );

  await Promise.all(
    gitMetadataByCwd.flatMap(({ metadata }) => {
      if (metadata == null) {
        return [];
      }
      return [
        refetchGitWorktreeQueries(queryClient, metadata, {
          changeType: "head",
          hostKey,
        }),
      ];
    }),
  );

  if (nextThreadBranch != null) {
    await manager.updateThreadGitBranch(conversationId, nextThreadBranch);
  }
}
