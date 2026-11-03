import { UserRole } from '@prisma/client';
import { IsBoolean, IsEmail, IsEnum, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateUserDto {
  @IsString() name!: string;
  @IsEmail() email!: string;
  @IsString() @MinLength(12) password!: string;
  @IsEnum(UserRole) role!: UserRole;
}

export class UpdateUserDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @IsEnum(UserRole) role?: UserRole;
  @IsOptional() @IsBoolean() active?: boolean;
}

export class ResetPasswordDto {
  @IsString() @MinLength(12) password!: string;
}
