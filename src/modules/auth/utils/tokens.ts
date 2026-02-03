import { JwtService } from '@nestjs/jwt';
import { randomUUID } from 'crypto';

export function signAccessToken(
  jwt: JwtService,
  payload: { sub: string; email: string },
) {
  return jwt.sign(payload, {
    expiresIn: '7d',
  });
}

export function generateRefreshToken(): string {
  return randomUUID();
}
