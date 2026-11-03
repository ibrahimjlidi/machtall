import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../auth/auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { ReportQueryDto } from './reports.dto';
import { ReportsService } from './reports.service';

@Controller('reports')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.STOREKEEPER, UserRole.SELLER, UserRole.VIEWER)
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  @Get()
  summary(@Query() query: ReportQueryDto) {
    return this.reports.summary(query);
  }
}
