/**
 * Core data models and enums for the Google Flights API.
 *
 * 1:1 port of fli/models/google_flights/base.py — keeps the same enum
 * integer values (the API uses them on the wire) and the same model field
 * names.
 */
import { z } from "zod";
import { parseIsoDate } from "../../core/dates.js";
// ---------------------------------------------------------------------------
// Enums (numeric values must match the Google Flights wire format)
// ---------------------------------------------------------------------------
export const SeatType = {
    ECONOMY: 1,
    PREMIUM_ECONOMY: 2,
    BUSINESS: 3,
    FIRST: 4,
};
export const SortBy = {
    TOP_FLIGHTS: 0,
    BEST: 1,
    CHEAPEST: 2,
    DEPARTURE_TIME: 3,
    ARRIVAL_TIME: 4,
    DURATION: 5,
    EMISSIONS: 6,
};
export const TripType = {
    ROUND_TRIP: 1,
    ONE_WAY: 2,
    MULTI_CITY: 3,
};
export const MaxStops = {
    ANY: 0,
    NON_STOP: 1,
    ONE_STOP_OR_FEWER: 2,
    TWO_OR_FEWER_STOPS: 3,
};
export const EmissionsFilter = {
    ALL: 0,
    LESS: 1,
};
export const Alliance = {
    ONEWORLD: "ONEWORLD",
    SKYTEAM: "SKYTEAM",
    STAR_ALLIANCE: "STAR_ALLIANCE",
};
/**
 * ISO 4217 currency codes supported by Google Flights' `curr=` URL param.
 * Pass any 3-letter ISO 4217 code as a plain string for codes not listed.
 */
export const Currency = {
    AED: "AED",
    ARS: "ARS",
    AUD: "AUD",
    BGN: "BGN",
    BRL: "BRL",
    CAD: "CAD",
    CHF: "CHF",
    CLP: "CLP",
    CNY: "CNY",
    COP: "COP",
    CZK: "CZK",
    DKK: "DKK",
    EGP: "EGP",
    EUR: "EUR",
    GBP: "GBP",
    HKD: "HKD",
    HUF: "HUF",
    IDR: "IDR",
    ILS: "ILS",
    INR: "INR",
    JPY: "JPY",
    KRW: "KRW",
    MXN: "MXN",
    MYR: "MYR",
    NOK: "NOK",
    NZD: "NZD",
    PEN: "PEN",
    PHP: "PHP",
    PLN: "PLN",
    QAR: "QAR",
    RON: "RON",
    SAR: "SAR",
    SEK: "SEK",
    SGD: "SGD",
    THB: "THB",
    TRY: "TRY",
    TWD: "TWD",
    UAH: "UAH",
    USD: "USD",
    VND: "VND",
    ZAR: "ZAR",
};
// ---------------------------------------------------------------------------
// Simple value-type models (validated via Zod)
// ---------------------------------------------------------------------------
export const BagsFilterSchema = z.object({
    checked_bags: z.number().int().nonnegative().default(0),
    carry_on: z.boolean().default(false),
});
export const TimeRestrictionsSchema = z
    .object({
    earliest_departure: z.number().int().nonnegative().nullable().optional(),
    latest_departure: z.number().int().positive().nullable().optional(),
    earliest_arrival: z.number().int().nonnegative().nullable().optional(),
    latest_arrival: z.number().int().positive().nullable().optional(),
})
    .transform((v) => {
    // Mirror the Python validator: if earliest > latest, swap.
    const out = { ...v };
    if (out.earliest_departure != null &&
        out.latest_departure != null &&
        out.earliest_departure > out.latest_departure) {
        [out.earliest_departure, out.latest_departure] = [
            out.latest_departure,
            out.earliest_departure,
        ];
    }
    if (out.earliest_arrival != null &&
        out.latest_arrival != null &&
        out.earliest_arrival > out.latest_arrival) {
        [out.earliest_arrival, out.latest_arrival] = [out.latest_arrival, out.earliest_arrival];
    }
    return out;
});
export const PassengerInfoSchema = z.object({
    adults: z.number().int().nonnegative().default(1),
    children: z.number().int().nonnegative().default(0),
    infants_in_seat: z.number().int().nonnegative().default(0),
    infants_on_lap: z.number().int().nonnegative().default(0),
});
export const PriceLimitSchema = z.object({
    max_price: z.number().int().positive(),
    currency: z.string().nullable().optional(),
});
export const LayoverRestrictionsSchema = z.object({
    airports: z.array(z.string()).nullable().optional(),
    min_duration: z.number().int().positive().nullable().optional(),
    max_duration: z.number().int().positive().nullable().optional(),
});
/** In-seat power flavour decoded from the leg[12] power slot group. */
export const POWER_TYPES = ["plug_and_usb", "plug", "usb"];
/** In-flight entertainment flavour decoded from the leg[12] video group. */
export const VIDEO_TYPES = ["live_tv", "on_demand", "stream_to_device"];
/** Whether Google flags the leg's Wi-Fi as complimentary or chargeable. */
export const WIFI_TIERS = ["free", "paid"];
/**
 * Human-readable label for Google's leg[13] seat-quality code.
 *
 * These are labels, not an ordered score: "average"/"below_average"/
 * "above_average" describe an economy-style pitch, while the remaining four
 * name a seat *product*. The code tracks the fare's cabin rather than the
 * airframe — in the captured fixtures AA 1209 (ORD-LAX, 737 MAX 8) appears
 * twice, as "average" in economy and "recliner" in first.
 */
