/**
 * Parser for Google Flights' FlightsFrontendService wire format.
 *
 * 1:1 port of fli/search/_wire.py — handles both the legacy single-chunk
 * JSONP shape and the multi-chunk format used by GetBookingResults.
 *
 * Important quirk: the length headers count UTF-8 BYTES, not characters,
 * so the parser operates on `Uint8Array` rather than the JS string.
 */
/** Yield the inner JSON of every `wrb.fr` chunk in `body`. */
export declare function iterWrbChunks(body: string | Uint8Array): Generator<unknown>;
/** Return the inner JSON of the first `wrb.fr` chunk, or `null`. */
export declare function parseFirstWrbPayload(body: string | Uint8Array): unknown;
//# sourceMappingURL=wire.d.ts.map