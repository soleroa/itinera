/**
 * Core data models and enums for the Google Flights API.
 *
 * 1:1 port of fli/models/google_flights/base.py — keeps the same enum
 * integer values (the API uses them on the wire) and the same model field
 * names.
 */
import { z } from "zod";
import type { Airline } from "../airline.ts";
import type { Airport } from "../airport.ts";
export declare const SeatType: {
    readonly ECONOMY: 1;
    readonly PREMIUM_ECONOMY: 2;
    readonly BUSINESS: 3;
    readonly FIRST: 4;
};
export type SeatType = (typeof SeatType)[keyof typeof SeatType];
export declare const SortBy: {
    readonly TOP_FLIGHTS: 0;
    readonly BEST: 1;
    readonly CHEAPEST: 2;
    readonly DEPARTURE_TIME: 3;
    readonly ARRIVAL_TIME: 4;
    readonly DURATION: 5;
    readonly EMISSIONS: 6;
};
export type SortBy = (typeof SortBy)[keyof typeof SortBy];
export declare const TripType: {
    readonly ROUND_TRIP: 1;
    readonly ONE_WAY: 2;
    readonly MULTI_CITY: 3;
};
export type TripType = (typeof TripType)[keyof typeof TripType];
export declare const MaxStops: {
    readonly ANY: 0;
    readonly NON_STOP: 1;
    readonly ONE_STOP_OR_FEWER: 2;
    readonly TWO_OR_FEWER_STOPS: 3;
};
export type MaxStops = (typeof MaxStops)[keyof typeof MaxStops];
export declare const EmissionsFilter: {
    readonly ALL: 0;
    readonly LESS: 1;
};
export type EmissionsFilter = (typeof EmissionsFilter)[keyof typeof EmissionsFilter];
export declare const Alliance: {
    readonly ONEWORLD: "ONEWORLD";
    readonly SKYTEAM: "SKYTEAM";
    readonly STAR_ALLIANCE: "STAR_ALLIANCE";
};
export type Alliance = (typeof Alliance)[keyof typeof Alliance];
/**
 * ISO 4217 currency codes supported by Google Flights' `curr=` URL param.
 * Pass any 3-letter ISO 4217 code as a plain string for codes not listed.
 */
