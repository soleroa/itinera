/**
 * Defensive accessors for the nested-list response payloads. Mirrors
 * fli/search/_helpers.py.
 */
export function safeGet(seq, idx) {
    if (Array.isArray(seq) && idx >= 0 && idx < seq.length) {
        return seq[idx];
    }
    return null;
}
export function asBool(v) {
    return typeof v === "boolean" ? v : null;
}
export function asStr(v) {
    return typeof v === "string" && v.length > 0 ? v : null;
}
export function asInt(v) {
    if (typeof v === "boolean")
        return null;
    if (typeof v !== "number")
        return null;
    if (!Number.isInteger(v))
        return null;
    return v;
}
export function asNonNegativeInt(v) {
    const n = asInt(v);
    return n != null && n >= 0 ? n : null;
}
//# sourceMappingURL=helpers.js.map