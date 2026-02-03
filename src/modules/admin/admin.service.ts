/* eslint-disable @typescript-eslint/no-unused-vars */
import {
  Injectable,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AdminLoginDto } from './dto/admin-login.dto';
import { AdminCreateDto } from './dto/admin-create.dto';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { AdminRole, AdminUser, ActivityType } from '@prisma/client';
import { AdminJwtPayload } from './types/admin-jwt-payload';
import { logActivity } from '../activity/activity-logger.util';

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  /* ======================================================
   * HELPERS
   * ====================================================== */

  private actorLabel(admin: AdminUser) {
    return admin.name ?? admin.email;
  }

  /* ======================================================
   * LOGIN
   * ====================================================== */

  async login(
    dto: AdminLoginDto,
  ): Promise<{ accessToken: string; admin: AdminUser }> {
    const admin = await this.prisma.adminUser.findUnique({
      where: { email: dto.email },
    });

    if (!admin) {
      throw new ForbiddenException('Invalid email or password');
    }

    const match = await bcrypt.compare(dto.password, admin.password);
    if (!match) {
      throw new ForbiddenException('Invalid email or password');
    }

    const payload: AdminJwtPayload = {
      id: admin.id,
      email: admin.email,
      role: admin.role,
    };

    const token = this.jwt.sign(payload);

    await logActivity(this.prisma, {
      actor: admin,
      action: ActivityType.ADMIN_LOGGED_IN,
      entity: 'AdminUser',
      entityId: admin.id,
      message: `${this.actorLabel(admin)} logged into the admin dashboard.`,
    });

    return { accessToken: token, admin };
  }

  /* ======================================================
   * CREATE ADMIN
   * ====================================================== */

  async createAdmin(
    dto: AdminCreateDto,
    requester: AdminUser,
  ): Promise<AdminUser> {
    // Only SUPER_ADMIN and ADMIN can create new admins
    if (
      requester.role !== AdminRole.SUPER_ADMIN &&
      requester.role !== AdminRole.ADMIN
    ) {
      throw new ForbiddenException(
        'Only SUPER_ADMIN or ADMIN can create new admin accounts.',
      );
    }

    // Only SUPER_ADMIN can create SUPER_ADMIN or ADMIN roles
    if (dto.role === AdminRole.SUPER_ADMIN || dto.role === AdminRole.ADMIN) {
      if (requester.role !== AdminRole.SUPER_ADMIN) {
        throw new ForbiddenException(
          'Only SUPER_ADMIN can create SUPER_ADMIN or ADMIN accounts.',
        );
      }
    }

    // Check if email already exists
    const existing = await this.prisma.adminUser.findUnique({
      where: { email: dto.email },
    });

    if (existing) {
      throw new ConflictException('An admin with this email already exists.');
    }

    // Hash password
    const hash = await bcrypt.hash(dto.password, 10);

    // Create admin
    const created = await this.prisma.adminUser.create({
      data: {
        email: dto.email,
        password: hash,
        name: dto.name,
        role: dto.role,
      },
    });

    // Log activity
    await logActivity(this.prisma, {
      actor: requester,
      action: ActivityType.ADMIN_CREATED,
      entity: 'AdminUser',
      entityId: created.id,
      message: `${this.actorLabel(requester)} created a new admin account for ${created.email} with role ${created.role}.`,
    });

    // Remove password from response
    const { password, ...adminWithoutPassword } = created;

    return adminWithoutPassword as AdminUser;
  }
}
