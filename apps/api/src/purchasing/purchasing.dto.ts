import { Transform, Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsDateString, IsEmail, IsInt, IsNumber, IsOptional, IsString, MaxLength, Min, MinLength, ValidateNested } from 'class-validator';

export class PurchaseOrderLineDto {
  @IsString() productId!: string;
  @IsInt() @Min(1) quantity!: number;
  @IsOptional() @IsString() supplierQuoteLineId?: string;
}

export class CreatePurchaseOrderDto {
  @IsString() supplierId!: string;
  @IsArray() @ArrayMinSize(1) @ValidateNested({ each: true }) @Type(() => PurchaseOrderLineDto)
  lines!: PurchaseOrderLineDto[];
}

export class SupplierDto {
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  @IsString() @MinLength(2) @MaxLength(120) name!: string;
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  @IsString() @MinLength(1) @MaxLength(120) city!: string;
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  @IsString() @MinLength(1) @MaxLength(120) type!: string;
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  @IsString() @MinLength(3) @MaxLength(40) phone!: string;
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  @IsOptional() @IsEmail() @MaxLength(254) email?: string;
}

export class SupplierQuoteLineDto {
  @IsString() productId!: string;
  @Type(() => Number) @IsNumber({ maxDecimalPlaces: 3 }) @Min(0) unitPrice!: number;
}

export class CreateSupplierQuoteDto {
  @IsString() supplierId!: string;
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  @IsString() @MinLength(1) @MaxLength(120) reference!: string;
  @IsOptional() @IsDateString() quoteDate?: string;
  @IsOptional() @IsDateString() validUntil?: string;
  @IsOptional() @IsString() @MaxLength(500) note?: string;
  @IsArray() @ArrayMinSize(1) @ValidateNested({ each: true }) @Type(() => SupplierQuoteLineDto)
  lines!: SupplierQuoteLineDto[];
}

export class CreateSupplierInvoiceDto {
  @IsString() supplierId!: string;
  @IsOptional() @IsString() purchaseOrderId?: string;
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  @IsString() @MinLength(1) @MaxLength(120) reference!: string;
  @Type(() => Number) @IsNumber({ maxDecimalPlaces: 3 }) @Min(0.001) totalAmount!: number;
  @IsOptional() @IsDateString() invoiceDate?: string;
  @IsOptional() @IsString() @MaxLength(500) note?: string;
}

export class CreateSupplierReturnDto {
  @IsString() supplierId!: string;
  @IsOptional() @IsString() purchaseOrderId?: string;
  @IsOptional() @IsString() @MaxLength(120) supplierReference?: string;
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  @IsString() @MinLength(3) @MaxLength(500) reason!: string;
  @IsOptional() @IsString() @MaxLength(500) note?: string;
  @IsArray() @ArrayMinSize(1) @ValidateNested({ each: true }) @Type(() => SupplierReturnLineDto)
  lines!: SupplierReturnLineDto[];
}

export class SupplierReturnLineDto {
  @IsString() productId!: string;
  @IsInt() @Min(1) quantity!: number;
}

export class RejectPurchaseOrderDto {
  @IsString() @MinLength(3) @MaxLength(500) reason!: string;
}

export class PurchaseReceiptLineDto {
  @IsString() orderLineId!: string;
  @IsInt() @Min(0) receivedQuantity!: number;
  @IsInt() @Min(0) damagedQuantity!: number;
}

export class CreatePurchaseReceiptDto {
  @IsArray() @ArrayMinSize(1) @ValidateNested({ each: true }) @Type(() => PurchaseReceiptLineDto)
  lines!: PurchaseReceiptLineDto[];
  @IsOptional() @IsString() @MaxLength(500) note?: string;
}
