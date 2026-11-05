import { Body, Controller, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { AuthenticatedRequest, JwtAuthGuard } from '../auth/auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { CreatePurchaseOrderDto, CreatePurchaseReceiptDto, RejectPurchaseOrderDto } from './purchasing.dto';
import { PurchasingService } from './purchasing.service';

@Controller('purchase-orders')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PurchasingController {
  constructor(private readonly purchasing: PurchasingService) {}

  @Get()
  @Roles(UserRole.ADMIN, UserRole.STOREKEEPER, UserRole.PURCHASING, UserRole.ACCOUNTANT)
  list() { return this.purchasing.list(); }

  @Post()
  @Roles(UserRole.PURCHASING)
  create(@Body() input: CreatePurchaseOrderDto, @Req() request: AuthenticatedRequest) {
    return this.purchasing.create(input, request.user);
  }

  @Patch(':id/approve')
  @Roles(UserRole.ADMIN)
  approve(@Param('id') id: string, @Req() request: AuthenticatedRequest) {
    return this.purchasing.approve(id, request.user);
  }

  @Patch(':id/reject')
  @Roles(UserRole.ADMIN)
  reject(@Param('id') id: string, @Body() input: RejectPurchaseOrderDto, @Req() request: AuthenticatedRequest) {
    return this.purchasing.reject(id, input.reason, request.user);
  }

  @Patch(':id/send')
  @Roles(UserRole.ADMIN, UserRole.PURCHASING)
  send(@Param('id') id: string, @Req() request: AuthenticatedRequest) {
    return this.purchasing.send(id, request.user);
  }

  @Post(':id/receipts')
  @Roles(UserRole.ADMIN, UserRole.STOREKEEPER)
  receive(@Param('id') id: string, @Body() input: CreatePurchaseReceiptDto, @Req() request: AuthenticatedRequest) {
    return this.purchasing.receive(id, input, request.user);
  }
}
