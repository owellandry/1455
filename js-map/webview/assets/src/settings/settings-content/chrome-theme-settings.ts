import {
  ConfigurationKeys,
  type ChromeTheme,
  type CodeThemeId,
  type ThemeFonts,
  type ThemeVariant,
} from "protocol";
import { useCallback, useRef } from "react";
import { z } from "zod";

import {
  useConfiguration,
  useWriteConfiguration,
} from "@/hooks/use-configuration";
import {
  getChromeTheme,
  MAX_CHROME_THEME_CONTRAST,
  MIN_CHROME_THEME_CONTRAST,
} from "@/theme/chrome-theme";
import {
  getCodeThemeChromeThemeSeed,
  getCodeThemeOption,
  getCodeThemeOptions,
  isCodeThemeId,
  type CodeThemeOption,
} from "@/theme/code-theme";

type ThemeSettingsSnapshot = {
  codeThemeId: CodeThemeId;
  theme: ChromeTheme;
};

type ThemeShareValue = ThemeSettingsSnapshot & {
  variant: ThemeVariant;
};

const THEME_SHARE_PREFIX = "codex-theme-v1:";
const codeThemeIdSchema = z.custom<CodeThemeId>((value) => {
  return typeof value === "string" && isCodeThemeId(value);
});
const themeHexColorSchema = z.string().regex(/^#[0-9a-fA-F]{6}$/);
const themeFontFamilySchema = z.string().nullable();
const chromeThemeShareValueSchema = z.object({
  accent: themeHexColorSchema,
  contrast: z.coerce
    .number()
    .int()
    .min(MIN_CHROME_THEME_CONTRAST)
    .max(MAX_CHROME_THEME_CONTRAST),
  fonts: z.object({
    code: themeFontFamilySchema,
    ui: themeFontFamilySchema,
  }),
  ink: themeHexColorSchema,
  opaqueWindows: z.boolean(),
  semanticColors: z.object({
    diffAdded: themeHexColorSchema,
    diffRemoved: themeHexColorSchema,
    skill: themeHexColorSchema,
  }),
  surface: themeHexColorSchema,
});
const themeShareValueSchema = z.object({
  codeThemeId: codeThemeIdSchema,
  theme: chromeThemeShareValueSchema,
  variant: z.enum(["light", "dark"]),
});

/**
 * Owns variant-scoped theme editing, optimistic cache updates, rollback-safe writes,
 * and share/import helpers for the theme customizer UI.
 */
export function useChromeThemeSettings(variant: ThemeVariant): {
  canImportThemeString: (value: string) => boolean;
  codeThemes: Array<CodeThemeOption>;
  exportThemeString: () => string;
  fonts: ThemeFonts;
  importThemeString: (value: string) => Promise<void>;
  isDisabled: boolean;
  selectedCodeTheme: CodeThemeOption;
  setCodeThemeId: (themeId: CodeThemeId) => Promise<void>;
  setFontsPatch: (fontsPatch: Partial<ThemeFonts>) => void;
  setThemePatch: (themePatch: Partial<ChromeTheme>) => void;
  theme: ChromeTheme;
} {
  const { chromeThemeConfigurationKey, codeThemeConfigurationKey } =
    getThemeConfigurationKeys(variant);
  const { data: storedThemeValue, isLoading: isThemeLoading } =
    useConfiguration(chromeThemeConfigurationKey);
  const { data: storedCodeThemeId, isLoading: isCodeThemeLoading } =
    useConfiguration(codeThemeConfigurationKey);
  const { setCachedData: setCachedThemeValue, writeData: writeThemeValue } =
    useWriteConfiguration(chromeThemeConfigurationKey);
  const { setCachedData: setCachedCodeThemeId, writeData: writeCodeThemeId } =
    useWriteConfiguration(codeThemeConfigurationKey);
  const theme = getChromeTheme(storedThemeValue, variant);
  const codeThemes = getCodeThemeOptions(variant);
  const storedSnapshot = {
    codeThemeId: getCodeThemeOption(storedCodeThemeId, variant).id,
    theme,
  } satisfies ThemeSettingsSnapshot;
  const isDisabled = isThemeLoading || isCodeThemeLoading;
  const snapshotRef = useRef(storedSnapshot);
  const committedSnapshotRef = useRef(storedSnapshot);
  const pendingWriteCountRef = useRef(0);
  const themeWriteQueueRef = useRef(Promise.resolve());

  if (pendingWriteCountRef.current === 0) {
    snapshotRef.current = storedSnapshot;
    committedSnapshotRef.current = storedSnapshot;
  }

  const setSnapshot = useCallback(
    (nextSnapshot: ThemeSettingsSnapshot): void => {
      snapshotRef.current = nextSnapshot;
      setCachedThemeValue(nextSnapshot.theme);
      setCachedCodeThemeId(nextSnapshot.codeThemeId);
    },
    [setCachedCodeThemeId, setCachedThemeValue],
  );

  const queueSnapshotWrite = useCallback(
    async (
      nextSnapshot: ThemeSettingsSnapshot,
      writeSnapshot: () => Promise<void>,
    ): Promise<void> => {
      pendingWriteCountRef.current += 1;
      setSnapshot(nextSnapshot);

      const runWrite = async (): Promise<void> => {
        try {
          await writeSnapshot();
        } catch (error) {
          if (
            areThemeSettingsSnapshotsEqual(snapshotRef.current, nextSnapshot)
          ) {
            setSnapshot(committedSnapshotRef.current);
          }
          throw error;
        } finally {
          pendingWriteCountRef.current -= 1;
        }
      };

      const queuedWrite = themeWriteQueueRef.current.then(runWrite, runWrite);
      themeWriteQueueRef.current = queuedWrite.catch(() => undefined);
      await queuedWrite;
    },
    [setSnapshot],
  );

  const persistThemeSettingsSnapshot = useCallback(
    async (nextSnapshot: ThemeSettingsSnapshot): Promise<void> => {
      await queueSnapshotWrite(nextSnapshot, async () => {
        const committedSnapshot = committedSnapshotRef.current;
        await writeThemeValue(nextSnapshot.theme);

        try {
          await writeCodeThemeId(nextSnapshot.codeThemeId);
        } catch (error) {
          await writeThemeValue(committedSnapshot.theme).catch(() => undefined);
          throw error;
        }

        committedSnapshotRef.current = nextSnapshot;
      });
    },
    [queueSnapshotWrite, writeCodeThemeId, writeThemeValue],
  );

  const persistTheme = useCallback(
    async (nextTheme: ChromeTheme): Promise<void> => {
      if (isDisabled) {
        return;
      }

      const nextSnapshot = {
        ...snapshotRef.current,
        theme: nextTheme,
      } satisfies ThemeSettingsSnapshot;
      await queueSnapshotWrite(nextSnapshot, async () => {
        const committedSnapshot = committedSnapshotRef.current;

        if (committedSnapshot.codeThemeId !== nextSnapshot.codeThemeId) {
          await writeCodeThemeId(nextSnapshot.codeThemeId);

          try {
            await writeThemeValue(nextTheme);
          } catch (error) {
            await writeCodeThemeId(committedSnapshot.codeThemeId).catch(
              () => undefined,
            );
            throw error;
          }

          committedSnapshotRef.current = nextSnapshot;
          return;
        }

        await writeThemeValue(nextTheme);
        committedSnapshotRef.current = nextSnapshot;
      });
    },
    [isDisabled, queueSnapshotWrite, writeCodeThemeId, writeThemeValue],
  );

  const setThemePatch = useCallback(
    (themePatch: Partial<ChromeTheme>): void => {
      void persistTheme(
        mergeChromeTheme(snapshotRef.current.theme, themePatch),
      ).catch(() => undefined);
    },
    [persistTheme],
  );

  const setFontsPatch = useCallback(
    (fontsPatch: Partial<ThemeFonts>): void => {
      void persistTheme(
        mergeChromeTheme(snapshotRef.current.theme, {
          fonts: fontsPatch,
        }),
      ).catch(() => undefined);
    },
    [persistTheme],
  );

  const setCodeThemeId = useCallback(
    async (themeId: CodeThemeId): Promise<void> => {
      if (isDisabled) {
        return;
      }

      const chromeThemeSeed = await getCodeThemeChromeThemeSeed(
        themeId,
        variant,
      );
      await persistThemeSettingsSnapshot({
        codeThemeId: themeId,
        theme: mergeChromeTheme(snapshotRef.current.theme, chromeThemeSeed),
      });
    },
    [isDisabled, persistThemeSettingsSnapshot, variant],
  );

  const exportThemeString = useCallback((): string => {
    return getThemeShareString({
      codeThemeId: snapshotRef.current.codeThemeId,
      theme: snapshotRef.current.theme,
      variant,
    });
  }, [variant]);

  const canImportThemeString = useCallback(
    (value: string): boolean => {
      try {
        getImportThemeSnapshot(value, variant, codeThemes);
        return true;
      } catch {
        return false;
      }
    },
    [codeThemes, variant],
  );

  const importThemeString = useCallback(
    async (value: string): Promise<void> => {
      if (isDisabled) {
        return;
      }

      await persistThemeSettingsSnapshot(
        getImportThemeSnapshot(value, variant, codeThemes),
      );
    },
    [codeThemes, isDisabled, persistThemeSettingsSnapshot, variant],
  );

  const activeSnapshot = snapshotRef.current;

  return {
    canImportThemeString,
    codeThemes,
    exportThemeString,
    fonts: activeSnapshot.theme.fonts,
    importThemeString,
    isDisabled,
    selectedCodeTheme: getCodeThemeOption(activeSnapshot.codeThemeId, variant),
    setCodeThemeId,
    setFontsPatch,
    setThemePatch,
    theme: activeSnapshot.theme,
  };
}

/**
 * Validates a shared theme string against the current variant and available code themes before it enters state.
 */
function getImportThemeSnapshot(
  value: string,
  variant: ThemeVariant,
  codeThemes: Array<CodeThemeOption>,
): ThemeSettingsSnapshot {
  const parsedValue = parseThemeShareValue(value);
  if (parsedValue.variant !== variant) {
    throw new Error("Theme variant mismatch");
  }
  const importedCodeTheme = codeThemes.find((codeTheme) => {
    return codeTheme.id === parsedValue.codeThemeId;
  });
  if (importedCodeTheme == null) {
    throw new Error("Theme code theme mismatch");
  }

  return {
    codeThemeId: importedCodeTheme.id,
    theme: getChromeTheme(parsedValue.theme, variant),
  };
}

/**
 * Maps a light or dark editor card to its persisted chrome/code theme configuration keys.
 */
function getThemeConfigurationKeys(variant: ThemeVariant): {
  chromeThemeConfigurationKey:
    | typeof ConfigurationKeys.APPEARANCE_DARK_CHROME_THEME
    | typeof ConfigurationKeys.APPEARANCE_LIGHT_CHROME_THEME;
  codeThemeConfigurationKey:
    | typeof ConfigurationKeys.APPEARANCE_DARK_CODE_THEME_ID
    | typeof ConfigurationKeys.APPEARANCE_LIGHT_CODE_THEME_ID;
} {
  if (variant === "light") {
    return {
      chromeThemeConfigurationKey:
        ConfigurationKeys.APPEARANCE_LIGHT_CHROME_THEME,
      codeThemeConfigurationKey:
        ConfigurationKeys.APPEARANCE_LIGHT_CODE_THEME_ID,
    };
  }

  return {
    chromeThemeConfigurationKey: ConfigurationKeys.APPEARANCE_DARK_CHROME_THEME,
    codeThemeConfigurationKey: ConfigurationKeys.APPEARANCE_DARK_CODE_THEME_ID,
  };
}

/**
 * Merges partial theme edits while preserving nested font-family fields.
 */
function mergeChromeTheme(
  theme: ChromeTheme,
  themePatch: Omit<Partial<ChromeTheme>, "fonts"> & {
    fonts?: Partial<ThemeFonts>;
  },
): ChromeTheme {
  return {
    ...theme,
    ...themePatch,
    fonts:
      themePatch.fonts == null
        ? theme.fonts
        : {
            ...theme.fonts,
            ...themePatch.fonts,
          },
    semanticColors:
      themePatch.semanticColors == null
        ? theme.semanticColors
        : {
            ...theme.semanticColors,
            ...themePatch.semanticColors,
          },
  };
}

/**
 * Compares queued theme snapshots so the write path knows when it is safe to roll back.
 */
function areThemeSettingsSnapshotsEqual(
  firstSnapshot: ThemeSettingsSnapshot,
  secondSnapshot: ThemeSettingsSnapshot,
): boolean {
  return (
    firstSnapshot.codeThemeId === secondSnapshot.codeThemeId &&
    areChromeThemesEqual(firstSnapshot.theme, secondSnapshot.theme)
  );
}

/**
 * Compares fully resolved chrome themes so save/export code can detect real user edits.
 */
export function areChromeThemesEqual(
  firstTheme: ChromeTheme,
  secondTheme: ChromeTheme,
): boolean {
  return (
    firstTheme.accent === secondTheme.accent &&
    firstTheme.contrast === secondTheme.contrast &&
    firstTheme.fonts.code === secondTheme.fonts.code &&
    firstTheme.fonts.ui === secondTheme.fonts.ui &&
    firstTheme.ink === secondTheme.ink &&
    firstTheme.opaqueWindows === secondTheme.opaqueWindows &&
    firstTheme.semanticColors.diffAdded ===
      secondTheme.semanticColors.diffAdded &&
    firstTheme.semanticColors.diffRemoved ===
      secondTheme.semanticColors.diffRemoved &&
    firstTheme.semanticColors.skill === secondTheme.semanticColors.skill &&
    firstTheme.surface === secondTheme.surface
  );
}

/**
 * Serializes the current theme card into the shared clipboard format.
 */
function getThemeShareString(value: ThemeShareValue): string {
  return `${THEME_SHARE_PREFIX}${JSON.stringify(value)}`;
}

/**
 * Parses the shared clipboard format back into a variant-scoped theme snapshot.
 */
function parseThemeShareValue(value: string): ThemeShareValue {
  const trimmedValue = value.trim();
  if (!trimmedValue.startsWith(THEME_SHARE_PREFIX)) {
    throw new Error("Theme share string mismatch");
  }

  const payload = trimmedValue.slice(THEME_SHARE_PREFIX.length);
  const parsedPayload = payload.startsWith("{")
    ? payload
    : decodeURIComponent(payload);
  return themeShareValueSchema.parse(JSON.parse(parsedPayload));
}
