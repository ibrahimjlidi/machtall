import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { AuthenticatedRequest, JwtAuthGuard } from '../auth/auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { CreateCustomerPaymentDto, CreateSaleDto } from './sales.dto';
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

  @Post('customers/:id/payments')
  @Roles(UserRole.ADMIN, UserRole.SELLER)
  receiveCustomerPayment(
    @Param('id') id: string,
    @Body() input: CreateCustomerPaymentDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.sales.receiveCustomerPayment(id, input, request.user);
  }

  @Get('customers')
  customers() { return this.sales.customerBalances(); }
}
