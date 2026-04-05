import {
  EMBEDDED_SHELL_LABELS_BY_EXECUTABLE,
  type EmbeddedShellLabel,
} from "protocol";

export function getEmbeddedShellLabel(
  command: string,
): EmbeddedShellLabel | null {
  const executable = getLeadingExecutable(command);
  if (executable == null) {
    return null;
  }

  return EMBEDDED_SHELL_LABELS_BY_EXECUTABLE[executable.toLowerCase()] ?? null;
}

function getLeadingExecutable(command: string): string | null {
  let trimmedCommand = command.trim();
  if (trimmedCommand.length === 0) {
    return null;
  }

  const quotedExecutableMatch = trimmedCommand.match(/^(['"])(.*?)\1/);
  const quotedCommand = quotedExecutableMatch?.[2];
  if (quotedCommand) {
    if (quotedExecutableMatch[0].length === trimmedCommand.length) {
      trimmedCommand = quotedCommand.trim();
    } else {
      return getExecutableName(quotedCommand);
    }
  }

  const executable = trimmedCommand.match(/^\S+/)?.[0];
  if (executable == null) {
    return null;
  }

  return getExecutableName(executable);
}

function getExecutableName(executable: string): string {
  return executable.split(/[/\\]/).at(-1) ?? executable;
}
