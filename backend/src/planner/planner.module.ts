import { Module } from '@nestjs/common';
import { ToolsModule } from '../tools/tools.module';
import { FxService } from './fx.service';
import { PlannerController } from './planner.controller';
import { TripPlannerService } from './trip-planner.service';

@Module({
  imports: [ToolsModule],
  controllers: [PlannerController],
  providers: [FxService, TripPlannerService],
})
export class PlannerModule {}
