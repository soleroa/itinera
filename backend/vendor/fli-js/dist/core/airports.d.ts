/**
 * Airport search by IATA code, city name, or airport name.
 * 1:1 port of fli/core/airports.py — same 5-priority cascade.
 */
import { type Airport } from "../models/airport.ts";
export type MatchType = "iata_exact" | "iata_prefix" | "city" | "name";
export interface AirportMatch {
    code: Airport;
    name: string;
    match_type: MatchType;
    score: number;
}
/**
 * Curated multi-airport city aliases (e.g., "new york" → JFK / LGA / EWR).
 * Mirrors the Python CITY_AIRPORTS dict.
 */
export declare const CITY_AIRPORTS: Record<string, string[]>;
/**
 * Strip the internal " (CODE)" suffix that keeps duplicate names unique in
 * AIRPORT_NAMES. The code is always returned separately, so users should see
 * the plain name (mirrors Python's `fli.models.display_name`).
 */
export declare function airportDisplayName(code: string): string;
/**
 * Search airports by city name, airport name, or IATA code.
 *
 * Results are ranked 0-100 (higher = better) via the same 5-priority
 * cascade used in the Python implementation:
 *
 *   1. iata_exact (100)   — exact IATA code
 *   2. city (90)          — exact city/alias
 *   3. city (80)          — prefix of a city/alias
 *   4. name (≤70)         — substring of an airport's name (position-weighted)
 *   5. iata_prefix (60)   — prefix of an IATA code (only for ≤3-char queries)
 */
export declare function searchAirports(query: string, limit?: number): AirportMatch[];
//# sourceMappingURL=airports.d.ts.map