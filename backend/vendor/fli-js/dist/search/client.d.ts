/**
 * HTTP client with rate limiting, retries, and proxy support.
 *
 * Replaces the Python `curl_cffi` impersonation with a `fetch`-based
 * client that:
 *
 *   - sends realistic Chrome-like headers
 *   - honours HTTPS_PROXY / HTTP_PROXY env vars (Bun's fetch supports this
 *     via the `proxy` option)
 *   - rate-limits at 10 req/sec via {@link TokenBucketRateLimiter}
 *   - retries network errors with exponential backoff
 *   - wraps low-level errors into the typed {@link SearchClientError} family
 */
/**
 * Pre-accepted consent cookie, sent so EU/EEA IPs are not redirected to
 * Google's consent interstitial — which serves a page with no `ds:1`
 * payload, so every search there fails to parse. The legacy `CONSENT`
 * cookie no longer works, and a truncated `SOCS` value is ignored.
 *
 * Override with `FLI_SOCS_COOKIE` if Google rotates the value; set it to
 * the empty string to send no cookie at all.
 */
export declare const DEFAULT_SOCS_COOKIE = "CAISNQgQEitib3FfaWRlbnRpdHlmcm9udGVuZHVpc2VydmVyXzIwMjQwMzE3LjA5X3AwGgJlbiADGgYIgLC_rwY";
/**
 * The `SOCS` cookie value in effect: `FLI_SOCS_COOKIE` if set (including
 * to the empty string, which disables the cookie), else
 * {@link DEFAULT_SOCS_COOKIE}.
 *
 * Read at `Client` construction rather than at module load — Python
 * reads its process environment once at import, but a JS consumer that
 * sets `process.env` before building a client would find that surprising,
 * and it makes the behaviour testable without module cache games.
 */
export declare function resolveSocsCookie(): string;
export interface ClientOptions {
    /** Calls per second budget. Defaults to 10. */
    callsPerSecond?: number;
    /** Per-request timeout in ms. Defaults to 60_000 (or `FLI_TIMEOUT` env var * 1000). */
    timeoutMs?: number;
    /** Total request attempts including the first try. Defaults to 3. */
    retries?: number;
    /** Initial backoff between attempts in ms. Defaults to 1_000. */
    backoffMs?: number;
    /** Proxy URL (e.g. `http://user:pass@host:port`). Defaults to HTTPS_PROXY/HTTP_PROXY env. */
    proxy?: string | null;
    /** Custom fetch implementation (test seam). */
    fetchImpl?: typeof fetch;
    /**
     * `SOCS` consent cookie value. Defaults to `FLI_SOCS_COOKIE` if set,
     * else {@link DEFAULT_SOCS_COOKIE}. An empty string sends no cookie.
     */
    socsCookie?: string;
}
export interface RequestOptions {
    headers?: Record<string, string>;
    body?: string | Uint8Array;
    signal?: AbortSignal;
}
export interface ClientResponse {
    status: number;
    statusText: string;
    text: string;
    headers: Headers;
    ok: boolean;
}
export declare class Client {
    private readonly rateLimiter;
    private readonly timeoutMs;
    private readonly retries;
    private readonly backoffMs;
    private readonly proxy;
    private readonly fetchImpl;
    private readonly cookieHeader;
    constructor(options?: ClientOptions);
    get(url: string, options?: RequestOptions): Promise<ClientResponse>;
    post(url: string, options?: RequestOptions): Promise<ClientResponse>;
    private request;
}
/**
 * Return the process-wide shared client.
 *
 * Lazy on the first call. If `options` is passed on a later call, the
 * existing singleton is replaced with a new instance configured against
 * those options (and that new instance becomes the cached singleton for
 * subsequent no-arg callers). Callers that want a fully isolated client
 * — e.g. to use a different proxy in one place without affecting
 * others — should construct `new Client(options)` directly and pass it
 * to `SearchFlights` / `SearchDates`.
 */
export declare function getClient(options?: ClientOptions): Client;
/** Replace the shared client (test helper). */
export declare function _setSharedClient(client: Client | null): void;
//# sourceMappingURL=client.d.ts.map