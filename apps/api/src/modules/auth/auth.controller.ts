import { Body, Controller, Get, Patch, Post, Req, Res, UseGuards } from '@nestjs/common';
import type { Request, Response } from 'express';
import { changePasswordSchema, loginSchema, registerSchema, updateProfileSchema } from '@dalmg/contracts';
import { AuthService } from './auth.service';
import { GuestService } from './guest.service';
import { AuthGuard, Public, CurrentUser, ZodValidationPipe } from '../../common/guards';
import { AuthRateLimitGuard } from '../../common/rate-limit.guard';
import { clearAuthCookies, clientIp, setAuthCookies, splitSession } from '../../common/http';
import { SESSION_COOKIE } from '../../env';
import { parseCookies } from '../../common/crypto';

@Controller('auth')
@UseGuards(AuthRateLimitGuard, AuthGuard)
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly guests: GuestService,
  ) {}

  @Public()
  @Post('guest')
  async guest(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const { tokens, me } = await this.guests.createGuest();
    setAuthCookies(res, tokens.accessToken, tokens.refreshToken);
    return me;
  }

  @Public()
  @Post('register')
  async register(
    @Body(new ZodValidationPipe(registerSchema)) body: ReturnType<typeof registerSchema.parse>,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { tokens, me } = await this.auth.register(body, clientIp(req));
    setAuthCookies(res, tokens.accessToken, tokens.refreshToken);
    return me;
  }

  @Public()
  @Post('login')
  async login(
    @Body(new ZodValidationPipe(loginSchema)) body: ReturnType<typeof loginSchema.parse>,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { tokens, me } = await this.auth.login(body, clientIp(req));
    setAuthCookies(res, tokens.accessToken, tokens.refreshToken);
    return me;
  }

  @Public()
  @Post('refresh')
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const cookies = parseCookies(req.headers.cookie);
    const { refreshToken } = splitSession(cookies[SESSION_COOKIE]);
    const { tokens, me } = await this.auth.refresh(refreshToken);
    setAuthCookies(res, tokens.accessToken, tokens.refreshToken);
    return me;
  }

  @Public()
  @Post('logout')
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const cookies = parseCookies(req.headers.cookie);
    const { refreshToken } = splitSession(cookies[SESSION_COOKIE]);
    await this.auth.logout(refreshToken);
    clearAuthCookies(res);
    return { ok: true };
  }

  @Get('me')
  me(@CurrentUser() user: { id: string }) {
    return this.auth.me(user.id);
  }

  @Patch('me')
  updateProfile(
    @CurrentUser() user: { id: string },
    @Body(new ZodValidationPipe(updateProfileSchema)) body: ReturnType<typeof updateProfileSchema.parse>,
  ) {
    return this.auth.updateProfile(user.id, body);
  }

  @Post('change-password')
  async changePassword(
    @CurrentUser() user: { id: string },
    @Body(new ZodValidationPipe(changePasswordSchema)) body: ReturnType<typeof changePasswordSchema.parse>,
  ) {
    await this.auth.changePassword(user.id, body.currentPassword, body.newPassword);
    return { ok: true };
  }
}
