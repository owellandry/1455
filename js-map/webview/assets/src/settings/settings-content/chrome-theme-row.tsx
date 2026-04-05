import { parseDiffFromFile } from "@pierre/diffs";
import { useQueries } from "@tanstack/react-query";
import { useScope } from "maitai";
import type {
  ChromeTheme,
  CodeThemeId,
  ThemeFonts,
  ThemeVariant,
} from "protocol";
import type React from "react";
import { useState } from "react";
import { HexColorPicker } from "react-colorful";
import { FormattedMessage, useIntl } from "react-intl";

import { Button } from "@/components/button";
import { Dialog, DialogTitle } from "@/components/dialog";
import {
  DIALOG_FOOTER_COMPACT,
  DialogBody,
  DialogFooter,
  DialogHeader,
  DialogSection,
} from "@/components/dialog-layout";
import { BasicDropdown, Dropdown } from "@/components/dropdown";
import { FileDiff } from "@/components/file-diff";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/popover";
import { toast$ } from "@/components/toaster/toast-signal";
import { Toggle } from "@/components/toggle";
import CheckIcon from "@/icons/check-md.svg";
import { AppScope } from "@/scopes/app-scope";
import { SettingsRow } from "@/settings/settings-row";
import { SettingsDropdownTrigger } from "@/settings/settings-shared";
import {
  MAX_CHROME_THEME_CONTRAST,
  MIN_CHROME_THEME_CONTRAST,
} from "@/theme/chrome-theme";
import type { CodeThemeOption } from "@/theme/code-theme";
import { getCodeThemeChromeThemeSeed } from "@/theme/code-theme";
import {
  getVisibleThemeVariants,
  useResolvedAppearanceMode,
} from "@/theme/use-resolved-theme-variant";
import { copyToClipboard } from "@/utils/copy-to-clipboard";

import { useChromeThemeSettings } from "./chrome-theme-settings";

type ThemeColorRole = "accent" | "surface" | "ink";

const THEME_PREVIEW_OLD_FILE = `const themePreview: ThemeConfig = {
  surface: "sidebar",
  accent: "#2563eb",
  contrast: 42,
};
`;
const THEME_PREVIEW_NEW_FILE = `const themePreview: ThemeConfig = {
  surface: "sidebar-elevated",
  accent: "#0ea5e9",
  contrast: 68,
};
`;
const UI_FONT_FAMILY_PLACEHOLDER =
  '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
const CODE_FONT_FAMILY_PLACEHOLDER =
  'ui-monospace, "SFMono-Regular", Menlo, Consolas, monospace';
const THEME_PREVIEW_DIFF = parseDiffFromFile(
  {
    name: "src/theme-preview.ts",
    contents: THEME_PREVIEW_OLD_FILE,
  },
  {
    name: "src/theme-preview.ts",
    contents: THEME_PREVIEW_NEW_FILE,
  },
);

export function ChromeThemeRow(): React.ReactElement {
  const appearanceMode = useResolvedAppearanceMode();
  const visibleVariants = getVisibleThemeVariants(appearanceMode);

  return (
    <div className="flex flex-col gap-2">
      {visibleVariants.map((variant) => (
        <ChromeThemeVariantRow key={variant} variant={variant} />
      ))}
    </div>
  );
}

export function ChromeThemePreview(): React.ReactElement {
  return (
    <div
      className="overflow-hidden rounded-xl border border-token-border bg-token-main-surface-primary"
      data-testid="theme-preview"
    >
      <FileDiff
        diffStyle="split"
        expansionLineCount={8}
        fileDiff={THEME_PREVIEW_DIFF}
        hunkSeparators="line-info"
        lineDiffType="none"
        overflow="scroll"
      />
    </div>
  );
}

