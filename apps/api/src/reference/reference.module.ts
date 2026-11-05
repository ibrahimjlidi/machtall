import { Body, Controller, Delete, Get, Module, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { AuthModule } from '../auth/auth.module';
import { AuthenticatedRequest } from '../auth/auth.guard';
import { JwtAuthGuard } from '../auth/auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { SaveCategoryDto } from './categories.dto';
import { CategoriesService } from './categories.service';

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
class ReferenceController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get('categories')
  categories() {
    return this.categoriesService.list();
  }

  @Post('categories')
  @Roles(UserRole.ADMIN)
  createCategory(@Body() input: SaveCategoryDto, @Req() request: AuthenticatedRequest) {
    return this.categoriesService.create(input, request.user);
  }

  @Patch('categories/:id')
  @Roles(UserRole.ADMIN)
  updateCategory(@Param('id') id: string, @Body() input: SaveCategoryDto, @Req() request: AuthenticatedRequest) {
    return this.categoriesService.update(id, input, request.user);
  }

  @Delete('categories/:id')
  @Roles(UserRole.ADMIN)
  deleteCategory(@Param('id') id: string, @Req() request: AuthenticatedRequest) {
    return this.categoriesService.remove(id, request.user);
  }

}

@Module({
  imports: [AuthModule],
  controllers: [ReferenceController],
  providers: [CategoriesService],
})
export class ReferenceModule {}
