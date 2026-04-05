import type { ThemeRegistrationResolved } from "@pierre/diffs";
import {
  CodeThemeIds,
  type ChromeTheme,
  type CodeThemeId,
  type ThemeSemanticColors,
  type ThemeVariant,
} from "protocol";

import { DEFAULT_CHROME_THEME_BY_VARIANT } from "./chrome-theme";

export type CodeThemeRegistration = {
  load: () => Promise<ThemeRegistrationResolved>;
  loadChromeThemeSeed: () => Promise<CodeThemeChromeThemeSeed>;
  name: string;
};

export type CodeThemeChromeThemeSeed = Partial<
  Pick<
    ChromeTheme,
    "accent" | "fonts" | "ink" | "opaqueWindows" | "semanticColors" | "surface"
  >
>;

export type CodeThemeOption = {
  id: CodeThemeId;
  label: string;
  registrationByVariant: Partial<Record<ThemeVariant, CodeThemeRegistration>>;
};

export const DEFAULT_CODE_THEME_ID = CodeThemeIds.CODEX;

const CHROME_THEME_SURFACE_KEYS = [
  "editor.background",
  "sideBar.background",
  "editorGroupHeader.tabsBackground",
  "panel.background",
  "activityBar.background",
] satisfies Array<string>;
const CHROME_THEME_INK_KEYS = [
  "editor.foreground",
  "sideBarTitle.foreground",
  "sideBar.foreground",
  "foreground",
] satisfies Array<string>;
const CHROME_THEME_ACCENT_KEYS = [
  "activityBarBadge.background",
  "textLink.foreground",
  "editorCursor.foreground",
  "focusBorder",
  "button.background",
  "activityBar.activeBorder",
] satisfies Array<string>;
const CHROME_THEME_DIFF_ADDED_KEYS = [
  "gitDecoration.addedResourceForeground",
  "gitDecoration.untrackedResourceForeground",
  "terminal.ansiGreen",
  "terminal.ansiBrightGreen",
] satisfies Array<string>;
const CHROME_THEME_DIFF_REMOVED_KEYS = [
  "gitDecoration.deletedResourceForeground",
  "terminal.ansiRed",
  "terminal.ansiBrightRed",
] satisfies Array<string>;
const CHROME_THEME_SKILL_KEYS = [
  "charts.purple",
  "terminal.ansiMagenta",
  "terminal.ansiBrightMagenta",
] satisfies Array<string>;
const MIN_ACCENT_ALPHA = 0.45;
const MIN_CHROMATIC_RANGE = 24;
const GREEN_HUE_RANGE = { max: 170, min: 80 } as const;
const GREEN_HUE_TARGET = 125;
const RED_HUE_RANGE = { max: 15, min: 345 } as const;
const RED_HUE_TARGET = 0;
const SKILL_HUE_RANGE = { max: 320, min: 210 } as const;
const SKILL_HUE_TARGET = 265;
const CODE_THEME_OPTION_LABEL_COLLATOR = new Intl.Collator(undefined, {
  sensitivity: "base",
});

