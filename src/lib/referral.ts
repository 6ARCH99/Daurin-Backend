import { prisma } from "./prisma.js";
import { recordLedger } from "./points.js";

export function generateReferralCode(fullName: string) {
  const base = fullName.replace(/[^a-zA-Z]/g, "").slice(0, 6).toUpperCase() || "USER";
  const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `${base}${suffix}`;
}

export async function applyReferralOnRegister(refereeId: string, code?: string) {
  if (!code?.trim()) return null;
  const referrer = await prisma.user.findUnique({
    where: { referralCode: code.trim().toUpperCase() },
  });
  if (!referrer || referrer.id === refereeId) return null;

  const existing = await prisma.referralEvent.findUnique({
    where: { refereeId },
  });
  if (existing) return existing;

  const bonus = 100;
  const event = await prisma.referralEvent.create({
    data: {
      referrerId: referrer.id,
      refereeId,
      bonusPoints: bonus,
    },
  });

  await prisma.user.update({
    where: { id: refereeId },
    data: { referredById: referrer.id },
  });

  await recordLedger(referrer.id, bonus, "referral", "Bonus referral — teman bergabung", event.id);
  await recordLedger(refereeId, bonus, "referral", "Bonus referral — pendaftaran", event.id);

  return event;
}