function ChromeThemeVariantRow({
  variant,
}: {
  variant: ThemeVariant;
}): React.ReactElement {
  const scope = useScope(AppScope);
  const intl = useIntl();
  const accentLabel = intl.formatMessage({
    id: "settings.general.appearance.chromeTheme.accent.short",
    defaultMessage: "Accent",
    description: "Short label for the accent color picker",
  });
  const backgroundLabel = intl.formatMessage({
    id: "settings.general.appearance.chromeTheme.surface.short",
    defaultMessage: "Background",
    description: "Short label for the background color picker",
  });
  const foregroundLabel = intl.formatMessage({
    id: "settings.general.appearance.chromeTheme.ink.short",
    defaultMessage: "Foreground",
    description: "Short label for the foreground color picker",
  });
  const contrastLabel = intl.formatMessage({
    id: "settings.general.appearance.chromeTheme.contrast.short",
    defaultMessage: "Contrast",
    description: "Short label for the contrast slider",
  });
  const translucentSidebarLabel = intl.formatMessage({
    id: "settings.general.appearance.chromeTheme.translucentSidebar.short",
    defaultMessage: "Translucent sidebar",
    description: "Short label for the translucent sidebar toggle",
  });
  const {
    canImportThemeString,
    codeThemes,
    exportThemeString,
    fonts,
    importThemeString,
    isDisabled,
    selectedCodeTheme,
    setCodeThemeId,
    setFontsPatch,
    setThemePatch,
    theme,
  } = useChromeThemeSettings(variant);
  const themeVariantLabel = getThemeVariantLabel(intl, variant);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [themeImportValue, setThemeImportValue] = useState("");
  const themeColorControls = [
    {
      ariaLabel: intl.formatMessage(
        {
          id: "settings.general.appearance.chromeTheme.accent",
          defaultMessage: "{variant} accent color",
          description:
            "Aria label for the accent color input in chrome theme settings",
        },
        { variant: themeVariantLabel },
      ),
      label: accentLabel,
      role: "accent",
    },
    {
      ariaLabel: intl.formatMessage(
        {
          id: "settings.general.appearance.chromeTheme.surface",
          defaultMessage: "{variant} background color",
          description:
            "Aria label for the background color input in chrome theme settings",
        },
        { variant: themeVariantLabel },
      ),
      label: backgroundLabel,
      role: "surface",
    },
    {
      ariaLabel: intl.formatMessage(
        {
          id: "settings.general.appearance.chromeTheme.ink",
          defaultMessage: "{variant} ink color",
          description:
            "Aria label for the ink color input in chrome theme settings",
        },
        { variant: themeVariantLabel },
      ),
      label: foregroundLabel,
      role: "ink",
    },
  ] satisfies Array<{
    ariaLabel: string;
    label: string;
    role: ThemeColorRole;
  }>;
  const themeFontControls = [
    {
      ariaLabel: intl.formatMessage(
        {
          id: "settings.general.appearance.chromeTheme.uiFontFamily",
          defaultMessage: "{variant} UI font",
          description:
            "Aria label for the UI font input in chrome theme settings",
        },
        { variant: themeVariantLabel },
      ),
      key: "ui",
      label: intl.formatMessage({
        id: "settings.general.appearance.chromeTheme.uiFontFamily.short",
        defaultMessage: "UI font",
        description: "Short label for the UI font input",
      }),
      placeholder: UI_FONT_FAMILY_PLACEHOLDER,
    },
    {
      ariaLabel: intl.formatMessage(
        {
          id: "settings.general.appearance.chromeTheme.codeFontFamily",
          defaultMessage: "{variant} code font",
          description:
            "Aria label for the code font input in chrome theme settings",
        },
        { variant: themeVariantLabel },
      ),
      key: "code",
      label: intl.formatMessage({
        id: "settings.general.appearance.chromeTheme.codeFontFamily.short",
        defaultMessage: "Code font",
        description: "Short label for the code font input",
      }),
      placeholder: CODE_FONT_FAMILY_PLACEHOLDER,
    },
  ] satisfies Array<{
    ariaLabel: string;
    key: keyof ThemeFonts;
    label: string;
    placeholder: string;
  }>;

  const updateThemeColor = (role: ThemeColorRole, value: string): void => {
    switch (role) {
      case "accent":
        setThemePatch({ accent: value });
        return;
      case "ink":
        setThemePatch({ ink: value });
        return;
      case "surface":
        setThemePatch({ surface: value });
        return;
    }
  };
  const handleExport = async (): Promise<void> => {
    const copied = await copyToClipboard(exportThemeString()).catch(
      () => false,
    );
    if (copied) {
      scope.get(toast$).success(
        intl.formatMessage(
          {
            id: "settings.general.appearance.chromeTheme.export.success",
            defaultMessage: "{variant} theme copied",
            description:
              "Success toast shown after copying a theme share string",
          },
          { variant: themeVariantLabel },
        ),
      );
      return;
    }

    scope.get(toast$).danger(
      intl.formatMessage(
        {
          id: "settings.general.appearance.chromeTheme.export.error",
          defaultMessage: "Couldn’t copy {variant} theme",
          description:
            "Error toast shown when copying a theme share string fails",
        },
        { variant: themeVariantLabel },
      ),
    );
  };
  const handleImport = async (): Promise<void> => {
    try {
      const importedThemeString = themeImportValue.trim();
      if (!importedThemeString) {
        throw new Error("Missing theme string");
      }

      await importThemeString(importedThemeString);
      setIsImportDialogOpen(false);
      setThemeImportValue("");
      scope.get(toast$).success(
        intl.formatMessage(
          {
            id: "settings.general.appearance.chromeTheme.import.success",
            defaultMessage: "{variant} theme imported",
            description:
              "Success toast shown after importing a theme share string",
          },
          { variant: themeVariantLabel },
        ),
      );
    } catch {
      scope.get(toast$).danger(
        intl.formatMessage(
          {
            id: "settings.general.appearance.chromeTheme.import.error",
            defaultMessage: "Couldn’t import {variant} theme",
            description:
              "Error toast shown when importing a theme share string fails",
          },
          { variant: themeVariantLabel },
        ),
      );
    }
  };

  return (
    <ThemeCustomizerCard
      title={getChromeThemeLabel(variant)}
      headerControl={
        <div className="flex items-center gap-2 max-sm:w-full max-sm:flex-wrap max-sm:justify-end">
          <Button
            className="px-2"
            color="ghost"
            disabled={isDisabled}
            size="toolbar"
            onClick={() => {
              setIsImportDialogOpen(true);
            }}
          >
            <FormattedMessage
              id="settings.general.appearance.chromeTheme.import"
              defaultMessage="Import"
              description="Button label for importing a shared theme string"
            />
          </Button>
          <Button
            className="px-2"
            color="ghost"
            disabled={isDisabled}
            size="toolbar"
            onClick={() => {
              void handleExport();
            }}
          >
            <FormattedMessage
              id="settings.general.appearance.chromeTheme.export"
              defaultMessage="Copy theme"
              description="Button label for copying a shared theme string"
            />
          </Button>
          <CodeThemePicker
            ariaLabel={intl.formatMessage(
              {
                id: "settings.general.appearance.codeTheme",
                defaultMessage: "{variant} code theme",
                description:
                  "Aria label for the code theme picker in appearance settings",
              },
              { variant: themeVariantLabel },
            )}
            codeThemes={codeThemes}
            disabled={isDisabled}
            selectedCodeTheme={selectedCodeTheme}
            theme={theme}
            variant={variant}
            onSelect={(themeId) => {
              void setCodeThemeId(themeId).catch(() => undefined);
            }}
          />
        </div>
      }
    >
      {themeColorControls.map((control) => (
        <SettingsRow
          key={control.role}
          control={
            <ThemeColorPicker
              ariaLabel={control.ariaLabel}
              disabled={isDisabled}
              value={theme[control.role]}
              onChange={(value) => {
                updateThemeColor(control.role, value);
              }}
            />
          }
          label={control.label}
          variant="nested"
        />
      ))}
      {themeFontControls.map((control) => (
        <SettingsRow
          key={control.key}
          control={
            <ThemeFontFamilyInput
              ariaLabel={control.ariaLabel}
              disabled={isDisabled}
              placeholder={control.placeholder}
              value={fonts[control.key]}
              onChange={(value) => {
                setFontsPatch({ [control.key]: value });
              }}
            />
          }
          label={control.label}
          variant="nested"
        />
      ))}
      <SettingsRow
        control={
          <Toggle
            checked={!theme.opaqueWindows}
            disabled={isDisabled}
            onChange={(next) => {
              setThemePatch({ opaqueWindows: !next });
            }}
            ariaLabel={intl.formatMessage(
              {
                id: "settings.general.appearance.chromeTheme.translucentSidebar",
                defaultMessage: "{variant} translucent sidebar",
                description:
                  "Aria label for the translucent sidebar toggle in chrome theme settings",
              },
              { variant: themeVariantLabel },
            )}
          />
        }
        label={translucentSidebarLabel}
        variant="nested"
      />
      <SettingsRow
        control={
          <ThemeContrastSlider
            ariaLabel={intl.formatMessage(
              {
                id: "settings.general.appearance.chromeTheme.contrast",
                defaultMessage: "{variant} contrast",
                description:
                  "Aria label for the contrast slider in chrome theme settings",
              },
              { variant: getThemeVariantLabel(intl, variant) },
            )}
            disabled={isDisabled}
            theme={theme}
            value={theme.contrast}
            onChange={(contrast) => {
              setThemePatch({ contrast });
            }}
          />
        }
        label={contrastLabel}
        variant="nested"
      />
      <ThemeImportDialog
        exampleValue={exportThemeString()}
        isImportValueValid={canImportThemeString(themeImportValue)}
        isDisabled={isDisabled}
        isOpen={isImportDialogOpen}
        value={themeImportValue}
        variantLabel={themeVariantLabel}
        onOpenChange={(nextOpen) => {
          setIsImportDialogOpen(nextOpen);
          if (!nextOpen) {
            setThemeImportValue("");
          }
        }}
        onSubmit={() => {
          void handleImport();
        }}
        onValueChange={setThemeImportValue}
      />
    </ThemeCustomizerCard>
  );
}