const SHIKI_THEME_LOADERS = {
  "ayu-dark"(): Promise<{ default: unknown }> {
    return import("@shikijs/themes/ayu-dark");
  },
  "catppuccin-latte"(): Promise<{ default: unknown }> {
    return import("@shikijs/themes/catppuccin-latte");
  },
  "catppuccin-mocha"(): Promise<{ default: unknown }> {
    return import("@shikijs/themes/catppuccin-mocha");
  },
  "dark-plus"(): Promise<{ default: unknown }> {
    return import("@shikijs/themes/dark-plus");
  },
  dracula(): Promise<{ default: unknown }> {
    return import("@shikijs/themes/dracula");
  },
  "everforest-dark"(): Promise<{ default: unknown }> {
    return import("@shikijs/themes/everforest-dark");
  },
  "everforest-light"(): Promise<{ default: unknown }> {
    return import("@shikijs/themes/everforest-light");
  },
  "github-dark-default"(): Promise<{ default: unknown }> {
    return import("@shikijs/themes/github-dark-default");
  },
  "github-light-default"(): Promise<{ default: unknown }> {
    return import("@shikijs/themes/github-light-default");
  },
  "gruvbox-dark-medium"(): Promise<{ default: unknown }> {
    return import("@shikijs/themes/gruvbox-dark-medium");
  },
  "gruvbox-light-medium"(): Promise<{ default: unknown }> {
    return import("@shikijs/themes/gruvbox-light-medium");
  },
  "light-plus"(): Promise<{ default: unknown }> {
    return import("@shikijs/themes/light-plus");
  },
  "material-theme-darker"(): Promise<{ default: unknown }> {
    return import("@shikijs/themes/material-theme-darker");
  },
  monokai(): Promise<{ default: unknown }> {
    return import("@shikijs/themes/monokai");
  },
  "night-owl"(): Promise<{ default: unknown }> {
    return import("@shikijs/themes/night-owl");
  },
  nord(): Promise<{ default: unknown }> {
    return import("@shikijs/themes/nord");
  },
  "one-dark-pro"(): Promise<{ default: unknown }> {
    return import("@shikijs/themes/one-dark-pro");
  },
  "one-light"(): Promise<{ default: unknown }> {
    return import("@shikijs/themes/one-light");
  },
  "rose-pine-dawn"(): Promise<{ default: unknown }> {
    return import("@shikijs/themes/rose-pine-dawn");
  },
  "rose-pine-moon"(): Promise<{ default: unknown }> {
    return import("@shikijs/themes/rose-pine-moon");
  },
  "solarized-dark"(): Promise<{ default: unknown }> {
    return import("@shikijs/themes/solarized-dark");
  },
  "solarized-light"(): Promise<{ default: unknown }> {
    return import("@shikijs/themes/solarized-light");
  },
  "tokyo-night"(): Promise<{ default: unknown }> {
    return import("@shikijs/themes/tokyo-night");
  },
} satisfies Record<string, () => Promise<{ default: unknown }>>;

type ShikiThemeName = keyof typeof SHIKI_THEME_LOADERS;
type CodeThemeRegistrationDefinition = Partial<
  Record<
    ThemeVariant,
    {
      load: () => Promise<unknown>;
      name: string;
    }
  >
>;

