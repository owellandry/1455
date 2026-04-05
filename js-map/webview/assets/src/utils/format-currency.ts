import type { IntlShape } from "react-intl";

type FormatCurrencyAmountOptions = {
  intl: IntlShape;
  /**
   * Amount in major currency units, for example `12.34` USD instead of cents.
   */
  amount: number;
  currencyCode: string;
  /**
   * Optional override for how many digits to show after the decimal separator.
   * When omitted, the formatter uses the currency's default precision.
   */
  currencyFractionDigits?: number | null;
};

/**
 * Formats a currency amount for the active locale using the currency's
 * configured precision.
 */
export function formatCurrencyAmount({
  intl,
  amount,
  currencyCode,
  currencyFractionDigits,
}: FormatCurrencyAmountOptions): string {
  const resolvedCurrencyFractionDigits =
    currencyFractionDigits ?? getCurrencyFractionDigits({ intl, currencyCode });

  return intl.formatNumber(amount, {
    style: "currency",
    currency: currencyCode,
    minimumFractionDigits: resolvedCurrencyFractionDigits,
    maximumFractionDigits: resolvedCurrencyFractionDigits,
  });
}

function getCurrencyFractionDigits({
  intl,
  currencyCode,
}: {
  intl: IntlShape;
  currencyCode: string;
}): number {
  return (
    intl.formatters
      .getNumberFormat(intl.locale, {
        style: "currency",
        currency: currencyCode,
      })
      .resolvedOptions().maximumFractionDigits ?? 0
  );
}
