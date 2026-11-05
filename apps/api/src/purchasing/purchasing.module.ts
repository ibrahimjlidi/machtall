import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PurchasingController } from './purchasing.controller';
import { PurchasingRecordsController } from './purchasing-records.controller';
import { PurchasingService } from './purchasing.service';

@Module({
  imports: [AuthModule],
  controllers: [PurchasingController, PurchasingRecordsController],
  providers: [PurchasingService],
})
export class PurchasingModule {}