/**
 * Shared chrome-theme card shell used by both light and dark theme sections.
 */
function ThemeCustomizerCard({
  title,
  headerControl,
  children,
}: {
  title: React.ReactNode;
  headerControl: React.ReactNode;
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <div className="overflow-hidden rounded-2xl border border-token-border bg-token-input-background shadow-sm">
      <div className="flex items-center justify-between gap-2 px-4 py-2 max-sm:flex-col max-sm:items-stretch">
        <div className="min-w-0">
          <div className="text-[13px] font-medium text-token-text-secondary">
            {title}
          </div>
        </div>
        <div className="shrink-0 max-sm:w-full">{headerControl}</div>
      </div>
      <div className="divide-y-[0.5px] divide-token-border">{children}</div>
    </div>
  );
}

/**
 * Small dialog for importing a serialized theme string into the active light or dark theme card.
 */
function ThemeImportDialog({
  exampleValue,
  isImportValueValid,
  isDisabled,
  isOpen,
  value,
  variantLabel,
  onOpenChange,
  onSubmit,
  onValueChange,
}: {
  exampleValue: string;
  isImportValueValid: boolean;
  isDisabled: boolean;
  isOpen: boolean;
  value: string;
  variantLabel: string;
  onOpenChange: (nextOpen: boolean) => void;
  onSubmit: () => void;
  onValueChange: (value: string) => void;
}): React.ReactElement {
  const intl = useIntl();
  const title = intl.formatMessage({
    id: "settings.general.appearance.chromeTheme.import.dialog.title",
    defaultMessage: "Import theme",
    description: "Title for the theme import dialog",
  });

  return (
    <Dialog
      open={isOpen}
      onOpenChange={onOpenChange}
      size="default"
      contentProps={{ "aria-describedby": undefined }}
    >
      <DialogBody>
        <DialogSection>
          <DialogTitle asChild>
            <h2 className="sr-only">{title}</h2>
          </DialogTitle>
          <DialogHeader title={title} />
        </DialogSection>
        <DialogSection>
          <input
            aria-label={intl.formatMessage(
              {
                id: "settings.general.appearance.chromeTheme.import.dialog.ariaLabel",
                defaultMessage: "{variant} theme share string",
                description: "Aria label for the theme import text area",
              },
              { variant: variantLabel },
            )}
            autoFocus={true}
            className="h-9 w-full rounded-xl border border-token-input-border bg-token-input-background px-3 font-mono text-sm text-token-input-foreground outline-none placeholder:text-token-input-placeholder-foreground focus:border-token-focus-border"
            disabled={isDisabled}
            placeholder={exampleValue}
            spellCheck={false}
            type="text"
            value={value}
            onChange={(event) => {
              onValueChange(event.target.value);
            }}
          />
        </DialogSection>
        <DialogSection>
          <DialogFooter className={DIALOG_FOOTER_COMPACT}>
            <Button
              color="ghost"
              size="toolbar"
              onClick={() => {
                onOpenChange(false);
              }}
            >
              <FormattedMessage
                id="settings.general.appearance.chromeTheme.import.dialog.cancel"
                defaultMessage="Cancel"
                description="Button label for canceling the theme import dialog"
              />
            </Button>
            <Button
              color="primary"
              disabled={isDisabled || !isImportValueValid}
              size="toolbar"
              onClick={onSubmit}
            >
              <FormattedMessage
                id="settings.general.appearance.chromeTheme.import.dialog.submit"
                defaultMessage="Import theme"
                description="Button label for submitting a theme import"
              />
            </Button>
          </DialogFooter>
        </DialogSection>
      </DialogBody>
    </Dialog>
  );
}

