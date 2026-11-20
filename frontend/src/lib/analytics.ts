import posthog from 'posthog-js';

const KEY = import.meta.env.VITE_POSTHOG_KEY;
const enabled = Boolean(KEY);

export function initAnalytics() {
  if (!enabled) return;
  posthog.init(KEY, {
    api_host: import.meta.env.VITE_POSTHOG_HOST ?? 'https://us.i.posthog.com',
    person_profiles: 'identified_only',
  });
}

/** Headers that tie backend events to this browser's PostHog person. */
export function analyticsHeaders(): Record<string, string> {
  if (!enabled) return {};
  return { 'X-PostHog-Distinct-Id': posthog.get_distinct_id() };
}

export function track(event: string, properties?: Record<string, unknown>) {
  if (!enabled) return;
  posthog.capture(event, properties);
}
