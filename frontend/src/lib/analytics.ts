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

export function track(event: string, properties?: Record<string, unknown>) {
  if (!enabled) return;
  posthog.capture(event, properties);
}
