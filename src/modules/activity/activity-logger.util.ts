import { ActivityType, AdminUser, Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
type PrismaLike = PrismaService | Prisma.TransactionClient;
export async function logActivity(
  prisma: PrismaLike,
  params: {
    actor: AdminUser;
    action: ActivityType;
    entity: string;
    entityId: string;
    message: string;
    metadata?: Record<string, unknown>;
  },
) {
  if (params.actor.role === 'SUPER_ADMIN') return;

  await prisma.activityLog.create({
    data: {
      actorId: params.actor.id,
      actorEmail: params.actor.email,
      actorName: params.actor.name ?? null,
      action: params.action,
      activityType: params.action,
      entity: params.entity,
      entityId: params.entityId,
      message: params.message,
      metadata: params.metadata
        ? (params.metadata as Prisma.InputJsonValue)
        : Prisma.JsonNull,
    },
  });
}
