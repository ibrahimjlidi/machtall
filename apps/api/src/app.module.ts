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
import { UsersModule } from './users/users.module';
import { ReportsModule } from './reports/reports.module';
import { AuditModule } from './audit/audit.module';
import { AccountingModule } from './accounting/accounting.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: (config) => {
        if (!config.DATABASE_URL) throw new Error('DATABASE_URL must be configured');
        if (!config.JWT_ACCESS_SECRET || config.JWT_ACCESS_SECRET.length < 32
          || /replace[-_ ]?with|change[-_ ]?me|placeholder|example/i.test(config.JWT_ACCESS_SECRET)) {
          throw new Error('JWT_ACCESS_SECRET must be unique, not a placeholder, and contain at least 32 characters');
        }
        try {
          const databasePassword = decodeURIComponent(new URL(config.DATABASE_URL).password);
          if (!databasePassword || /replace[-_ ]?with|change[-_ ]?me|placeholder|example/i.test(databasePassword)) {
            throw new Error('DATABASE_URL must use a unique database password, not a placeholder');
          }
        } catch (error) {
          if (error instanceof Error && error.message.startsWith('DATABASE_URL')) throw error;
          throw new Error('DATABASE_URL must be a valid PostgreSQL connection URL');
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
    UsersModule,
    ReportsModule,
    AuditModule,
    AccountingModule,
  ],
})
export class AppModule {}
