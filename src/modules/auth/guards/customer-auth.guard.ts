import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { PrismaService } from 'src/prisma/prisma.service';

interface JwtPayload {
  sub: string;
}

@Injectable()
export class CustomerAuthGuard implements CanActivate {
  constructor(
    private jwt: JwtService,
    private prisma: PrismaService,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest<Request>();
    const auth = req.headers.authorization;

    if (!auth?.startsWith('Bearer ')) {
      throw new UnauthorizedException();
    }

    const token = auth.replace('Bearer ', '');

    try {
      const payload = this.jwt.verify<JwtPayload>(token, {
        secret: process.env.JWT_SECRET,
      });

      const customer = await this.prisma.customer.findUnique({
        where: { id: payload.sub },
        select: { id: true, email: true, name: true, deletedAt: true },
      });
      if (!customer || customer.deletedAt !== null) {
        throw new UnauthorizedException('Account deactivated');
      }

      if (customer) {
        req.customer = customer;
      } else {
        console.log('Customer not found for the given token');
      }
      return true;
    } catch {
      throw new UnauthorizedException();
    }
  }
}
