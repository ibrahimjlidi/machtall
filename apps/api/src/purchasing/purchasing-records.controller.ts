import { Body, Controller, Delete, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { AuthenticatedRequest, JwtAuthGuard } from '../auth/auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import {
  CreateSupplierInvoiceDto,
  CreateSupplierQuoteDto,
  CreateSupplierReturnDto,
  RejectPurchaseOrderDto,
  SupplierDto,
} from './purchasing.dto';
import { PurchasingService } from './purchasing.service';

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
export class PurchasingRecordsController {
  constructor(private readonly purchasing: PurchasingService) {}

  @Get('suppliers')
  @Roles(UserRole.ADMIN, UserRole.STOREKEEPER, UserRole.PURCHASING, UserRole.ACCOUNTANT)
  listSuppliers() {
    return this.purchasing.listSuppliers();
  }

  @Post('suppliers')
  @Roles(UserRole.ADMIN, UserRole.PURCHASING)
  createSupplier(@Body() input: SupplierDto, @Req() request: AuthenticatedRequest) {
    return this.purchasing.createSupplier(input, request.user);
  }

  @Patch('suppliers/:id')
  @Roles(UserRole.ADMIN, UserRole.PURCHASING)
  updateSupplier(@Param('id') id: string, @Body() input: SupplierDto, @Req() request: AuthenticatedRequest) {
    return this.purchasing.updateSupplier(id, input, request.user);
  }

  @Delete('suppliers/:id')
  @Roles(UserRole.ADMIN, UserRole.PURCHASING)
  archiveSupplier(@Param('id') id: string, @Req() request: AuthenticatedRequest) {
    return this.purchasing.archiveSupplier(id, request.user);
  }

  @Get('supplier-quotes')
  @Roles(UserRole.ADMIN, UserRole.PURCHASING, UserRole.ACCOUNTANT)
  listSupplierQuotes() {
    return this.purchasing.listSupplierQuotes();
  }

  @Post('supplier-quotes')
  @Roles(UserRole.PURCHASING)
  createSupplierQuote(@Body() input: CreateSupplierQuoteDto, @Req() request: AuthenticatedRequest) {
    return this.purchasing.createSupplierQuote(input, request.user);
  }

  @Get('supplier-invoices')
  @Roles(UserRole.ADMIN, UserRole.PURCHASING, UserRole.ACCOUNTANT)
  listSupplierInvoices() {
    return this.purchasing.listSupplierInvoices();
  }

  @Post('supplier-invoices')
  @Roles(UserRole.PURCHASING)
  recordSupplierInvoice(@Body() input: CreateSupplierInvoiceDto, @Req() request: AuthenticatedRequest) {
    return this.purchasing.recordSupplierInvoice(input, request.user);
  }

  @Patch('supplier-invoices/:id/review')
  @Roles(UserRole.ADMIN, UserRole.ACCOUNTANT)
  reviewSupplierInvoice(@Param('id') id: string, @Req() request: AuthenticatedRequest) {
    return this.purchasing.reviewSupplierInvoice(id, request.user);
  }

  @Get('supplier-returns')
  @Roles(UserRole.ADMIN, UserRole.STOREKEEPER, UserRole.PURCHASING, UserRole.ACCOUNTANT)
  listSupplierReturns() {
    return this.purchasing.listSupplierReturns();
  }

  @Post('supplier-returns')
  @Roles(UserRole.PURCHASING)
  createSupplierReturn(@Body() input: CreateSupplierReturnDto, @Req() request: AuthenticatedRequest) {
    return this.purchasing.createSupplierReturn(input, request.user);
  }

  @Patch('supplier-returns/:id/approve')
  @Roles(UserRole.ADMIN)
  approveSupplierReturn(@Param('id') id: string, @Req() request: AuthenticatedRequest) {
    return this.purchasing.reviewSupplierReturn(id, true, undefined, request.user);
  }

  @Patch('supplier-returns/:id/reject')
  @Roles(UserRole.ADMIN)
  rejectSupplierReturn(
    @Param('id') id: string,
    @Body() input: RejectPurchaseOrderDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.purchasing.reviewSupplierReturn(id, false, input.reason, request.user);
  }
}
