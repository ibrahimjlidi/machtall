import { AccountingPaymentMethod, PaymentStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export class SaleLineDto {
  @IsString() productId!: string;
  @IsInt() @Min(1) quantity!: number;
}

export class CreateSaleDto {
  @IsString() customerId!: string;
  @IsEnum(PaymentStatus) payment!: PaymentStatus;
  @IsArray() @ArrayMinSize(1) @ValidateNested({ each: true }) @Type(() => SaleLineDto)
  lines!: SaleLineDto[];
}

export class CreateCustomerPaymentDto {
  @IsNumber({ maxDecimalPlaces: 3 }) @Min(0.001) amount!: number;
  @IsOptional() @IsEnum(AccountingPaymentMethod) method?: AccountingPaymentMethod;
  @IsOptional() @IsString() @MaxLength(120) reference?: string;
  @IsOptional() @IsString() @MaxLength(200) note?: string;
  @IsOptional() @IsString() cashSessionId?: string;
}

export class OpenCashSessionDto {
  @IsNumber({ maxDecimalPlaces: 3 }) @Min(0) openingFloat!: number;
}

export class CloseCashSessionDto {
  @IsNumber({ maxDecimalPlaces: 3 }) @Min(0) closingCash!: number;
}

export class CreateSalesReturnLineDto {
  @IsString() productId!: string;
  @IsInt() @Min(1) quantity!: number;
}

export class CreateSalesReturnDto {
  @IsString() @Matches(/\S/) @MaxLength(500) reason!: string;
  @IsArray() @ArrayMinSize(1) @ValidateNested({ each: true }) @Type(() => CreateSalesReturnLineDto)
  lines!: CreateSalesReturnLineDto[];
}

export class VerifySalesReturnLineDto {
  @IsString() returnLineId!: string;
  @IsInt() @Min(0) restockedQuantity!: number;
}

export class VerifySalesReturnDto {
  @IsArray() @ArrayMinSize(1) @ValidateNested({ each: true }) @Type(() => VerifySalesReturnLineDto)
  lines!: VerifySalesReturnLineDto[];
}

export class ReviewSalesReturnDto {
  @IsString() @Matches(/\S/) @MaxLength(500) reason!: string;
}
