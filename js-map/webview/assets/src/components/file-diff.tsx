import type { FileDiffMetadata, FileDiffOptions } from "@pierre/diffs";
import {
  type DiffBasePropsReact,
  // oxlint-disable-next-line no-restricted-imports
  FileDiff as PierreFileDiff,
} from "@pierre/diffs/react";
import { ConfigurationKeys } from "protocol";

import { CODEX_DIFF_VARIABLES_CSS } from "@/diff/codex-diff-css";
import { useConfiguration } from "@/hooks/use-configuration";
import { useWindowType } from "@/hooks/use-window-type";
import {
  getCodeThemeOption,
  getCodeThemeRegistration,
} from "@/theme/code-theme";
import {
  useResolvedAppearanceMode,
  useResolvedThemeVariant,
} from "@/theme/use-resolved-theme-variant";
import { useIsDark } from "@/utils/use-is-dark";

const PIERRE_DIFF_ROOT_SELECTOR = ":is([data-diff], [data-file])";

/**
 * Wrapper around the Pierre FileDiff component with some default values and flattened props.
 * ESLint requires that this component is used over the library one.
 */
export function FileDiff<LAnnotation>({
  fileDiff,
  className,
  hunkSeparators = "line-info",
  isLoadingFullContent: _isLoadingFullContent = false,
  lineAnnotations,
  onGutterUtilityClick,
  renderAnnotation,
  overflow = "scroll",
  ...restOptions
}: {
  fileDiff: FileDiffMetadata;
  className?: string;
  isLoadingFullContent?: boolean;
} & Pick<
  DiffBasePropsReact<LAnnotation>,
  "lineAnnotations" | "renderAnnotation"
> &
  Pick<
    FileDiffOptions<LAnnotation>,
    | "diffStyle"
    | "enableLineSelection"
    | "hunkSeparators"
    | "lineDiffType"
    | "overflow"
    | "onLineEnter"
    | "onLineLeave"
    | "onLineClick"
    | "onLineNumberClick"
    | "onGutterUtilityClick"
    | "expansionLineCount"
  >): React.ReactElement {
  const windowType = useWindowType();
  const appearanceMode = useResolvedAppearanceMode();
  const appearanceVariant = useResolvedThemeVariant(appearanceMode);
  const { data: lightCodeThemeId } = useConfiguration(
    ConfigurationKeys.APPEARANCE_LIGHT_CODE_THEME_ID,
    { enabled: windowType === "electron" },
  );
  const { data: darkCodeThemeId } = useConfiguration(
    ConfigurationKeys.APPEARANCE_DARK_CODE_THEME_ID,
    { enabled: windowType === "electron" },
  );
  const isDark = useIsDark();
  const shikiTheme =
    appearanceVariant === "light"
      ? getCodeThemeRegistration(lightCodeThemeId, "light")
      : getCodeThemeRegistration(darkCodeThemeId, "dark");
  const extensionTheme = getCodeThemeOption(undefined);
  return (
    <PierreFileDiff
      className={className}
      fileDiff={fileDiff}
      lineAnnotations={lineAnnotations}
      renderAnnotation={renderAnnotation}
      options={{
        overflow,
        hunkSeparators,
        themeType:
          windowType === "extension" && isDark != null
            ? isDark
              ? "dark"
              : "light"
            : appearanceVariant,
        theme:
          windowType === "extension"
            ? {
                dark: getCodeThemeRegistration(extensionTheme.id, "dark").name,
                light: getCodeThemeRegistration(extensionTheme.id, "light")
                  .name,
              }
            : shikiTheme.name,
        disableFileHeader: true,
        enableGutterUtility: onGutterUtilityClick != null,
        onGutterUtilityClick,
        unsafeCSS: `
          [data-diffs-header],
          ${PIERRE_DIFF_ROOT_SELECTOR} {
            ${CODEX_DIFF_VARIABLES_CSS}
            --diffs-bg: var(--codex-diffs-surface) !important;
            background-color: var(--codex-diffs-surface) !important;
          }

          ${PIERRE_DIFF_ROOT_SELECTOR} [data-utility-button] {
            background-color: var(--color-token-foreground);
            color: var(--color-token-side-bar-background);
            border: none;
            border-radius: 4px;
          }

          ${PIERRE_DIFF_ROOT_SELECTOR} [data-utility-button]:hover {
            background-color: color-mix(
              in srgb,
              var(--color-token-foreground) 88%,
              var(--color-token-side-bar-background)
            );
          }

          mark.codex-thread-find-match {
            background-color: var(--vscode-charts-yellow);
            color: var(--color-token-foreground);
            border-radius: var(--radius-2xs);
            padding: 0;
            margin: 0;
            border: 0;
            font: inherit;
            line-height: inherit;
            letter-spacing: inherit;
            word-spacing: inherit;
            vertical-align: baseline;
          }

          mark.codex-thread-find-active {
            background-color: var(--vscode-charts-orange);
          }

          :host(.composer-diff-simple-line) [data-separator]:empty {
            background-color: transparent;
          }

          :host(.composer-diff-simple-line) [data-separator]:empty::after {
            content: "";
            grid-column: 2 / 3;
            align-self: center;
            margin-inline: 1ch;
            border-top: 1px solid color-mix(in srgb, var(--diffs-fg) 18%, transparent);
          }
        `,
        ...restOptions,
      }}
    />
  );
}
