import { Body, Controller, Get, Post, Req, Res, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Response } from 'express';
import { AuthenticatedRequest, JwtAuthGuard } from './auth.guard';
import { AuthService } from './auth.service';
import { LoginDto } from './auth.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService, private readonly config: ConfigService) {}

  @Post('login')
  async login(@Body() input: LoginDto, @Res({ passthrough: true }) response: Response) {
    const session = await this.auth.login(input);
    const secure = this.config.get('COOKIE_SECURE') === 'true' ? '; Secure' : '';
    response.setHeader('Set-Cookie', `mashtal_session=${encodeURIComponent(session.accessToken)}; HttpOnly; SameSite=Strict; Path=/api; Max-Age=28800${secure}`);
    return { user: session.user };
  }

  @Post('logout')
  logout(@Res({ passthrough: true }) response: Response) {
    const secure = this.config.get('COOKIE_SECURE') === 'true' ? '; Secure' : '';
    response.setHeader('Set-Cookie', `mashtal_session=; HttpOnly; SameSite=Strict; Path=/api; Max-Age=0${secure}`);
    return { success: true };
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@Req() request: AuthenticatedRequest) {
    return this.auth.me(request.user.sub);
  }
}
