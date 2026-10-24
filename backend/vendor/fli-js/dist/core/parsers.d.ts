/**
 * Shared parsing utilities — string inputs from CLI/API callers into
 * domain enum values. 1:1 port of fli/core/parsers.py.
 */
import { Airline } from "../models/airline.ts";
import { Airport } from "../models/airport.ts";
import { Alliance, EmissionsFilter, MaxStops, SeatType, SortBy } from "../models/google-flights/base.ts";
export declare class ParseError extends Error {
    constructor(message: string);
}
/** Resolve an enum member by case-insensitive name. */
export declare function resolveEnum<T extends Record<string, unknown>>(enumObj: T, name: string): T[keyof T];
/** Resolve a string airport IATA code to the `Airport` constant. */
export declare function resolveAirport(code: string): Airport;
/**
 * Parse a list of airline tokens into Airline constants.
 * Each item may itself contain multiple codes separated by commas or whitespace.
 */
export declare function parseAirlines(codes: string[] | null | undefined): Airline[] | null;
/** Parse a list of alliance identifiers into Alliance constants. */
export declare function parseAlliances(codes: string[] | null | undefined): Alliance[] | null;
/** Parse a "stops" parameter into the matching `MaxStops` value. */
export declare function parseMaxStops(stops: string): MaxStops;
/** Parse a cabin-class string into a `SeatType` value. */
export declare function parseCabinClass(cabinClass: string): SeatType;
/** Parse a sort-by string into a `SortBy` value. */
export declare function parseSortBy(sortBy: string): SortBy;
/** Normalise an ISO 4217 currency code; pass through unknown 3-letter codes. */
export declare function parseCurrency(currency: string | null | undefined): string | null;
/** Parse an emissions filter string into an `EmissionsFilter` value. */
export declare function parseEmissions(emissions: string): EmissionsFilter;
/** Parse a time range string ("HH-HH") into a `[start, end]` tuple of hours. */
export declare function parseTimeRange(timeRange: string): [number, number];
//# sourceMappingURL=parsers.d.ts.map