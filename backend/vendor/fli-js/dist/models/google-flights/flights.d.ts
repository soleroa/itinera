/**
 * FlightSearchFilters — produces the nested-list payload Google's
 * FlightsFrontendService.GetShoppingResults endpoint expects.
 *
 * 1:1 port of fli/models/google_flights/flights.py — the formatted output
 * must remain byte-identical to the Python implementation (see
 * tests/integration/test_filter_format_snapshots.test.ts).
 */
import { type Airline } from "../airline.ts";
import { type Alliance, type BagsFilter, EmissionsFilter, type FlightSegment, type LayoverRestrictions, MaxStops, type PassengerInfo, type PriceLimit, SeatType, SortBy, TripType } from "./base.ts";
export interface FlightSearchFiltersInput {
    trip_type?: TripType;
    passenger_info: PassengerInfo;
    flight_segments: FlightSegment[];
    stops?: MaxStops;
    seat_type?: SeatType;
    price_limit?: PriceLimit | null;
    airlines?: Airline[] | null;
    airlines_exclude?: Airline[] | null;
    alliances?: Alliance[] | null;
    alliances_exclude?: Alliance[] | null;
    max_duration?: number | null;
    layover_restrictions?: LayoverRestrictions | null;
    sort_by?: SortBy;
    exclude_basic_economy?: boolean;
    emissions?: EmissionsFilter;
    bags?: BagsFilter | null;
    show_all_results?: boolean;
}
export declare class FlightSearchFilters {
    trip_type: TripType;
    passenger_info: PassengerInfo;
    flight_segments: FlightSegment[];
    stops: MaxStops;
    seat_type: SeatType;
    price_limit: PriceLimit | null;
    airlines: Airline[] | null;
    airlines_exclude: Airline[] | null;
    alliances: Alliance[] | null;
    alliances_exclude: Alliance[] | null;
    max_duration: number | null;
    layover_restrictions: LayoverRestrictions | null;
    sort_by: SortBy;
    exclude_basic_economy: boolean;
    emissions: EmissionsFilter;
    bags: BagsFilter | null;
    show_all_results: boolean;
    constructor(input: FlightSearchFiltersInput);
    /**
     * Render the nested-list payload Google's GetShoppingResults RPC accepts.
     * See the position map in the upstream Python flights.py.
     */
    format(): unknown[];
    /** URL-encode the formatted filters into the `f.req` body. */
    encode(): string;
}
//# sourceMappingURL=flights.d.ts.map