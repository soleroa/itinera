/**
 * Date-based flight search — the cheapest price for each date in a range.
 *
 * Google's `GetCalendarGraph` RPC used to hand back a whole date grid in
 * one call, but it now requires a browser-signed
 * `x-goog-batchexecute-bgr` header (see `tfs.ts`). The public search page
 * has no such grid, so each date costs its own page fetch. Those run
 * concurrently under the shared rate limiter, and the range is capped —
 * see {@link MAX_DATES_PER_SEARCH}.
 *
 * 1:1 port of fli/search/dates.py.
 */
import type { PassengerInfo } from "../models/google-flights/base.ts";
import type { DateSearchFilters } from "../models/google-flights/dates.ts";
import { type Client } from "./client.ts";
/**
 * Same wording the flight path uses for the same condition, so a caller
 * who sees it on either path gets the same hint about what to check.
 *
 * Exported (mirroring the Python module's `_NO_PAYLOAD`, importable despite
 * the underscore) so tests can build `DateOutcome`s that exercise the
 * no-payload branch of {@link SearchDates._collect} exactly.
 */
export declare const NO_PAYLOAD: string;
/**
 * Same wording `flights.ts` uses for the same condition — see
 * {@link SPARSE_PASSENGER_MIX_WARNING} there for the live JFK-LHR / SFO-NRT
 * row counts behind it. Duplicated rather than imported so this module's
 * empty-result path stays self-contained.
 */
export declare const SPARSE_PASSENGER_MIX_WARNING: string;
/**
 * Most dates a single {@link SearchDates.search} call will price.
 *
 * The public search page carries no calendar grid, so every date in the
 * range costs its own full page fetch (~2 MB). Ninety-three days is a
 * whole quarter — comfortably wider than the 61-day chunk size — and caps
 * one search at roughly 190 MB of transfer rather than letting a
 * "2026-01-01 to 2026-12-31" request quietly issue 365 requests.
 */
export declare const MAX_DATES_PER_SEARCH = 93;
/**
 * Payload-less pages, before any success, that abandon a sweep.
 *
 * Retries multiply. The client retries a request three times, and
 * `fetchPayload` fetches a page up to three times, so one date can cost
 * nine HTTP requests before it gives up — and a client that is being
 * blocked (an EU/EEA IP with the consent cookie disabled, say) fails that
 * way on *every* date. Paying it 93 times to learn one fact is the wrong
 * trade.
 *
 * Only the payload-less page counts. That failure is deterministic: a
 * consent or block page is served to every request alike, so the dates
 * not yet tried will fail the same way. A connection error or timeout
 * says nothing about them, so counting those would abandon a healthy
 * sweep over a transient wobble.
 *
 * The breaker also only looks at the start of a sweep: it arms while no
 * date has produced a usable page, and disarms permanently the moment one
 * does. A working sweep therefore keeps the full retry budget for every
 * transient miss in it.
 */
export declare const SWEEP_FAILURE_THRESHOLD = 5;
export interface DatePrice {
    /** Single date for one-way searches, or `[outbound, return]` for round trip. */
    date: [Date] | [Date, Date];
    price: number;
    currency: string | null;
}
export interface DateSearchOptions {
    currency?: string | null;
    language?: string | null;
    country?: string | null;
    /**
     * Cancels the sweep. A 93-date range is up to 93 page fetches with
     * backoffs between their retries; this reaches every one of them,
     * sleeps included.
     */
    signal?: AbortSignal;
}
/**
 * What pricing one date produced.
 *
 * Richer than a bare `DatePrice | null` so the caller can tell "this date
 * had no flights" apart from "this date never loaded". Exported for
 * {@link SearchDates._collect}, which tests drive directly because the
 * interesting states (a tripped breaker alongside real prices) depend on
 * how the sweep's concurrent fetches happen to interleave.
 */
