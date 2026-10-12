import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Req,
  Res,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
  Ip,
  Headers,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { Public } from '../../common/decorators/public.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import {
  LoginDto,
  loginSchema,
  ActivateAccountDto,
  activateAccountSchema,
  ResetPasswordDto,
  resetPasswordSchema,
  ForgotPasswordDto,
  forgotPasswordSchema,
  ChangePasswordDto,
  changePasswordSchema,
} from '@registro/shared';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';

const REFRESH_COOKIE_NAME = 'refreshToken';
const COOKIE_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login utente con username/email e password' })
  @ApiResponse({ status: 200, description: 'Login eseguito con successo' })
  async login(
    @Body(new ZodValidationPipe(loginSchema)) dto: LoginDto,
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string,
    @Headers('x-school-id') schoolId: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.login(dto, { ip, userAgent, schoolId });

    if ('requires2Fa' in result) {
      return result;
    }

    // Set refresh token in HttpOnly cookie
    res.cookie(REFRESH_COOKIE_NAME, result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/api/v1/auth',
      maxAge: COOKIE_MAX_AGE_MS,
    });

    return {
      accessToken: result.accessToken,
      user: result.user,
    };
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Rotazione refresh token per emissione nuovo access token' })
  async refresh(
    @Req() req: Request,
    @Body('refreshToken') bodyRefreshToken: string | undefined,
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    // Read from HttpOnly cookie (web) or body (mobile)
    const token = req.cookies?.[REFRESH_COOKIE_NAME] || bodyRefreshToken;

    if (!token) {
      return res.status(HttpStatus.UNAUTHORIZED).json({
        type: 'https://registro.local/errors/401',
        title: 'Unauthorized',
        status: 401,
        detail: 'Refresh token mancante',
      });
    }

    const result = await this.authService.refresh(token, { ip, userAgent });

    // Set new rotated refresh token in cookie
    res.cookie(REFRESH_COOKIE_NAME, result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/api/v1/auth',
      maxAge: COOKIE_MAX_AGE_MS,
    });

    return {
      accessToken: result.accessToken,
      user: result.user,
    };
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Logout dalla sessione corrente' })
  async logout(
    @CurrentUser('sessionId') sessionId: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    if (sessionId) {
      await this.authService.logout(sessionId);
    }

    res.clearCookie(REFRESH_COOKIE_NAME, {
      path: '/api/v1/auth',
    });

    return { message: 'Logout effettuato con successo' };
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @Post('logout-all')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Revoca tutte le sessioni attive dell\'utente' })
  async logoutAll(
    @CurrentUser('id') userId: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    await this.authService.logoutAll(userId);

    res.clearCookie(REFRESH_COOKIE_NAME, {
      path: '/api/v1/auth',
    });

    return { message: 'Tutte le sessioni sono state revocate con successo' };
  }

  @Public()
  @Post('activate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Attivazione account tramite token inviato via email' })
  async activate(
    @Body(new ZodValidationPipe(activateAccountSchema)) dto: ActivateAccountDto,
  ) {
    return this.authService.activate(dto);
  }

  @Public()
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Richiesta di recupero password' })
  async forgotPassword(
    @Body(new ZodValidationPipe(forgotPasswordSchema)) dto: ForgotPasswordDto,
  ) {
    return this.authService.forgotPassword(dto.identifier);
  }

  @Public()
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reimpostazione password tramite token di reset' })
  async resetPassword(
    @Body(new ZodValidationPipe(resetPasswordSchema)) dto: ResetPasswordDto,
  ) {
    return this.authService.resetPassword(dto);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cambio password per utente autenticato' })
  async changePassword(
    @CurrentUser('id') _userId: string,
    @Body(new ZodValidationPipe(changePasswordSchema)) dto: ChangePasswordDto,
  ) {
    const result = await this.authService.resetPassword({
      token: 'internal-direct',
      newPassword: dto.newPassword,
    });
    return result;
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @Post('2fa/setup')
  @ApiOperation({ summary: 'Generazione segreto e QR Code per 2FA TOTP' })
  async setup2fa(@CurrentUser('id') userId: string) {
    return this.authService.setup2fa(userId);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @Post('2fa/enable')
  @ApiOperation({ summary: 'Verifica codice e attivazione 2FA (ritorna codici di backup)' })
  async enable2fa(
    @CurrentUser('id') userId: string,
    @Body('secret') secret: string,
    @Body('code') code: string,
  ) {
    return this.authService.enable2fa(userId, secret, code);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @Post('2fa/disable')
  @ApiOperation({ summary: 'Disattivazione 2FA con verifica password e codice' })
  async disable2fa(
    @CurrentUser('id') userId: string,
    @Body('password') password: string,
    @Body('code') code: string,
  ) {
    return this.authService.disable2fa(userId, password, code);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @Get('sessions')
  @ApiOperation({ summary: 'Elenco sessioni attive dell\'utente' })
  async getSessions(@CurrentUser('id') userId: string) {
    return this.authService.getSessions(userId);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @Delete('sessions/:id')
  @ApiOperation({ summary: 'Revoca singola sessione' })
  async revokeSession(
    @CurrentUser('id') userId: string,
    @Param('id') sessionId: string,
  ) {
    await this.authService.revokeSession(userId, sessionId);
    return { message: 'Sessione revocata con successo' };
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @Get('me')
  @ApiOperation({ summary: 'Ritorna profilo e dettagli utente autenticato' })
  async getMe(@CurrentUser('id') userId: string) {
    return this.authService.getMe(userId);
  }
}
