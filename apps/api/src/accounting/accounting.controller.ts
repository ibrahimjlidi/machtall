import { Body, Controller, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { AuthenticatedRequest, JwtAuthGuard } from '../auth/auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import {
  CashSessionReviewDto,
  CreateAccountingPaymentDto,
  CreateExpenseDto,
  CreateVatRateDto,
  ExpenseReviewDto,
  RejectExpenseDto,
  UpdateVatRateDto,
} from './accounting.dto';
import { AccountingService } from './accounting.service';

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
export class AccountingController {
  constructor(private readonly accounting: AccountingService) {}

  @Get('expenses')
  @Roles(UserRole.ADMIN, UserRole.ACCOUNTANT)
  listExpenses() {
    return this.accounting.listExpenses();
  }

  @Post('expenses')
  @Roles(UserRole.ACCOUNTANT)
  createExpense(@Body() input: CreateExpenseDto, @Req() request: AuthenticatedRequest) {
    return this.accounting.createExpense(input, request.user);
  }

  @Patch('expenses/:id/approve')
  @Roles(UserRole.ADMIN)
  approveExpense(@Param('id') id: string, @Body() input: ExpenseReviewDto, @Req() request: AuthenticatedRequest) {
    return this.accounting.reviewExpense(id, input, true, request.user);
  }

  @Patch('expenses/:id/reject')
  @Roles(UserRole.ADMIN)
  rejectExpense(@Param('id') id: string, @Body() input: RejectExpenseDto, @Req() request: AuthenticatedRequest) {
    return this.accounting.reviewExpense(id, input, false, request.user);
  }

  @Post('expenses/:id/payments')
  @Roles(UserRole.ACCOUNTANT)
  payExpense(
    @Param('id') id: string,
    @Body() input: CreateAccountingPaymentDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.accounting.payExpense(id, input, request.user);
  }

  @Post('supplier-invoices/:id/payments')
  @Roles(UserRole.ACCOUNTANT)
  paySupplierInvoice(
    @Param('id') id: string,
    @Body() input: CreateAccountingPaymentDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.accounting.paySupplierInvoice(id, input, request.user);
  }

  @Patch('cash-sessions/:id/review')
  @Roles(UserRole.ACCOUNTANT)
  reviewCashSession(
    @Param('id') id: string,
    @Body() input: CashSessionReviewDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.accounting.reviewCashSession(id, input, request.user);
  }

  @Patch('cash-sessions/:id/approve-variance')
  @Roles(UserRole.ADMIN)
  approveCashVariance(
    @Param('id') id: string,
    @Body() input: CashSessionReviewDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.accounting.approveCashVariance(id, input, request.user);
  }

  @Get('vat-rates')
  @Roles(UserRole.ADMIN, UserRole.ACCOUNTANT)
  listVatRates() {
    return this.accounting.listVatRates();
  }

  @Post('vat-rates')
  @Roles(UserRole.ADMIN)
  createVatRate(@Body() input: CreateVatRateDto, @Req() request: AuthenticatedRequest) {
    return this.accounting.createVatRate(input, request.user);
  }

  @Patch('vat-rates/:id')
  @Roles(UserRole.ADMIN)
  updateVatRate(
    @Param('id') id: string,
    @Body() input: UpdateVatRateDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.accounting.updateVatRate(id, input, request.user);
  }
}