export interface DateOutcome {
    /** The cheapest itinerary for the date, or null when skipped/failed/empty. */
    price: DatePrice | null;
    /** Human-readable reason the date could not be priced, or null. */
    failure: string | null;
    /** The error behind `failure`, kept for chaining. */
    error: unknown;
    /** False for dates skipped before any request, so they don't count as failures. */
    attempted: boolean;
    /**
     * How many rows the page decoded to *before* `applyClientSideFilters` ran,
     * or `null`/absent when the page never loaded (`failure` is set) or the
     * outcome was built by hand. Zero here means Google itself inlined
     * nothing for the date; a positive count that still left `price` unset
     * means the caller's own airline/price/duration/window filter removed
     * every row — a different cause, so the two must not be conflated when
     * deciding whether to blame a sparse passenger mix. Optional so existing
     * hand-built ``DateOutcome`` literals (test fixtures predating this field)
     * still type-check; an absent value reads the same as `null`.
     */
    rowsBeforeFilters?: number | null;
}
export declare class SearchDates {
    /**
     * @deprecated Kept only so the exported surface does not move. The
     * sweep no longer POSTs here: `GetCalendarGraph` requires a
     * browser-signed `x-goog-batchexecute-bgr` header and answers every
     * other client with error 13. Each date is priced from its own
     * `/travel/flights` page instead.
     */
    static readonly BASE_URL = "https://www.google.com/_/FlightsFrontendUi/data/travel.frontend.flights.FlightsFrontendService/GetCalendarGraph";
    /** Range size at which the sweep splits into independent chunk filters. */
    static readonly MAX_DAYS_PER_SEARCH = 61;
    /** Most dates one `search` call will price. See {@link MAX_DATES_PER_SEARCH}. */
    static readonly MAX_DATES_PER_SEARCH = 93;
    private readonly client;
    private _sparsePassengerMix;
    constructor(client?: Client);
    /**
     * Whether the sparse-passenger-mix warning fired on the most recent `search()`.
     *
     * `true` exactly when the empty sweep this instance last returned (or
     * threw out of) was consistent with Google's client-side pricing gap for
     * children/infants rather than the caller's own filters — see
     * {@link SearchDates._warnIfSparsePassengerMix}. Reset to `false` at the
     * start of every `search()` call, including ones that throw, so a stale
     * `true` from an earlier call never leaks into a later one.
     *
     * Reflects only the *last completed* `search()` call on this instance and
     * is not meant for instances shared across concurrent searches. Not
     * currently read by any caller in this package (unlike
     * {@link SearchFlights.sparsePassengerMix}); exposed here for symmetry
     * with the warning this class already logs.
     */
    get sparsePassengerMix(): boolean;
    /**
     * Price every date in the filters' range.
     *
     * Every date costs its own search-page fetch — the page serves no
     * calendar grid — so the range is capped at
     * {@link MAX_DATES_PER_SEARCH} dates. Internally it is still split into
     * {@link MAX_DAYS_PER_SEARCH}-day chunk filters, but all dates are
     * priced by a single flat parallel map.
     *
     * @returns One entry per date that could be priced, or `null` when no
     *   date in the range had flights.
     * @throws {RangeError} The range covers more than
     *   {@link MAX_DATES_PER_SEARCH} dates.
     * @throws {SearchParseError} Every date came back without a payload —
     *   a consent or block page, not an empty route.
     * @throws {SearchClientError} Every date failed for some other reason,
     *   or nothing priced because at least half the attempted dates never
     *   loaded — see {@link SearchDates._collect}.
     */
    search(filters: DateSearchFilters, options?: DateSearchOptions): Promise<DatePrice[] | null>;
    /**
     * Warn once when an empty sweep may be Google's pricing gap, not a dead range.
     *
     * `_collect` already turns "every attempted date failed" or a tripped
     * breaker into a throw, and a minority of load failures into its own
     * summary warning (see its docstring) — so this only has something to add
     * when nothing priced *and* not one attempted date failed to load.
     *
     * That alone is not enough, though: a date whose page loaded and decoded
     * rows that the caller's own airline/price/duration/window filter then
     * removed looks identical to one Google itself served nothing for, unless
     * the pre-filter row count is checked too. Only when at least one loaded
     * date's page decoded to *zero* rows before filtering is the emptiness
     * actually Google's doing — see {@link DateOutcome.rowsBeforeFilters}. For
     * a party with children or infants that is the shape Google's
     * client-side pricing produces, not evidence the route has no service.
     *
     * Internal — underscore-prefixed rather than private, mirroring
     * {@link SearchDates._collect}, so tests can drive it with a fixed set of
     * outcomes instead of racing a real sweep's per-date failure logging into
     * the state they want to assert.
     *
     * @returns Whether the warning fired — the caller mirrors this onto
     *   {@link SearchDates.sparsePassengerMix}.
     */
    static _warnIfSparsePassengerMix(outcomes: DateOutcome[], result: DatePrice[] | null, passengerInfo: PassengerInfo): boolean;
    /** List every date in one chunk's `from_date`..`to_date` range. */
    private static _daysIn;
    /**
     * Assemble priced dates, raising when nothing could be fetched at all.
     *
     * A date with no flights is a legitimate answer; a date whose page
     * never arrived is not. When *every* attempted date failed, returning
     * an empty list would report a dead transport as "this route has no
     * flights" — exactly the silent failure this client exists to avoid.
     *
     * A sweep that tripped the circuit breaker must never end quietly
     * either. With prices to show, the answer is real but incomplete, so it
     * comes with one warning naming the count.
     *
     * The breaker is not the only way a sweep can go quietly wrong, though:
     * it disarms for good the instant any page loads, empty or not, so "1
     * loaded, 29 timeouts" sails straight past it — one date out of thirty
     * is not enough evidence that a route has no flights. When nothing
     * priced and at least half the attempted dates never loaded (`failed
     * >= loaded`), that is raised too. A page did load in that case, which
     * rules out an EU/EEA consent wall — those block every request alike —
     * so this path never adds the `FLI_SOCS_COOKIE` hint the branch above
     * does.
     *
     * Short of either throw, a sweep that lost some dates but not enough to
     * doubt the rest still owes the caller exactly one line saying so,
     * whether or not it ends up with anything to return.
     *
     * Internal — underscore-prefixed rather than `private` so tests can
     * drive it with a fixed set of outcomes instead of racing the sweep's
     * concurrent fetches into the state they want to assert.
     *
     * @param outcomes One entry per date in the range, in date order.
     * @param total Dates the sweep set out to price.
     * @param skipped Dates the breaker abandoned without requesting them.
     *   Non-zero exactly when the breaker tripped.
     */
    static _collect(outcomes: DateOutcome[], total: number, skipped: number): DatePrice[] | null;
    /**
     * Split the filters' date range into independent per-chunk copies.
     *
     * The flight segments are cloned per chunk and their `travel_date`
     * advanced by the chunk offset so each chunk represents a distinct,
     * self-contained search — which keeps the outbound/return gap a
     * round-trip sweep reads its duration from.
     */
    private _buildChunkFilters;
    /**
     * Price one departure date through its own search-page fetch.
     *
     * Total by construction — one bad date must never sink the sweep, so
     * every failure comes back as a `DateOutcome` rather than a rejection.
     *
     * `health` is the sweep's circuit breaker. It is consulted before any
     * request, so a date still queued when the sweep is already known to be
     * failing deterministically costs nothing at all.
     */
    private _priceOneDate;
}
//# sourceMappingURL=dates.d.ts.map