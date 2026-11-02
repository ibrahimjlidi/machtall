import { MovementType } from '@prisma/client';
import { IsDateString, IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class CreateMovementDto {
  @IsString() productId!: string;
  @IsEnum(MovementType) type!: MovementType;
  @IsInt() @Min(1) quantity!: number;
  @IsOptional() @IsString() reason?: string;
  @IsOptional() @IsString() reference?: string;
  @IsOptional() @IsString() fromLocation?: string;
  @IsOptional() @IsString() toLocation?: string;
  @IsOptional() @IsDateString() effectiveAt?: string;
}
