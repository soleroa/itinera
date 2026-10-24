/**
 * The search client's warning channel.
 *
 * The Python library reports partial failures through `logging` — a
 * dropped filter, a date whose page never arrived, a sweep cut short.
 * Those messages are the difference between an honest partial answer and
 * a silent one, so the port keeps them; JavaScript has no stdlib logger,
 * so they go to `console.warn` by default and can be redirected or
 * silenced with {@link setSearchLogger}.
 *
 * `debug` is a no-op by default, mirroring a Python logger left at its
 * default level: the detail (stack traces in particular) stays available
 * to anyone who asks for it and never lands on a user's stderr by
 * accident.
 */
const DEFAULT_LOGGER = {
    warn(message) {
        console.warn(`[fli] ${message}`);
    },
    debug() {
        // Off by default.
    },
};
let current = DEFAULT_LOGGER;
/**
 * Replace the logger the search client writes to.
 *
 * Pass `null` to restore the default (`console.warn`). Pass an object
 * with no-op methods to silence the client entirely.
 */
export function setSearchLogger(logger) {
    current = logger ?? DEFAULT_LOGGER;
}
/** The logger in effect. */
export function getSearchLogger() {
    return current;
}
//# sourceMappingURL=logging.js.map