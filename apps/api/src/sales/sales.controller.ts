import { Body, Controller, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { AuthenticatedRequest, JwtAuthGuard } from '../auth/auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import {
  CloseCashSessionDto,
  CreateCustomerPaymentDto,
  CreateSaleDto,
  CreateSalesReturnDto,
  OpenCashSessionDto,
  ReviewSalesReturnDto,
  VerifySalesReturnDto,
} from './sales.dto';
import { SalesService } from './sales.service';

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
export class SalesController {
  constructor(private readonly sales: SalesService) {}

  @Get('sales')
  @Roles(UserRole.ADMIN, UserRole.SELLER, UserRole.ACCOUNTANT)
  list(@Req() request: AuthenticatedRequest) { return this.sales.list(request.user); }

  @Post('sales')
  @Roles(UserRole.ADMIN, UserRole.SELLER)
  create(@Body() input: CreateSaleDto, @Req() request: AuthenticatedRequest) {
    return this.sales.create(input, request.user);
  }

  @Patch('sales/:id/approve')
  @Roles(UserRole.ADMIN)
  approveCreditSale(@Param('id') id: string, @Req() request: AuthenticatedRequest) {
    return this.sales.approveCreditSale(id, request.user);
  }

  @Patch('sales/:id/reject')
  @Roles(UserRole.ADMIN)
  rejectCreditSale(
    @Param('id') id: string,
    @Body() input: ReviewSalesReturnDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.sales.rejectCreditSale(id, input, request.user);
  }

  @Get('sales/returns')
  @Roles(UserRole.ADMIN, UserRole.SELLER, UserRole.STOREKEEPER)
  returns(@Req() request: AuthenticatedRequest) {
    return this.sales.listReturns(request.user);
  }

  @Post('sales/:id/returns')
  @Roles(UserRole.ADMIN, UserRole.SELLER)
  requestReturn(
    @Param('id') id: string,
    @Body() input: CreateSalesReturnDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.sales.requestReturn(id, input, request.user);
  }

  @Patch('sales/returns/:id/approve')
  @Roles(UserRole.ADMIN)
  approveReturn(@Param('id') id: string, @Req() request: AuthenticatedRequest) {
    return this.sales.approveReturn(id, request.user);
  }

  @Patch('sales/returns/:id/reject')
  @Roles(UserRole.ADMIN)
  rejectReturn(
    @Param('id') id: string,
    @Body() input: ReviewSalesReturnDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.sales.rejectReturn(id, input, request.user);
  }

  @Patch('sales/returns/:id/verify')
  @Roles(UserRole.ADMIN, UserRole.STOREKEEPER)
  verifyReturn(
    @Param('id') id: string,
    @Body() input: VerifySalesReturnDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.sales.verifyReturn(id, input, request.user);
  }

  @Get('cash-sessions')
  @Roles(UserRole.ADMIN, UserRole.SELLER, UserRole.ACCOUNTANT)
  cashSessions(@Req() request: AuthenticatedRequest) {
    return this.sales.listCashSessions(request.user);
  }

  @Post('cash-sessions')
  @Roles(UserRole.ADMIN, UserRole.SELLER)
  openCashSession(@Body() input: OpenCashSessionDto, @Req() request: AuthenticatedRequest) {
    return this.sales.openCashSession(input, request.user);
  }

  @Patch('cash-sessions/:id/close')
  @Roles(UserRole.ADMIN, UserRole.SELLER)
  closeCashSession(
    @Param('id') id: string,
    @Body() input: CloseCashSessionDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.sales.closeCashSession(id, input, request.user);
  }

  @Post('customers/:id/payments')
  @Roles(UserRole.ADMIN, UserRole.SELLER, UserRole.ACCOUNTANT)
  receiveCustomerPayment(
    @Param('id') id: string,
    @Body() input: CreateCustomerPaymentDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.sales.receiveCustomerPayment(id, input, request.user);
  }

  @Get('customers')
  @Roles(UserRole.ADMIN, UserRole.SELLER, UserRole.ACCOUNTANT)
  customers(@Req() request: AuthenticatedRequest) { return this.sales.customerBalances(request.user); }
}
