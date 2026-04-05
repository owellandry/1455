import type {
  ChromeTheme,
  ThemeFonts,
  ThemeSemanticColors,
  ThemeVariant,
} from "protocol";

export const DEFAULT_CHROME_THEME_BY_VARIANT = {
  dark: {
    accent: "#339cff",
    contrast: 60,
    fonts: {
      code: null,
      ui: null,
    },
    ink: "#ffffff",
    opaqueWindows: false,
    semanticColors: {
      diffAdded: "#40c977",
      diffRemoved: "#fa423e",
      skill: "#ad7bf9",
    },
    surface: "#181818",
  },
  light: {
    accent: "#339cff",
    contrast: 45,
    fonts: {
      code: null,
      ui: null,
    },
    ink: "#0d0d0d",
    opaqueWindows: false,
    semanticColors: {
      diffAdded: "#00a240",
      diffRemoved: "#ba2623",
      skill: "#924ff7",
    },
    surface: "#ffffff",
  },
} satisfies Record<ThemeVariant, ChromeTheme>;

export const MIN_CHROME_THEME_CONTRAST = 0;
export const MAX_CHROME_THEME_CONTRAST = 100;

const BLACK = { blue: 0, green: 0, red: 0 } as const satisfies RGB;
const WHITE = { blue: 255, green: 255, red: 255 } as const satisfies RGB;
const CONTRAST_PIVOT_BY_VARIANT = {
  dark: DEFAULT_CHROME_THEME_BY_VARIANT.dark.contrast,
  light: DEFAULT_CHROME_THEME_BY_VARIANT.light.contrast,
} satisfies Record<ThemeVariant, number>;
const CONTRAST_EXPANSION = 0.7;
const HIGH_CONTRAST_RANGE_MULTIPLIER = 2;
const SURFACE_UNDER_BASE_MIX_BY_VARIANT = {
  dark: 0.16,
  light: 0.04,
} satisfies Record<ThemeVariant, number>;
const SURFACE_UNDER_STEP_BY_VARIANT = {
  dark: 0.0015,
  light: 0.0012,
} satisfies Record<ThemeVariant, number>;
const PANEL_BASE_MIX_BY_VARIANT = {
  dark: 0.03,
  light: 0.18,
} satisfies Record<ThemeVariant, number>;
const PANEL_STEP_BY_VARIANT = {
  dark: 0.03,
  light: 0.008,
} satisfies Record<ThemeVariant, number>;

type RGB = {
  blue: number;
  green: number;
  red: number;
};

type ChromeThemeState = {
  accent: RGB;
  contrast: number;
  editorBackground: RGB;
  ink: RGB;
  surface: RGB;
  surfaceUnder: string;
  theme: ChromeTheme;
  variant: ThemeVariant;
};

type ChromeThemePalette = {
  accentBackground: string;
  accentBackgroundActive: string;
  accentBackgroundHover: string;
  border: string;
  borderFocus: string;
  borderHeavy: string;
  borderLight: string;
  buttonPrimaryBackground: string;
  buttonPrimaryBackgroundActive: string;
  buttonPrimaryBackgroundHover: string;
  buttonPrimaryBackgroundInactive: string;
  buttonSecondaryBackground: string;
  buttonSecondaryBackgroundActive: string;
  buttonSecondaryBackgroundHover: string;
  buttonSecondaryBackgroundInactive: string;
  buttonTertiaryBackground: string;
  buttonTertiaryBackgroundActive: string;
  buttonTertiaryBackgroundHover: string;
  controlBackground: string;
  controlBackgroundOpaque: string;
  elevatedPrimary: string;
  elevatedPrimaryOpaque: string;
  elevatedSecondary: string;
  elevatedSecondaryOpaque: string;
  iconAccent: string;
  iconPrimary: string;
  iconSecondary: string;
  iconTertiary: string;
  simpleScrim: string;
  textAccent: string;
  textButtonPrimary: string;
  textButtonSecondary: string;
  textButtonTertiary: string;
  textForeground: string;
  textForegroundSecondary: string;
  textForegroundTertiary: string;
};

