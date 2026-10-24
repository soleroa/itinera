/**
 * Builder utilities for constructing search filters. 1:1 port of
 * fli/core/builders.py.
 */
import type { Airport } from "../models/airport.ts";
import { FlightSegment, type TimeRestrictions, TripType } from "../models/google-flights/base.ts";
/** Zero-pad a YYYY-MM-DD date string. */
export declare function normalizeDate(dateStr: string): string;
/** Build a `TimeRestrictions` from "HH-HH"-style window strings, or `null`. */
export declare function buildTimeRestrictions(departureWindow?: string | null, arrivalWindow?: string | null): TimeRestrictions | null;
/** Build flight segments for a one-way or round-trip search. */
export declare function buildFlightSegments(origin: Airport | Airport[], destination: Airport | Airport[], departureDate: string, returnDate?: string | null, timeRestrictions?: TimeRestrictions | null): {
    segments: FlightSegment[];
    tripType: TripType;
};
/** Build flight segments for a multi-city search from a list of legs. */
export declare function buildMultiCitySegments(legs: Array<[Airport, Airport, string]>, timeRestrictions?: TimeRestrictions | null): {
    segments: FlightSegment[];
    tripType: TripType;
};
/** Build flight segments for a date-range search. */
export declare function buildDateSearchSegments(origin: Airport | Airport[], destination: Airport | Airport[], startDate: string, options?: {
    tripDuration?: number | null;
    isRoundTrip?: boolean;
    timeRestrictions?: TimeRestrictions | null;
}): {
    segments: FlightSegment[];
    tripType: TripType;
};
//# sourceMappingURL=builders.d.ts.map