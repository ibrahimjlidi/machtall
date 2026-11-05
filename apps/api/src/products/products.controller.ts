import { Body, Controller, Delete, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { AuthenticatedRequest, JwtAuthGuard } from '../auth/auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { CreateProductDto, UpdateProductDto } from './products.dto';
import { ProductsService } from './products.service';

@Controller('products')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ProductsController {
  constructor(private readonly products: ProductsService) {}

  @Get()
  list(@Req() request: AuthenticatedRequest) { return this.products.list(request.user.role); }

  @Post()
  @Roles(UserRole.ADMIN)
  create(@Body() input: CreateProductDto, @Req() request: AuthenticatedRequest) {
    return this.products.create(input, request.user);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN)
  update(@Param('id') id: string, @Body() input: UpdateProductDto, @Req() request: AuthenticatedRequest) {
    return this.products.update(id, input, request.user);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  archive(@Param('id') id: string, @Req() request: AuthenticatedRequest) {
    return this.products.archive(id, request.user);
  }
}
