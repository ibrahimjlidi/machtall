import { Controller, Get, Module, UseGuards } from '@nestjs/common';
import { MovementType, UserRole } from '@prisma/client';
import { AuthModule } from '../auth/auth.module';
import { JwtAuthGuard } from '../auth/auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { stockByProduct } from '../common/stock';
import { PrismaService } from '../prisma/prisma.service';

@Controller('dashboard')
@UseGuards(JwtAuthGuard, RolesGuard)
class DashboardController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @Roles(UserRole.ADMIN, UserRole.STOREKEEPER, UserRole.SELLER, UserRole.VIEWER)
  async summary() {
    const [products, movements, sales, stock] = await Promise.all([
      this.prisma.product.findMany({
        where: { active: true },
        select: { id: true, minimumStock: true, purchasePrice: true },
      }),
      this.prisma.inventoryMovement.aggregate({
        where: { type: MovementType.LOSS_OUT, effectiveAt: { gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) } },
        _sum: { quantity: true },
      }),
      this.prisma.sale.findMany({
        where: { createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) } },
        include: { lines: { select: { quantity: true, unitPrice: true } } },
      }),
      stockByProduct(this.prisma),
    ]);
    const lowStock = products.filter((product) => (stock.get(product.id) ?? 0) <= product.minimumStock).length;
    const stockValue = products.reduce((sum, product) => sum + (stock.get(product.id) ?? 0) * Number(product.purchasePrice), 0);
    const todaySales = sales.reduce((sum, sale) => sum + sale.lines.reduce((lineSum, line) => lineSum + line.quantity * Number(line.unitPrice), 0), 0);
    return {
      totalProducts: products.length,
      stockValue,
      lowStock,
      lossesThisMonth: movements._sum.quantity ?? 0,
      todaySales,
    };
  }
}

@Module({
  imports: [AuthModule],
  controllers: [DashboardController],
})
export class DashboardModule {}
