/**
 * https://github.com/openai/codex/blob/main/codex-rs/core/src/parse_command.rs#L9
 */
export type ParsedCmdWithoutStatus =
  | { type: "read"; cmd: string; name: string; path?: string | null }
  | { type: "list_files"; cmd: string; path?: string | null }
  | { type: "search"; cmd: string; query?: string | null; path?: string | null }
  | {
      type: "format";
      cmd: string;
      tool?: string | null;
      targets?: Array<string> | null;
    }
  | { type: "test"; cmd: string }
  | {
      type: "lint";
      cmd: string;
      tool?: string | null;
      targets?: Array<string> | null;
    }
  | { type: "noop"; cmd: string }
  | { type: "unknown"; cmd: string };

export type ParsedCmd = ParsedCmdWithoutStatus & { isFinished: boolean };

export type ReadCmd = Extract<ParsedCmd, { type: "read" }>;

export function addStatusToParsedCmd(
  parsedCmd: ParsedCmdWithoutStatus,
  isFinished: boolean,
): ParsedCmd {
  return { ...parsedCmd, isFinished };
}