/**
 * Theme picker trigger used inside each chrome-theme card.
 */
function CodeThemePicker({
  ariaLabel,
  codeThemes,
  disabled,
  selectedCodeTheme,
  theme,
  variant,
  onSelect,
}: {
  ariaLabel: string;
  codeThemes: Array<CodeThemeOption>;
  disabled: boolean;
  selectedCodeTheme: CodeThemeOption;
  theme: ChromeTheme;
  variant: ThemeVariant;
  onSelect: (themeId: CodeThemeId) => void;
}): React.ReactElement {
  return (
    <BasicDropdown
      align="end"
      contentWidth="menuWide"
      disabled={disabled}
      triggerButton={
        <SettingsDropdownTrigger
          aria-label={ariaLabel}
          className="h-9 w-[11rem] justify-between rounded-lg border border-token-border bg-token-bg-primary px-2.5 py-0 shadow-sm max-sm:w-full"
          contentClassName="gap-2"
          chevronClassName="icon-xs opacity-65"
          disabled={disabled}
        >
          <CodeThemePreviewGlyph theme={theme} />
          <span className="truncate text-sm leading-none">
            {selectedCodeTheme.label}
          </span>
        </SettingsDropdownTrigger>
      }
    >
      <CodeThemePickerContent
        codeThemes={codeThemes}
        disabled={disabled}
        selectedCodeTheme={selectedCodeTheme}
        theme={theme}
        variant={variant}
        onSelect={onSelect}
      />
    </BasicDropdown>
  );
}

