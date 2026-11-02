import { PaymentStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsEnum, IsInt, IsString, Min, ValidateNested } from 'class-validator';

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
