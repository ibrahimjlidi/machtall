import { Body, Controller, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { AuthenticatedRequest, JwtAuthGuard } from '../auth/auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { CreateBatchDto, UpdateBatchDto } from './production.dto';
import { ProductionService } from './production.service';

@Controller('production/batches')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ProductionController {
  constructor(private readonly production: ProductionService) {}

  @Get()
  list() { return this.production.list(); }

  @Post()
  @Roles(UserRole.ADMIN, UserRole.STOREKEEPER)
  create(@Body() input: CreateBatchDto) { return this.production.create(input); }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.STOREKEEPER)
  update(@Param('id') id: string, @Body() input: UpdateBatchDto) {
    return this.production.update(id, input);
  }

  @Post(':id/ready')
  @Roles(UserRole.ADMIN, UserRole.STOREKEEPER)
  markReady(@Param('id') id: string, @Req() request: AuthenticatedRequest) {
    return this.production.markReady(id, request.user);
  }
}
