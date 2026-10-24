/**
 * Pure response decoders for Google Flights' RPC payloads.
 * 1:1 port of fli/search/_decoders.py.
 */
import { extractCurrencyFromPriceToken } from "../core/currency.js";
import { AIRLINE_NAMES } from "../models/airline.js";
import { AIRPORT_NAMES } from "../models/airport.js";
import { SeatType } from "../models/google-flights/base.js";
import { asBool, asInt, asNonNegativeInt, asStr, safeGet } from "./helpers.js";
// Pseudo-codes Google emits in place of a real IATA carrier identifier.
const AIRLINE_SENTINELS = new Set(["multi"]);
// Pre-compute the bare-IATA-code → enum-key lookup table. Digit-prefixed
// IATA codes (e.g. "2B") are stored in the enum under a "_2B" key because
// "2B" is not a valid JavaScript identifier; we strip the leading "_" so
// callers can look up by the wire-format code Google emits.
const AIRLINE_BY_CODE = {};
for (const key of Object.keys(AIRLINE_NAMES)) {
    const code = key.startsWith("_") ? key.slice(1) : key;
    AIRLINE_BY_CODE[code] = key;
}
const AIRPORT_BY_CODE = {};
for (const key of Object.keys(AIRPORT_NAMES)) {
    AIRPORT_BY_CODE[key] = key;
}
function parseDateTime(dateArr, timeArr) {
    if (!Array.isArray(dateArr) || !Array.isArray(timeArr)) {
        throw new Error("Date and time arrays must contain at least one non-null value");
    }
    if (!dateArr.some((x) => x != null) || !timeArr.some((x) => x != null)) {
        throw new Error("Date and time arrays must contain at least one non-null value");
    }
    const y = dateArr[0];
    const m = dateArr[1];
    const d = dateArr[2];
    // Python's `datetime(y, m, d, ...)` rejects month=0 / day=0, so a partial
    // like `[2026, null, null]` raises there. JS `new Date(2026, -1, 0, ...)`
    // silently returns a valid-but-wrong Date (Nov 30 2025), so we enforce
    // the same strictness up front. Time components default to 0 to match
    // Python's `or 0` for the time tuple.
    if (y == null || m == null || d == null || m < 1 || m > 12 || d < 1 || d > 31) {
        throw new Error(`Invalid date components: y=${y}, m=${m}, d=${d}`);
    }
    const h = timeArr[0] ?? 0;
    const min = timeArr[1] ?? 0;
    // Use local-time constructor (mirrors Python's naive datetime).
    return new Date(y, m - 1, d, h, min);
}
function parseAirport(code) {
    if (typeof code !== "string" || !(code in AIRPORT_BY_CODE)) {
        throw new Error(`Unknown airport code: ${String(code)}`);
    }
    return AIRPORT_BY_CODE[code];
}
function safeAirline(code) {
    if (typeof code !== "string" || code.length === 0)
        return null;
    if (AIRLINE_SENTINELS.has(code))
        return null;
    if (code in AIRLINE_BY_CODE)
        return AIRLINE_BY_CODE[code];
    return null;
}
// --- leg[12] amenity slot map (issue #217) --------------------------------
//
// leg[12] is a sparse array of amenity flags with trailing nulls trimmed.
// Two mutually-exclusive groups plus a Wi-Fi tier code were confirmed by
// tabulating all 481 leg instances across the captured fixtures (plus
// three live public-page captures) against published fleet facts:
//
//   slots 1..6  power group — exactly one is ever set on a leg.
//   slots 8..10 video group — exactly one is ever set on a leg.
//   slot 11     Wi-Fi tier code (a number, never a bool).
//
// Slots 2, 4 and 6 are reported to be "some seats only" variants of 1, 3
// and 5, and slot 11 === 1 is reported to mean "Wi-Fi, tier unknown", but
// none of those values occurs anywhere in the corpus. Nothing is inferred
// from them: an unobserved slot yields null, never a guessed value.
//
// No slot in the corpus ever holds JSON `false`, so every `false` this
// decoder emits is an inference. Only one is made — see `inSeatVideo` in
// parseAmenities.
/** Power slots whose flavour is confirmed. */
const POWER_SLOTS = new Map([
    [1, "plug_and_usb"],
    [3, "plug"],
    [5, "usb"],
]);
/**
 * Every index in the power group, scanned in wire order. Includes the
 * unobserved 2/4/6 "some seats" variants deliberately: the first *set* slot
 * wins even when it is one we cannot label, so a payload that ever does set
 * one yields "unknown" rather than skipping ahead to a slot we can name and
 * reporting something Google did not say.
 */
