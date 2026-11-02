import { Body, Controller, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { AuthenticatedRequest, JwtAuthGuard } from '../auth/auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { CreatePurchaseOrderDto } from './purchasing.dto';
import { PurchasingService } from './purchasing.service';

@Controller('purchase-orders')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PurchasingController {
  constructor(private readonly purchasing: PurchasingService) {}

  @Get()
  list() { return this.purchasing.list(); }

  @Post()
  @Roles(UserRole.ADMIN, UserRole.STOREKEEPER)
  create(@Body() input: CreatePurchaseOrderDto) { return this.purchasing.create(input); }

  @Patch(':id/send')
  @Roles(UserRole.ADMIN, UserRole.STOREKEEPER)
  send(@Param('id') id: string) { return this.purchasing.send(id); }

  @Patch(':id/receive')
  @Roles(UserRole.ADMIN, UserRole.STOREKEEPER)
  receive(@Param('id') id: string, @Req() request: AuthenticatedRequest) {
    return this.purchasing.receive(id, request.user);
  }
}
