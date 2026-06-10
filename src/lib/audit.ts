import { prisma } from "./prisma.js";

export async function audit(
  userId: string | undefined,
  action: string,
  resource: string,
  metadata?: Record<string, unknown>
) {
  await prisma.auditLog.create({
    data: {
      userId,
      action,
      resource,
      metadata: metadata ? JSON.stringify(metadata) : null,
    },
  });
}