const POWER_GROUP = [1, 2, 3, 4, 5, 6];
/** Video slots, in wire order. */
const VIDEO_SLOTS = new Map([
    [8, "live_tv"],
    [9, "on_demand"],
    [10, "stream_to_device"],
]);
const VIDEO_GROUP = [8, 9, 10];
/** Video products delivered on a seatback screen rather than to a phone. */
const SEATBACK_VIDEO = new Set(["live_tv", "on_demand"]);
/** Position of the Wi-Fi tier code within leg[12]. */
const WIFI_TIER_SLOT = 11;
/** Confirmed Wi-Fi tier codes. */
const WIFI_TIERS_BY_CODE = new Map([
    [2, "free"],
    [3, "paid"],
]);
/**
 * Confirmed leg[13] seat-quality codes. Code 9 ("angled flat") is reported
 * but unobserved, so it deliberately has no label here.
 */
const SEAT_QUALITY_BY_CODE = new Map([
    [1, "average"],
    [2, "below_average"],
    [3, "above_average"],
    [4, "extra_reclining"],
    [5, "lie_flat"],
    [6, "lie_flat_suite_with_door"],
    [8, "recliner"],
]);
/**
 * True when slots[index] is a set flag. Google's RPC payload encodes these
 * as JSON booleans while the public travel page encodes them as 1; accept
 * both and treat every other value (including 0, non-integers and strings)
 * as unset. The integer check keeps this identical to Python's
 * `isinstance(value, int)`, which rejects floats such as 1.5.
 */
