/**
 * Shared YYYY-MM-DD parsing and formatting helpers.
 *
 * Lives in `core/` so the same canonical implementation backs every part
 * of the package — `models/google-flights/base.ts`, the date-search
 * filters, and `search/dates.ts` — rather than each maintaining its own
 * subtly-different copy.
 */
/** Strict YYYY-MM-DD shape (4 digit year, 2 digit month, 2 digit day). */
export declare const ISO_DATE_RE: RegExp;
/**
 * Parse a YYYY-MM-DD string into a UTC `Date`.
 *
 * Rejects strings that don't match {@link ISO_DATE_RE} and rejects
 * out-of-range calendar dates (e.g. `2026-02-30` would round-trip to
 * March, so the round-trip check catches it). Throws {@link TypeError}
 * on any malformed input — consistent with the rest of the package.
 */
export declare function parseIsoDate(s: string): Date;
/** Format a `Date` as YYYY-MM-DD in UTC. */
export declare function formatIsoDate(d: Date): string;
//# sourceMappingURL=dates.d.ts.map