import { Body, Controller, Delete, Get, Module, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { AuthModule } from '../auth/auth.module';
import { JwtAuthGuard } from '../auth/auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { PrismaService } from '../prisma/prisma.service';
import { SaveCategoryDto } from './categories.dto';
import { CategoriesService } from './categories.service';

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
class ReferenceController {
  constructor(private readonly prisma: PrismaService, private readonly categoriesService: CategoriesService) {}

  @Get('categories')
  categories() {
    return this.categoriesService.list();
  }

  @Post('categories')
  @Roles(UserRole.ADMIN)
  createCategory(@Body() input: SaveCategoryDto) {
    return this.categoriesService.create(input);
  }

  @Patch('categories/:id')
  @Roles(UserRole.ADMIN)
  updateCategory(@Param('id') id: string, @Body() input: SaveCategoryDto) {
    return this.categoriesService.update(id, input);
  }

  @Delete('categories/:id')
  @Roles(UserRole.ADMIN)
  deleteCategory(@Param('id') id: string) {
    return this.categoriesService.remove(id);
  }

  @Get('suppliers')
  suppliers() {
    return this.prisma.supplier.findMany({ where: { active: true }, orderBy: { name: 'asc' } });
  }
}

@Module({
  imports: [AuthModule],
  controllers: [ReferenceController],
  providers: [CategoriesService],
})
export class ReferenceModule {}
