import { Controller, Get, Module, Req, UseGuards } from '@nestjs/common';
import { MovementType, SaleApprovalStatus, SalesReturnStatus, UserRole } from '@prisma/client';
import { AuthModule } from '../auth/auth.module';
import { AuthenticatedRequest, JwtAuthGuard } from '../auth/auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { stockByProduct } from '../common/stock';
import { PrismaService } from '../prisma/prisma.service';

@Controller('dashboard')
@UseGuards(JwtAuthGuard, RolesGuard)
class DashboardController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @Roles(
    UserRole.ADMIN,
    UserRole.STOREKEEPER,
    UserRole.SELLER,
    UserRole.PURCHASING,
    UserRole.NURSERY_WORKER,
    UserRole.ACCOUNTANT,
    UserRole.VIEWER,
  )
  async summary(@Req() request: AuthenticatedRequest) {
    const role = request.user.role;
    const seesLosses = new Set<UserRole>([UserRole.ADMIN, UserRole.STOREKEEPER]).has(role);
    const seesSales = new Set<UserRole>([UserRole.ADMIN, UserRole.SELLER, UserRole.ACCOUNTANT]).has(role);
    const seesStockValue = new Set<UserRole>([UserRole.ADMIN, UserRole.ACCOUNTANT]).has(role);
    const [products, movements, stock] = await Promise.all([
      this.prisma.product.findMany({
        where: { active: true },
        select: { id: true, minimumStock: true, purchasePrice: true },
      }),
      seesLosses ? this.prisma.inventoryMovement.aggregate({
        where: { type: MovementType.LOSS_OUT, effectiveAt: { gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) } },
        _sum: { quantity: true },
      }) : Promise.resolve({ _sum: { quantity: null } }),
      stockByProduct(this.prisma),
    ]);
    const sales = seesSales ? await this.prisma.sale.findMany({
        where: {
          createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
          approvalStatus: SaleApprovalStatus.APPROVED,
          ...(role === UserRole.SELLER && { createdById: request.user.sub }),
        },
        include: {
          lines: { select: { id: true, quantity: true, unitPrice: true } },
          returns: {
            where: { status: { in: [SalesReturnStatus.APPROVED, SalesReturnStatus.COMPLETED] } },
            include: { lines: { include: { saleLine: { select: { id: true, unitPrice: true } } } } },
          },
        },
      }) : [];
    const lowStock = products.filter((product) => (stock.get(product.id) ?? 0) <= product.minimumStock).length;
    const stockValue = seesStockValue
      ? products.reduce((sum, product) => sum + (stock.get(product.id) ?? 0) * Number(product.purchasePrice), 0)
      : 0;
    const todaySales = sales.reduce((sum, sale) => {
      const gross = sale.lines.reduce((lineSum, line) => lineSum + line.quantity * Number(line.unitPrice), 0);
      const returned = sale.returns.reduce((lineSum, item) => lineSum + item.lines.reduce(
        (returnSum, line) => returnSum + line.quantity * Number(line.saleLine.unitPrice),
        0,
      ), 0);
      return sum + Math.max(0, gross - returned);
    }, 0);
    return {
      role,
      totalProducts: products.length,
      stockValue,
      lowStock: new Set<UserRole>([
        UserRole.ADMIN,
        UserRole.STOREKEEPER,
        UserRole.SELLER,
        UserRole.PURCHASING,
        UserRole.VIEWER,
      ]).has(role) ? lowStock : 0,
      lossesThisMonth: seesLosses ? movements._sum.quantity ?? 0 : 0,
      todaySales,
    };
  }
}

@Module({
  imports: [AuthModule],
  controllers: [DashboardController],
})
export class DashboardModule {}
