/**
 * Search transport built on Google Flights' public `/travel/flights` page.
 *
 * Since 2026-08 the `FlightsFrontendService` RPC endpoints
 * (`GetShoppingResults`, `GetCalendarGraph`) require an
 * `x-goog-batchexecute-bgr` header that only the page's own JavaScript can
 * produce. The signature is bound to the exact request bytes, so a captured
 * token cannot be replayed against a different body — every plain HTTP
 * client gets HTTP 200 with a payload-less `wrb.fr` row carrying error 13.
 *
 * The public search page is not gated that way. It serves the same result
 * payload inline, in an `AF_initDataCallback` blob keyed `ds:1`, whose
 * elements `[2]` and `[3]` hold exactly the flight rows the RPC used to
 * return — so `decoders.ts` keeps working untouched. The page is addressed
 * by a `tfs` protobuf parameter instead of the `f.req` JSON struct, which
 * is what this module builds.
 *
 * Scope note: `tfs` carries trip type, segments, stop limit, cabin,
 * passengers, alliances and layover restrictions. Filters with no known
 * `tfs` field (airline include/exclude, price cap, duration, departure
 * window) are applied to the decoded results instead — see
 * {@link applyClientSideFilters}. Anything that can be neither encoded nor
 * filtered after the fact is reported by {@link unsupportedFilters} so the
 * caller can warn rather than silently return results that ignore it.
 *
 * Multi-city is out of reach here entirely: the page inlines no rows for
 * it, so {@link buildTfs} refuses those searches rather than returning the
 * first leg's one-way board.
 *
 * 1:1 port of fli/search/_tfs.py.
 */
import type { FlightResult } from "../models/google-flights/base.ts";
import type { DateSearchFilters } from "../models/google-flights/dates.ts";
import type { FlightSearchFilters } from "../models/google-flights/flights.ts";
import type { Client } from "./client.ts";
/** Filter objects this transport can encode — both carry the same core fields. */
export type TfsFilters = FlightSearchFilters | DateSearchFilters;
export declare const PAGE_URL = "https://www.google.com/travel/flights";
/**
 * How many times one page is fetched before giving up on its `ds:1` blob.
 *
 * Roughly one page in sixty comes back HTTP 200 with every other
 * `AF_initDataCallback` block present but no `ds:1` one — a transient
 * variant, not a block: the identical request succeeds seconds later. A
 * round trip fetches six pages and a date sweep one per date, so at that
 * rate an unretried search fails noticeably often.
 *
 * Retry only this exact case. HTTP errors and error-13 rejections are
 * already handled (and retried, where appropriate) by the client, and
 * re-fetching them here would just multiply a hard failure. Worst case is
 * 3 fetches per page, so a healthy N-date sweep stays N requests.
 */
export declare const PAGE_FETCH_ATTEMPTS = 3;
/** Backoff in milliseconds between page fetch attempts. */
export declare const PAGE_RETRY_BACKOFF_MS: readonly [500, 1500];
type SleepFn = (ms: number, signal?: AbortSignal) => Promise<void>;
/**
 * Replace the page-retry backoff (test seam).
 *
 * Pass `null` to restore the real `setTimeout` sleep. Mirrors the
 * `_tfs._sleep` indirection the Python tests patch, so a retry test can
 * observe the backoff without waiting two seconds for it.
 */
export declare function _setPageRetrySleep(fn: SleepFn | null): void;
export interface BuildTfsOptions {
    /**
     * Per-segment date overrides, used by the date sweep to reprice one
     * segment set across a range without cloning the whole filter object
     * per day.
     */
    travelDates?: readonly string[] | null;
}
/**
 * Build the `tfs` URL parameter for `filters`.
 *
 * @returns The base64url `tfs` value, unpadded, as Google's own URLs carry it.
 * @throws {SearchUnsupportedError} For multi-city trips, which this
 *   transport cannot serve at all.
 */
export declare function buildTfs(filters: TfsFilters, options?: BuildTfsOptions): string;
/** Build the search-page URL for a `tfs` value and locale. */
export declare function pageUrl(tfs: string, currency?: string | null, language?: string | null, country?: string | null): string;
/**
 * Pull the `ds:1` payload out of a rendered search page.
 *
 * Returns the same structure the RPC used to hand back, so callers can
 * keep reading `payload[2]` / `payload[3]` for flight rows.
 */
export declare function extractPayload(html: string): unknown;
export interface FetchPayloadOptions {
    /** Propagated to the client so a caller can cancel the fetch. */
    signal?: AbortSignal;
}
/**
 * Fetch a search page and return its `ds:1` payload, or `null`.
 *
 * The single entry point both the flight search and the date sweep use,
 * so the transient-page retry described at {@link PAGE_FETCH_ATTEMPTS}
 * applies identically to each. Only a 200 with no `ds:1` blob is retried;
 * HTTP and network errors propagate on the first attempt exactly as
 * before.
 *
 * @returns The decoded payload, or `null` when every attempt came back
 *   without one — the caller decides whether that is fatal.
 */
export declare function fetchPayload(client: Client, url: string, options?: FetchPayloadOptions): Promise<unknown>;
/** Name the set filters this transport can neither encode nor emulate. */
export declare function unsupportedFilters(filters: TfsFilters): string[];
/**
 * Apply the filters `tfs` has no field for, to already-decoded rows.
 *
 * Google would have applied these server-side and back-filled the result
 * list, so a filtered search returns fewer options here than the old RPC
 * did — but every option it does return honours the filter.
 */
export declare function applyClientSideFilters(flights: readonly FlightResult[], filters: TfsFilters): FlightResult[];
export {};
//# sourceMappingURL=tfs.d.ts.map