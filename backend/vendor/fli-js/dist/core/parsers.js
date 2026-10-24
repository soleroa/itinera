/**
 * Shared parsing utilities — string inputs from CLI/API callers into
 * domain enum values. 1:1 port of fli/core/parsers.py.
 */
import { Airline } from "../models/airline.js";
import { Airport } from "../models/airport.js";
import { Alliance, Currency, EmissionsFilter, MaxStops, SeatType, SortBy, } from "../models/google-flights/base.js";
export class ParseError extends Error {
    constructor(message) {
        super(message);
        this.name = "ParseError";
    }
}
const AIRLINE_SEPARATORS = /[,\s]+/;
/** Resolve an enum member by case-insensitive name. */
export function resolveEnum(enumObj, name) {
    const upper = name.toUpperCase();
    if (Object.hasOwn(enumObj, upper)) {
        return enumObj[upper];
    }
    const valid = Object.keys(enumObj).join(", ");
    throw new ParseError(`Invalid value: '${name}'. Valid values: ${valid}`);
}
/** Resolve a string airport IATA code to the `Airport` constant. */
export function resolveAirport(code) {
    const upper = code.toUpperCase();
    if (Object.hasOwn(Airport, upper)) {
        return Airport[upper];
    }
    throw new ParseError(`Invalid airport code: '${code}'`);
}
/**
 * Parse a list of airline tokens into Airline constants.
 * Each item may itself contain multiple codes separated by commas or whitespace.
 */
export function parseAirlines(codes) {
    if (!codes || codes.length === 0)
        return null;
    const expanded = [];
    for (const item of codes) {
        for (const token of item.split(AIRLINE_SEPARATORS)) {
            const t = token.trim().toUpperCase();
            if (t)
                expanded.push(t);
        }
    }
    if (expanded.length === 0) {
        throw new ParseError(`No valid airline codes found in: ${JSON.stringify(codes)}`);
    }
    const result = [];
    for (const code of expanded) {
        const key = /^[0-9]/.test(code) ? `_${code}` : code;
        if (!Object.hasOwn(Airline, key)) {
            throw new ParseError(`Invalid airline code: '${code}'`);
        }
        result.push(Airline[key]);
    }
    return result;
}
/** Parse a list of alliance identifiers into Alliance constants. */
export function parseAlliances(codes) {
    if (!codes || codes.length === 0)
        return null;
    const expanded = [];
    for (const item of codes) {
        for (const token of item.split(AIRLINE_SEPARATORS)) {
            const t = token.trim().toUpperCase().replace(/ /g, "_").replace(/-/g, "_");
            if (t)
                expanded.push(t);
        }
    }
    if (expanded.length === 0) {
        throw new ParseError(`No valid alliance names found in: ${JSON.stringify(codes)}`);
    }
    const result = [];
    for (const name of expanded) {
        if (!Object.hasOwn(Alliance, name)) {
            const valid = Object.keys(Alliance).join(", ");
            throw new ParseError(`Invalid alliance: '${name}'. Valid values: ${valid}`);
        }
        result.push(Alliance[name]);
    }
    return result;
}
/** Parse a "stops" parameter into the matching `MaxStops` value. */
export function parseMaxStops(stops) {
    const asInt = Number.parseInt(stops, 10);
    if (Number.isFinite(asInt) && String(asInt) === stops.trim()) {
        if (asInt <= 0)
            return MaxStops.NON_STOP;
        if (asInt === 1)
            return MaxStops.ONE_STOP_OR_FEWER;
        if (asInt >= 2)
            return MaxStops.TWO_OR_FEWER_STOPS;
    }
    const upper = stops.toUpperCase();
    const map = {
        ANY: MaxStops.ANY,
        NON_STOP: MaxStops.NON_STOP,
        NONSTOP: MaxStops.NON_STOP,
        ONE_STOP: MaxStops.ONE_STOP_OR_FEWER,
        ONE_STOP_OR_FEWER: MaxStops.ONE_STOP_OR_FEWER,
        TWO_PLUS_STOPS: MaxStops.TWO_OR_FEWER_STOPS,
        TWO_OR_FEWER_STOPS: MaxStops.TWO_OR_FEWER_STOPS,
    };
    if (Object.hasOwn(map, upper))
        return map[upper];
    throw new ParseError(`Invalid max_stops value: '${stops}'. Valid values: ANY, NON_STOP, ONE_STOP, TWO_PLUS_STOPS, or 0/1/2`);
}
/** Parse a cabin-class string into a `SeatType` value. */
export function parseCabinClass(cabinClass) {
    const upper = cabinClass.toUpperCase();
    if (Object.hasOwn(SeatType, upper)) {
        return SeatType[upper];
    }
    const valid = Object.keys(SeatType).join(", ");
    throw new ParseError(`Invalid cabin_class value: '${cabinClass}'. Valid values: ${valid}`);
}
/** Parse a sort-by string into a `SortBy` value. */
export function parseSortBy(sortBy) {
    const upper = sortBy.toUpperCase();
    if (Object.hasOwn(SortBy, upper)) {
        return SortBy[upper];
    }
    const valid = Object.keys(SortBy).join(", ");
    throw new ParseError(`Invalid sort_by value: '${sortBy}'. Valid values: ${valid}`);
}
/** Normalise an ISO 4217 currency code; pass through unknown 3-letter codes. */
export function parseCurrency(currency) {
    if (currency == null || currency === "")
        return null;
    const normalized = currency.trim().toUpperCase();
    if (normalized.length !== 3 || !/^[A-Z]{3}$/.test(normalized)) {
        throw new ParseError(`Invalid currency code: '${currency}'. Expected a 3-letter ISO 4217 code.`);
    }
    if (Object.hasOwn(Currency, normalized)) {
        return Currency[normalized];
    }
    return normalized;
}
/** Parse an emissions filter string into an `EmissionsFilter` value. */
export function parseEmissions(emissions) {
    return resolveEnum(EmissionsFilter, emissions);
}
/** Parse a time range string ("HH-HH") into a `[start, end]` tuple of hours. */
export function parseTimeRange(timeRange) {
    const parts = timeRange.split("-");
    if (parts.length !== 2) {
        throw new ParseError(`Invalid time range format: '${timeRange}'. Expected 'HH-HH' (e.g., '6-20')`);
    }
    const start = Number.parseInt((parts[0] ?? "").trim(), 10);
    const end = Number.parseInt((parts[1] ?? "").trim(), 10);
    if (!Number.isFinite(start) || !Number.isFinite(end)) {
        throw new ParseError(`Invalid time range format: '${timeRange}'. Expected 'HH-HH' (e.g., '6-20')`);
    }
    if (start < 0 || start > 23 || end < 0 || end > 23) {
        throw new ParseError(`Invalid time range format: '${timeRange}'. Expected 'HH-HH' (e.g., '6-20')`);
    }
    return [start, end];
}
//# sourceMappingURL=parsers.js.map