export declare const Currency: {
    readonly AED: "AED";
    readonly ARS: "ARS";
    readonly AUD: "AUD";
    readonly BGN: "BGN";
    readonly BRL: "BRL";
    readonly CAD: "CAD";
    readonly CHF: "CHF";
    readonly CLP: "CLP";
    readonly CNY: "CNY";
    readonly COP: "COP";
    readonly CZK: "CZK";
    readonly DKK: "DKK";
    readonly EGP: "EGP";
    readonly EUR: "EUR";
    readonly GBP: "GBP";
    readonly HKD: "HKD";
    readonly HUF: "HUF";
    readonly IDR: "IDR";
    readonly ILS: "ILS";
    readonly INR: "INR";
    readonly JPY: "JPY";
    readonly KRW: "KRW";
    readonly MXN: "MXN";
    readonly MYR: "MYR";
    readonly NOK: "NOK";
    readonly NZD: "NZD";
    readonly PEN: "PEN";
    readonly PHP: "PHP";
    readonly PLN: "PLN";
    readonly QAR: "QAR";
    readonly RON: "RON";
    readonly SAR: "SAR";
    readonly SEK: "SEK";
    readonly SGD: "SGD";
    readonly THB: "THB";
    readonly TRY: "TRY";
    readonly TWD: "TWD";
    readonly UAH: "UAH";
    readonly USD: "USD";
    readonly VND: "VND";
    readonly ZAR: "ZAR";
};
export type Currency = (typeof Currency)[keyof typeof Currency];
export declare const BagsFilterSchema: z.ZodObject<{
    checked_bags: z.ZodDefault<z.ZodNumber>;
    carry_on: z.ZodDefault<z.ZodBoolean>;
}, z.core.$strip>;
export type BagsFilter = z.infer<typeof BagsFilterSchema>;
export declare const TimeRestrictionsSchema: z.ZodPipe<z.ZodObject<{
    earliest_departure: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    latest_departure: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    earliest_arrival: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    latest_arrival: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
}, z.core.$strip>, z.ZodTransform<{
    earliest_departure?: number | null | undefined;
    latest_departure?: number | null | undefined;
    earliest_arrival?: number | null | undefined;
    latest_arrival?: number | null | undefined;
}, {
    earliest_departure?: number | null | undefined;
    latest_departure?: number | null | undefined;
    earliest_arrival?: number | null | undefined;
    latest_arrival?: number | null | undefined;
}>>;
export type TimeRestrictions = z.infer<typeof TimeRestrictionsSchema>;
export declare const PassengerInfoSchema: z.ZodObject<{
    adults: z.ZodDefault<z.ZodNumber>;
    children: z.ZodDefault<z.ZodNumber>;
    infants_in_seat: z.ZodDefault<z.ZodNumber>;
    infants_on_lap: z.ZodDefault<z.ZodNumber>;
}, z.core.$strip>;
export type PassengerInfo = z.infer<typeof PassengerInfoSchema>;
export declare const PriceLimitSchema: z.ZodObject<{
    max_price: z.ZodNumber;
    currency: z.ZodOptional<z.ZodNullable<z.ZodString>>;
}, z.core.$strip>;
export type PriceLimit = z.infer<typeof PriceLimitSchema>;
export declare const LayoverRestrictionsSchema: z.ZodObject<{
    airports: z.ZodOptional<z.ZodNullable<z.ZodArray<z.ZodString>>>;
    min_duration: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    max_duration: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
}, z.core.$strip>;
export type LayoverRestrictions = z.infer<typeof LayoverRestrictionsSchema>;
/** In-seat power flavour decoded from the leg[12] power slot group. */
export declare const POWER_TYPES: readonly ["plug_and_usb", "plug", "usb"];
export type PowerType = (typeof POWER_TYPES)[number];
/** In-flight entertainment flavour decoded from the leg[12] video group. */
export declare const VIDEO_TYPES: readonly ["live_tv", "on_demand", "stream_to_device"];
export type VideoType = (typeof VIDEO_TYPES)[number];
/** Whether Google flags the leg's Wi-Fi as complimentary or chargeable. */
export declare const WIFI_TIERS: readonly ["free", "paid"];
export type WifiTier = (typeof WIFI_TIERS)[number];
/**
 * Human-readable label for Google's leg[13] seat-quality code.
 *
 * These are labels, not an ordered score: "average"/"below_average"/
 * "above_average" describe an economy-style pitch, while the remaining four
 * name a seat *product*. The code tracks the fare's cabin rather than the
 * airframe — in the captured fixtures AA 1209 (ORD-LAX, 737 MAX 8) appears
 * twice, as "average" in economy and "recliner" in first.
 */
export declare const SEAT_QUALITIES: readonly ["average", "below_average", "above_average", "extra_reclining", "lie_flat", "lie_flat_suite_with_door", "recliner"];
export type SeatQuality = (typeof SEAT_QUALITIES)[number];
/**
 * Per-leg amenities reported by Google Flights. Booleans are tri-state
 * (true / false / null when Google did not publish that signal).
 *
 * Google never publishes an explicit "no" for any of these amenities — the
 * wire format only ever sets a flag or omits it — so `false` is always an
 * inference and is used exactly once: `in_seat_video` is false when
 * `video_type === "stream_to_device"`, which is Google's way of saying the
 * aircraft has no seatback screen. Every other unknown stays null,
 * including `usb_power` for a plug-only cabin and `on_demand_video` for a
 * live-TV or stream-to-device leg.
 */
