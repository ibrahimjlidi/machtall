import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { HealthModule } from './health/health.module';
import { PrismaModule } from './prisma/prisma.module';
import { ProductsModule } from './products/products.module';
import { MovementsModule } from './movements/movements.module';
import { ProductionModule } from './production/production.module';
import { PurchasingModule } from './purchasing/purchasing.module';
import { SalesModule } from './sales/sales.module';
import { ReferenceModule } from './reference/reference.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: (config) => {
        if (!config.DATABASE_URL) throw new Error('DATABASE_URL must be configured');
        if (!config.JWT_ACCESS_SECRET || config.JWT_ACCESS_SECRET.length < 32) {
          throw new Error('JWT_ACCESS_SECRET must contain at least 32 characters');
        }
        return config;
      },
    }),
    PrismaModule,
    AuthModule,
    HealthModule,
    DashboardModule,
    ProductsModule,
    MovementsModule,
    ProductionModule,
    PurchasingModule,
    SalesModule,
    ReferenceModule,
  ],
})
export class AppModule {}
