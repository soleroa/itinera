import { Global, Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { AnalyticsInterceptor } from './analytics.interceptor';
import { AnalyticsService } from './analytics.service';

@Global()
@Module({
  providers: [AnalyticsService, { provide: APP_INTERCEPTOR, useClass: AnalyticsInterceptor }],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}
