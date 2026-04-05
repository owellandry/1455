export const CODEX_DIFF_SURFACE_DEFAULT = `color-mix(
  in srgb,
  var(--color-token-side-bar-background) 97%,
  var(--color-token-foreground)
)`;

export const CODEX_DIFF_CONTEXT_NUMBER = `color-mix(
  in lab,
  var(--codex-diffs-surface) 98.5%,
  var(--diffs-mixer)
)`;

export const CODEX_DIFF_ADDITION_NUMBER = `color-mix(
  in srgb,
  var(--codex-diffs-surface) 91%,
  var(--diffs-addition-color-override)
)`;

export const CODEX_DIFF_DELETION_NUMBER = `color-mix(
  in srgb,
  var(--codex-diffs-surface) 91%,
  var(--diffs-deletion-color-override)
)`;

export const CODEX_DIFF_VARIABLES_CSS = `
  --codex-diffs-surface: ${CODEX_DIFF_SURFACE_DEFAULT};
  --codex-diffs-context-number: ${CODEX_DIFF_CONTEXT_NUMBER};
  --codex-diffs-addition-number: ${CODEX_DIFF_ADDITION_NUMBER};
  --codex-diffs-deletion-number: ${CODEX_DIFF_DELETION_NUMBER};
`;

export function codexDiffSurfaceValue(background: boolean): string {
  if (!background) {
    return "var(--color-token-side-bar-background)";
  }

  return CODEX_DIFF_SURFACE_DEFAULT;
}
