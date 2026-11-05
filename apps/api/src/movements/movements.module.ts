import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { MovementsController } from './movements.controller';
import { MovementsService } from './movements.service';
import { AdjustmentsController, StockCountsController } from './adjustments.controller';
import { AdjustmentsService } from './adjustments.service';

@Module({
  imports: [AuthModule],
  controllers: [MovementsController, AdjustmentsController, StockCountsController],
  providers: [MovementsService, AdjustmentsService],
  exports: [MovementsService],
})
export class MovementsModule {}
