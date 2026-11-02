import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { AuthenticatedRequest, JwtAuthGuard } from '../auth/auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { CreateSaleDto } from './sales.dto';
import { SalesService } from './sales.service';

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
export class SalesController {
  constructor(private readonly sales: SalesService) {}

  @Get('sales')
  list() { return this.sales.list(); }

  @Post('sales')
  @Roles(UserRole.ADMIN, UserRole.SELLER)
  create(@Body() input: CreateSaleDto, @Req() request: AuthenticatedRequest) {
    return this.sales.create(input, request.user);
  }

  @Get('customers')
  customers() { return this.sales.customerBalances(); }
}
