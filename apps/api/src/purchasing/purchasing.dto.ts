import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsInt, IsString, Min, ValidateNested } from 'class-validator';

export class PurchaseOrderLineDto {
  @IsString() productId!: string;
  @IsInt() @Min(1) quantity!: number;
}

export class CreatePurchaseOrderDto {
  @IsString() supplierId!: string;
  @IsArray() @ArrayMinSize(1) @ValidateNested({ each: true }) @Type(() => PurchaseOrderLineDto)
  lines!: PurchaseOrderLineDto[];
}
