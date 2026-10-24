/**
 * Shared URL helpers for Google Flights deep links.
 *
 * Consumers can surface a clickable Google Flights link alongside search
 * results so a user can open the route (and complete a booking) in a
 * browser. The natural-language `q` form used here is the same one Google's
 * own frontend accepts.
 *
 * `withLocaleParams` lives here (rather than in `search/`) so the core layer
 * stays free of any dependency on the search package; `search/urls.ts`
 * re-exports it for backwards compatibility.
 *
 * 1:1 port of fli/core/links.py.
 */
/**
 * Append optional `curr`/`hl`/`gl` parameters to a URL.
 *
 * - `currency` is uppercased ("usd" → "USD") because Google rejects lowercase
 *   codes silently.
 * - `language` is passed through verbatim (BCP-47).
 * - `country` is uppercased (ISO 3166-1 alpha-2).
 *
 * All values are percent-encoded; returns `url` unchanged when all three are null.
 */
export declare function withLocaleParams(url: string, currency: string | null | undefined, language: string | null | undefined, country: string | null | undefined): string;
export interface GoogleFlightsUrlOptions {
    currency?: string | null;
    language?: string | null;
    country?: string | null;
}
/**
 * Build a shareable Google Flights deep link for a route and dates.
 *
 * `origin` and `destination` are bare IATA codes (e.g. `"JFK"`). The returned
 * URL pre-fills the route and outbound date (plus the return date for round
 * trips); locale knobs (`curr`/`hl`/`gl`) are appended when supplied.
 */
export declare function googleFlightsUrl(origin: string, destination: string, departureDate: string, returnDate?: string | null, options?: GoogleFlightsUrlOptions): string;
//# sourceMappingURL=links.d.ts.map