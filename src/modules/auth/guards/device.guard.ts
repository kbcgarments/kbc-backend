import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Request, Response } from 'express';
import crypto from 'crypto';

@Injectable()
export class DeviceGuard implements CanActivate {
  canActivate(ctx: ExecutionContext): boolean {
    const req = ctx.switchToHttp().getRequest<Request>();
    const res = ctx.switchToHttp().getResponse<Response>();

    let deviceId: string = req.cookies?.deviceId as string;

    if (!deviceId) {
      deviceId = crypto.randomUUID();

      res.cookie('deviceId', deviceId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
        path: '/',
        maxAge: 365 * 24 * 60 * 60 * 1000,
      });
    }

    req.deviceId = deviceId;
    return true;
  }
}
