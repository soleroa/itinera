/**
 * Copying filter objects before a search mutates them.
 *
 * Round-trip expansion pins a segment's `selected_flight` and the date
 * sweep rewrites segment dates per chunk; neither may touch the object
 * the caller handed in. Python does this with Pydantic's `model_copy`.
 *
 * There is exactly one implementation here on purpose. Both call sites
 * used to keep their own hand-written list of fields to copy, which is
 * the pattern that silently dropped `airlines_exclude` and the alliance
 * lists in Python: a filter left off the list is not an error, it is a
 * search that quietly ignores what the caller asked for. Copying every
 * own property means a filter added later is carried without anyone
 * having to remember to add it.
 */
/** Shape shared by both filter classes: the part a search mutates. */
interface HasSegments {
    flight_segments: object[];
}
/**
 * Copy a `FlightSearchFilters` or `DateSearchFilters`.
 *
 * Every own field is carried over. `flight_segments` and the segments
 * themselves are fresh objects, so pinning a `selected_flight` or
 * rewriting a `travel_date` on the copy leaves the caller's filters
 * untouched.
 */
export declare function cloneFilters<T extends HasSegments>(filters: T): T;
export {};
//# sourceMappingURL=clone.d.ts.map