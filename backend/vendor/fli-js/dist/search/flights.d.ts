/**
 * Flight search orchestrator.
 *
 * Results come from Google's public `/travel/flights` page — see
 * `tfs.ts` for why, and for the token that addresses it. Booking options
 * still go through the `GetBookingResults` RPC, which is gated: that call
 * now fails with {@link SearchRejectedError} rather than returning
 * anything.
 *
 * 1:1 port of fli/search/flights.py.
 */
import type { GoogleFlightsUrlOptions } from "../core/links.ts";
import type { BookingOption, FlightResult, PassengerInfo } from "../models/google-flights/base.ts";
import { SeatType } from "../models/google-flights/base.ts";
import type { FlightSearchFilters } from "../models/google-flights/flights.ts";
import { type Client } from "./client.ts";
/**
 * Google inlines fewer rows — in premium cabins often none — for parties
 * with children or infants, because those fares are priced client-side
 * through the gated RPC this transport cannot reach; extra adults cost
 * nothing. Measured live 2026-09-20: JFK-LHR economy held 23 rows for one
 * adult and 16 with a lap infant; SFO-NRT business held 9 for one or two
 * adults and 0 with a child.
 */
export declare const SPARSE_PASSENGER_MIX_WARNING: string;
export interface SearchOptions {
    topN?: number;
    currency?: string | null;
    language?: string | null;
    country?: string | null;
    /**
     * Cancels the search. A round trip is several sequential page fetches
     * with backoffs between them, so this reaches every one of them —
     * including the sleeps — and rejects with the reason it was aborted with.
     */
    signal?: AbortSignal;
}
export interface BookingOptions {
    currency?: string | null;
    language?: string | null;
    country?: string | null;
    bookingToken?: string | null;
    sessionId?: string | null;
    /** Cancels the booking request. */
    signal?: AbortSignal;
}
/** Locale knobs plus cabin class for {@link SearchFlights.buildFlightBookingUrl}. */
export interface BookingUrlOptions extends GoogleFlightsUrlOptions {
    /** Cabin class encoded into the `tfs` token (field 9). Defaults to economy. */
    seatType?: SeatType;
    /**
     * Passenger mix encoded into the `tfs` token (field 8, one entry per
     * traveller). Defaults to a single adult, matching this method's output
     * before this option existed.
     */
    passengerInfo?: Partial<PassengerInfo>;
}
export declare class SearchFlights {
    /**
     * @deprecated Kept only so the exported surface does not move. Searches
     * no longer POST here: `GetShoppingResults` requires a browser-signed
     * `x-goog-batchexecute-bgr` header and answers every other client with
     * error 13. Results come from `PAGE_URL` in `tfs.ts` instead.
     */
    static readonly BASE_URL = "https://www.google.com/_/FlightsFrontendUi/data/travel.frontend.flights.FlightsFrontendService/GetShoppingResults";
    /**
     * The `GetBookingResults` RPC. Still used by {@link SearchFlights.getBookingOptions},
     * and still gated the same way — that call currently throws
     * `SearchRejectedError`.
     */
    static readonly BOOKING_URL = "https://www.google.com/_/FlightsFrontendUi/data/travel.frontend.flights.FlightsFrontendService/GetBookingResults";
    private readonly client;
    private _lastSessionId;
    private _sparsePassengerMix;
    constructor(client?: Client);
    /**
     * Whether the sparse-passenger-mix warning fired on the most recent `search()`.
     *
     * `true` exactly when the empty result this instance last returned (or
     * threw out of) was consistent with Google's client-side pricing gap for
     * children/infants — at least one fetched page decoded to zero rows
     * before client-side filtering, and the party had a child or infant —
     * rather than the caller's own airline/price/duration/window filter
     * removing rows Google did inline. See {@link SPARSE_PASSENGER_MIX_WARNING}.
     * Reset to `false` at the start of every `search()` call, including ones
     * that throw, so a stale `true` from an earlier call never leaks into a
     * later one.
     *
     * Reflects only the *last completed* `search()` call on this instance and
     * is not meant for instances shared across concurrent searches — two
     * overlapping `search()` calls on one `SearchFlights` would race on this
     * the same way they already race on the cached session id used by
     * {@link SearchFlights.getBookingOptions}. Any MCP-equivalent or CLI-style
     * caller should read this after `search()` instead of recomputing the
     * condition itself.
     */
    get sparsePassengerMix(): boolean;
    /**
     * Search for flights using the given filters.
     *
     * One page fetch for a one-way trip; for a round trip, one more per
     * expanded outbound candidate (`topN`, default 5).
     *
     * @returns For one-way trips, `FlightResult[]`. For round trips, one
     *   array per itinerary (`[outbound, return]`). `null` when nothing
     *   survived the filters.
     * @throws {SearchUnsupportedError} Multi-city, which the page cannot serve.
     * @throws {SearchParseError} The page loaded but carried no readable rows.
     * @throws {SearchClientError} Network or HTTP failure.
     */
    search(filters: FlightSearchFilters, options?: SearchOptions): Promise<Array<FlightResult | FlightResult[]> | null>;
    /**
     * Warn once when an empty result may be Google's pricing gap, not a dead route.
     *
     * Called only from {@link SearchFlights.search}, after the trip's final
     * result is known to be empty — never from {@link SearchFlights._fetchFlights},
     * which the round-trip expansion calls once per candidate outbound. That
     * keeps this to exactly one warning per `search` call, one-way or
     * round-trip alike.
     *
     * `tracker` is what keeps this from misattributing an empty result: the
     * final list can be empty either because Google inlined nothing
     * (`tracker.anyZeroRows`) or because it inlined rows the caller's own
     * airline/price/duration/window filter then removed entirely — the
     * warning must only fire for the former.
     */
    private _warnIfSparsePassengerMix;
    private _fetchFlights;
    /**
     * Fetch bookable fare options for a selected itinerary.
     *
     * Currently unavailable: this is the one call still made against the
     * `GetBookingResults` RPC, which since 2026-08 requires an
     * `x-goog-batchexecute-bgr` header signed by Google's own page
     * JavaScript. Expect {@link SearchRejectedError}. Per-itinerary booking
     * links are still available — see
     * {@link SearchFlights.buildFlightBookingUrl}, which needs no network
     * call at all.
     *
     * @throws {SearchRejectedError} Google declined the RPC (the normal outcome).
     */
    getBookingOptions(flight: FlightResult | FlightResult[], filters: FlightSearchFilters, options?: BookingOptions): Promise<BookingOption[]>;
    /**
     * Build a Google Flights deep-link URL for a specific itinerary.
     *
     * Constructs `https://www.google.com/travel/flights/booking?tfs=…` that opens
     * the booking page pre-loaded with the given itinerary — the airline/OTA fare
     * options and the "Continue" booking CTA included.
     *
     * The `tfs` itinerary token is fully deterministic (built from the flight's
     * airports, dates and flight numbers); no session id or network round-trip is
     * required, so the same itinerary always yields the same URL. This method
     * never throws — on malformed input it falls back to the generic Google
     * Flights URL.
     *
     * @param flight A single `FlightResult` (one-way / single segment) or an
     *   array of them (round-trip / multi-city, one element per travel direction).
     */
    buildFlightBookingUrl(flight: FlightResult | FlightResult[], options?: BookingUrlOptions): string;
    /**
     * Cache the shopping session id from `inner[0][4]` of a search payload.
     *
     * A shape change here means booking calls fall back to "missing token"
     * errors, so it warns rather than silently leaving the cache untouched.
     */
    private _captureSessionId;
    private _expandMultiLeg;
    static _encodeBookingPayload(token: string, filters: FlightSearchFilters): string;
}
//# sourceMappingURL=flights.d.ts.map