/* eslint-disable @typescript-eslint/no-unsafe-assignment */

import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { JwtModule } from '@nestjs/jwt';
import { AdminJwtStrategy } from './strategies/admin-jwt.strategy';

const jwtSecret = process.env.JWT_SECRET ?? '';
const jwtExpiresIn: number | string =
  (process.env.JWT_EXPIRES_IN as string | number) ?? '7d';

@Module({
  imports: [
    JwtModule.register({
      secret: jwtSecret,
      signOptions: {
        expiresIn: jwtExpiresIn as any,
      },
    }),
  ],
  controllers: [AdminController],
  providers: [AdminService, AdminJwtStrategy],
})
export class AdminModule {}
