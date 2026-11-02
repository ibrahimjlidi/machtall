import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { compare } from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './auth.dto';

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService, private readonly jwt: JwtService) {}

  async login(input: LoginDto) {
    const user = await this.prisma.user.findUnique({ where: { email: input.email.toLowerCase() } });
    if (!user || !user.active || !(await compare(input.password, user.passwordHash))) {
      throw new UnauthorizedException('Invalid email or password');
    }
    const accessToken = await this.jwt.signAsync({
      sub: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    });
    return {
      accessToken,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    };
  }

  async me(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: { id: true, name: true, email: true, role: true, active: true },
    });
    if (!user?.active) throw new UnauthorizedException('User is inactive');
    return user;
  }
}