/**
 * Dropdown content that shows each theme with its own preview chip.
 * It lazily loads preview seeds only while the menu is open.
 */
function CodeThemePickerContent({
  codeThemes,
  disabled,
  selectedCodeTheme,
  theme,
  variant,
  onSelect,
}: {
  codeThemes: Array<CodeThemeOption>;
  disabled: boolean;
  selectedCodeTheme: CodeThemeOption;
  theme: ChromeTheme;
  variant: ThemeVariant;
  onSelect: (themeId: CodeThemeId) => void;
}): React.ReactElement {
  const themeSeedQueries = useQueries({
    queries: codeThemes.map((codeTheme) => ({
      queryKey: ["code-theme-preview-seed", variant, codeTheme.id],
      queryFn: (): Promise<Partial<ChromeTheme>> => {
        return getCodeThemeChromeThemeSeed(codeTheme.id, variant);
      },
      staleTime: Infinity,
    })),
  });

  return (
    <Dropdown.Section>
      <div className="max-h-80 overflow-y-auto pb-1">
        {codeThemes.map((codeTheme, index) => {
          const themeSeed = themeSeedQueries[index]?.data;

          return (
            <Dropdown.Item
              key={codeTheme.id}
              disabled={disabled}
              RightIcon={
                codeTheme.id === selectedCodeTheme.id ? CheckIcon : undefined
              }
              onSelect={() => {
                onSelect(codeTheme.id);
              }}
            >
              <div className="flex items-center gap-2">
                <CodeThemePreviewGlyph
                  theme={{
                    accent: themeSeed?.accent ?? theme.accent,
                    ink: themeSeed?.ink ?? theme.ink,
                    surface: themeSeed?.surface ?? theme.surface,
                  }}
                />
                <span className="truncate">{codeTheme.label}</span>
              </div>
            </Dropdown.Item>
          );
        })}
      </div>
    </Dropdown.Section>
  );
}

/**
 * Tiny theme chip used in the selected trigger and each dropdown row.
 */
function CodeThemePreviewGlyph({
  theme,
}: {
  theme: Pick<ChromeTheme, "accent" | "ink" | "surface">;
}): React.ReactElement {
  const intl = useIntl();

  return (
    <span
      aria-hidden
      className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md border text-[11px] leading-none font-semibold"
      style={{
        backgroundColor: theme.surface,
        borderColor: `color-mix(in srgb, ${theme.ink} 16%, ${theme.surface})`,
        color: theme.accent,
      }}
    >
      {intl.formatMessage({
        id: "settings.general.appearance.codeTheme.previewGlyph",
        defaultMessage: "Aa",
        description: "Preview glyph shown in the code theme selector",
      })}
    </span>
  );
}

