import { ConfigurationKeys } from "protocol";
import {
  useEffect,
  useMemo,
  useState,
  type ReactElement,
  type ReactNode,
} from "react";
// oxlint-disable-next-line no-restricted-imports -- AppIntlProvider is the central place that wraps IntlProvider.
import { IntlProvider } from "react-intl";

import { useConfiguration } from "@/hooks/use-configuration";
import { useWindowType } from "@/hooks/use-window-type";
import { useStatsigEventLogger, useStatsigLayer } from "@/statsig/statsig";
import { logger } from "@/utils/logger";
import { QUERY_STALE_TIME } from "@/utils/query-stale-times";
import { useFetchFromVSCode } from "@/vscode-api";

import {
  ENGLISH_OVERRIDE_LOCALE,
  findBestLocale,
  isEnglishLocaleCode,
  loadLocaleMessages,
  normalizeLocaleCode,
} from "./locale-resolver";

const DEFAULT_LOCALE = ENGLISH_OVERRIDE_LOCALE;

function getBrowserLocale(): string | undefined {
  if (typeof navigator === "undefined") {
    return undefined;
  }
  if (navigator.language) {
    return navigator.language;
  }
  if (navigator.languages?.length) {
    return navigator.languages[0];
  }
  return undefined;
}

function canonicalizeLocale(locale: string): string {
  try {
    return Intl.getCanonicalLocales(locale)[0] ?? locale;
  } catch {
    return locale;
  }
}

export function AppIntlProvider({
  children,
}: {
  children: ReactNode;
}): ReactElement {
  const windowType = useWindowType();
  const { data: localeInfo } = useFetchFromVSCode("locale-info", {
    queryConfig: {
      enabled: windowType !== "browser",
      staleTime: QUERY_STALE_TIME.INFINITE,
    },
  });

  const layer = useStatsigLayer(__statsigName("codex-i18n"));

  const isI18nEnabled = useMemo(
    () => layer?.get("enable_i18n", false),
    [layer],
  );

  const localeSource = useMemo(
    () => layer?.get("locale_source", "IDE"),
    [layer],
  );

  const { data: localeOverride } = useConfiguration(
    ConfigurationKeys.LOCALE_OVERRIDE,
    {
      enabled: windowType !== "browser",
    },
  );

  const ideLocaleCode = localeInfo?.ideLocale;
  const systemLocaleCode = localeInfo?.systemLocale;
  const hasEnglishLocaleOverride = isEnglishLocaleCode(localeOverride);

  const preferredLocale = useMemo((): string | undefined => {
    if (localeOverride) {
      return localeOverride;
    }

    if (windowType === "browser") {
      return getBrowserLocale();
    }

    if (localeSource === "SYSTEM") {
      return systemLocaleCode;
    }

    if (localeSource === "FIRST_AVAILABLE") {
      // Use first available non-english locale if any.

      if (ideLocaleCode !== undefined && !isEnglishLocaleCode(ideLocaleCode)) {
        return ideLocaleCode;
      }

      if (
        systemLocaleCode !== undefined &&
        !isEnglishLocaleCode(systemLocaleCode)
      ) {
        return systemLocaleCode;
      }

      return undefined;
    }

    // Default to IDE locale.
    return ideLocaleCode;
  }, [
    ideLocaleCode,
    localeOverride,
    localeSource,
    systemLocaleCode,
    windowType,
  ]);

  const fallbackLocale = canonicalizeLocale(
    normalizeLocaleCode(preferredLocale) ?? DEFAULT_LOCALE,
  );

  const bestMatch = useMemo(() => {
    if (hasEnglishLocaleOverride) {
      return undefined;
    }

    try {
      return findBestLocale(preferredLocale);
    } catch {
      logger.error("Failed to resolve preferred locale");
      return undefined;
    }
  }, [hasEnglishLocaleOverride, preferredLocale]);

  const resolvedLocale = useMemo(
    () => canonicalizeLocale(bestMatch?.locale ?? fallbackLocale),
    [bestMatch?.locale, fallbackLocale],
  );

  const { logEventWithStatsig } = useStatsigEventLogger();

  const [messagesForLocale, setMessagesForLocale] = useState<{
    locale: string;
    messages: Record<string, string>;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async (): Promise<void> => {
      if (!bestMatch) {
        return;
      }
      try {
        const messages = await loadLocaleMessages(bestMatch);
        if (!cancelled) {
          setMessagesForLocale({ locale: resolvedLocale, messages });

          logEventWithStatsig("codex_i18n_locale_resolved", {
            resolved_locale: resolvedLocale,
            best_match_locale: bestMatch?.locale ?? "",
          });
        }
      } catch {
        logger.error("Failed to load locale messages", {
          safe: { locale: bestMatch.locale },
          sensitive: {},
        });
        if (!cancelled) {
          setMessagesForLocale(null);
        }
      }
    };

    if (isI18nEnabled) {
      void load();
    }

    return (): void => {
      cancelled = true;
    };
  }, [bestMatch, resolvedLocale, isI18nEnabled, logEventWithStatsig]);

  const intlMessages = useMemo(() => {
    if (!isI18nEnabled) {
      return undefined;
    }
    return messagesForLocale?.locale === resolvedLocale
      ? messagesForLocale.messages
      : undefined;
  }, [isI18nEnabled, messagesForLocale, resolvedLocale]);

  return (
    <IntlProvider
      locale={resolvedLocale}
      defaultLocale={DEFAULT_LOCALE}
      messages={intlMessages}
      onError={() => {}}
    >
      {children}
    </IntlProvider>
  );
}
