import { z } from "zod";

/**
 * Default filename used when creating a local environment from the UI.
 */
export const DEFAULT_ENVIRONMENT_FILE_NAME = "environment.toml";
export const LOCAL_ENVIRONMENT_CONFIG_KEY = "codex.localEnvironmentConfigPath";
export const LOCAL_ENVIRONMENT_CONFIG_NONE = "__none__";
export const LOCAL_ENVIRONMENT_SOURCE_TREE_PATH_ENV_VAR =
  "CODEX_SOURCE_TREE_PATH";
export const LOCAL_ENVIRONMENT_WORKTREE_PATH_ENV_VAR = "CODEX_WORKTREE_PATH";

const ENVIRONMENT_ACTION_ICONS = ["tool", "run", "debug", "test"] as const;
const ENVIRONMENT_PLATFORMS = ["darwin", "linux", "win32"] as const;

export type LocalEnvironmentActionIcon =
  (typeof ENVIRONMENT_ACTION_ICONS)[number];

export type LocalEnvironmentPlatform = (typeof ENVIRONMENT_PLATFORMS)[number];

const localActionSchema = z.object({
  name: z.string(),
  icon: z.enum(ENVIRONMENT_ACTION_ICONS).nullable().catch(null),
  command: z.string(),
  platform: z.enum(ENVIRONMENT_PLATFORMS).optional(),
});

const localLifecyclePlatformSchema = z.object({
  /**
   * Inline shell script that runs from the workspace root (parent directory of the .codex folder the environment file is in).
   */
  script: z.string(),
});

const localLifecycleSchema = z.object({
  /**
   * Inline shell script that runs from the workspace root (parent directory of the .codex folder the environment file is in).
   */
  script: z.string(),
  darwin: localLifecyclePlatformSchema.optional(),
  linux: localLifecyclePlatformSchema.optional(),
  win32: localLifecyclePlatformSchema.optional(),
});

export const localEnvironmentSchema = z.object({
  version: z.number().int().min(1).default(1),
  name: z.string(),
  setup: localLifecycleSchema,
  cleanup: localLifecycleSchema.optional(),
  actions: z.array(localActionSchema).optional(),
});

export type LocalEnvironment = z.infer<typeof localEnvironmentSchema>;
export type LocalEnvironmentLifecycle = z.infer<typeof localLifecycleSchema>;

export type LocalEnvironmentResultWithPath = {
  configPath: string;
  cwdRelativeToGitRoot: string;
} & (
  | { type: "success"; environment: LocalEnvironment }
  | { type: "error"; error: Error }
);

export type LocalEnvironmentWithPath = Extract<
  LocalEnvironmentResultWithPath,
  { type: "success" }
>;

export type LocalEnvironmentAction = z.infer<typeof localActionSchema>;
