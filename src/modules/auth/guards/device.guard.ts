import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Request, Response } from 'express';
import crypto from 'crypto';

@Injectable()
export class DeviceGuard implements CanActivate {
  canActivate(ctx: ExecutionContext): boolean {
    const req = ctx.switchToHttp().getRequest<Request>();
    const res = ctx.switchToHttp().getResponse<Response>();

    // 1) Prefer header (mobile-safe)
    const headerDeviceIdRaw =
      (req.headers['x-device-id'] as string | undefined) ??
      (req.headers['deviceid'] as string | undefined);

    let deviceId = (headerDeviceIdRaw ?? '').trim();

    // 2) Fall back to cookie
    if (!deviceId) {
      const cookieDeviceId = req.cookies?.deviceId as string | undefined;
      deviceId = (cookieDeviceId ?? '').trim();
    }

    // 3) Generate if missing
    if (!deviceId) {
      deviceId = crypto.randomUUID();
    }

    // 4) Always set cookie (best effort)
    res.cookie('deviceId', deviceId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      path: '/',
      maxAge: 365 * 24 * 60 * 60 * 1000,
    });

    req.deviceId = deviceId;
    return true;
  }
}