const CODE_THEME_OPTIONS = [
  createShikiCodeThemeOption(CodeThemeIds.AYU, "Ayu", {
    dark: "ayu-dark",
  }),
  createShikiCodeThemeOption(CodeThemeIds.CATPPUCCIN, "Catppuccin", {
    dark: "catppuccin-mocha",
    light: "catppuccin-latte",
  }),
  createCodeThemeOption(CodeThemeIds.ABSOLUTELY, "Absolutely", {
    dark: {
      load: () => import("../diff/themes/absolutely-dark.json"),
      name: "Absolutely Dark",
    },
    light: {
      load: () => import("../diff/themes/absolutely-light.json"),
      name: "Absolutely Light",
    },
  }),
  createCodeThemeOption(CodeThemeIds.CODEX, "Codex", {
    dark: {
      load: () => import("../diff/themes/codex-dark.json"),
      name: "Codex Dark",
    },
    light: {
      load: () => import("../diff/themes/codex-light.json"),
      name: "Codex Light",
    },
  }),
  createShikiCodeThemeOption(CodeThemeIds.DRACULA, "Dracula", {
    dark: "dracula",
  }),
  createShikiCodeThemeOption(CodeThemeIds.EVERFOREST, "Everforest", {
    dark: "everforest-dark",
    light: "everforest-light",
  }),
  createShikiCodeThemeOption(CodeThemeIds.GITHUB, "GitHub", {
    dark: "github-dark-default",
    light: "github-light-default",
  }),
  createShikiCodeThemeOption(CodeThemeIds.GRUVBOX, "Gruvbox", {
    dark: "gruvbox-dark-medium",
    light: "gruvbox-light-medium",
  }),
  createCodeThemeOption(CodeThemeIds.LINEAR, "Linear", {
    dark: {
      load: () => import("../diff/themes/linear-dark.json"),
      name: "Linear Dark",
    },
    light: {
      load: () => import("../diff/themes/linear-light.json"),
      name: "Linear Light",
    },
  }),
  createCodeThemeOption(CodeThemeIds.LOBSTER, "Lobster", {
    dark: {
      load: () => import("../diff/themes/lobster-dark.json"),
      name: "Lobster Dark",
    },
  }),
  createShikiCodeThemeOption(CodeThemeIds.MATERIAL, "Material", {
    dark: "material-theme-darker",
  }),
  createCodeThemeOption(CodeThemeIds.MATRIX, "Matrix", {
    dark: {
      load: () => import("../diff/themes/matrix-dark.json"),
      name: "Matrix Dark",
    },
  }),
  createShikiCodeThemeOption(CodeThemeIds.MONOKAI, "Monokai", {
    dark: "monokai",
  }),
  createShikiCodeThemeOption(CodeThemeIds.NIGHT_OWL, "Night Owl", {
    dark: "night-owl",
  }),
  createShikiCodeThemeOption(CodeThemeIds.NORD, "Nord", {
    dark: "nord",
  }),
  createCodeThemeOption(CodeThemeIds.NOTION, "Notion", {
    dark: {
      load: () => import("../diff/themes/notion-dark.json"),
      name: "Notion Dark",
    },
    light: {
      load: () => import("../diff/themes/notion-light.json"),
      name: "Notion Light",
    },
  }),
  createCodeThemeOption(CodeThemeIds.OSCURANGE, "Oscurange", {
    dark: {
      load: () => import("../diff/themes/oscurange.json"),
      name: "Oscurange",
    },
  }),
  createShikiCodeThemeOption(CodeThemeIds.ONE, "One", {
    dark: "one-dark-pro",
    light: "one-light",
  }),
  createCodeThemeOption(CodeThemeIds.PROOF, "Proof", {
    light: {
      load: () => import("../diff/themes/proof-light.json"),
      name: "Proof Light",
    },
  }),
  createCodeThemeOption(CodeThemeIds.RAYCAST, "Raycast", {
    dark: {
      load: () => import("../diff/themes/raycast-dark.json"),
      name: "Raycast Dark",
    },
    light: {
      load: () => import("../diff/themes/raycast-light.json"),
      name: "Raycast Light",
    },
  }),
  createShikiCodeThemeOption(CodeThemeIds.ROSE_PINE, "Rose Pine", {
    dark: "rose-pine-moon",
    light: "rose-pine-dawn",
  }),
  createCodeThemeOption(CodeThemeIds.SENTRY, "Sentry", {
    dark: {
      load: () => import("../diff/themes/sentry-dark.json"),
      name: "Sentry Dark",
    },
  }),
  createShikiCodeThemeOption(CodeThemeIds.SOLARIZED, "Solarized", {
    dark: "solarized-dark",
    light: "solarized-light",
  }),
  createShikiCodeThemeOption(CodeThemeIds.TOKYO_NIGHT, "Tokyo Night", {
    dark: "tokyo-night",
  }),
  createCodeThemeOption(CodeThemeIds.TEMPLE, "Temple", {
    dark: {
      load: () => import("../diff/themes/temple-dark.json"),
      name: "Temple Dark",
    },
  }),
  createShikiCodeThemeOption(CodeThemeIds.VSCODE_PLUS, "VS Code Plus", {
    dark: "dark-plus",
    light: "light-plus",
  }),
] satisfies Array<CodeThemeOption>;

