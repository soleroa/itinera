/**
 * Builder utilities for constructing search filters. 1:1 port of
 * fli/core/builders.py.
 */
import { FlightSegment, TripType } from "../models/google-flights/base.js";
import { parseTimeRange } from "./parsers.js";
const ISO_DATE_RE = /^\d{4}-\d{1,2}-\d{1,2}$/;
/** Zero-pad a YYYY-MM-DD date string. */
export function normalizeDate(dateStr) {
    if (!ISO_DATE_RE.test(dateStr)) {
        throw new Error(`Invalid date string: ${dateStr}`);
    }
    const parts = dateStr.split("-").map((p) => Number.parseInt(p, 10));
    const [y, m, d] = parts;
    if (y == null || m == null || d == null) {
        throw new Error(`Invalid date string: ${dateStr}`);
    }
    const date = new Date(Date.UTC(y, m - 1, d));
    if (date.getUTCFullYear() !== y || date.getUTCMonth() !== m - 1 || date.getUTCDate() !== d) {
        throw new Error(`Invalid date: ${dateStr}`);
    }
    const mm = String(m).padStart(2, "0");
    const dd = String(d).padStart(2, "0");
    return `${y}-${mm}-${dd}`;
}
/** Build a `TimeRestrictions` from "HH-HH"-style window strings, or `null`. */
export function buildTimeRestrictions(departureWindow, arrivalWindow) {
    if (!departureWindow && !arrivalWindow)
        return null;
    let earliestDeparture = null;
    let latestDeparture = null;
    let earliestArrival = null;
    let latestArrival = null;
    if (departureWindow) {
        [earliestDeparture, latestDeparture] = parseTimeRange(departureWindow);
    }
    if (arrivalWindow) {
        [earliestArrival, latestArrival] = parseTimeRange(arrivalWindow);
    }
    return {
        earliest_departure: earliestDeparture ?? undefined,
        latest_departure: latestDeparture ?? undefined,
        earliest_arrival: earliestArrival ?? undefined,
        latest_arrival: latestArrival ?? undefined,
    };
}
/** Build flight segments for a one-way or round-trip search. */
export function buildFlightSegments(origin, destination, departureDate, returnDate, timeRestrictions) {
    const depDate = normalizeDate(departureDate);
    const origins = Array.isArray(origin) ? origin : [origin];
    const destinations = Array.isArray(destination) ? destination : [destination];
    const segments = [
        new FlightSegment({
            departure_airport: [origins.map((apt) => [apt, 0])],
            arrival_airport: [destinations.map((apt) => [apt, 0])],
            travel_date: depDate,
            time_restrictions: timeRestrictions ?? null,
        }),
    ];
    let tripType = TripType.ONE_WAY;
    if (returnDate) {
        const retDate = normalizeDate(returnDate);
        tripType = TripType.ROUND_TRIP;
        segments.push(new FlightSegment({
            departure_airport: [destinations.map((apt) => [apt, 0])],
            arrival_airport: [origins.map((apt) => [apt, 0])],
            travel_date: retDate,
            time_restrictions: timeRestrictions ?? null,
        }));
    }
    return { segments, tripType };
}
/** Build flight segments for a multi-city search from a list of legs. */
export function buildMultiCitySegments(legs, timeRestrictions) {
    const segments = legs.map(([origin, destination, date]) => new FlightSegment({
        departure_airport: [[[origin, 0]]],
        arrival_airport: [[[destination, 0]]],
        travel_date: normalizeDate(date),
        time_restrictions: timeRestrictions ?? null,
    }));
    return { segments, tripType: TripType.MULTI_CITY };
}
/** Build flight segments for a date-range search. */
export function buildDateSearchSegments(origin, destination, startDate, options = {}) {
    const startNormalized = normalizeDate(startDate);
    const origins = Array.isArray(origin) ? origin : [origin];
    const destinations = Array.isArray(destination) ? destination : [destination];
    const segments = [
        new FlightSegment({
            departure_airport: [origins.map((apt) => [apt, 0])],
            arrival_airport: [destinations.map((apt) => [apt, 0])],
            travel_date: startNormalized,
            time_restrictions: options.timeRestrictions ?? null,
        }),
    ];
    let tripType = TripType.ONE_WAY;
    if (options.isRoundTrip) {
        tripType = TripType.ROUND_TRIP;
        const startMs = Date.parse(`${startNormalized}T00:00:00Z`);
        const days = options.tripDuration ?? 3;
        const returnMs = startMs + days * 24 * 60 * 60 * 1000;
        const returnDate = new Date(returnMs);
        const ret = `${returnDate.getUTCFullYear()}-${String(returnDate.getUTCMonth() + 1).padStart(2, "0")}-${String(returnDate.getUTCDate()).padStart(2, "0")}`;
        segments.push(new FlightSegment({
            departure_airport: [destinations.map((apt) => [apt, 0])],
            arrival_airport: [origins.map((apt) => [apt, 0])],
            travel_date: ret,
            time_restrictions: options.timeRestrictions ?? null,
        }));
    }
    return { segments, tripType };
}
//# sourceMappingURL=builders.js.map