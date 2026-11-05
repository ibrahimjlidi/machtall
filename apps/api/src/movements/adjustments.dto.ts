import { IsInt, IsString, MaxLength, Min, MinLength } from 'class-validator';

export class CreateStockCountDto {
  @IsString() productId!: string;
  @IsInt() @Min(0) countedQuantity!: number;
  @IsString() @MinLength(3) @MaxLength(500) reason!: string;
  @IsString() @MinLength(1) @MaxLength(120) location!: string;
}

export class ReviewAdjustmentRequestDto {
  @IsString() @MinLength(3) @MaxLength(500) reason!: string;
}