const CODE_THEME_IDS = CODE_THEME_OPTIONS.map((theme) => theme.id);

/**
 * Resolves the selected code theme or the best available fallback for a variant.
 * Used by settings, previews, and runtime theme loading.
 */
export function getCodeThemeOption(
  codeThemeId: CodeThemeId | undefined,
  variant?: ThemeVariant,
): CodeThemeOption {
  const availableThemes = getAvailableCodeThemes(variant);
  const selectedTheme = availableThemes.find((theme) => {
    return theme.id === codeThemeId;
  });
  if (selectedTheme) {
    return selectedTheme;
  }

  return (
    availableThemes.find((theme) => {
      return theme.id === DEFAULT_CODE_THEME_ID;
    }) ??
    availableThemes[0] ??
    CODE_THEME_OPTIONS[0]
  );
}

/**
 * Returns the picker list for a variant in user-facing alphabetical order.
 */
export function getCodeThemeOptions(
  variant?: ThemeVariant,
): Array<CodeThemeOption> {
  return getAvailableCodeThemes(variant).sort((firstTheme, secondTheme) => {
    return CODE_THEME_OPTION_LABEL_COLLATOR.compare(
      firstTheme.label,
      secondTheme.label,
    );
  });
}

/**
 * Flattens all variant registrations for Pierre/Shiki startup registration.
 */
export function getRegisteredCodeThemes(): Array<CodeThemeRegistration> {
  return CODE_THEME_OPTIONS.flatMap((theme) => {
    return Object.values(theme.registrationByVariant);
  }).filter((registration): registration is CodeThemeRegistration => {
    return registration != null;
  });
}

/**
 * Validates imported/shared theme ids against the live registry.
 */
export function isCodeThemeId(value: string): value is CodeThemeId {
  return CODE_THEME_IDS.some((codeThemeId) => {
    return codeThemeId === value;
  });
}

/**
 * Resolves the concrete registration for a theme variant before loading syntax or chrome seed data.
 */
export function getCodeThemeRegistration(
  codeThemeId: CodeThemeId | undefined,
  variant: ThemeVariant,
): CodeThemeRegistration {
  const registration = getCodeThemeOption(codeThemeId, variant)
    .registrationByVariant[variant];

  if (registration == null) {
    throw new Error(`Missing ${variant} code theme registration`);
  }

  return registration;
}

/**
 * Loads the small chrome seed for a selected code theme.
 * Theme settings uses this when a preset is chosen.
 */
export async function getCodeThemeChromeThemeSeed(
  codeThemeId: CodeThemeId | undefined,
  variant: ThemeVariant,
): Promise<CodeThemeChromeThemeSeed> {
  return getCodeThemeRegistration(codeThemeId, variant).loadChromeThemeSeed();
}

/**
 * Filters a theme option to the variants it actually supports.
 */
function isCodeThemeAvailable(
  theme: CodeThemeOption,
  variant: ThemeVariant | undefined,
): boolean {
  if (variant == null) {
    return true;
  }

  return theme.registrationByVariant[variant] != null;
}

/**
 * Returns the variant-filtered registry before label sorting and fallback selection.
 */
function getAvailableCodeThemes(
  variant: ThemeVariant | undefined,
): Array<CodeThemeOption> {
  return CODE_THEME_OPTIONS.filter((theme) => {
    return isCodeThemeAvailable(theme, variant);
  });
}

/**
 * Lazily loads a stock Shiki theme module by name.
 */
function loadShikiTheme(
  themeName: ShikiThemeName,
): Promise<{ default: unknown }> {
  return SHIKI_THEME_LOADERS[themeName]();
}

/**
 * Adapts a Shiki-only theme entry into the app's shared code-theme option shape.
 */
