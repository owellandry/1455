export type ThemeVariant = "light" | "dark";

export type ThemeAppearanceMode = ThemeVariant | "system";

export type ThemeFonts = {
  code: string | null;
  ui: string | null;
};

export type ThemeSemanticColors = {
  diffAdded: string;
  diffRemoved: string;
  skill: string;
};

export type ChromeTheme = {
  accent: string;
  contrast: number;
  fonts: ThemeFonts;
  ink: string;
  opaqueWindows: boolean;
  semanticColors: ThemeSemanticColors;
  surface: string;
};

export const CodeThemeIds = {
  AYU: "ayu",
  CATPPUCCIN: "catppuccin",
  CODEX: "codex",
  DRACULA: "dracula",
  EVERFOREST: "everforest",
  GITHUB: "github",
  GRUVBOX: "gruvbox",
  LINEAR: "linear",
  LOBSTER: "lobster",
  MATERIAL: "material",
  MATRIX: "matrix",
  MONOKAI: "monokai",
  ABSOLUTELY: "absolutely",
  NIGHT_OWL: "night-owl",
  NORD: "nord",
  NOTION: "notion",
  OSCURANGE: "oscurange",
  ONE: "one",
  PROOF: "proof",
  RAYCAST: "raycast",
  ROSE_PINE: "rose-pine",
  SENTRY: "sentry",
  SOLARIZED: "solarized",
  TEMPLE: "temple",
  TOKYO_NIGHT: "tokyo-night",
  VSCODE_PLUS: "vscode-plus",
} as const;

export type CodeThemeId = (typeof CodeThemeIds)[keyof typeof CodeThemeIds];
