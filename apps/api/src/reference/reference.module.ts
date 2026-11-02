import { Controller, Get, Module, UseGuards } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { JwtAuthGuard } from '../auth/auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { PrismaService } from '../prisma/prisma.service';

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
class ReferenceController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('categories')
  categories() {
    return this.prisma.category.findMany({ orderBy: { nameAr: 'asc' } });
  }

  @Get('suppliers')
  suppliers() {
    return this.prisma.supplier.findMany({ where: { active: true }, orderBy: { name: 'asc' } });
  }
}

@Module({
  imports: [AuthModule],
  controllers: [ReferenceController],
})
export class ReferenceModule {}
