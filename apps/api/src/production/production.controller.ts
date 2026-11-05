import { Body, Controller, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { AuthenticatedRequest, JwtAuthGuard } from '../auth/auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import {
  CreateBatchDto,
  CreateProductionCareLogDto,
  CreateProductionLossDto,
  CreateProductionTaskDto,
  ReadyProposalDto,
  RejectReadyProposalDto,
  UpdateBatchDto,
  UpdateBatchStageDto,
  UpdateProductionTaskStatusDto,
} from './production.dto';
import { ProductionService } from './production.service';

@Controller('production')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ProductionController {
  constructor(private readonly production: ProductionService) {}

  @Get('batches')
  @Roles(UserRole.ADMIN, UserRole.STOREKEEPER, UserRole.NURSERY_WORKER, UserRole.ACCOUNTANT)
  list(@Req() request: AuthenticatedRequest) { return this.production.list(request.user); }

  @Get('tasks')
  @Roles(UserRole.ADMIN, UserRole.STOREKEEPER, UserRole.NURSERY_WORKER, UserRole.ACCOUNTANT)
  listTasks(@Req() request: AuthenticatedRequest) { return this.production.listTasks(request.user); }

  @Get('workers')
  @Roles(UserRole.ADMIN)
  listWorkers() { return this.production.listWorkers(); }

  @Post('tasks')
  @Roles(UserRole.ADMIN)
  createTask(@Body() input: CreateProductionTaskDto, @Req() request: AuthenticatedRequest) {
    return this.production.createTask(input, request.user);
  }

  @Patch('tasks/:id/status')
  @Roles(UserRole.NURSERY_WORKER)
  updateTaskStatus(
    @Param('id') id: string,
    @Body() input: UpdateProductionTaskStatusDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.production.updateTaskStatus(id, input, request.user);
  }

  @Post('batches')
  @Roles(UserRole.ADMIN, UserRole.NURSERY_WORKER)
  create(@Body() input: CreateBatchDto, @Req() request: AuthenticatedRequest) {
    return this.production.create(input, request.user);
  }

  @Patch('batches/:id')
  @Roles(UserRole.ADMIN, UserRole.NURSERY_WORKER)
  update(@Param('id') id: string, @Body() input: UpdateBatchDto, @Req() request: AuthenticatedRequest) {
    return this.production.update(id, input, request.user);
  }

  @Patch('batches/:id/stage')
  @Roles(UserRole.ADMIN, UserRole.NURSERY_WORKER)
  updateStage(
    @Param('id') id: string,
    @Body() input: UpdateBatchStageDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.production.updateStage(id, input, request.user);
  }

  @Post('batches/:id/care-logs')
  @Roles(UserRole.NURSERY_WORKER)
  createCareLog(
    @Param('id') id: string,
    @Body() input: CreateProductionCareLogDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.production.createCareLog(id, input, request.user);
  }

  @Post('batches/:id/losses')
  @Roles(UserRole.NURSERY_WORKER)
  reportLoss(
    @Param('id') id: string,
    @Body() input: CreateProductionLossDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.production.reportLoss(id, input, request.user);
  }

  @Post('batches/:id/ready-proposal')
  @Roles(UserRole.NURSERY_WORKER)
  proposeReady(
    @Param('id') id: string,
    @Body() input: ReadyProposalDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.production.proposeReady(id, input, request.user);
  }

  @Post('batches/:id/verify-ready')
  @Roles(UserRole.STOREKEEPER)
  verifyReady(@Param('id') id: string, @Req() request: AuthenticatedRequest) {
    return this.production.verifyReady(id, request.user);
  }

  @Post('batches/:id/ready')
  @Roles(UserRole.ADMIN)
  markReady(@Param('id') id: string, @Req() request: AuthenticatedRequest) {
    return this.production.markReady(id, request.user);
  }

  @Post('batches/:id/reject-ready')
  @Roles(UserRole.ADMIN, UserRole.STOREKEEPER)
  rejectReady(
    @Param('id') id: string,
    @Body() input: RejectReadyProposalDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.production.rejectReady(id, input, request.user);
  }
}
