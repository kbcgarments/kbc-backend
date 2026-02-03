import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { ActivityType } from '@prisma/client';

interface ActivityLogQuery {
  limit?: number;
  offset?: number;
  entity?: string;
  entityId?: string;
  action?: ActivityType;
  actorId?: string;
  fromDate?: string;
  toDate?: string;
}

@Injectable()
export class ActivityService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(params: ActivityLogQuery) {
    const {
      limit = 50,
      offset = 0,
      entity,
      entityId,
      action, // ← Changed from activityType
      actorId,
      fromDate,
      toDate,
    } = params;

    return this.prisma.activityLog.findMany({
      where: {
        ...(entity && { entity }),
        ...(entityId && { entityId }),
        ...(action && { action }), // ← Changed field name
        ...(actorId && { actorId }),

        ...(fromDate || toDate
          ? {
              createdAt: {
                ...(fromDate && { gte: new Date(fromDate) }),
                ...(toDate && { lte: new Date(toDate) }),
              },
            }
          : {}),
      },

      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
      include: {
        actor: {
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
          },
        },
      },
    });
  }
}
