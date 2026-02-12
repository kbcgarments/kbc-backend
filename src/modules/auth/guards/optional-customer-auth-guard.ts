import { CanActivate, ExecutionContext, Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { PrismaService } from 'src/prisma/prisma.service';
import jwksClient from 'jwks-rsa';

type JwtPayload = {
  sub?: string;
  email?: string;
  role?: string;
  iss?: string;
  [key: string]: unknown;
};

type RequestWithCustomer = Request & {
  deviceId?: string;
  customer?: {
    id: string;
    email: string;
    name: string | null;
  } | null;
};

@Injectable()
export class OptionalCustomerAuthGuard implements CanActivate {
  private readonly logger = new Logger(OptionalCustomerAuthGuard.name);

  private readonly supabaseIssuer?: string;
  private readonly jwks?: ReturnType<typeof jwksClient>;

  constructor(
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    const supabaseUrl = this.config.get<string>('SUPABASE_URL')?.replace(/\/$/, '');
    if (supabaseUrl) {
      this.supabaseIssuer = `${supabaseUrl}/auth/v1`;
      this.jwks = jwksClient({
        jwksUri: `${this.supabaseIssuer}/keys`,
        cache: true,
        cacheMaxEntries: 5,
        cacheMaxAge: 60 * 60 * 1000,
        rateLimit: true,
        jwksRequestsPerMinute: 10,
      });
    }
  }

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest<RequestWithCustomer>();

    /* ======================================================
       1) ATTACH DEVICE ID (guest tracking)
    ====================================================== */
    const deviceId = req.headers['x-device-id'];
    if (typeof deviceId === 'string' && deviceId.trim()) {
      req.deviceId = deviceId.trim();
    }

    /* ======================================================
       2) OPTIONAL AUTH
    ====================================================== */
    req.customer = null;

    const auth = req.headers.authorization;
    if (!auth?.startsWith('Bearer ')) return true;

    const token = auth.slice('Bearer '.length).trim();
    if (!token) return true;

    const payload = await this.verifyToken(token);
    if (!payload?.sub) return true;

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
      return true;
    }

    req.customer = { id: customer.id, email: customer.email, name: customer.name, deletedAt: customer.deletedAt };
    return true;
  }

  private async verifyToken(token: string): Promise<JwtPayload | null> {
    // Decode header so we know RS256 vs HS256 + kid
    const decoded = this.jwt.decode(token, { complete: true }) as
      | { header?: { alg?: string; kid?: string }; payload?: unknown }
      | null;

    const alg = decoded?.header?.alg;
    const kid = decoded?.header?.kid;

    try {
      // Most Supabase access tokens are RS256
      if (alg === 'RS256') {
        if (!this.jwks || !this.supabaseIssuer) {
          // Don’t blow up: optional guard
          this.logger.warn('SUPABASE_URL not configured; cannot verify RS256 token.');
          return null;
        }
        if (!kid) return null;

        const signingKey = await this.jwks.getSigningKey(kid);
        const publicKey = signingKey.getPublicKey();

        return await this.jwt.verifyAsync<JwtPayload>(token, {
          publicKey,
          algorithms: ['RS256'],
          issuer: this.supabaseIssuer,
        });
      }

      // If you *intentionally* use HS256 tokens:
      if (alg === 'HS256') {
        const secret =
          this.config.get<string>('SUPABASE_JWT_SECRET') ??
          this.config.get<string>('JWT_SECRET'); // fallback if you used this historically

        if (!secret) return null;

        return await this.jwt.verifyAsync<JwtPayload>(token, {
          secret,
          algorithms: ['HS256'],
        });
      }

      // Unknown alg → ignore (optional)
      return null;
    } catch {
      // invalid signature / expired / wrong issuer → ignore (optional)
      return null;
    }
  }
}