import type { ElectronMenuAcceleratorId } from "./electron-menu-accelerators";

export type CodexCommandSurface =
  | "commandMenu"
  | "electronMenu"
  | "vscodeCommand"
  | "vscodeContextMenu"
  | "electronContextMenu";

export type CodexCommandDefinition = {
  id: string;
  titleKey: string;
  groupKey?: string;
  keywords?: Array<string>;
  surfaces: Array<CodexCommandSurface>;
  host: {
    electron?: {
      acceleratorId?: ElectronMenuAcceleratorId;
    };
    extension?: true;
    browser?: true;
  };
};

type NoExtraProperties<Shape, Value extends Shape> = Value &
  Record<Exclude<keyof Value, keyof Shape>, never>;

function defineCodexCommand<const T extends CodexCommandDefinition>(
  command: NoExtraProperties<CodexCommandDefinition, T>,
): T {
  return command;
}

const ELECTRON_HOST: { acceleratorId?: ElectronMenuAcceleratorId } = {};

export const CODEX_COMMANDS = [
  defineCodexCommand({
    id: "newThread",
    titleKey: "codex.command.newThread",
    groupKey: "codex.commandGroup.thread",
    keywords: ["new chat", "new conversation"],
    surfaces: ["commandMenu", "electronMenu", "vscodeCommand"],
    host: {
      electron: ELECTRON_HOST,
      extension: true,
      browser: true,
    },
  }),
  defineCodexCommand({
    id: "openThreadOverlay",
    titleKey: "codex.command.openThreadOverlay",
    groupKey: "codex.commandGroup.thread",
    keywords: ["pop out", "overlay", "window", "mini window"],
    surfaces: ["commandMenu", "electronMenu"],
    host: {
      electron: ELECTRON_HOST,
    },
  }),
  defineCodexCommand({
    id: "previousThread",
    titleKey: "codex.command.previousThread",
    groupKey: "codex.commandGroup.navigation",
    keywords: ["previous thread", "previous chat", "earlier thread"],
    surfaces: ["commandMenu", "electronMenu"],
    host: {
      electron: ELECTRON_HOST,
    },
  }),
  defineCodexCommand({
    id: "nextThread",
    titleKey: "codex.command.nextThread",
    groupKey: "codex.commandGroup.navigation",
    keywords: ["next thread", "next chat", "later thread"],
    surfaces: ["commandMenu", "electronMenu"],
    host: {
      electron: ELECTRON_HOST,
    },
  }),
  defineCodexCommand({
    id: "settings",
    titleKey: "codex.command.settings",
    groupKey: "codex.commandGroup.app",
    keywords: ["preferences"],
    surfaces: ["commandMenu", "electronMenu", "vscodeCommand"],
    host: {
      electron: ELECTRON_HOST,
      extension: true,
      browser: true,
    },
  }),
  defineCodexCommand({
    id: "mcpSettings",
    titleKey: "codex.command.mcpSettings",
    groupKey: "codex.commandGroup.configure",
    keywords: ["mcp", "servers"],
    surfaces: ["commandMenu"],
    host: {
      electron: ELECTRON_HOST,
      browser: true,
    },
  }),
  defineCodexCommand({
    id: "personalitySettings",
    titleKey: "codex.command.personalitySettings",
    groupKey: "codex.commandGroup.configure",
    keywords: ["personality", "tone", "style"],
    surfaces: ["commandMenu"],
    host: {
      electron: ELECTRON_HOST,
      browser: true,
    },
  }),
  defineCodexCommand({
    id: "manageTasks",
    titleKey: "codex.command.manageTasks",
    groupKey: "codex.commandGroup.app",
    keywords: ["tasks", "manage", "automations"],
    surfaces: ["commandMenu"],
    host: {
      electron: ELECTRON_HOST,
      extension: true,
      browser: true,
    },
  }),
  defineCodexCommand({
    id: "forceReloadSkills",
    titleKey: "codex.command.forceReloadSkills",
    groupKey: "codex.commandGroup.skills",
    keywords: ["skills", "reload", "refresh"],
    surfaces: ["commandMenu"],
    host: {
      electron: ELECTRON_HOST,
      extension: true,
      browser: true,
    },
  }),
  defineCodexCommand({
    id: "openSkills",
    titleKey: "codex.command.openSkills",
    groupKey: "codex.commandGroup.skills",
    keywords: ["skills", "catalog", "directory"],
    surfaces: ["commandMenu"],
    host: {
      electron: ELECTRON_HOST,
      extension: true,
      browser: true,
    },
  }),
  defineCodexCommand({
    id: "openFolder",
    titleKey: "codex.command.openFolder",
    groupKey: "codex.commandGroup.workspace",
    keywords: ["workspace", "repo"],
    surfaces: ["commandMenu", "electronMenu"],
    host: {
      electron: ELECTRON_HOST,
    },
  }),
  defineCodexCommand({
    id: "toggleSidebar",
    titleKey: "codex.command.toggleSidebar",
    groupKey: "codex.commandGroup.panels",
    keywords: ["sidebar"],
    surfaces: ["commandMenu", "electronMenu"],
    host: {
      electron: ELECTRON_HOST,
      extension: true,
      browser: true,
    },
  }),
  defineCodexCommand({
    id: "toggleTerminal",
    titleKey: "codex.command.toggleTerminal",
    groupKey: "codex.commandGroup.panels",
    keywords: ["terminal", "console"],
    surfaces: ["commandMenu", "electronMenu"],
    host: {
      electron: ELECTRON_HOST,
    },
  }),
  defineCodexCommand({
    id: "toggleDiffPanel",
    titleKey: "codex.command.toggleDiffPanel",
    groupKey: "codex.commandGroup.panels",
    keywords: ["diff"],
    surfaces: ["commandMenu", "electronMenu"],
    host: {
      electron: ELECTRON_HOST,
    },
  }),
  defineCodexCommand({
    id: "findInThread",
    titleKey: "codex.command.findInThread",
    groupKey: "codex.commandGroup.navigation",
    keywords: ["find", "search", "cmd+f"],
    surfaces: ["commandMenu", "electronMenu"],
    host: {
      electron: ELECTRON_HOST,
      browser: true,
      extension: true,
    },
  }),
  defineCodexCommand({
    id: "navigateBack",
    titleKey: "codex.command.navigateBack",
    groupKey: "codex.commandGroup.navigation",
    keywords: ["back"],
    surfaces: ["commandMenu", "electronMenu", "vscodeCommand"],
    host: {
      electron: ELECTRON_HOST,
      extension: true,
      browser: true,
    },
  }),
  defineCodexCommand({
    id: "navigateForward",
    titleKey: "codex.command.navigateForward",
    groupKey: "codex.commandGroup.navigation",
    keywords: ["forward"],
    surfaces: ["commandMenu", "electronMenu", "vscodeCommand"],
    host: {
      electron: ELECTRON_HOST,
      extension: true,
      browser: true,
    },
  }),
  defineCodexCommand({
    id: "logOut",
    titleKey: "codex.command.logOut",
    groupKey: "codex.commandGroup.app",
    keywords: ["log out", "logout", "sign out"],
    surfaces: ["commandMenu"],
    host: {
      electron: ELECTRON_HOST,
      extension: true,
      browser: true,
    },
  }),
  defineCodexCommand({
    id: "feedback",
    titleKey: "codex.command.feedback",
    groupKey: "codex.commandGroup.app",
    keywords: ["feedback", "report bug", "bug report"],
    surfaces: ["commandMenu"],
    host: {
      electron: ELECTRON_HOST,
      extension: true,
      browser: true,
    },
  }),
];

export type CodexCommandId = (typeof CODEX_COMMANDS)[number]["id"];