/**
 * Combined swatch, editable hex field, and native picker popover for chrome colors.
 */
function ThemeColorPicker({
  ariaLabel,
  disabled,
  value,
  onChange,
}: {
  ariaLabel: string;
  disabled: boolean;
  value: string;
  onChange: (value: ChromeTheme["surface"]) => void;
}): React.ReactElement {
  const [isOpen, setIsOpen] = useState(false);
  const [draftValue, setDraftValue] = useState<string | null>(null);

  return (
    <Popover
      open={isOpen}
      onOpenChange={(nextOpen) => {
        setIsOpen(nextOpen);
        if (!nextOpen) {
          setDraftValue(null);
        }
      }}
    >
      <div
        className="relative flex h-7 w-full max-w-[8.5rem] items-center gap-2 rounded-lg border border-transparent px-2 shadow-sm max-sm:max-w-none"
        style={{
          backgroundColor: value,
          color: getThemePickerTextColor(value),
        }}
      >
        <PopoverTrigger asChild={true}>
          <button
            className="h-3.5 w-3.5 shrink-0 rounded-full disabled:cursor-default"
            disabled={disabled}
            style={{
              backgroundColor: value,
              border: `1px solid color-mix(in srgb, ${getThemePickerTextColor(value)} 18%, ${value})`,
            }}
            type="button"
          >
            <span aria-hidden={true} className="sr-only" />
          </button>
        </PopoverTrigger>
        <input
          aria-label={ariaLabel}
          className="min-w-0 flex-1 bg-transparent text-[11px] uppercase tabular-nums outline-hidden disabled:cursor-default"
          disabled={disabled}
          spellCheck={false}
          type="text"
          value={(draftValue ?? value).toUpperCase()}
          onClick={(event) => {
            event.stopPropagation();
          }}
          onBlur={() => {
            setDraftValue(null);
          }}
          onChange={(event) => {
            const nextValue = formatThemePickerInput(event.target.value);
            const nextColor = parseCompleteThemePickerColor(nextValue);
            if (nextColor == null) {
              setDraftValue(nextValue);
              return;
            }

            setDraftValue(null);
            onChange(nextColor);
          }}
          onPointerDown={(event) => {
            event.stopPropagation();
          }}
        />
      </div>
      <PopoverContent
        align="end"
        className="w-auto rounded-xl p-3"
        sideOffset={8}
        onOpenAutoFocus={(event) => {
          event.preventDefault();
        }}
      >
        <HexColorPicker
          className="h-34 w-34"
          color={value}
          onChange={(nextValue) => {
            onChange(nextValue);
          }}
        />
      </PopoverContent>
    </Popover>
  );
}

/**
 * Theme-owned font-family input that commits on blur or Enter.
 */
function ThemeFontFamilyInput({
  ariaLabel,
  disabled,
  placeholder,
  value,
  onChange,
}: {
  ariaLabel: string;
  disabled: boolean;
  placeholder: string;
  value: string | null;
  onChange: (value: string | null) => void;
}): React.ReactElement {
  return (
    <input
      key={`${ariaLabel}:${value ?? ""}`}
      aria-label={ariaLabel}
      className="focus-visible:ring-token-focus h-7 w-full max-w-[8.5rem] rounded-lg border border-token-border bg-token-input-background px-2 text-[11px] text-token-text-primary shadow-sm outline-none focus-visible:ring-2 max-sm:max-w-none"
      defaultValue={value ?? ""}
      disabled={disabled}
      placeholder={placeholder}
      spellCheck={false}
      type="text"
      onBlur={(event) => {
        const trimmedValue = event.currentTarget.value.trim();
        event.currentTarget.value = trimmedValue;
        onChange(trimmedValue.length > 0 ? trimmedValue : null);
      }}
      onKeyDown={(event) => {
        if (event.key !== "Enter") {
          return;
        }

        event.preventDefault();
        const trimmedValue = event.currentTarget.value.trim();
        event.currentTarget.value = trimmedValue;
        onChange(trimmedValue.length > 0 ? trimmedValue : null);
      }}
    />
  );
}

/**
 * Contrast slider for the derived chrome palette.
 */
