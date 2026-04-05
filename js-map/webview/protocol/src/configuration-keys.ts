import type { CodeThemeId, ChromeTheme } from "./theme";
import type { ConversationDetailMode } from "./types/conversation-detail-mode";

export const ConfigurationKeys = {
  // Configuration keys that are documented in package.json and therefore visible
  // in the VS Code settings UI.
  APPEARANCE_THEME: "appearanceTheme",
  APPEARANCE_LIGHT_CHROME_THEME: "appearanceLightChromeTheme",
  APPEARANCE_DARK_CHROME_THEME: "appearanceDarkChromeTheme",
  APPEARANCE_LIGHT_CODE_THEME_ID: "appearanceLightCodeThemeId",
  APPEARANCE_DARK_CODE_THEME_ID: "appearanceDarkCodeThemeId",
  SANS_FONT_FAMILY: "sansFontFamily",
  SANS_FONT_SIZE: "sansFontSize",
  CODE_FONT_FAMILY: "codeFontFamily",
  CODE_FONT_SIZE: "codeFontSize",
  CLI_EXECUTABLE: "cliExecutable",
  COMMENT_CODELENS_ENABLED: "commentCodeLensEnabled",
  FOLLOW_UP_QUEUE_MODE: "followUpQueueMode",
  COMPOSER_ENTER_BEHAVIOR: "composerEnterBehavior",
  LOCALE_OVERRIDE: "localeOverride",
  OPEN_ON_STARTUP: "openOnStartup",
  RUN_CODEX_IN_WSL: "runCodexInWindowsSubsystemForLinux",
  HOTKEY_WINDOW_HOTKEY: "hotkeyWindowHotkey",

  // These are not documented in package.json.
  API_ENDPOINT: "apiEndpoint",
  LOG_LEVEL: "logLevel",
  PREVENT_SLEEP_WHILE_RUNNING: "preventSleepWhileRunning",
  OPAQUE_WINDOWS: "opaqueWindows",
  USE_POINTER_CURSORS: "usePointerCursors",
  CONVERSATION_DETAIL_MODE: "conversationDetailMode",
  USE_EXPERIMENTAL_LSP_MCP_SERVER: "useExperimentalLspMcpServer",
  INTEGRATED_TERMINAL_SHELL: "integratedTerminalShell",
} as const satisfies Record<string, string>;

export type ConfigurationKey =
  (typeof ConfigurationKeys)[keyof typeof ConfigurationKeys];

/**
 * Generic, type-safe wrapper around get-configuration and set-configuration.
 * Returns the current value, async setter, and loading state.
 */
export type ConfigValueByKey = {
  [ConfigurationKeys.APPEARANCE_THEME]: "system" | "light" | "dark";
  [ConfigurationKeys.APPEARANCE_LIGHT_CHROME_THEME]: ChromeTheme;
  [ConfigurationKeys.APPEARANCE_DARK_CHROME_THEME]: ChromeTheme;
  [ConfigurationKeys.APPEARANCE_LIGHT_CODE_THEME_ID]: CodeThemeId;
  [ConfigurationKeys.APPEARANCE_DARK_CODE_THEME_ID]: CodeThemeId;
  [ConfigurationKeys.SANS_FONT_FAMILY]: string | null;
  [ConfigurationKeys.SANS_FONT_SIZE]: number;
  [ConfigurationKeys.CODE_FONT_FAMILY]: string | null;
  [ConfigurationKeys.CODE_FONT_SIZE]: number;
  [ConfigurationKeys.CLI_EXECUTABLE]: string | undefined;
  [ConfigurationKeys.COMMENT_CODELENS_ENABLED]: boolean;
  [ConfigurationKeys.FOLLOW_UP_QUEUE_MODE]: "queue" | "steer" | "interrupt";
  [ConfigurationKeys.COMPOSER_ENTER_BEHAVIOR]: ComposerEnterBehavior;
  [ConfigurationKeys.LOCALE_OVERRIDE]: string | null;
  [ConfigurationKeys.OPEN_ON_STARTUP]: boolean;
  [ConfigurationKeys.RUN_CODEX_IN_WSL]: boolean;
  [ConfigurationKeys.HOTKEY_WINDOW_HOTKEY]: string | undefined;
  [ConfigurationKeys.API_ENDPOINT]: string | undefined;
  [ConfigurationKeys.LOG_LEVEL]: string | undefined;
  [ConfigurationKeys.PREVENT_SLEEP_WHILE_RUNNING]: boolean;
  [ConfigurationKeys.OPAQUE_WINDOWS]: boolean;
  [ConfigurationKeys.USE_POINTER_CURSORS]: boolean;
  [ConfigurationKeys.USE_EXPERIMENTAL_LSP_MCP_SERVER]: boolean | undefined;
  [ConfigurationKeys.CONVERSATION_DETAIL_MODE]: ConversationDetailMode;
  [ConfigurationKeys.INTEGRATED_TERMINAL_SHELL]: IntegratedTerminalShell;
};

export type ComposerEnterBehavior = "enter" | "cmdIfMultiline";

export type IntegratedTerminalShell =
  | "powershell"
  | "commandPrompt"
  | "gitBash"
  | "wsl";