function createShikiCodeThemeOption(
  id: CodeThemeId,
  label: string,
  registrationByVariant: Partial<Record<ThemeVariant, ShikiThemeName>>,
): CodeThemeOption {
  const darkTheme = registrationByVariant.dark;
  const lightTheme = registrationByVariant.light;

  return createCodeThemeOption(id, label, {
    dark:
      darkTheme == null
        ? undefined
        : {
            load: () => loadShikiTheme(darkTheme),
            name: darkTheme,
          },
    light:
      lightTheme == null
        ? undefined
        : {
            load: () => loadShikiTheme(lightTheme),
            name: lightTheme,
          },
  });
}

/**
 * Builds a registry entry that can expose light and dark registrations under one user-facing theme.
 */
function createCodeThemeOption(
  id: CodeThemeId,
  label: string,
  registrationByVariant: CodeThemeRegistrationDefinition,
): CodeThemeOption {
  const nextRegistrationByVariant: CodeThemeOption["registrationByVariant"] =
    {};
  const darkRegistration = registrationByVariant.dark;
  const lightRegistration = registrationByVariant.light;

  if (darkRegistration != null) {
    nextRegistrationByVariant.dark = createCodeThemeRegistration(
      darkRegistration.name,
      "dark",
      darkRegistration.load,
    );
  }
  if (lightRegistration != null) {
    nextRegistrationByVariant.light = createCodeThemeRegistration(
      lightRegistration.name,
      "light",
      lightRegistration.load,
    );
  }

  return { id, label, registrationByVariant: nextRegistrationByVariant };
}

/**
 * Creates a lazily cached theme registration that serves both full syntax payloads and chrome seed data.
 */
function createCodeThemeRegistration(
  name: string,
  variant: ThemeVariant,
  loadThemeModule: () => Promise<unknown>,
): CodeThemeRegistration {
  let loadedThemePromise: Promise<
    ThemeRegistrationResolved & ThemeColorSource
  > | null = null;

  const loadTheme = async (): Promise<
    ThemeRegistrationResolved & ThemeColorSource
  > => {
    loadedThemePromise ??= loadThemeModule().then((themeModule) => {
      return (
        typeof themeModule === "object" &&
        themeModule != null &&
        "default" in themeModule
          ? themeModule.default
          : themeModule
      ) as ThemeRegistrationResolved & ThemeColorSource;
    });
    return loadedThemePromise;
  };

  return {
    load: loadTheme,
    loadChromeThemeSeed: (): Promise<CodeThemeChromeThemeSeed> =>
      loadTheme().then((theme) => {
        return mergeChromeThemeSeed(
          getChromeThemeSeed(theme, variant),
          theme.chromeTheme,
        );
      }),
    name,
  };
}

type ThemeColorSource = {
  chromeTheme?: CodeThemeChromeThemeSeed;
  colors?: Record<string, string>;
  settings?: Array<ThemeTokenColor>;
  tokenColors?: Array<{
    settings?: {
      foreground?: string;
    };
  }>;
};

type ThemeTokenColor = {
  settings?: {
    foreground?: string;
  };
};

type ParsedThemeColor = {
  alpha: number;
  blue: number;
  green: number;
  red: number;
};

type ThemeHueRange = {
  max: number;
  min: number;
};

/**
 * Extracts the reduced chrome seed from a full code theme.
 * Syntax highlighting still consumes the full theme separately.
 */
function getChromeThemeSeed(
  theme: ThemeRegistrationResolved & ThemeColorSource,
  variant: ThemeVariant,
): CodeThemeChromeThemeSeed {
  const fallbackTheme = DEFAULT_CHROME_THEME_BY_VARIANT[variant];
  const surface =
    getThemeColor(theme.colors, CHROME_THEME_SURFACE_KEYS) ??
    fallbackTheme.surface;
  const ink =
    getThemeColor(theme.colors, CHROME_THEME_INK_KEYS) ?? fallbackTheme.ink;
  const accent = getAccentColor(theme, surface, ink) ?? fallbackTheme.accent;

  return {
    accent,
    ink,
    semanticColors: getThemeSemanticColors(
      theme,
      surface,
      ink,
      accent,
      variant,
    ),
    surface,
  };
}

