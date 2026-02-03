import {
  UseGuards,
  Controller,
  Get,
  Query,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AdminAuthGuard } from '../admin/guards/admin-auth.guard';
import { RolesGuard } from '../admin/guards/roles.guard';
import { ActivityService } from './activity.service';
import { ActivityLogQueryDto } from './activity-log-query.dto';

@ApiTags('Activity Logs')
@ApiBearerAuth()
@UseGuards(AdminAuthGuard, RolesGuard)
@Controller('activity')
export class ActivityController {
  constructor(private readonly service: ActivityService) {}

  @Get()
  @ApiOperation({ summary: 'Get activity logs' })
  @UsePipes(new ValidationPipe({ transform: true }))
  findAll(@Query() query: ActivityLogQueryDto) {
    return this.service.findAll(query);
  }
}
