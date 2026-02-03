import {
  Body,
  Controller,
  Get,
  Headers,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';

import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { CustomerAuthGuard } from './guards/customer-auth.guard';
import { Customer } from 'src/common/decorators/customer.decorator';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { ChangePasswordDto } from './dto/change-password.dto';

@ApiTags('Auth (Storefront)')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  /* ================= ME ================= */

  @Get('me')
  @UseGuards(CustomerAuthGuard)
  @ApiOperation({ summary: 'Get current customer' })
  me(@Customer() customer: { id: string }) {
    return this.auth.getMe(customer.id);
  }

  /* ================= REGISTER ================= */

  @Post('register')
  @ApiOperation({ summary: 'Register customer' })
  register(@Body() dto: RegisterDto) {
    return this.auth.register(dto);
  }

  @Post('verify-email')
  @ApiOperation({ summary: 'Verify customer email' })
  verifyEmail(@Body() dto: VerifyEmailDto) {
    return this.auth.verifyEmail(dto.token);
  }

  /* ================= LOGIN ================= */

  @Post('login')
  @ApiOperation({ summary: 'Login customer' })
  login(
    @Body() dto: LoginDto,
    @Headers('user-agent') ua: string | undefined,
    @Req() req: { ip?: string; cookies?: Record<string, any> },
  ) {
    const deviceId = req.cookies?.deviceId as string | undefined;
    const ip = req.ip;

    return this.auth.login(dto, deviceId, ua, ip);
  }

  /* ================= REFRESH ================= */

  @Post('refresh')
  @ApiOperation({ summary: 'Refresh access token' })
  refresh(@Body() dto: RefreshDto) {
    return this.auth.refresh(dto);
  }

  /* ================= LOGOUT ================= */

  @Post('logout')
  @ApiOperation({ summary: 'Logout (revoke refresh token)' })
  logout(@Body('refreshToken') refreshToken: string) {
    return this.auth.logout(refreshToken);
  }

  /* ================= FORGOT PASSWORD ================= */

  @Post('forgot-password')
  @ApiOperation({ summary: 'Request password reset' })
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.auth.forgotPassword(dto);
  }

  /* ================= RESET PASSWORD ================= */

  @Post('reset-password')
  @ApiOperation({ summary: 'Reset password using token' })
  resetPassword(
    @Body() dto: ResetPasswordDto,
    @Headers('user-agent') ua: string,
    @Req() req: { ip?: string },
  ) {
    const ip = req.ip;
    return this.auth.resetPassword(dto, ua, ip ?? 'Unknown IP address');
  }

  /* ================= CHANGE PASSWORD ================= */

  @Post('change-password')
  @UseGuards(CustomerAuthGuard)
  @ApiOperation({ summary: 'Change password (authenticated)' })
  changePassword(
    @Customer() customer: { id: string },
    @Body() dto: ChangePasswordDto,
    @Headers('user-agent') ua: string,
    @Req() req: { ip?: string },
  ) {
    const ip = req.ip;
    return this.auth.changePassword(
      customer.id,
      dto,
      ua,
      ip ?? 'Unknown IP address',
    );
  }
}