export declare const AmenitiesSchema: z.ZodObject<{
    wifi: z.ZodOptional<z.ZodNullable<z.ZodBoolean>>;
    power: z.ZodOptional<z.ZodNullable<z.ZodBoolean>>;
    usb_power: z.ZodOptional<z.ZodNullable<z.ZodBoolean>>;
    in_seat_video: z.ZodOptional<z.ZodNullable<z.ZodBoolean>>;
    on_demand_video: z.ZodOptional<z.ZodNullable<z.ZodBoolean>>;
    legroom_rating: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    wifi_tier: z.ZodOptional<z.ZodNullable<z.ZodEnum<{
        free: "free";
        paid: "paid";
    }>>>;
    power_type: z.ZodOptional<z.ZodNullable<z.ZodEnum<{
        plug: "plug";
        plug_and_usb: "plug_and_usb";
        usb: "usb";
    }>>>;
    video_type: z.ZodOptional<z.ZodNullable<z.ZodEnum<{
        live_tv: "live_tv";
        on_demand: "on_demand";
        stream_to_device: "stream_to_device";
    }>>>;
    seat_quality: z.ZodOptional<z.ZodNullable<z.ZodEnum<{
        above_average: "above_average";
        average: "average";
        below_average: "below_average";
        extra_reclining: "extra_reclining";
        lie_flat: "lie_flat";
        lie_flat_suite_with_door: "lie_flat_suite_with_door";
        recliner: "recliner";
    }>>>;
    legroom_inches: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
}, z.core.$strip>;
export type Amenities = z.infer<typeof AmenitiesSchema>;
export interface Layover {
    airport: Airport;
    duration: number;
    overnight: boolean;
    change_of_airport: boolean;
    city?: string | null;
    airport_name?: string | null;
}
export interface FlightLeg {
    airline: Airline;
    flight_number: string;
    departure_airport: Airport;
    arrival_airport: Airport;
    departure_datetime: Date;
    arrival_datetime: Date;
    duration: number;
    departure_airport_name?: string | null;
    arrival_airport_name?: string | null;
    operating_airline?: Airline | null;
    operating_flight_number?: string | null;
    aircraft?: string | null;
    legroom?: string | null;
    legroom_short?: string | null;
    amenities?: Amenities | null;
    overnight?: boolean;
    co2_emissions_g?: number | null;
    /**
     * Cabin actually flown on this leg, from leg[16]. Per-leg, so a business
     * itinerary can still show an economy connecting leg.
     */
    cabin?: SeatType | null;
}
export interface BookingOption {
    vendor_code: string | null;
    vendor_name: string | null;
    is_airline_direct: boolean;
    price: number | null;
    currency: string | null;
    fare_name: string | null;
    booking_url: string | null;
    google_click_url: string | null;
    /** [(airline_code, flight_number), ...] */
    flights: Array<[string, string]> | null;
}
export interface FlightResult {
    legs: FlightLeg[];
    /** Price in specified currency. `null` when Google did not surface a price (see Python issue #165). */
    price: number | null;
    currency: string | null;
    /** Total duration in minutes. */
    duration: number;
    stops: number;
    layovers?: Layover[] | null;
    co2_emissions_g?: number | null;
    co2_emissions_typical_g?: number | null;
    co2_emissions_delta_pct?: number | null;
    /** "lower" | "typical" | "higher" */
    emissions_tag?: string | null;
    self_transfer?: boolean | null;
    mixed_cabin?: boolean | null;
    primary_airline?: Airline | null;
    primary_airline_name?: string | null;
    booking_token?: string | null;
}
/** `true` when Google did not surface a price for this row (premium-cabin RT). */
export declare function priceUnknown(f: FlightResult): boolean;
/**
 * Airport entry inside a segment's departure/arrival list — `[Airport code, 0]`
 * is the standard shape (the trailing int is unused in current API responses
 * but Google still requires it).
 */
export type AirportEntry = [Airport, number];
export interface FlightSegmentInput {
    departure_airport: AirportEntry[][];
    arrival_airport: AirportEntry[][];
    travel_date: string;
    time_restrictions?: TimeRestrictions | null;
    selected_flight?: FlightResult | null;
}
export declare class FlightSegment {
    readonly departure_airport: AirportEntry[][];
    readonly arrival_airport: AirportEntry[][];
    travel_date: string;
    readonly time_restrictions: TimeRestrictions | null;
    selected_flight: FlightResult | null;
    constructor(input: FlightSegmentInput);
    get parsed_travel_date(): Date;
}
//# sourceMappingURL=base.d.ts.map