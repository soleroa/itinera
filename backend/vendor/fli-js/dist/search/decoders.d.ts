/**
 * Pure response decoders for Google Flights' RPC payloads.
 * 1:1 port of fli/search/_decoders.py.
 */
import { type Airline } from "../models/airline.ts";
import type { BookingOption, FlightResult } from "../models/google-flights/base.ts";
declare function parseDateTime(dateArr: unknown, timeArr: unknown): Date;
declare function safeAirline(code: unknown): Airline | null;
interface EmissionsBlock {
    this_g: number | null;
    typical_g: number | null;
    delta_pct: number | null;
    tag: string | null;
}
declare function parseEmissions(detail: unknown): EmissionsBlock;
/** Decode a single flight row into a `FlightResult`. */
export declare function parseFlightRow(row: unknown[]): FlightResult;
/** Walk a decoded `wrb.fr` chunk and yield every booking-option row. */
export declare function parseBookingChunk(chunk: unknown): BookingOption[];
declare function tryParseBookingRow(row: unknown[]): BookingOption | null;
export { parseDateTime as _parseDateTime, parseEmissions as _parseEmissions, safeAirline as _safeAirline, tryParseBookingRow as _tryParseBookingRow, };
//# sourceMappingURL=decoders.d.ts.map