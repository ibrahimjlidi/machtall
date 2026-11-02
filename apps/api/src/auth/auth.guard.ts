import {
  CanActivate, ExecutionContext, Injectable, UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { AuthUser } from './auth.types';

export type AuthenticatedRequest = Request & { user: AuthUser };

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwt: JwtService) {}

  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const bearer = request.headers.authorization?.match(/^Bearer (.+)$/i)?.[1];
    const sessionCookie = request.headers.cookie?.split(';')
      .map((cookie) => cookie.trim())
      .find((cookie) => cookie.startsWith('mashtal_session='))
      ?.slice('mashtal_session='.length);
    const token = bearer ?? (sessionCookie ? decodeURIComponent(sessionCookie) : undefined);
    if (!token) throw new UnauthorizedException('Bearer token required');
    try {
      request.user = await this.jwt.verifyAsync<AuthUser>(token);
      return true;
    } catch {
      throw new UnauthorizedException('Invalid or expired access token');
    }
  }
}
