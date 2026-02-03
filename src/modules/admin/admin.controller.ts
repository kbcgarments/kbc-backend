/* eslint-disable @typescript-eslint/no-unsafe-argument */
import { Controller, Post, Body, UseGuards, Req } from '@nestjs/common';
import { AdminService } from './admin.service';
import { AdminLoginDto } from './dto/admin-login.dto';
import { AdminCreateDto } from './dto/admin-create.dto';
import { AdminAuthGuard } from './guards/admin-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { AdminOnly } from './decorators/roles.decorator';
import type { Request } from 'express';
import { AdminJwtPayload } from './types/admin-jwt-payload';

interface AdminRequest extends Request {
  user: AdminJwtPayload;
}

@Controller('admin')
export class AdminController {
  constructor(private readonly service: AdminService) {}

  @Post('login')
  login(@Body() dto: AdminLoginDto) {
    return this.service.login(dto);
  }

  @Post('create')
  @UseGuards(AdminAuthGuard, RolesGuard)
  @AdminOnly()
  create(@Body() dto: AdminCreateDto, @Req() req: AdminRequest) {
    return this.service.createAdmin(dto, {
      id: req.user.id,
      role: req.user.role,
    } as any);
  }
}
