import { ProductionCareType, ProductionStage, ProductionTaskStatus, ProductionTaskType } from '@prisma/client';
import {
  IsDateString, IsEnum, IsInt, IsOptional, IsString, MaxLength, Min, MinLength,
} from 'class-validator';

export class CreateBatchDto {
  @IsString() @MinLength(2) code!: string;
  @IsString() seedType!: string;
  @IsString() productId!: string;
  @IsDateString() sowingDate!: string;
  @IsInt() @Min(1) quantitySown!: number;
  @IsDateString() expectedReadyDate!: string;
}

export class UpdateBatchDto {
  @IsOptional() @IsString() seedType?: string;
  @IsOptional() @IsDateString() expectedReadyDate?: string;
}

export class UpdateBatchStageDto {
  @IsEnum(ProductionStage) stage!: ProductionStage;
}

export class ReadyProposalDto {
  @IsInt() @Min(1) quantity!: number;
}

export class RejectReadyProposalDto {
  @IsString() @MinLength(3) @MaxLength(500) reason!: string;
}

export class CreateProductionTaskDto {
  @IsString() @MinLength(2) @MaxLength(160) title!: string;
  @IsEnum(ProductionTaskType) type!: ProductionTaskType;
  @IsString() assignedToId!: string;
  @IsOptional() @IsString() batchId?: string;
  @IsOptional() @IsDateString() dueAt?: string;
}

export class UpdateProductionTaskStatusDto {
  @IsEnum(ProductionTaskStatus) status!: ProductionTaskStatus;
  @IsOptional() @IsString() @MaxLength(500) workerNote?: string;
}

export class CreateProductionCareLogDto {
  @IsEnum(ProductionCareType) type!: ProductionCareType;
  @IsDateString() performedAt!: string;
  @IsOptional() @IsString() @MaxLength(500) note?: string;
}

export class CreateProductionLossDto {
  @IsInt() @Min(1) quantity!: number;
  @IsString() @MinLength(3) @MaxLength(500) reason!: string;
  @IsDateString() occurredAt!: string;
}
