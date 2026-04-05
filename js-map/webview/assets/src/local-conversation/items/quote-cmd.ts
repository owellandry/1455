import * as shlex from "shlex";

/**
 * This is a substitue for `shlex.join()` that tries to produce functionally
 * equivalent output, but with some extra effort to focus on readability.
 */
export function quoteCmd(cmd: Array<string>): string {
  return cmd.map(quoteArg).join(" ");
}

function quoteArg(arg: string): string {
  // Safe chars that need no quoting.
  // Important: we intentionally exclude `%` from the safe set. Although `%`
  // is harmless on POSIX and PowerShell, it expands in cmd.exe (even inside
  // double quotes). We don't attempt cmd-specific escaping here, but avoiding
  // leaving `%` bare makes copy/paste safer on Windows.
  if (/^[A-Za-z0-9_@+=:,./-]+$/.test(arg)) {
    return arg;
  }

  // Prefer double quotes if `arg` contains no characters that would expand in
  // "" and it doesn't already contain a double quote.
  if (!/[`$\\!]/.test(arg) && !arg.includes('"')) {
    return `"${arg}"`;
  }

  // Fallback: rely on shlex.quote().
  return shlex.quote(arg);
}
