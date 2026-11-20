import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { PostHog } from 'posthog-node';

/** PostHog server-side client. Without POSTHOG_KEY it does nothing. */
@Injectable()
export class AnalyticsService implements OnModuleDestroy {
  private readonly client: PostHog | null;

  constructor() {
    const key = process.env.POSTHOG_KEY;
    this.client = key
      ? new PostHog(key, { host: process.env.POSTHOG_HOST ?? 'https://us.i.posthog.com' })
      : null;
  }

  capture(distinctId: string, event: string, properties?: Record<string, unknown>) {
    this.client?.capture({ distinctId, event, properties });
  }

  captureException(distinctId: string, error: unknown, properties?: Record<string, unknown>) {
    this.client?.captureException(error, { distinctId, properties });
  }

  async onModuleDestroy() {
    await this.client?.shutdown();
  }
}
