import { Body, Controller, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { AuthenticatedRequest, JwtAuthGuard } from '../auth/auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { AdjustmentsService } from './adjustments.service';
import { CreateStockCountDto, ReviewAdjustmentRequestDto } from './adjustments.dto';

@Controller('adjustment-requests')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AdjustmentsController {
  constructor(private readonly adjustments: AdjustmentsService) {}

  @Get()
  @Roles(UserRole.ADMIN, UserRole.STOREKEEPER)
  list() { return this.adjustments.list(); }

  @Patch(':id/approve')
  @Roles(UserRole.ADMIN)
  approve(@Param('id') id: string, @Req() request: AuthenticatedRequest) {
    return this.adjustments.approve(id, request.user);
  }

  @Patch(':id/reject')
  @Roles(UserRole.ADMIN)
  reject(@Param('id') id: string, @Body() input: ReviewAdjustmentRequestDto, @Req() request: AuthenticatedRequest) {
    return this.adjustments.reject(id, input.reason, request.user);
  }
}

@Controller('stock-counts')
@UseGuards(JwtAuthGuard, RolesGuard)
export class StockCountsController {
  constructor(private readonly adjustments: AdjustmentsService) {}

  @Get()
  @Roles(UserRole.ADMIN, UserRole.STOREKEEPER)
  list() { return this.adjustments.listCounts(); }

  @Post()
  @Roles(UserRole.STOREKEEPER)
  record(@Body() input: CreateStockCountDto, @Req() request: AuthenticatedRequest) {
    return this.adjustments.recordCount(input, request.user);
  }
}
