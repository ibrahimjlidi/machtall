import {
  CanActivate, ExecutionContext, Injectable, UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { PrismaService } from '../prisma/prisma.service';
import { AuthUser } from './auth.types';

export type AuthenticatedRequest = Request & { user: AuthUser };

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwt: JwtService, private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const bearer = request.headers.authorization?.match(/^Bearer (.+)$/i)?.[1];
    const sessionCookie = request.headers.cookie?.split(';')
      .map((cookie) => cookie.trim())
      .find((cookie) => cookie.startsWith('mashtal_session='))
      ?.slice('mashtal_session='.length);
    const token = bearer ?? (sessionCookie ? decodeURIComponent(sessionCookie) : undefined);
    if (!token) throw new UnauthorizedException('Bearer token required');
    let claims: AuthUser;
    try {
      claims = await this.jwt.verifyAsync<AuthUser>(token);
    } catch {
      throw new UnauthorizedException('Invalid or expired access token');
    }
    const user = await this.prisma.user.findUnique({
      where: { id: claims.sub },
      select: { id: true, email: true, name: true, role: true, active: true, authVersion: true },
    });
    if (!user?.active || user.authVersion !== (claims.authVersion ?? 0)) {
      throw new UnauthorizedException('Session is no longer active');
    }
    request.user = {
      sub: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      authVersion: user.authVersion,
    };
    return true;
  }
}