/**
 * Normalizes persisted chrome theme values before palette derivation.
 * Used by appearance-provider and theme import/export flows.
 */
export function getChromeTheme(
  themeValue: ChromeTheme | undefined,
  variant: ThemeVariant,
): ChromeTheme {
  const fallbackTheme = DEFAULT_CHROME_THEME_BY_VARIANT[variant];
  return {
    accent: getColorHex(themeValue?.accent) ?? fallbackTheme.accent,
    contrast: getThemeContrast(themeValue?.contrast, fallbackTheme.contrast),
    fonts: getThemeFonts(themeValue?.fonts),
    ink: getColorHex(themeValue?.ink) ?? fallbackTheme.ink,
    opaqueWindows: themeValue?.opaqueWindows ?? fallbackTheme.opaqueWindows,
    semanticColors: getThemeSemanticColors(
      themeValue?.semanticColors,
      fallbackTheme.semanticColors,
    ),
    surface: getColorHex(themeValue?.surface) ?? fallbackTheme.surface,
  };
}

/**
 * Clamps stored contrast values to the supported slider range.
 * Used by the persisted theme loader and the internal contrast curve.
 */
export function getThemeContrast(
  contrastValue: number | undefined,
  fallbackValue: number,
): number {
  if (contrastValue == null || Number.isNaN(contrastValue)) {
    return fallbackValue;
  }

  return Math.min(
    MAX_CHROME_THEME_CONTRAST,
    Math.max(MIN_CHROME_THEME_CONTRAST, Math.round(contrastValue)),
  );
}

/**
 * Builds the semantic CSS variable record for the active Electron theme.
 * AppearanceProvider writes this object onto the Electron root element.
 */
export function getChromeThemeVariables(
  theme: ChromeTheme,
  variant: ThemeVariant,
): Record<string, string> {
  const state = getChromeThemeState(theme, variant);
  const palette =
    variant === "light"
      ? getLightChromeThemePalette(state)
      : getDarkChromeThemePalette(state);

  return getChromeThemeVariableRecord(state, palette);
}

/**
 * Parses the persisted theme once and computes shared derived values for both palette builders.
 */
function getChromeThemeState(
  theme: ChromeTheme,
  variant: ThemeVariant,
): ChromeThemeState {
  const contrast = getThemeContrastScale(theme.contrast, variant);
  const surface = parseHexColor(theme.surface);
  const ink = parseHexColor(theme.ink);
  const accent = parseHexColor(theme.accent);
  const editorBackground =
    variant === "light"
      ? mixRgb(surface, WHITE, 0.12)
      : mixRgb(surface, ink, 0.07);
  const surfaceUnder = getSurfaceUnder(theme, surface, ink, variant);

  return {
    accent,
    contrast,
    editorBackground,
    ink,
    surface,
    surfaceUnder,
    theme,
    variant,
  };
}

/**
 * Resolves per-theme font overrides and collapses empty strings to null.
 */
function getThemeFonts(themeFonts: ThemeFonts | undefined): ThemeFonts {
  return {
    code: getThemeFontFamily(themeFonts?.code),
    ui: getThemeFontFamily(themeFonts?.ui),
  };
}

/**
 * Resolves the non-editable semantic accents that theme presets still persist and share.
 */
function getThemeSemanticColors(
  semanticColors: Partial<ThemeSemanticColors> | undefined,
  fallbackSemanticColors: ThemeSemanticColors,
): ThemeSemanticColors {
  return {
    diffAdded:
      getColorHex(semanticColors?.diffAdded) ??
      fallbackSemanticColors.diffAdded,
    diffRemoved:
      getColorHex(semanticColors?.diffRemoved) ??
      fallbackSemanticColors.diffRemoved,
    skill: getColorHex(semanticColors?.skill) ?? fallbackSemanticColors.skill,
  };
}

/**
 * Collapses empty font-family strings back to null so stored themes stay canonical.
 */
function getThemeFontFamily(
  fontFamily: string | null | undefined,
): string | null {
  const trimmedFontFamily = fontFamily?.trim() ?? "";
  return trimmedFontFamily.length > 0 ? trimmedFontFamily : null;
}

