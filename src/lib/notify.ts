import { prisma } from "./prisma.js";

export async function queueNotification(
  userId: string,
  event: string,
  payload: Record<string, unknown>,
  channel: "push" | "email" = "push"
) {
  await prisma.notificationQueue.create({
    data: {
      userId,
      channel,
      event,
      payload: JSON.stringify(payload),
    },
  });
  if (process.env.NODE_ENV !== "production") {
    console.log(`[notify:${channel}] ${event}`, payload);
  }
}

export const notify = queueNotification;
