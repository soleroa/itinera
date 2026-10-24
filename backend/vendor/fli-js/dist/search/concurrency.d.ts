/**
 * Async concurrency primitives. 1:1 port of fli/search/_concurrency.py,
 * adapted to JavaScript's single-threaded event loop (no need for a
 * threading.Condition — `setTimeout`/`Promise` are the equivalent).
 */
/**
 * Throw the caller's abort reason if `signal` has already fired.
 *
 * Used at every point where a cancelled call would otherwise spend
 * something on the caller's behalf — a rate-limiter token (which delays
 * the next real request), a `fetchImpl` call, a page fetch, a date.
 * Real `fetch` rejects a pre-aborted signal without touching the network,
 * but a custom `fetchImpl` is under no such obligation.
 */
export declare function throwIfAborted(signal?: AbortSignal): void;
/**
 * Sleep for `ms`, giving up promptly if `signal` aborts.
 *
 * Both backoffs in this package — the client's retry backoff and the
 * page-retry backoff — sit between HTTP requests on a path a caller may
 * cancel. A plain `setTimeout` promise would make the caller wait out a
 * delay that no longer has any reason to elapse, and would leave the
 * timer armed after the call had already settled.
 *
 * Rejects with the signal's own `reason`, so the caller gets back the
 * error it aborted with rather than a synthesised one.
 */
export declare function sleep(ms: number, signal?: AbortSignal): Promise<void>;
/**
 * Async token-bucket rate limiter.
 *
 * The bucket starts full (`capacity` tokens) and refills continuously at
 * `capacity / period` tokens per second. `acquire()` resolves once a
 * token has been taken; concurrent waiters are released in arrival order
 * via a FIFO promise chain.
 */
export declare class TokenBucketRateLimiter {
    private readonly capacityValue;
    private readonly refillPerSecond;
    private tokens;
    private lastRefill;
    /** Serialises waiters so they wake in arrival order. */
    private queue;
    constructor(calls: number, period: number);
    get capacity(): number;
    private refill;
    /**
     * Block until `tokens` are available; returns `false` on timeout.
     *
     * @param tokens count to acquire (must be ≤ capacity)
     * @param timeoutMs optional timeout in milliseconds
     */
    acquire(tokens?: number, timeoutMs?: number | null): Promise<boolean>;
}
export declare function configureConcurrency(maxWorkers: number): void;
export declare function getDefaultMaxWorkers(): number;
/**
 * Apply `fn` to each item with bounded concurrency; results returned in
 * input order. Fast-path for ≤1 items / maxWorkers=1 (no scheduling
 * overhead).
 *
 * The first rejection rethrows after all in-flight calls have settled,
 * matching the Python implementation's "let siblings finish" contract.
 */
export declare function parallelMap<T, R>(fn: (item: T) => Promise<R>, items: Iterable<T>, options?: {
    maxWorkers?: number;
}): Promise<R[]>;
//# sourceMappingURL=concurrency.d.ts.map