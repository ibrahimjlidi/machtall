import { IsDateString, IsInt, IsOptional, IsString, Min, MinLength } from 'class-validator';

export class CreateBatchDto {
  @IsString() @MinLength(2) code!: string;
  @IsString() seedType!: string;
  @IsString() productId!: string;
  @IsDateString() sowingDate!: string;
  @IsInt() @Min(1) quantitySown!: number;
  @IsOptional() @IsInt() @Min(0) quantityLost?: number;
  @IsDateString() expectedReadyDate!: string;
}

export class UpdateBatchDto {
  @IsOptional() @IsString() seedType?: string;
  @IsOptional() @IsDateString() expectedReadyDate?: string;
  @IsOptional() @IsInt() @Min(0) quantityLost?: number;
}