function slotOn(slots, index) {
    const value = safeGet(slots, index);
    if (typeof value === "boolean")
        return value;
    return typeof value === "number" && Number.isInteger(value) && value > 0;
}
/** Index of the first set slot in `group` (wire order), else null. */
function firstSetSlot(slots, group) {
    for (const index of group) {
        if (slotOn(slots, index))
            return index;
    }
    return null;
}
/** Pull the integer seat pitch out of "31 in" / "31 inches". */
function parseLegroomInches(text) {
    if (typeof text !== "string")
        return null;
    const head = text.split(" ", 1)[0];
    if (head == null || !/^\d+$/.test(head))
        return null;
    const inches = Number.parseInt(head, 10);
    return inches > 0 ? inches : null;
}
function parseAmenities(slots, seatQuality = null, legroom = null) {
    // Only a slot whose meaning the corpus confirms may set `power`; an
    // unlabelled slot (2/4/6, never observed) leaves every power field
    // unknown rather than asserting "there is power, flavour unknown".
    const powerSlot = firstSetSlot(slots, POWER_GROUP);
    const powerType = powerSlot == null ? null : (POWER_SLOTS.get(powerSlot) ?? null);
    const power = powerType == null ? null : true;
    // `powerType === "plug"` is the AC-outlet-only variant, but it rests on 7
    // legs from 2 carriers in the whole corpus — far too thin to put a false
    // on a public tri-state. The distinction survives losslessly in
    // `power_type`; `usb_power` only ever says true or "unknown".
    const usbPower = powerType === "plug_and_usb" || powerType === "usb" ? true : null;
    const videoSlot = firstSetSlot(slots, VIDEO_GROUP);
    const videoType = videoSlot == null ? null : (VIDEO_SLOTS.get(videoSlot) ?? null);
    // INFERENCE: "stream to your own device" is Google's way of saying the
    // aircraft has no seatback screen — true of every slot-10 fleet in the
    // corpus (Alaska, AA 737/A321 Sharklets, every regional jet) — so it is
    // the one negative these slots license. Nothing else is inferred: a
    // live-TV seatback normally carries on-demand content too, and streamed
    // content is itself on-demand, so the absence of slot 9 is not evidence
    // that on-demand is unavailable.
    const inSeatVideo = videoType == null ? null : SEATBACK_VIDEO.has(videoType);
    const onDemandVideo = videoType === "on_demand" ? true : null;
    const wifiCode = asNonNegativeInt(safeGet(slots, WIFI_TIER_SLOT));
    const wifi = wifiCode ? true : null;
    const wifiTier = wifiCode ? (WIFI_TIERS_BY_CODE.get(wifiCode) ?? null) : null;
    // leg[12][11] is the Wi-Fi tier; seat quality lives separately at leg[13].
    const legroomRating = asNonNegativeInt(seatQuality);
    const seatQualityLabel = legroomRating == null ? null : (SEAT_QUALITY_BY_CODE.get(legroomRating) ?? null);
    // legroom_inches is derived from a string the leg already exposes as
    // legroom/legroom_short, so on its own it is not enough to materialise an
    // Amenities object — that keeps "no amenities" meaning what it did before
    // this decoder was corrected.
    if (wifi == null && power == null && videoType == null && legroomRating == null) {
        return null;
    }
    return {
        wifi,
        power,
        usb_power: usbPower,
        in_seat_video: inSeatVideo,
        on_demand_video: onDemandVideo,
        legroom_rating: legroomRating ?? null,
        wifi_tier: wifiTier,
        power_type: powerType,
        video_type: videoType,
        seat_quality: seatQualityLabel,
        legroom_inches: parseLegroomInches(legroom),
    };
}
/**
 * Decode the per-leg cabin code at leg[16] into a SeatType. Google uses the
 * same 1..4 numbering here as in the request filters. Unknown codes return
 * null rather than throwing — the leg is still usable.
 */
