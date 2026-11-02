import { Controller, Get, Module } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Controller('health')
class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async check() {
    await this.prisma.$queryRaw`SELECT 1`;
    return { status: 'ok', database: 'ok', timestamp: new Date().toISOString() };
  }
}

@Module({ controllers: [HealthController] })
export class HealthModule {}
