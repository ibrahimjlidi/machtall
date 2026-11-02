import { IsInt, IsNumber, IsOptional, IsString, Min, MinLength } from 'class-validator';

export class CreateProductDto {
  @IsOptional() @IsString() sku?: string;
  @IsString() @MinLength(2) nameAr!: string;
  @IsString() @MinLength(2) nameFr!: string;
  @IsOptional() @IsString() scientific?: string;
  @IsString() category!: string;
  @IsString() size!: string;
  @IsOptional() @IsString() unit?: string;
  @IsNumber() @Min(0) purchasePrice!: number;
  @IsNumber() @Min(0) salePrice!: number;
  @IsInt() @Min(0) minimum!: number;
  @IsString() location!: string;
  @IsOptional() @IsString() image?: string;
  @IsOptional() @IsInt() @Min(0) initialQuantity?: number;
}

export class UpdateProductDto {
  @IsOptional() @IsString() @MinLength(2) nameAr?: string;
  @IsOptional() @IsString() @MinLength(2) nameFr?: string;
  @IsOptional() @IsString() scientific?: string;
  @IsOptional() @IsString() category?: string;
  @IsOptional() @IsString() size?: string;
  @IsOptional() @IsString() unit?: string;
  @IsOptional() @IsNumber() @Min(0) purchasePrice?: number;
  @IsOptional() @IsNumber() @Min(0) salePrice?: number;
  @IsOptional() @IsInt() @Min(0) minimum?: number;
  @IsOptional() @IsString() location?: string;
  @IsOptional() @IsString() image?: string;
}
