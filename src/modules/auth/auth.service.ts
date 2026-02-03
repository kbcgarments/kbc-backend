import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Customer } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';

import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { RefreshDto } from './dto/refresh.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

import { hashPassword, verifyPassword } from './utils/hash';
import { signAccessToken, generateRefreshToken } from './utils/tokens';

import { CartService } from '../cart/cart.service';
import { WishlistService } from '../wishlist/wishlist.service';
import { OrdersService } from '../orders/orders.service';
import { EmailService } from '../notifications/email/email.service';
import { randomUUID, randomBytes } from 'crypto';
import { EMAIL_TEMPLATE_MAP } from '../notifications/email/email.templates';
import { EmailEvent } from '../notifications/email/email.types';
import { ChangePasswordDto } from './dto/change-password.dto';
import { parseDeviceInfo } from 'src/common/utils/device-info';
import { getLocationFromIp } from 'src/common/utils/ip-location';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private cart: CartService,
    private wishlist: WishlistService,
    private order: OrdersService,
    private jwt: JwtService,
    private emailService: EmailService,
  ) {}

  /* ================= REGISTER ================= */

  async register(dto: RegisterDto) {
    const existing = await this.prisma.customer.findUnique({
      where: { email: dto.email },
    });

    if (existing) {
      if (existing.deletedAt) {
        throw new BadRequestException(
          'This account has been deactivated. Please contact support.',
        );
      }
      throw new BadRequestException('Email already exists');
    }

    const customer = await this.prisma.customer.create({
      data: {
        email: dto.email,
        password: await hashPassword(dto.password),
        name: dto.name,
        emailVerified: false,
      },
    });

    const token = randomBytes(32).toString('hex');

    await this.prisma.emailVerificationToken.create({
      data: {
        customerId: customer.id,
        token,
        expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24),
      },
    });

    await this.emailService.sendTemplate({
      to: customer.email,
      templateId: EMAIL_TEMPLATE_MAP[EmailEvent.ACCOUNT_CREATED_VERIFY_EMAIL],
      params: {
        firstName: customer.name?.split(' ')[0] ?? 'there',
        verificationLink: `${process.env.APP_URL}/account/verify-email?token=${token}`,
        year: new Date().getFullYear(),
      },
    });

    /* ================= ISSUE TOKENS ================= */

    return this.issueTokens(customer);
  }

  /* ================= VERIFY EMAIL ================= */

  async verifyEmail(token: string) {
    const record = await this.prisma.emailVerificationToken.findUnique({
      where: { token },
      include: { customer: true },
    });

    if (!record) {
      throw new BadRequestException('Invalid verification token');
    }

    if (record.expiresAt < new Date()) {
      throw new BadRequestException('Verification token expired');
    }

    await this.prisma.$transaction([
      this.prisma.customer.update({
        where: { id: record.customerId },
        data: { emailVerified: true },
      }),
      this.prisma.emailVerificationToken.delete({
        where: { id: record.id },
      }),
    ]);

    return { success: true };
  }
  /* ================= LOGIN ================= */

  async login(
    dto: LoginDto,
    deviceId?: string,
    userAgent?: string,
    ip?: string,
  ) {
    const customer = await this.prisma.customer.findUnique({
      where: { email: dto.email },
    });

    if (!customer || !customer.password) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (customer.deletedAt) {
      throw new UnauthorizedException(
        'Your account has been deactivated. Please contact support.',
      );
    }

    const valid = await verifyPassword(dto.password, customer.password);
    if (!valid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    await this.cart.mergeCart(this.prisma, deviceId, customer.id);
    await this.wishlist.mergeWishlist(this.prisma, deviceId, customer.id);
    await this.order.attachOrdersByEmail(
      this.prisma,
      customer.id,
      customer.email,
    );

    await this.prisma.customer.update({
      where: { id: customer.id },
      data: { lastLoginAt: new Date() },
    });

    return this.issueTokens(customer, userAgent, ip);
  }
  /* ================= ME ================= */
  async getMe(customerId: string) {
    return this.prisma.customer.findUnique({
      where: { id: customerId },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        createdAt: true,
        lastLoginAt: true,
        addresses: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });
  }

  /* ================= TOKENS ================= */

  async issueTokens(customer: Customer, ua?: string, ip?: string) {
    const accessToken = signAccessToken(this.jwt, {
      sub: customer.id,
      email: customer.email,
    });

    const refreshToken = generateRefreshToken();

    await this.prisma.customerSession.create({
      data: {
        customerId: customer.id,
        refreshToken,
        userAgent: ua,
        ipAddress: ip,
        expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
      },
    });

    return { accessToken, refreshToken };
  }

  /* ================= REFRESH ================= */

  async refresh(dto: RefreshDto) {
    const session = await this.prisma.customerSession.findUnique({
      where: { refreshToken: dto.refreshToken },
      include: { customer: true },
    });

    if (
      !session ||
      session.revokedAt ||
      session.expiresAt < new Date() ||
      session.customer.deletedAt
    ) {
      throw new UnauthorizedException();
    }

    return this.issueTokens(session.customer);
  }

  /* ================= LOGOUT ================= */

  async logout(refreshToken: string) {
    await this.prisma.customerSession.updateMany({
      where: { refreshToken },
      data: { revokedAt: new Date() },
    });

    return { success: true };
  }

  /* ================= FORGOT PASSWORD ================= */

  async forgotPassword(dto: ForgotPasswordDto) {
    const customer = await this.prisma.customer.findUnique({
      where: { email: dto.email },
    });

    if (!customer) return { success: true };

    const token = randomUUID();

    await this.prisma.customer.update({
      where: { id: customer.id },
      data: {
        resetToken: token,
        resetTokenExp: new Date(Date.now() + 1000 * 60 * 30),
      },
    });

    const resetLink = `${process.env.APP_URL}/account/reset-password?token=${token}`;

    await this.emailService.sendTemplate({
      to: customer.email,
      templateId: EMAIL_TEMPLATE_MAP[EmailEvent.PASSWORD_RESET_REQUESTED],
      params: {
        firstName: customer.name?.split(' ')[0] ?? 'there',
        resetLink,
        expiryHours: 0.5,
        year: new Date().getFullYear(),
      },
    });

    return { success: true };
  }

  /* ================= RESET PASSWORD ================= */

  async resetPassword(dto: ResetPasswordDto, userAgent: string, ip: string) {
    const customer = await this.prisma.customer.findFirst({
      where: {
        resetToken: dto.token,
        resetTokenExp: { gt: new Date() },
      },
    });

    if (!customer) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    await this.prisma.customer.update({
      where: { id: customer.id },
      data: {
        password: await hashPassword(dto.newPassword),
        resetToken: null,
        resetTokenExp: null,
      },
    });

    const now = new Date();
    const { device, browser } = parseDeviceInfo(userAgent);
    const { city, country } = await getLocationFromIp(ip);

    await this.emailService.sendTemplate({
      to: customer.email,
      templateId: EMAIL_TEMPLATE_MAP[EmailEvent.PASSWORD_CHANGED_CONFIRMATION],
      params: {
        firstName: customer.name?.split(' ')[0] ?? 'there',
        changeDate: now.toLocaleDateString(),
        changeTime: now.toLocaleTimeString(),
        device: `${device} (${browser})`,
        location: `${city}, ${country}`,
        ipAddress: ip,
        year: now.getFullYear(),
      },
    });

    return { success: true };
  }

  async changePassword(
    customerId: string,
    dto: ChangePasswordDto,
    userAgent: string,
    ip: string,
  ) {
    const customer = await this.prisma.customer.findUnique({
      where: { id: customerId },
    });

    if (!customer?.password) {
      throw new UnauthorizedException('Invalid account');
    }

    const valid = await verifyPassword(dto.currentPassword, customer.password);
    if (!valid) throw new BadRequestException('Current password incorrect');

    await this.prisma.customer.update({
      where: { id: customer.id },
      data: {
        password: await hashPassword(dto.newPassword),
      },
    });

    // prepare email details
    const now = new Date();
    const { device, browser } = parseDeviceInfo(userAgent);
    const { city, country } = await getLocationFromIp(ip);

    await this.emailService.sendTemplate({
      to: customer.email,
      templateId: EMAIL_TEMPLATE_MAP[EmailEvent.PASSWORD_CHANGED_CONFIRMATION],
      params: {
        firstName: customer.name?.split(' ')[0] ?? 'there',
        changeDate: now.toLocaleDateString(),
        changeTime: now.toLocaleTimeString(),
        device: `${device} (${browser})`,
        location: `${city}, ${country}`,
        ipAddress: ip,
        year: now.getFullYear(),
      },
    });

    return { success: true };
  }
}
