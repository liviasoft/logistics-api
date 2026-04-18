/**
 * Currency utilities — pure functions, no external dependencies.
 *
 * Amounts in payment APIs are always in the *smallest currency unit*:
 *   USD  → cents      ($12.34 = 1234)
 *   GBP  → pence      (£12.34 = 1234)
 *   NGN  → kobo       (₦1234 = 123400)
 *   JPY  → yen        (¥1234 = 1234 — zero-decimal currency)
 *
 * Use toSmallestUnit() when sending to a provider and fromSmallestUnit()
 * when displaying amounts to users.
 */

// ISO 4217 currencies that have no fractional unit (no cents)
const ZERO_DECIMAL_CURRENCIES = new Set([
  'bif', 'clp', 'djf', 'gnf', 'jpy', 'kmf', 'krw', 'mga', 'pyg',
  'rwf', 'ugx', 'vnd', 'vuv', 'xaf', 'xof', 'xpf',
]);

/**
 * Format an amount (in smallest unit) as a human-readable currency string.
 *
 * @param amount   Amount in smallest unit (e.g. 1234 cents)
 * @param currency ISO 4217 currency code (e.g. 'usd')
 * @param locale   BCP 47 locale tag (e.g. 'en-US', 'fr-FR'). Defaults to 'en'.
 *
 * @example formatCurrency(1234, 'usd', 'en-US') // '$12.34'
 * @example formatCurrency(1234, 'gbp', 'en-GB') // '£12.34'
 * @example formatCurrency(123400, 'ngn', 'en')  // '₦1,234.00'
 * @example formatCurrency(1234, 'jpy', 'ja-JP') // '¥1,234'
 */
export function formatCurrency(
  amount: number,
  currency: string,
  locale = 'en',
): string {
  const major = fromSmallestUnit(amount, currency);
  return new Intl.NumberFormat(locale, {
    style:    'currency',
    currency: currency.toUpperCase(),
  }).format(major);
}

/**
 * Convert a major-unit amount to the smallest currency unit.
 *
 * @example toSmallestUnit(12.34, 'usd') // 1234
 * @example toSmallestUnit(1234,  'jpy') // 1234
 */
export function toSmallestUnit(amount: number, currency: string): number {
  if (ZERO_DECIMAL_CURRENCIES.has(currency.toLowerCase())) {
    return Math.round(amount);
  }
  return Math.round(amount * 100);
}

/**
 * Convert a smallest-unit amount to the major unit (for display).
 *
 * @example fromSmallestUnit(1234, 'usd') // 12.34
 * @example fromSmallestUnit(1234, 'jpy') // 1234
 */
export function fromSmallestUnit(amount: number, currency: string): number {
  if (ZERO_DECIMAL_CURRENCIES.has(currency.toLowerCase())) {
    return amount;
  }
  return amount / 100;
}

/**
 * Return the number of decimal places for a currency.
 *
 * @example decimalPlaces('usd') // 2
 * @example decimalPlaces('jpy') // 0
 */
export function decimalPlaces(currency: string): number {
  return ZERO_DECIMAL_CURRENCIES.has(currency.toLowerCase()) ? 0 : 2;
}