/**
 * Applies app-owned theme metadata from bundled theme JSON on top of extracted colors.
 */
function mergeChromeThemeSeed(
  themeSeed: CodeThemeChromeThemeSeed,
  seedPatch: CodeThemeChromeThemeSeed | undefined,
): CodeThemeChromeThemeSeed {
  if (seedPatch == null) {
    return themeSeed;
  }

  return {
    ...themeSeed,
    ...seedPatch,
    fonts:
      seedPatch.fonts == null
        ? themeSeed.fonts
        : {
            ...themeSeed.fonts,
            ...seedPatch.fonts,
          },
    semanticColors:
      seedPatch.semanticColors == null
        ? themeSeed.semanticColors
        : {
            ...themeSeed.semanticColors,
            ...seedPatch.semanticColors,
          },
  };
}

/**
 * Picks the theme-owned semantic accents used outside syntax highlighting, like diff stats and skill chips.
 */
function getThemeSemanticColors(
  theme: ThemeRegistrationResolved & ThemeColorSource,
  surface: string,
  ink: string,
  accent: string,
  variant: ThemeVariant,
): ThemeSemanticColors {
  const fallbackTheme = DEFAULT_CHROME_THEME_BY_VARIANT[variant];

  return {
    diffAdded:
      getThemeColor(theme.colors, CHROME_THEME_DIFF_ADDED_KEYS) ??
      getThemeColorByHue(
        theme,
        surface,
        ink,
        GREEN_HUE_RANGE,
        GREEN_HUE_TARGET,
      ) ??
      fallbackTheme.semanticColors.diffAdded,
    diffRemoved:
      getThemeColor(theme.colors, CHROME_THEME_DIFF_REMOVED_KEYS) ??
      getThemeColorByHue(theme, surface, ink, RED_HUE_RANGE, RED_HUE_TARGET) ??
      fallbackTheme.semanticColors.diffRemoved,
    skill:
      getThemeColor(theme.colors, CHROME_THEME_SKILL_KEYS) ??
      getThemeColorByHue(
        theme,
        surface,
        ink,
        SKILL_HUE_RANGE,
        SKILL_HUE_TARGET,
      ) ??
      (!isNearThemeColor(accent, surface) && !isNearThemeColor(accent, ink)
        ? accent
        : fallbackTheme.semanticColors.skill),
  };
}

/**
 * Scans ordered VS Code color keys and returns the first solid candidate.
 */
function getThemeColor(
  colors: Record<string, string> | undefined,
  colorKeys: Array<string>,
): string | undefined {
  if (colors == null) {
    return undefined;
  }

  for (const colorKey of colorKeys) {
    const colorValue = getSolidThemeColor(colors[colorKey]);
    if (colorValue != null) {
      return colorValue;
    }
  }

  return undefined;
}

/**
 * Chooses an accent color that is vivid enough and distinct from the selected surface and ink.
 */
function getAccentColor(
  theme: ThemeRegistrationResolved & ThemeColorSource,
  surface: string,
  ink: string,
): string | undefined {
  for (const colorKey of CHROME_THEME_ACCENT_KEYS) {
    const colorValue = getSolidThemeColor(theme.colors?.[colorKey], {
      minimumAlpha: MIN_ACCENT_ALPHA,
      minimumChromaticRange: MIN_CHROMATIC_RANGE,
    });
    if (
      colorValue != null &&
      !isNearThemeColor(colorValue, surface) &&
      !isNearThemeColor(colorValue, ink)
    ) {
      return colorValue;
    }
  }

  let bestTokenColor: string | undefined;
  let bestTokenScore = -1;

  for (const tokenColor of getThemeTokenColors(theme)) {
    const colorValue = getSolidThemeColor(tokenColor.settings?.foreground, {
      minimumAlpha: MIN_ACCENT_ALPHA,
      minimumChromaticRange: MIN_CHROMATIC_RANGE,
    });
    if (
      colorValue == null ||
      isNearThemeColor(colorValue, surface) ||
      isNearThemeColor(colorValue, ink)
    ) {
      continue;
    }

    const colorScore = getThemeColorScore(colorValue, surface, ink);
    if (colorScore > bestTokenScore) {
      bestTokenColor = colorValue;
      bestTokenScore = colorScore;
    }
  }

  return bestTokenColor;
}

