/**
 * Minimal protobuf encoder for the GetBookingResults token.
 *
 * 1:1 port of fli/search/_proto.py — preserves the byte-perfect
 * reproduction of a captured live booking token.
 */
import type { PassengerInfo } from "../models/google-flights/base.ts";
/**
 * Construct the GetBookingResults outer[0][1] token.
 *
 * @returns base64-encoded protobuf token.
 * @throws Error when any string argument is empty or price_cents is negative.
 */
export declare function buildBookingToken(args: {
    sessionId: string;
    airlineCode: string;
    flightNumber: string;
    legIndex: number;
    priceCents: number;
    currency?: string;
}): string;
/** Varint reader; returns `[value, newOffset]`.
 *
 * Uses `+= chunk * 2**shift` instead of `|= chunk << shift` because
 * JavaScript's bitwise operators coerce to signed 32-bit integers, so
 * `<<` past bit 30 corrupts the result. Numbers stay accurate up to
 * `Number.MAX_SAFE_INTEGER` (2^53 − 1), which is plenty for prices and
 * field tags but stops short of the full protobuf 64-bit varint range.
 */
export declare function _readVarint(buf: Uint8Array, off: number): [number, number];
type DecodedNested = Record<string, string | number>;
type DecodedToken = Record<string, string | number | DecodedNested>;
/** Decode a booking token (round-trip helper used by tests). */
export declare function decodeBookingToken(token: string): DecodedToken;
/** Extract the booking token from a `tfu` URL parameter (or full URL). */
export declare function extractBookingTokenFromTfu(tfu: string): string;
/** Extract the booking session id from a `tfu` parameter. */
export declare function extractSessionIdFromTfu(tfu: string): string;
/** One physical leg within a booking-URL segment. */
export interface LegSpec {
    /** IATA code of the departure airport (e.g. `"SFO"`). */
    origin: string;
    /** Departure date in `YYYY-MM-DD` format. */
    depDate: string;
    /** IATA code of the arrival airport (e.g. `"PHX"`). */
    dest: string;
    /** Airline IATA code (e.g. `"AA"`). */
    airline: string;
    /** Flight number string (e.g. `"2413"`). */
    flightNumber: string;
}
export interface BuildTfsTokenOptions {
    /** `true` for one-way (incl. multi-city); `false` for round-trip. */
    isOneWay?: boolean;
    /**
     * Passenger kind codes, one entry per traveller (field 8). Build these
     * from a search's `PassengerInfo` with {@link passengerCodes}. Defaults
     * to a single adult so existing callers keep producing the captured
     * tokens.
     */
    passengers?: readonly number[];
    /**
     * Cabin class encoded in field 9.
     * `1` = economy, `2` = premium economy, `3` = business, `4` = first.
     * Defaults to economy so existing callers keep producing the captured tokens.
     */
    seat?: number;
}
/**
 * Convert a `PassengerInfo` into `tfs` field-8 codes, one per traveller.
 *
 * Shared by {@link buildTfs} in `tfs.ts` (the search token) and
 * {@link buildTfsToken} (the per-flight booking token) so the two cannot
 * drift on how they encode the passenger mix.
 *
 * @param passengerInfo A `PassengerInfo`, or any duck-typed object exposing
 *   some subset of `adults`/`children`/`infants_on_lap`/`infants_in_seat`
 *   (missing ones count as zero). `null`/`undefined` is treated as an
 *   all-zero mix.
 * @returns One code per traveller, in field order. Falls back to `[1]` (a
 *   single adult) when the mix would otherwise be empty.
 * @throws {RangeError} Any count is not a non-negative integer, or the
 *   total exceeds {@link MAX_TOTAL_PASSENGERS}. Checked before building the
 *   result array, so a wildly out-of-range count (a duck-typed
 *   `adults: 1_000_000`, say) fails immediately instead of allocating an
 *   array that size — callers that pass a validated `PassengerInfo` never
 *   hit this; it exists for the duck-typed callers this function otherwise
 *   tolerates.
 */
export declare function passengerCodes(passengerInfo: Partial<PassengerInfo> | null | undefined): number[];
/** Optional per-segment restrictions Google reads out of the `tfs` segment. */
export interface EncodeTfsSegmentOptions {
    /**
     * Physical flights pinned for this direction, if any. Supplying them
     * narrows a search to itineraries that include them — that is how a
     * round-trip search asks for return options against a chosen outbound.
     */
    legs?: readonly LegSpec[];
    /**
     * Stop ceiling, zero-based (`0` = non-stop, `1` = one stop or fewer).
     * `null`/`undefined` leaves the search unconstrained; passing `0` for
     * "any" would pin it to non-stop instead.
     */
    maxStops?: number | null;
    /**
     * Only itineraries on these carriers. Google takes airline IATA codes
     * and alliance names (`"STAR_ALLIANCE"`) in the same list.
     */
    carriers?: readonly string[];
    /** The same values, as an exclude list. */
    carriersExclude?: readonly string[];
    /** Only these airports may be used as layover stops. */
    layoverAirports?: readonly string[];
    /** Minimum layover wait, in minutes. */
    minLayover?: number | null;
    /** Maximum layover wait, in minutes. */
    maxLayover?: number | null;
}
/**
 * Encode one travel direction of a `tfs` itinerary.
 *
 * @param origin IATA code (or codes) the direction departs from.
 * @param dest IATA code (or codes) the direction arrives at.
 * @param date Departure date in `YYYY-MM-DD` format.
 * @returns The length-delimited field 3 bytes for this segment.
 */
export declare function encodeTfsSegment(origin: string | readonly string[], dest: string | readonly string[], date: string, options?: EncodeTfsSegmentOptions): Uint8Array;
/** Envelope options for {@link encodeTfsPayload}. */
export interface EncodeTfsPayloadOptions {
    /**
     * `true` for one-way, `false` for round-trip. Controls field 19.
     * Multi-city is a third value (3) that the search page cannot serve.
     */
    isOneWay: boolean;
    /**
     * Passenger kind codes, one entry per traveller (1 = adult, 2 = child,
     * 3 = infant on lap, 4 = infant in own seat). The two infant codes are
     * the ones to get right: a lap infant prices at ~10% of the adult fare
     * and an infant in its own seat at ~100%, and transposing them produces
     * a plausible wrong quote rather than an error.
     */
    passengers?: readonly number[];
    /** Cabin class (1 = economy, 2 = premium, 3 = business, 4 = first). */
    seat?: number;
    /**
     * Emit the field 16 constant that booking deep links carry. The search
     * page does not need it.
     */
    pinMaxU64?: boolean;
}
/**
 * Wrap encoded segments in the `tfs` envelope and base64 it.
 *
 * @param segments Concatenated output of {@link encodeTfsSegment}.
 * @returns URL-safe base64 string with padding stripped.
 */
export declare function encodeTfsPayload(segments: Uint8Array, options: EncodeTfsPayloadOptions): string;
/**
 * Build the `tfs` query parameter for a Google Flights deep-link URL.
 *
 * The `tfs` token encodes the complete itinerary — one segment per travel
 * direction, each segment containing one leg per physical flight. It is
 * deterministic (no session id required) and can be constructed purely from
 * search-result data.
 *
 * 1:1 port of fli/search/_proto.py::build_tfs_token.
 *
 * @throws Error when `segments` is empty or any segment has no legs.
 */
export declare function buildTfsToken(segments: LegSpec[][], options?: BuildTfsTokenOptions): string;
export {};
//# sourceMappingURL=proto.d.ts.map