/**
 * Maps the derived palette into the semantic --color-* surface consumed by app-theme.css.
 */
function getChromeThemeVariableRecord(
  state: ChromeThemeState,
  palette: ChromeThemePalette,
): Record<string, string> {
  return {
    "--codex-base-accent": state.theme.accent,
    "--codex-base-contrast": String(state.theme.contrast),
    "--codex-base-ink": state.theme.ink,
    "--codex-base-surface": state.theme.surface,
    "--color-accent-blue": state.theme.accent,
    "--color-accent-purple": state.theme.semanticColors.skill,
    "--color-background-accent": palette.accentBackground,
    "--color-background-accent-active": palette.accentBackgroundActive,
    "--color-background-accent-hover": palette.accentBackgroundHover,
    "--color-background-button-primary": palette.buttonPrimaryBackground,
    "--color-background-button-primary-active":
      palette.buttonPrimaryBackgroundActive,
    "--color-background-button-primary-hover":
      palette.buttonPrimaryBackgroundHover,
    "--color-background-button-primary-inactive":
      palette.buttonPrimaryBackgroundInactive,
    "--color-background-button-secondary": palette.buttonSecondaryBackground,
    "--color-background-button-secondary-active":
      palette.buttonSecondaryBackgroundActive,
    "--color-background-button-secondary-hover":
      palette.buttonSecondaryBackgroundHover,
    "--color-background-button-secondary-inactive":
      palette.buttonSecondaryBackgroundInactive,
    "--color-background-button-tertiary": palette.buttonTertiaryBackground,
    "--color-background-button-tertiary-active":
      palette.buttonTertiaryBackgroundActive,
    "--color-background-button-tertiary-hover":
      palette.buttonTertiaryBackgroundHover,
    "--color-background-control": palette.controlBackground,
    "--color-background-control-opaque": palette.controlBackgroundOpaque,
    "--color-background-editor-opaque": toRgbString(state.editorBackground),
    "--color-background-elevated-primary": palette.elevatedPrimary,
    "--color-background-elevated-primary-opaque": palette.elevatedPrimaryOpaque,
    "--color-background-elevated-secondary": palette.elevatedSecondary,
    "--color-background-elevated-secondary-opaque":
      palette.elevatedSecondaryOpaque,
    "--color-background-panel": getPanelBackground(state),
    "--color-background-surface": state.theme.surface,
    "--color-background-surface-under": state.surfaceUnder,
    "--color-border": palette.border,
    "--color-border-focus": palette.borderFocus,
    "--color-border-heavy": palette.borderHeavy,
    "--color-border-light": palette.borderLight,
    "--color-decoration-added": state.theme.semanticColors.diffAdded,
    "--color-decoration-deleted": state.theme.semanticColors.diffRemoved,
    "--color-editor-added": alpha(
      parseHexColor(state.theme.semanticColors.diffAdded),
      state.variant === "light" ? 0.15 : 0.23,
    ),
    "--color-editor-deleted": alpha(
      parseHexColor(state.theme.semanticColors.diffRemoved),
      state.variant === "light" ? 0.15 : 0.23,
    ),
    "--color-icon-accent": palette.iconAccent,
    "--color-icon-primary": palette.iconPrimary,
    "--color-icon-secondary": palette.iconSecondary,
    "--color-icon-tertiary": palette.iconTertiary,
    "--color-simple-scrim": palette.simpleScrim,
    "--color-text-accent": palette.textAccent,
    "--color-text-button-primary": palette.textButtonPrimary,
    "--color-text-button-secondary": palette.textButtonSecondary,
    "--color-text-button-tertiary": palette.textButtonTertiary,
    "--color-text-foreground": palette.textForeground,
    "--color-text-foreground-secondary": palette.textForegroundSecondary,
    "--color-text-foreground-tertiary": palette.textForegroundTertiary,
  };
}

/**
 * Builds the light-mode semantic palette from the shared chrome theme state.
 */
