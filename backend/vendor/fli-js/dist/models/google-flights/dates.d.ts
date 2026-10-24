/**
 * DateSearchFilters — payload for Google Flights' GetCalendarGraph endpoint.
 *
 * 1:1 port of fli/models/google_flights/dates.py.
 */
import { type Airline } from "../airline.ts";
import { type Alliance, type BagsFilter, EmissionsFilter, type FlightSegment, type LayoverRestrictions, MaxStops, type PassengerInfo, type PriceLimit, SeatType, TripType } from "./base.ts";
export interface DateSearchFiltersInput {
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
    emissions?: EmissionsFilter;
    bags?: BagsFilter | null;
    from_date: string;
    to_date: string;
    duration?: number | null;
}
export declare class DateSearchFilters {
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
    emissions: EmissionsFilter;
    bags: BagsFilter | null;
    from_date: string;
    to_date: string;
    duration: number | null;
    constructor(input: DateSearchFiltersInput);
    get parsed_from_date(): Date;
    get parsed_to_date(): Date;
    format(): unknown[];
    encode(): string;
}
//# sourceMappingURL=dates.d.ts.map