function ThemeContrastSlider({
  ariaLabel,
  disabled,
  theme,
  value,
  onChange,
}: {
  ariaLabel: string;
  disabled: boolean;
  theme: ChromeTheme;
  value: number;
  onChange: (value: number) => void;
}): React.ReactElement {
  return (
    <div className="flex h-9 min-w-[12rem] items-center gap-2.5 max-sm:w-full max-sm:min-w-0">
      <input
        aria-label={ariaLabel}
        className="h-0.5 flex-1 appearance-none rounded-full [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border [&::-moz-range-thumb]:border-transparent [&::-moz-range-thumb]:bg-current [&::-moz-range-thumb]:shadow-sm [&::-moz-range-track]:h-0.5 [&::-moz-range-track]:rounded-full [&::-webkit-slider-runnable-track]:h-0.5 [&::-webkit-slider-runnable-track]:rounded-full [&::-webkit-slider-thumb]:mt-[-9px] [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border [&::-webkit-slider-thumb]:border-transparent [&::-webkit-slider-thumb]:bg-current [&::-webkit-slider-thumb]:shadow-sm"
        disabled={disabled}
        max={MAX_CHROME_THEME_CONTRAST}
        min={MIN_CHROME_THEME_CONTRAST}
        onChange={(event) => {
          onChange(Number(event.target.value));
        }}
        step={1}
        style={{
          background: `linear-gradient(90deg, color-mix(in srgb, ${theme.accent} 35%, ${theme.surface}) 0%, ${theme.accent} 32%, ${theme.accent} 100%)`,
          color: "var(--color-token-foreground)",
        }}
        type="range"
        value={value}
      />
      <span className="w-9 text-right text-sm text-token-text-primary tabular-nums">
        {value}
      </span>
    </div>
  );
}

/**
 * Returns the light/dark section title shown on each chrome-theme card.
 */
function getChromeThemeLabel(variant: ThemeVariant): React.ReactNode {
  if (variant === "light") {
    return (
      <FormattedMessage
        id="settings.general.appearance.lightChromeTheme"
        defaultMessage="Light theme"
        description="Label for light chrome theme controls in appearance settings"
      />
    );
  }

  return (
    <FormattedMessage
      id="settings.general.appearance.darkChromeTheme"
      defaultMessage="Dark theme"
      description="Label for dark chrome theme controls in appearance settings"
    />
  );
}

/**
 * Returns the localized light/dark label reused in control aria text and toasts.
 */
function getThemeVariantLabel(
  intl: ReturnType<typeof useIntl>,
  variant: ThemeVariant,
): string {
  if (variant === "light") {
    return intl.formatMessage({
      id: "settings.general.appearance.theme.light",
      defaultMessage: "Light",
      description: "Light theme option",
    });
  }

  return intl.formatMessage({
    id: "settings.general.appearance.theme.dark",
    defaultMessage: "Dark",
    description: "Dark theme option",
  });
}

/**
 * Chooses readable hex text and swatch-border color against the current picker background.
 */
function getThemePickerTextColor(color: string): string {
  const rgb = parseThemePickerColor(color);
  if (rgb == null) {
    return "#101010";
  }

  const luminance =
    (rgb.red * 0.2126 + rgb.green * 0.7152 + rgb.blue * 0.0722) / 255;
  return luminance > 0.62 ? "#101010" : "#ffffff";
}

/**
 * Normalizes freeform hex input into the picker-friendly #RRGGBB editing shape.
 */
function formatThemePickerInput(value: string): string {
  const hexCharacters = value.toUpperCase().replace(/[^0-9A-F#]/g, "");
  const normalizedHex = hexCharacters.replaceAll("#", "");
  if (normalizedHex.length === 0) {
    return "#";
  }

  return `#${normalizedHex.slice(0, 6)}`;
}

/**
 * Accepts only complete six-digit hex colors before committing them to theme state.
 */
function parseCompleteThemePickerColor(color: string): string | null {
  if (!/^#[0-9A-F]{6}$/.test(color)) {
    return null;
  }

  return color.toLowerCase();
}

/**
 * Parses a six-digit hex string into RGB channels for contrast checks inside the picker UI.
 */
function parseThemePickerColor(
  color: string,
): { blue: number; green: number; red: number } | null {
  if (!/^#[0-9a-fA-F]{6}$/.test(color)) {
    return null;
  }

  return {
    blue: Number.parseInt(color.slice(5, 7), 16),
    green: Number.parseInt(color.slice(3, 5), 16),
    red: Number.parseInt(color.slice(1, 3), 16),
  };
}
