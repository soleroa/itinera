import { CallHandler, ExecutionContext, HttpException, Injectable, NestInterceptor } from '@nestjs/common';
import type { Request } from 'express';
import { Observable, tap } from 'rxjs';
import { AnalyticsService } from './analytics.service';

/** Header the frontend sends so server events join the same PostHog person. */
export const DISTINCT_ID_HEADER = 'x-posthog-distinct-id';

/** Reports every request (route, duration, outcome). Never sends the body or query: no destinations or dates. */
@Injectable()
export class AnalyticsInterceptor implements NestInterceptor {
  constructor(private readonly analytics: AnalyticsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest<Request>();
    const started = Date.now();
    const distinctId = req.header(DISTINCT_ID_HEADER) || 'backend';
    const base = { route: `${req.method} ${req.route?.path ?? req.path}` };

    return next.handle().pipe(
      tap({
        next: () =>
          this.analytics.capture(distinctId, 'backend_request', {
            ...base,
            ok: true,
            duration_ms: Date.now() - started,
          }),
        error: (error: unknown) => {
          const status = error instanceof HttpException ? error.getStatus() : 500;
          this.analytics.capture(distinctId, 'backend_request', {
            ...base,
            ok: false,
            status,
            duration_ms: Date.now() - started,
          });
          if (status >= 500) this.analytics.captureException(distinctId, error, base);
        },
      }),
    );
  }
}
