import { Body, Controller, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { AuthenticatedRequest, JwtAuthGuard } from '../auth/auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { CreateUserDto, ResetPasswordDto, UpdateUserDto } from './users.dto';
import { UsersService } from './users.service';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get()
  list() { return this.users.list(); }

  @Post()
  create(@Body() input: CreateUserDto, @Req() request: AuthenticatedRequest) {
    return this.users.create(input, request.user);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() input: UpdateUserDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.users.update(id, input, request.user);
  }

  @Post(':id/password')
  resetPassword(@Param('id') id: string, @Body() input: ResetPasswordDto, @Req() request: AuthenticatedRequest) {
    return this.users.resetPassword(id, input.password, request.user);
  }
}
