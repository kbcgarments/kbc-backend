import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class OptionalCustomerAuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest<Request>();

    /* ======================================================
       1. ATTACH DEVICE ID (guest tracking)
    ====================================================== */
    const deviceId = req.headers['x-device-id'];
    if (typeof deviceId === 'string' && deviceId) {
      req.deviceId = deviceId;
    }

    /* ======================================================
       2. OPTIONAL AUTH – only attach customer if valid token
    ====================================================== */
    const auth = req.headers.authorization;

    if (!auth?.startsWith('Bearer ')) {
      req.customer = null;
      return true;
    }

    const token = auth.replace('Bearer ', '');
    const secret = this.configService.get<string>('JWT_SECRET');

    if (!secret) {
      console.error('JWT_SECRET missing – cannot verify token');
      req.customer = null;
      return true;
    }

    try {
      const payload = this.jwt.verify<{ sub?: string }>(token, { secret });

      // 🚨 Prevent Prisma error
      if (!payload?.sub) {
        req.customer = null;
        return true;
      }

      // Fetch customer safely
      const customer = await this.prisma.customer.findUnique({
        where: { id: payload.sub },
        select: {
          id: true,
          email: true,
          name: true,
          deletedAt: true,
        },
      });

      if (!customer || customer.deletedAt) {
        req.customer = null;
      } else {
        req.customer = customer;
      }
    } catch (err) {
      console.error('Error verifying JWT token', err);
      req.customer = null;
    }

    return true;
  }
}
