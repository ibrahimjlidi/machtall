import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, UserRole } from '@prisma/client';
import { hash } from 'bcryptjs';
import { AuthUser } from '../auth/auth.types';
import { writeAudit } from '../common/audit';
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

  async create(input: CreateUserDto, actor: AuthUser) {
    if (input.role === UserRole.VIEWER) {
      throw new BadRequestException('New viewer accounts are disabled; assign an approved staff role instead');
    }
    try {
      return await this.prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: {
            name: input.name.trim(),
            email: input.email.trim().toLowerCase(),
            passwordHash: await hash(input.password, 12),
            role: input.role,
          },
          select: publicUser,
        });
        await writeAudit(tx, actor.sub, 'user.created', 'user', user.id, {
          name: user.name,
          role: user.role,
          active: user.active,
        });
        return user;
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
          select: { id: true, name: true, email: true, role: true, active: true },
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

        const user = await tx.user.update({
          where: { id },
          data: {
            ...(input.name !== undefined && { name: input.name.trim() }),
            ...(input.email !== undefined && { email: input.email.trim().toLowerCase() }),
            ...(input.role !== undefined && { role: input.role }),
            ...(input.active !== undefined && { active: input.active }),
            ...((input.role !== undefined && input.role !== target.role)
              || (input.active !== undefined && input.active !== target.active)
              ? { authVersion: { increment: 1 } }
              : {}),
          },
          select: publicUser,
        });
        const before = { name: target.name, email: target.email, role: target.role, active: target.active };
        const after = { name: user.name, email: user.email, role: user.role, active: user.active };
        if (JSON.stringify(before) !== JSON.stringify(after)) {
          await writeAudit(tx, actor.sub, 'user.updated', 'user', user.id, { before, after });
        }
        return user;
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') throw new ConflictException('A user with this email already exists');
        if (error.code === 'P2034') throw new ConflictException('The user changed concurrently; retry the update');
      }
      throw error;
    }
  }

  async resetPassword(id: string, password: string, actor: AuthUser) {
    return this.prisma.$transaction(async (tx) => {
      const result = await tx.user.updateMany({
        where: { id },
        data: { passwordHash: await hash(password, 12), authVersion: { increment: 1 } },
      });
      if (!result.count) throw new NotFoundException('User not found');
      await writeAudit(tx, actor.sub, 'user.password_reset', 'user', id, {});
      return { success: true };
    });
  }
}