function getLightChromeThemePalette(
  state: ChromeThemeState,
): ChromeThemePalette {
  const controlSurface = mixRgb(
    state.surface,
    WHITE,
    0.09 + state.contrast * 0.04,
  );
  const elevatedSecondarySurface = mixRgb(
    state.surface,
    WHITE,
    0.08 + state.contrast * 0.08,
  );
  const raisedSurface = mixRgb(
    state.surface,
    WHITE,
    0.16 + state.contrast * 0.12,
  );

  return {
    accentBackground: mix(
      state.surface,
      state.accent,
      0.11 + state.contrast * 0.04,
    ),
    accentBackgroundActive: mix(
      state.surface,
      state.accent,
      0.13 + state.contrast * 0.05,
    ),
    accentBackgroundHover: mix(
      state.surface,
      state.accent,
      0.12 + state.contrast * 0.045,
    ),
    border: alpha(state.ink, 0.06 + state.contrast * 0.04),
    borderFocus: state.theme.accent,
    borderHeavy: alpha(state.ink, 0.09 + state.contrast * 0.06),
    borderLight: alpha(state.ink, 0.04 + state.contrast * 0.02),
    buttonPrimaryBackground: state.theme.ink,
    buttonPrimaryBackgroundActive: alpha(
      state.ink,
      0.1 + state.contrast * 0.12,
    ),
    buttonPrimaryBackgroundHover: alpha(
      state.ink,
      0.05 + state.contrast * 0.06,
    ),
    buttonPrimaryBackgroundInactive: alpha(
      state.ink,
      0.18 + state.contrast * 0.14,
    ),
    buttonSecondaryBackground: alpha(state.ink, 0.04 + state.contrast * 0.02),
    buttonSecondaryBackgroundActive: alpha(
      state.ink,
      0.03 + state.contrast * 0.02,
    ),
    buttonSecondaryBackgroundHover: alpha(
      state.ink,
      0.04 + state.contrast * 0.03,
    ),
    buttonSecondaryBackgroundInactive: alpha(
      state.ink,
      0.01 + state.contrast * 0.02,
    ),
    buttonTertiaryBackground: alpha(state.ink, 0),
    buttonTertiaryBackgroundActive: alpha(
      state.ink,
      0.16 + state.contrast * 0.08,
    ),
    buttonTertiaryBackgroundHover: alpha(
      state.ink,
      0.08 + state.contrast * 0.04,
    ),
    controlBackground: alpha(controlSurface, 0.96),
    controlBackgroundOpaque: toRgbString(controlSurface),
    elevatedPrimary: alpha(raisedSurface, 0.96),
    elevatedPrimaryOpaque: toRgbString(raisedSurface),
    elevatedSecondary: alpha(elevatedSecondarySurface, 0.96),
    elevatedSecondaryOpaque: toRgbString(elevatedSecondarySurface),
    iconAccent: state.theme.accent,
    iconPrimary: state.theme.ink,
    iconSecondary: alpha(state.ink, 0.65 + state.contrast * 0.1),
    iconTertiary: alpha(state.ink, 0.45 + state.contrast * 0.1),
    simpleScrim: alpha(BLACK, 0.08 + state.contrast * 0.04),
    textAccent: state.theme.accent,
    textButtonPrimary: state.theme.surface,
    textButtonSecondary: state.theme.ink,
    textButtonTertiary: alpha(state.ink, 0.45 + state.contrast * 0.1),
    textForeground: state.theme.ink,
    textForegroundSecondary: alpha(state.ink, 0.65 + state.contrast * 0.1),
    textForegroundTertiary: alpha(state.ink, 0.45 + state.contrast * 0.1),
  };
}

/**
 * Builds the dark-mode semantic palette from the shared chrome theme state.
 */