/**
 * Unifies tokenColors and top-level settings so custom bundled themes and stock Shiki themes share one fallback path.
 */
function getThemeTokenColors(
  theme: ThemeRegistrationResolved & ThemeColorSource,
): Array<ThemeTokenColor> {
  return [...(theme.tokenColors ?? []), ...(theme.settings ?? [])];
}

/**
 * Chooses the most theme-appropriate color inside a hue family for semantic accents.
 */
function getThemeColorByHue(
  theme: ThemeRegistrationResolved & ThemeColorSource,
  surface: string,
  ink: string,
  hueRange: ThemeHueRange,
  targetHue: number,
): string | undefined {
  let bestColor: string | undefined;
  let bestScore = -1;

  for (const colorValue of getThemeColorCandidates(theme)) {
    if (
      isNearThemeColor(colorValue, surface) ||
      isNearThemeColor(colorValue, ink)
    ) {
      continue;
    }

    const color = parseThemeColor(colorValue);
    if (color == null) {
      continue;
    }

    const hue = getThemeHue(color);
    if (hue == null || !isThemeHueInRange(hue, hueRange)) {
      continue;
    }

    const score =
      getThemeColorScore(colorValue, surface, ink) -
      getThemeHueDistance(hue, targetHue) * 2;
    if (score > bestScore) {
      bestColor = colorValue;
      bestScore = score;
    }
  }

  return bestColor;
}

/**
 * Flattens all vivid theme colors we can safely reuse for semantic accents.
 */
function getThemeColorCandidates(
  theme: ThemeRegistrationResolved & ThemeColorSource,
): Array<string> {
  const themeColorCandidates = Object.values(theme.colors ?? {});
  const tokenColorCandidates = getThemeTokenColors(theme).map((tokenColor) => {
    return tokenColor.settings?.foreground;
  });
  const colors = new Set<string>();

  for (const colorValue of [...themeColorCandidates, ...tokenColorCandidates]) {
    const solidColor = getSolidThemeColor(colorValue, {
      minimumAlpha: MIN_ACCENT_ALPHA,
      minimumChromaticRange: MIN_CHROMATIC_RANGE,
    });
    if (solidColor != null) {
      colors.add(solidColor);
    }
  }

  return [...colors];
}

/**
 * Parses a theme color and rejects translucent or low-chroma candidates when required.
 */
function getSolidThemeColor(
  colorValue: string | undefined,
  options?: {
    minimumAlpha?: number;
    minimumChromaticRange?: number;
  },
): string | undefined {
  const parsedColor = parseThemeColor(colorValue);
  if (parsedColor == null) {
    return undefined;
  }

  const { minimumAlpha = 0.98, minimumChromaticRange = 0 } = options ?? {};
  if (parsedColor.alpha < minimumAlpha) {
    return undefined;
  }

  if (getChromaticRange(parsedColor) < minimumChromaticRange) {
    return undefined;
  }

  return toThemeHex(parsedColor);
}

/**
 * Parses #rrggbb or #rrggbbaa theme colors into channels for scoring.
 */
