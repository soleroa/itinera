import { Body, Controller, Post } from '@nestjs/common';
import { TripPlannerService, TripRequest } from './trip-planner.service';

@Controller('trips')
export class PlannerController {
  constructor(private readonly planner: TripPlannerService) {}

  /** Flight + accommodation combinations that fit the budget (deterministic code, no LLM). */
  @Post('options')
  options(@Body() body: Partial<TripRequest>) {
    return this.planner.options(this.planner.validate(body));
  }
}