function parseCabin(code) {
    const value = asNonNegativeInt(code);
    if (value == null)
        return null;
    return Object.values(SeatType).includes(value) ? value : null;
}
function parseEmissions(detail) {
    const out = { this_g: null, typical_g: null, delta_pct: null, tag: null };
    const block = safeGet(detail, 22);
    if (!Array.isArray(block))
        return out;
    out.this_g = asNonNegativeInt(safeGet(block, 7));
    out.typical_g = asNonNegativeInt(safeGet(block, 8));
    out.delta_pct = asInt(safeGet(block, 3));
    const tagInt = asInt(safeGet(block, 11));
    if (tagInt === 1)
        out.tag = "lower";
    else if (tagInt === 2)
        out.tag = "typical";
    else if (tagInt === 3)
        out.tag = "higher";
    return out;
}
function parseLeg(fl) {
    const airlineInfo = fl[22] ?? [];
    const airline = safeAirline(safeGet(airlineInfo, 0));
    if (airline == null) {
        throw new Error("Leg missing airline code");
    }
    const flightNumber = asStr(safeGet(airlineInfo, 1)) ?? "";
    const opCode = safeGet(airlineInfo, 2);
    const operatingAirline = opCode ? safeAirline(opCode) : null;
    const aircraft = asStr(safeGet(fl, 17));
    const legroomShort = asStr(safeGet(fl, 14));
    const legroomLong = asStr(safeGet(fl, 30));
    const amenities = parseAmenities(safeGet(fl, 12), safeGet(fl, 13), legroomShort ?? legroomLong);
    const overnight = asBool(safeGet(fl, 19)) ?? false;
    const co2EmissionsG = asNonNegativeInt(safeGet(fl, 31));
    const cabin = parseCabin(safeGet(fl, 16));
    return {
        airline,
        flight_number: flightNumber,
        departure_airport: parseAirport(fl[3]),
        arrival_airport: parseAirport(fl[6]),
        departure_datetime: parseDateTime(fl[20], fl[8]),
        arrival_datetime: parseDateTime(fl[21], fl[10]),
        duration: fl[11],
        departure_airport_name: asStr(safeGet(fl, 4)),
        arrival_airport_name: asStr(safeGet(fl, 5)),
        operating_airline: operatingAirline,
        operating_flight_number: null,
        aircraft,
        legroom_short: legroomShort,
        legroom: legroomLong ?? legroomShort,
        amenities,
        overnight,
        co2_emissions_g: co2EmissionsG,
        cabin,
    };
}
function deriveLayovers(legs, detailBlock) {
    const detailEntries = Array.isArray(detailBlock) ? detailBlock : [];
    const layovers = [];
    for (let i = 0; i < legs.length - 1; i++) {
        const prev = legs[i];
        const next = legs[i + 1];
        const waitMs = next.departure_datetime.getTime() - prev.arrival_datetime.getTime();
        const deltaMinutes = Math.max(Math.floor(waitMs / 60000), 0);
        let airportName = null;
        let city = null;
        const entry = detailEntries[i];
        if (Array.isArray(entry)) {
            airportName = asStr(safeGet(entry, 4));
            city = asStr(safeGet(entry, 5));
        }
        layovers.push({
            airport: prev.arrival_airport,
            duration: deltaMinutes,
            overnight: prev.arrival_datetime.toDateString() !== next.departure_datetime.toDateString(),
            change_of_airport: prev.arrival_airport !== next.departure_airport,
            airport_name: airportName,
            city,
        });
    }
    return layovers;
}
function getPriceBlock(row) {
    const block = safeGet(row, 1);
    return Array.isArray(block) ? block : null;
}
function parsePriceInfo(row) {
    const priceBlock = getPriceBlock(row);
    if (priceBlock == null)
        throw new Error("price block missing — skip row");
    const head = priceBlock[0];
    if (!Array.isArray(head))
        throw new Error("price head is not a list");
    let price = null;
    if (head.length > 0) {
        const rawPrice = head[head.length - 1];
        if (typeof rawPrice === "boolean" || (typeof rawPrice !== "number" && rawPrice != null)) {
            throw new Error(`price field is not numeric: ${JSON.stringify(rawPrice)}`);
        }
        price = rawPrice == null ? null : Number(rawPrice);
    }
    let currency = null;
    if (priceBlock.length > 1) {
        try {
            currency = extractCurrencyFromPriceToken(priceBlock[1]);
        }
        catch {
            currency = null;
        }
    }
    return [price, currency];
}
/** Decode a single flight row into a `FlightResult`. */
export function parseFlightRow(row) {
    const detail = row[0];
    const [price, currency] = parsePriceInfo(row);
    const rawLegs = detail[2] ?? [];
    const legs = rawLegs.map(parseLeg);
    const layovers = legs.length > 1 ? deriveLayovers(legs, safeGet(detail, 13)) : [];
    const emissions = parseEmissions(detail);
    const primaryAirline = safeAirline(safeGet(detail, 0));
    const namesField = safeGet(detail, 1);
    let primaryAirlineName = null;
    if (Array.isArray(namesField) && namesField.length > 0) {
        const first = namesField[0];
        if (typeof first === "string")
            primaryAirlineName = first;
    }
    return {
        legs,
        price,
        currency,
        duration: detail[9],
        stops: Math.max(legs.length - 1, 0),
        layovers: layovers.length > 0 ? layovers : null,
        co2_emissions_g: emissions.this_g,
        co2_emissions_typical_g: emissions.typical_g,
        co2_emissions_delta_pct: emissions.delta_pct,
        emissions_tag: emissions.tag,
        self_transfer: asBool(safeGet(detail, 12)),
        mixed_cabin: asBool(safeGet(row, 10)),
        primary_airline: primaryAirline,
        primary_airline_name: primaryAirlineName,
        booking_token: asStr(safeGet(row, 8)),
    };
}
// ---------------------------------------------------------------------------
// Booking option decoding
// ---------------------------------------------------------------------------
/** Walk a decoded `wrb.fr` chunk and yield every booking-option row. */
export function parseBookingChunk(chunk) {
    const out = [];
    walkForBookingRows(chunk, out);
    return out;
}
function walkForBookingRows(node, out) {
    if (!Array.isArray(node))
        return;
    const opt = tryParseBookingRow(node);
    if (opt != null) {
        out.push(opt);
        return;
    }
    for (const child of node)
        walkForBookingRows(child, out);
}
function tryParseBookingRow(row) {
    if (!Array.isArray(row) || row.length < 8)
        return null;
    if (typeof row[0] !== "number" || !Number.isInteger(row[0]))
        return null;
    const vendorBlock = row[1];
    if (!Array.isArray(vendorBlock) || vendorBlock.length === 0)
        return null;
    const firstVendor = vendorBlock[0];
    if (!Array.isArray(firstVendor) ||
        firstVendor.length < 2 ||
        typeof firstVendor[0] !== "string" ||
        typeof firstVendor[1] !== "string") {
        return null;
    }
    const isDirect = firstVendor.length >= 4 && typeof firstVendor[3] === "boolean" ? firstVendor[3] : false;
    let flights = null;
    if (Array.isArray(row[3])) {
        const gathered = [];
        for (const entry of row[3]) {
            if (Array.isArray(entry) &&
                entry.length >= 2 &&
                typeof entry[0] === "string" &&
                typeof entry[1] === "string") {
                gathered.push([entry[0], entry[1]]);
            }
        }
        flights = gathered.length > 0 ? gathered : null;
    }
    const [bookingUrl, googleClickUrl] = extractBookingUrls(row[5]);
    let price = null;
    let currency = null;
    if (Array.isArray(row[7])) {
        const pblock = row[7];
        if (pblock.length > 0 && Array.isArray(pblock[0]) && pblock[0].length >= 2) {
            const inner = pblock[0];
            const rawPrice = inner[inner.length - 1];
            if (typeof rawPrice === "number" && !Number.isNaN(rawPrice)) {
                price = rawPrice;
            }
        }
        if (pblock.length > 1 && typeof pblock[1] === "string") {
            currency = extractCurrencyFromPriceToken(pblock[1]);
        }
    }
    return {
        vendor_code: firstVendor[0],
        vendor_name: firstVendor[1],
        is_airline_direct: isDirect,
        price,
        currency,
        fare_name: extractFareName(row),
        booking_url: bookingUrl,
        google_click_url: googleClickUrl,
        flights,
    };
}
function extractBookingUrls(block) {
    if (!Array.isArray(block))
        return [null, null];
    const vendorUrl = block.length > 0 && typeof block[0] === "string" ? block[0] : null;
    let googleClickUrl = null;
    if (block.length > 2 && Array.isArray(block[2]) && block[2].length > 0) {
        const candidate = block[2][0];
        if (typeof candidate === "string" && candidate.includes("/travel/clk")) {
            googleClickUrl = candidate;
        }
    }
    return [vendorUrl, googleClickUrl];
}
function extractFareName(row) {
    if (row.length > 21 && Array.isArray(row[21]) && row[21].length > 3) {
        const candidate = row[21][3];
        if (typeof candidate === "string" && candidate.length > 0)
            return candidate;
    }
    if (row.length > 14 && Array.isArray(row[14]) && row[14].length > 0) {
        try {
            const label = row[14][0][0][1][1];
            if (typeof label === "string" && label.length > 0)
                return label;
        }
        catch {
            // Shape mismatch — fall through.
        }
    }
    return null;
}
// Re-export the internal helpers so tests can exercise them.
export { parseDateTime as _parseDateTime, parseEmissions as _parseEmissions, safeAirline as _safeAirline, tryParseBookingRow as _tryParseBookingRow, };
//# sourceMappingURL=decoders.js.map