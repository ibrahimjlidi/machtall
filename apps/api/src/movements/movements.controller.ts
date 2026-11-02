import { Body, Controller, Get, Post, Query, Req, UseGuards } from '@nestjs/common';
import { MovementType, UserRole } from '@prisma/client';
import { AuthenticatedRequest, JwtAuthGuard } from '../auth/auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { CreateMovementDto } from './movements.dto';
import { MovementsService } from './movements.service';

@Controller('movements')
@UseGuards(JwtAuthGuard, RolesGuard)
export class MovementsController {
  constructor(private readonly movements: MovementsService) {}

  @Get()
  list(@Query('type') type?: MovementType) {
    return this.movements.list(type);
  }

  @Post()
  @Roles(UserRole.ADMIN, UserRole.STOREKEEPER)
  create(@Body() input: CreateMovementDto, @Req() request: AuthenticatedRequest) {
    return this.movements.create(input, request.user);
  }
}
