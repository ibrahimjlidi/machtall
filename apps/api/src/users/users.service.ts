import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, UserRole } from '@prisma/client';
import { hash } from 'bcryptjs';
import { AuthUser } from '../auth/auth.types';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto, UpdateUserDto } from './users.dto';

const publicUser = {
  id: true,
  name: true,
  email: true,
  role: true,
  active: true,
  createdAt: true,
} satisfies Prisma.UserSelect;

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  list() {
    return this.prisma.user.findMany({ select: publicUser, orderBy: { createdAt: 'asc' } });
  }

  async create(input: CreateUserDto) {
    try {
      return await this.prisma.user.create({
        data: {
          name: input.name.trim(),
          email: input.email.trim().toLowerCase(),
          passwordHash: await hash(input.password, 12),
          role: input.role,
        },
        select: publicUser,
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('A user with this email already exists');
      }
      throw error;
    }
  }

  async update(id: string, input: UpdateUserDto, actor: AuthUser) {
    try {
      return await this.prisma.$transaction(async (tx) => {
        const target = await tx.user.findUnique({
          where: { id },
          select: { id: true, role: true, active: true },
        });
        if (!target) throw new NotFoundException('User not found');
        if (actor.sub === id && input.active === false) {
          throw new BadRequestException('You cannot deactivate your own account');
        }

        const removesActiveAdmin = target.role === UserRole.ADMIN
          && target.active
          && (input.active === false || (input.role !== undefined && input.role !== UserRole.ADMIN));
        if (removesActiveAdmin) {
          const activeAdmins = await tx.user.count({ where: { role: UserRole.ADMIN, active: true } });
          if (activeAdmins <= 1) throw new BadRequestException('At least one active administrator is required');
        }

        return tx.user.update({
          where: { id },
          data: {
            ...(input.name !== undefined && { name: input.name.trim() }),
            ...(input.email !== undefined && { email: input.email.trim().toLowerCase() }),
            ...(input.role !== undefined && { role: input.role }),
            ...(input.active !== undefined && { active: input.active }),
          },
          select: publicUser,
        });
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') throw new ConflictException('A user with this email already exists');
        if (error.code === 'P2034') throw new ConflictException('The user changed concurrently; retry the update');
      }
      throw error;
    }
  }

  async resetPassword(id: string, password: string) {
    const result = await this.prisma.user.updateMany({
      where: { id },
      data: { passwordHash: await hash(password, 12), authVersion: { increment: 1 } },
    });
    if (!result.count) throw new NotFoundException('User not found');
    return { success: true };
  }
}
