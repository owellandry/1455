import type { IntegratedTerminalShell } from "./configuration-keys";

export type EmbeddedShellLabel = "bash" | "cmd" | "powershell" | "sh" | "zsh";

export const EMBEDDED_SHELL_LABELS_BY_EXECUTABLE: Record<
  string,
  EmbeddedShellLabel
> = {
  bash: "bash",
  "bash.exe": "bash",
  cmd: "cmd",
  "cmd.exe": "cmd",
  "git-bash.exe": "bash",
  powershell: "powershell",
  "powershell.exe": "powershell",
  pwsh: "powershell",
  "pwsh.exe": "powershell",
  sh: "sh",
  "sh.exe": "sh",
  zsh: "zsh",
  "zsh.exe": "zsh",
};

export const EMBEDDED_SHELL_LABEL_TEXT: Record<EmbeddedShellLabel, string> = {
  bash: "bash",
  cmd: "cmd",
  powershell: "PowerShell",
  sh: "sh",
  zsh: "zsh",
};

export const INTEGRATED_TERMINAL_SHELL_LABELS: Record<
  IntegratedTerminalShell,
  string
> = {
  powershell: "PowerShell",
  commandPrompt: "Command Prompt",
  gitBash: "Git Bash",
  wsl: "WSL",
};