function getDarkChromeThemePalette(
  state: ChromeThemeState,
): ChromeThemePalette {
  const controlSurface = mixRgb(
    state.surface,
    state.ink,
    0.06 + state.contrast * 0.05,
  );
  const lightAccent = mixRgb(state.accent, WHITE, 0.3 + state.contrast * 0.15);
  const darkPrimary = mixRgb(
    state.surface,
    BLACK,
    0.38 + state.contrast * 0.12,
  );
  const raisedSurface = mixRgb(
    state.surface,
    state.ink,
    0.08 + state.contrast * 0.08,
  );

  return {
    accentBackground: mix(BLACK, state.accent, 0.2 + state.contrast * 0.08),
    accentBackgroundActive: mix(
      BLACK,
      state.accent,
      0.22 + state.contrast * 0.12,
    ),
    accentBackgroundHover: mix(
      BLACK,
      state.accent,
      0.21 + state.contrast * 0.1,
    ),
    border: alpha(state.ink, 0.06 + state.contrast * 0.04),
    borderFocus: alpha(lightAccent, 0.7 + state.contrast * 0.1),
    borderHeavy: alpha(state.ink, 0.12 + state.contrast * 0.06),
    borderLight: alpha(state.ink, 0.03 + state.contrast * 0.02),
    buttonPrimaryBackground: toRgbString(darkPrimary),
    buttonPrimaryBackgroundActive: alpha(
      state.ink,
      0.07 + state.contrast * 0.05,
    ),
    buttonPrimaryBackgroundHover: alpha(
      state.ink,
      0.04 + state.contrast * 0.03,
    ),
    buttonPrimaryBackgroundInactive: alpha(
      state.ink,
      0.02 + state.contrast * 0.02,
    ),
    buttonSecondaryBackground: alpha(state.ink, 0.04 + state.contrast * 0.02),
    buttonSecondaryBackgroundActive: alpha(
      state.ink,
      0.09 + state.contrast * 0.05,
    ),
    buttonSecondaryBackgroundHover: alpha(
      state.ink,
      0.06 + state.contrast * 0.03,
    ),
    buttonSecondaryBackgroundInactive: alpha(
      state.ink,
      0.02 + state.contrast * 0.03,
    ),
    buttonTertiaryBackground: alpha(state.ink, 0.02 + state.contrast * 0.015),
    buttonTertiaryBackgroundActive: alpha(
      state.ink,
      0.07 + state.contrast * 0.05,
    ),
    buttonTertiaryBackgroundHover: alpha(
      state.ink,
      0.05 + state.contrast * 0.03,
    ),
    controlBackground: alpha(controlSurface, 0.96),
    controlBackgroundOpaque: toRgbString(controlSurface),
    elevatedPrimary: alpha(raisedSurface, 0.96),
    elevatedPrimaryOpaque: toRgbString(raisedSurface),
    elevatedSecondary: alpha(state.ink, 0.02 + state.contrast * 0.02),
    elevatedSecondaryOpaque: mix(
      state.surface,
      state.ink,
      0.04 + state.contrast * 0.05,
    ),
    iconAccent: toRgbString(lightAccent),
    iconPrimary: alpha(state.ink, 0.82 + state.contrast * 0.14),
    iconSecondary: alpha(state.ink, 0.65 + state.contrast * 0.1),
    iconTertiary: alpha(state.ink, 0.45 + state.contrast * 0.1),
    simpleScrim: alpha(state.ink, 0.08 + state.contrast * 0.04),
    textAccent: toRgbString(lightAccent),
    textButtonPrimary: toRgbString(darkPrimary),
    textButtonSecondary: mix(
      state.ink,
      state.surface,
      0.7 + state.contrast * 0.1,
    ),
    textButtonTertiary: alpha(state.ink, 0.45 + state.contrast * 0.1),
    textForeground: state.theme.ink,
    textForegroundSecondary: alpha(state.ink, 0.65 + state.contrast * 0.1),
    textForegroundTertiary: alpha(state.ink, 0.42 + state.contrast * 0.13),
  };
}

/**
 * Accepts only canonical #rrggbb inputs before they enter the palette math.
 */
function getColorHex(colorValue: string | undefined): string | undefined {
  if (colorValue == null) {
    return undefined;
  }

  const trimmedValue = colorValue.trim();
  if (!/^#[0-9a-fA-F]{6}$/.test(trimmedValue)) {
    return undefined;
  }

  return trimmedValue.toLowerCase();
}

/**
 * Expands the 0..100 slider value into the internal contrast curve used by palette derivation.
 */