function parseThemeColor(
  colorValue: string | undefined,
): ParsedThemeColor | undefined {
  if (colorValue == null) {
    return undefined;
  }

  const trimmedColorValue = colorValue.trim();
  if (!/^#[0-9a-fA-F]{6}([0-9a-fA-F]{2})?$/.test(trimmedColorValue)) {
    return undefined;
  }

  const alphaChannel =
    trimmedColorValue.length === 9 ? trimmedColorValue.slice(7, 9) : "ff";

  return {
    alpha: Number.parseInt(alphaChannel, 16) / 255,
    blue: Number.parseInt(trimmedColorValue.slice(5, 7), 16),
    green: Number.parseInt(trimmedColorValue.slice(3, 5), 16),
    red: Number.parseInt(trimmedColorValue.slice(1, 3), 16),
  };
}

/**
 * Treats colors as equivalent when they are too close to be useful as a distinct theme seed.
 */
function isNearThemeColor(
  colorValue: string,
  otherColorValue: string,
): boolean {
  const color = parseThemeColor(colorValue);
  const otherColor = parseThemeColor(otherColorValue);
  if (color == null || otherColor == null) {
    return false;
  }

  return getThemeColorDistance(color, otherColor) < 42;
}

/**
 * Scores accent candidates by vividness and distance from the chosen surface and ink.
 */
function getThemeColorScore(
  colorValue: string,
  surface: string,
  ink: string,
): number {
  const color = parseThemeColor(colorValue);
  const surfaceColor = parseThemeColor(surface);
  const inkColor = parseThemeColor(ink);
  if (color == null || surfaceColor == null || inkColor == null) {
    return 0;
  }

  return (
    getChromaticRange(color) +
    getThemeColorDistance(color, surfaceColor) / 4 +
    getThemeColorDistance(color, inkColor) / 4
  );
}

/**
 * Measures Euclidean distance between two parsed RGB colors for seed selection.
 */
function getThemeColorDistance(
  firstColor: ParsedThemeColor,
  secondColor: ParsedThemeColor,
): number {
  return Math.sqrt(
    (firstColor.red - secondColor.red) ** 2 +
      (firstColor.green - secondColor.green) ** 2 +
      (firstColor.blue - secondColor.blue) ** 2,
  );
}

/**
 * Converts a parsed RGB color into a hue angle so we can pick semantic colors by family.
 */
function getThemeHue(color: ParsedThemeColor): number | null {
  const red = color.red / 255;
  const green = color.green / 255;
  const blue = color.blue / 255;
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const delta = max - min;

  if (delta === 0) {
    return null;
  }

  let hue: number;
  if (max === red) {
    hue = (((green - blue) / delta) % 6) * 60;
  } else if (max === green) {
    hue = ((blue - red) / delta + 2) * 60;
  } else {
    hue = ((red - green) / delta + 4) * 60;
  }
  return (hue + 360) % 360;
}

/**
 * Handles circular hue ranges, including wraparound ranges like red near 0 degrees.
 */
function isThemeHueInRange(hue: number, hueRange: ThemeHueRange): boolean {
  if (hueRange.min <= hueRange.max) {
    return hue >= hueRange.min && hue <= hueRange.max;
  }

  return hue >= hueRange.min || hue <= hueRange.max;
}

/**
 * Measures circular hue distance so nearby reds on either side of 0 degrees score together.
 */
function getThemeHueDistance(firstHue: number, secondHue: number): number {
  const rawDistance = Math.abs(firstHue - secondHue);
  return Math.min(rawDistance, 360 - rawDistance);
}

/**
 * Measures how colorful a parsed RGB value is by its channel spread.
 */
function getChromaticRange(color: ParsedThemeColor): number {
  return (
    Math.max(color.red, color.green, color.blue) -
    Math.min(color.red, color.green, color.blue)
  );
}

/**
 * Converts a parsed theme color back into canonical #rrggbb form.
 */
function toThemeHex(color: ParsedThemeColor): string {
  return `#${color.red.toString(16).padStart(2, "0")}${color.green
    .toString(16)
    .padStart(2, "0")}${color.blue.toString(16).padStart(2, "0")}`;
}
