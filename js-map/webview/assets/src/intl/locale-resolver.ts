export type LocaleMessages = Record<string, string>;

type LocaleModuleLoader = () => Promise<{
  default: LocaleMessages;
}>;

export type LocaleDefinition = {
  locale: string;
  normalized: string;
  language: string;
  load: LocaleModuleLoader;
};

export const ENGLISH_OVERRIDE_LOCALE = "en-US";
export const ENGLISH_LANGUAGE = "en";

const localeModules = import.meta.glob("../locales/*.json");

const localeDefinitions: Array<LocaleDefinition> = Object.entries(localeModules)
  .map(([path, loader]) => {
    const match = path.match(/\/([^/]+)\.json$/);
    if (!match) {
      return null;
    }
    const locale = match[1];
    const normalized = normalizeLocaleCode(locale);
    if (!normalized) {
      return null;
    }
    const [language] = normalized.split("-");
    return {
      locale,
      normalized,
      language,
      load: loader as LocaleModuleLoader,
    };
  })
  .filter((definition): definition is LocaleDefinition => definition != null)
  .sort((a, b) => a.locale.localeCompare(b.locale));

export function getAvailableLocales(): Array<LocaleDefinition> {
  return [...localeDefinitions];
}

export function normalizeLocaleCode(
  locale: string | undefined | null,
): string | null {
  if (!locale) {
    return null;
  }
  const trimmed = locale.trim();
  if (!trimmed) {
    return null;
  }
  return trimmed.replace(/_/g, "-").toLowerCase();
}

export function isEnglishLocaleCode(
  locale: string | undefined | null,
): boolean {
  const normalizedLocale = normalizeLocaleCode(locale);

  if (normalizedLocale == null) {
    return false;
  }

  return (
    normalizedLocale === ENGLISH_LANGUAGE ||
    normalizedLocale.startsWith(`${ENGLISH_LANGUAGE}-`)
  );
}

export function isLocaleOptionSelected(
  optionCode: string,
  localeOverride: string | undefined | null,
): boolean {
  if (isEnglishLocaleCode(optionCode)) {
    return isEnglishLocaleCode(localeOverride);
  }

  return (
    normalizeLocaleCode(optionCode) === normalizeLocaleCode(localeOverride)
  );
}

export function findBestLocale(
  preferredLocale: string | undefined | null,
): LocaleDefinition | undefined {
  const normalizedPreferred = normalizeLocaleCode(preferredLocale);
  if (!normalizedPreferred) {
    return undefined;
  }

  const exactMatch = localeDefinitions.find(
    (definition) => definition.normalized === normalizedPreferred,
  );
  if (exactMatch) {
    return exactMatch;
  }

  const [language, region] = normalizedPreferred.split("-");
  if (!language) {
    return undefined;
  }

  const languageMatches = localeDefinitions.filter(
    (definition) => definition.language === language,
  );
  if (languageMatches.length === 0) {
    return undefined;
  }

  if (region) {
    const regionMatch = languageMatches.find(
      (definition) => definition.normalized === `${language}-${region}`,
    );
    if (regionMatch) {
      return regionMatch;
    }
  }

  return languageMatches[0];
}

export async function loadLocaleMessages(
  definition: LocaleDefinition,
): Promise<LocaleMessages> {
  const module = await definition.load();
  return module.default ?? (module as unknown as LocaleMessages);
}
