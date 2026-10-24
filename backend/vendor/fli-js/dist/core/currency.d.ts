/**
 * Currency extraction from Google Flights price tokens.
 *
 * 1:1 port of fli/core/currency.py — varint walk over a base64-urlsafe
 * protobuf payload to extract the nested ISO currency code, cached to
 * avoid repeated decoding for the common one-currency-per-response case.
 */
/**
 * Extract the ISO currency code from a Google Flights price token.
 *
 * Cached so the same token returned for every row in a response decodes
 * the protobuf payload exactly once.
 */
export declare function extractCurrencyFromPriceToken(token: string | null | undefined): string | null;
/** Currency-code-aware formatter built on `Intl.NumberFormat`. */
export declare function formatPrice(amount: number | null | undefined, currencyCode: string | null | undefined): string;
/** Build a chart-axis label for one or more result currencies. */
export declare function formatPriceAxisLabel(currencies: Iterable<string | null | undefined>): string;
/** Clear the in-memory token-decode cache (test helper). */
export declare function _clearCurrencyCache(): void;
//# sourceMappingURL=currency.d.ts.map