export function getThemeContrastScale(
  contrastValue: number,
  variant: ThemeVariant,
): number {
  const contrastPivot = CONTRAST_PIVOT_BY_VARIANT[variant];
  const pivotScale = contrastPivot / 100;
  const contrastScale =
    contrastValue / 100 +
    ((contrastValue - contrastPivot) / 60) * CONTRAST_EXPANSION;

  if (contrastValue <= contrastPivot) {
    return contrastScale;
  }

  return (
    pivotScale + (contrastScale - pivotScale) * HIGH_CONTRAST_RANGE_MULTIPLIER
  );
}

/**
 * Computes the underlay surface used by the shell/sidebar chrome.
 */
function getSurfaceUnder(
  theme: ChromeTheme,
  surface: RGB,
  ink: RGB,
  variant: ThemeVariant,
): string {
  const contrastPivot = CONTRAST_PIVOT_BY_VARIANT[variant];
  const mixAmount =
    SURFACE_UNDER_BASE_MIX_BY_VARIANT[variant] +
    (theme.contrast - contrastPivot) * SURFACE_UNDER_STEP_BY_VARIANT[variant];

  if (variant === "light") {
    return mix(surface, ink, mixAmount);
  }

  return mix(surface, BLACK, mixAmount);
}

/**
 * Derives the settings/panel surface that sits between the base canvas and controls.
 */
function getPanelBackground(state: ChromeThemeState): string {
  const mixTarget = state.variant === "light" ? WHITE : state.ink;

  return mix(
    state.surface,
    mixTarget,
    PANEL_BASE_MIX_BY_VARIANT[state.variant] +
      state.contrast * PANEL_STEP_BY_VARIANT[state.variant],
  );
}

/**
 * Parses a normalized hex color into RGB channels for palette math.
 */
function parseHexColor(colorValue: string): RGB {
  const hexValue = colorValue.slice(1);
  return {
    blue: Number.parseInt(hexValue.slice(4, 6), 16),
    green: Number.parseInt(hexValue.slice(2, 4), 16),
    red: Number.parseInt(hexValue.slice(0, 2), 16),
  };
}

/**
 * Applies alpha to an RGB color and returns an rgba() string for semantic tokens.
 */
function alpha(color: RGB, opacity: number): string {
  return `rgba(${color.red}, ${color.green}, ${color.blue}, ${getOpacity(opacity)})`;
}

/**
 * Mixes two RGB colors and returns a hex string for persisted semantic outputs.
 */
function mix(colorA: RGB, colorB: RGB, amount: number): string {
  return toHexColor(mixRgb(colorA, colorB, amount));
}

/**
 * Mixes two RGB colors and keeps the result in channel form for further math.
 */
function mixRgb(colorA: RGB, colorB: RGB, amount: number): RGB {
  const weight = Math.min(1, Math.max(0, amount));
  return {
    blue: blendChannel(colorA.blue, colorB.blue, weight),
    green: blendChannel(colorA.green, colorB.green, weight),
    red: blendChannel(colorA.red, colorB.red, weight),
  };
}

/**
 * Blends a single color channel with a normalized weight.
 */
function blendChannel(
  channelA: number,
  channelB: number,
  amount: number,
): number {
  return Math.round(channelA + (channelB - channelA) * amount);
}

/**
 * Clamps opacity values and formats them for stable rgba() output.
 */
function getOpacity(opacity: number): string {
  const clampedOpacity = Math.min(1, Math.max(0, opacity));
  return clampedOpacity.toFixed(3).replace(/0+$/, "").replace(/\.$/, "");
}

/**
 * Converts RGB channels back into a #rrggbb string.
 */
function toHexColor(color: RGB): string {
  return `#${toHexPair(color.red)}${toHexPair(color.green)}${toHexPair(color.blue)}`;
}

/**
 * Converts RGB channels into an rgb() string for CSS variables that stay opaque.
 */
function toRgbString(color: RGB): string {
  return `rgb(${color.red}, ${color.green}, ${color.blue})`;
}

/**
 * Formats a single color channel as a two-character hex pair.
 */
function toHexPair(channel: number): string {
  return channel.toString(16).padStart(2, "0");
}
