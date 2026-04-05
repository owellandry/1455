import { useScope } from "maitai";
import { ConfigurationKeys } from "protocol";
import type React from "react";
import { useCallback, useMemo, useState } from "react";
import { defineMessage, FormattedMessage, useIntl } from "react-intl";

import {
  BasicSubDropdown,
  DropdownItem,
  DropdownSearchInput,
} from "@/components/dropdown";
import { toast$ } from "@/components/toaster/toast-signal";
import { useConfiguration } from "@/hooks/use-configuration";
import { useWindowType } from "@/hooks/use-window-type";
import CheckIcon from "@/icons/check-md.svg";
import GlobeIcon from "@/icons/globe.svg";
import {
  ENGLISH_LANGUAGE,
  ENGLISH_OVERRIDE_LOCALE,
  getAvailableLocales,
  isEnglishLocaleCode,
  isLocaleOptionSelected,
  normalizeLocaleCode,
} from "@/intl/locale-resolver";
import { AppScope } from "@/scopes/app-scope";
import { useStatsigEventLogger, useStatsigLayer } from "@/statsig/statsig";

type LocaleOption = {
  code: string;
  label: string;
  localizedLabel: string;
};

const defaultLanguageMessage = defineMessage({
  id: "codex.profileDropdown.languageDefault",
  defaultMessage: "Auto Detect",
  description:
    "Default language option which lets the app automatically choose which language to use",
});

const languageSearchPlaceholderMessage = defineMessage({
  id: "codex.profileDropdown.languageSearchPlaceholder",
  defaultMessage: "Search languages",
  description: "Placeholder for language search input in the language picker",
});

export function LanguageDropdown(): React.ReactElement | null {
  const intl = useIntl();
  const windowType = useWindowType();
  const scope = useScope(AppScope);
  const layer = useStatsigLayer(__statsigName("codex-i18n"));
  const { logEventWithStatsig } = useStatsigEventLogger();

  const isI18nEnabled = useMemo((): boolean => {
    return layer?.get("enable_i18n", false);
  }, [layer]);

  const {
    data: localeOverride,
    setData,
    isLoading,
  } = useConfiguration(ConfigurationKeys.LOCALE_OVERRIDE, {
    enabled: windowType !== "browser",
  });
  const [searchQuery, setSearchQuery] = useState("");

  const localeOptions = useMemo((): Array<LocaleOption> => {
    return [
      {
        code: ENGLISH_OVERRIDE_LOCALE,
        label: getLocaleDisplayName(
          ENGLISH_OVERRIDE_LOCALE,
          ENGLISH_OVERRIDE_LOCALE,
        ),
        localizedLabel: getLocaleDisplayName(ENGLISH_LANGUAGE, intl.locale),
      },
      ...getAvailableLocales().map((definition) => ({
        code: definition.locale,
        label: getLocaleDisplayName(definition.locale, definition.locale),
        localizedLabel: getLocaleDisplayName(definition.locale, intl.locale),
      })),
    ].sort((first, second) => first.label.localeCompare(second.label));
  }, [intl.locale]);

  const filteredLocaleOptions = useMemo((): Array<LocaleOption> => {
    const trimmedQuery = searchQuery.trim().toLowerCase();
    if (!trimmedQuery) {
      return localeOptions;
    }

    return localeOptions.filter((option) => {
      const labelMatch = option.label.toLowerCase().includes(trimmedQuery);
      const localizedMatch = option.localizedLabel
        .toLowerCase()
        .includes(trimmedQuery);
      return labelMatch || localizedMatch;
    });
  }, [localeOptions, searchQuery]);

  const normalizedLocaleOverride = normalizeLocaleCode(localeOverride);

  const handleSelect = useCallback(
    async (value: string | null): Promise<void> => {
      if (value === localeOverride) {
        return;
      }
      try {
        await setData(value);
        logEventWithStatsig("codex_i18n_language_selected", {
          selection: value ?? "auto",
          surface: "profile_dropdown",
        });
      } catch {
        scope.get(toast$).danger(
          intl.formatMessage({
            id: "codex.profileDropdown.languageUpdateError",
            defaultMessage: "Failed to update language",
            description:
              "Error toast shown when updating the language selection fails",
          }),
        );
      }
    },
    [scope, intl, localeOverride, logEventWithStatsig, setData],
  );

  if (!isI18nEnabled || windowType === "browser") {
    return null;
  }

  return (
    <BasicSubDropdown
      trigger={
        <DropdownItem LeftIcon={GlobeIcon}>
          <FormattedMessage
            id="codex.profileDropdown.language"
            defaultMessage="Language"
            description="Trigger label for language preference dropdown"
          />
        </DropdownItem>
      }
    >
      <div className="flex max-h-[280px] min-w-[200px] flex-col gap-1 overflow-y-auto p-1">
        <DropdownSearchInput
          value={searchQuery}
          onChange={(event) => {
            setSearchQuery(event.target.value);
          }}
          placeholder={intl.formatMessage(languageSearchPlaceholderMessage)}
          className="mb-1"
        />
        <DropdownItem
          disabled={isLoading}
          RightIcon={normalizedLocaleOverride == null ? CheckIcon : undefined}
          onSelect={(event) => {
            event.preventDefault();
            void handleSelect(null);
          }}
        >
          <FormattedMessage {...defaultLanguageMessage} />
        </DropdownItem>
        {filteredLocaleOptions.map((option) => {
          const isSelected = isLocaleOptionSelected(
            option.code,
            localeOverride,
          );
          return (
            <DropdownItem
              key={option.code}
              disabled={isLoading}
              RightIcon={isSelected ? CheckIcon : undefined}
              onSelect={(event) => {
                event.preventDefault();
                void handleSelect(
                  isEnglishLocaleCode(option.code)
                    ? ENGLISH_OVERRIDE_LOCALE
                    : option.code,
                );
              }}
            >
              {option.label}
            </DropdownItem>
          );
        })}
      </div>
    </BasicSubDropdown>
  );
}

const localeLabelCache = new Map<string, string>();

function getLocaleDisplayName(locale: string, displayLocale: string): string {
  const cacheKey = `${displayLocale}:${locale}`;
  const cached = localeLabelCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  try {
    const displayNames = new Intl.DisplayNames([displayLocale], {
      type: "language",
      languageDisplay: "standard",
    });
    const label = displayNames.of(locale) ?? locale;
    localeLabelCache.set(cacheKey, label);
    return label;
  } catch {
    localeLabelCache.set(cacheKey, locale);
    return locale;
  }
}