export const SEAT_QUALITIES = [
    "average",
    "below_average",
    "above_average",
    "extra_reclining",
    "lie_flat",
    "lie_flat_suite_with_door",
    "recliner",
];
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
export const AmenitiesSchema = z.object({
    wifi: z.boolean().nullable().optional(),
    power: z.boolean().nullable().optional(),
    usb_power: z.boolean().nullable().optional(),
    in_seat_video: z.boolean().nullable().optional(),
    on_demand_video: z.boolean().nullable().optional(),
    legroom_rating: z.number().int().nonnegative().nullable().optional(),
    // Optional detail — populated only for slot values confirmed against
    // captured responses, so callers never see a confidently wrong label.
    wifi_tier: z.enum(WIFI_TIERS).nullable().optional(),
    power_type: z.enum(POWER_TYPES).nullable().optional(),
    video_type: z.enum(VIDEO_TYPES).nullable().optional(),
    seat_quality: z.enum(SEAT_QUALITIES).nullable().optional(),
    legroom_inches: z.number().int().positive().nullable().optional(),
});
/** `true` when Google did not surface a price for this row (premium-cabin RT). */
export function priceUnknown(f) {
    return f.price == null;
}
function todayUtc() {
    const now = new Date();
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}
export class FlightSegment {
    departure_airport;
    arrival_airport;
    travel_date;
    time_restrictions;
    selected_flight;
    constructor(input) {
        if (!input.departure_airport?.length || !input.arrival_airport?.length) {
            throw new Error("Both departure and arrival airports must be specified");
        }
        // travel_date must be a valid ISO date and not in the past.
        const travelDate = parseIsoDate(input.travel_date);
        if (travelDate < todayUtc()) {
            throw new Error("Travel date cannot be in the past");
        }
        const depFirst = input.departure_airport[0]?.[0]?.[0];
        const arrFirst = input.arrival_airport[0]?.[0]?.[0];
        if (depFirst && arrFirst && depFirst === arrFirst) {
            throw new Error("Departure and arrival airports must be different");
        }
        this.departure_airport = input.departure_airport;
        this.arrival_airport = input.arrival_airport;
        this.travel_date = input.travel_date;
        this.time_restrictions = input.time_restrictions ?? null;
        this.selected_flight = input.selected_flight ?? null;
    }
    get parsed_travel_date() {
        return parseIsoDate(this.travel_date);
    }
}
//# sourceMappingURL=base.js.map