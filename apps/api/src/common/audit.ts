import { Prisma } from '@prisma/client';

export async function writeAudit(
  tx: Prisma.TransactionClient,
  actorId: string,
  action: string,
  entity: string,
  entityId: string,
  details: Prisma.InputJsonValue,
) {
  await tx.auditLog.create({
    data: { actorId, action, entity, entityId, details },
  });
}
