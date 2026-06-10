import { prisma } from "./prisma.js";
import { co2FromWeightKg, pointsFromDeposit } from "./climate.js";

export const CATEGORY_RATES: Record<string, number> = {
  plastik: 55,
  kertas: 45,
  logam: 60,
  kaca: 40,
  elektronik: 70,
  organik: 30,
};

export function calcCategoryPoints(category: string, weightKg: number) {
  const rate = CATEGORY_RATES[category.toLowerCase()] ?? 50;
  return Math.round(weightKg * rate);
}

export async function recordLedger(
  userId: string,
  amount: number,
  type: string,
  description: string,
  referenceId?: string
) {
  const user = await prisma.user.update({
    where: { id: userId },
    data: { totalPoints: { increment: amount } },
  });
  await prisma.pointLedger.create({
    data: {
      userId,
      amount,
      balanceAfter: user.totalPoints,
      type,
      description,
      referenceId,
    },
  });
  return user.totalPoints;
}

export async function awardVerifiedDeposit(
  userId: string,
  txnId: string,
  totalWeightKg: number,
  categories: { category: string; weightKg: number }[],
  location: string,
  type: "drop_point" | "pickup"
) {
  const points = categories.reduce(
    (sum, c) => sum + calcCategoryPoints(c.category, c.weightKg),
    0
  );
  const co2 = co2FromWeightKg(totalWeightKg);

  await prisma.depositTransaction.update({
    where: { id: txnId },
    data: {
      status: "verified",
      totalWeightKg,
      co2SavedKg: co2,
      pointsAwarded: points,
      categoriesJson: JSON.stringify(categories),
      verifiedAt: new Date(),
    },
  });

  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      totalWeightKg: { increment: totalWeightKg },
      co2SavedKg: { increment: co2 },
      activeDays: { increment: 1 },
    },
  });

  await recordLedger(userId, points, "deposit", `Setor ${totalWeightKg} kg`, txnId);

  await prisma.deposit.create({
    data: {
      userId,
      weightKg: totalWeightKg,
      co2SavedKg: co2,
      points,
      location,
      type,
    },
  });

  await prisma.activity.create({
    data: {
      userId,
      type: "deposit",
      title: "Setor Sampah",
      description: `${totalWeightKg} kg — ${location}`,
      pointsDelta: points,
      metadata: JSON.stringify({ transactionId: txnId }),
    },
  });

  const activeChallenges = await prisma.userChallenge.findMany({
    where: { userId, status: "active" },
    include: { challenge: true },
  });
  for (const uc of activeChallenges) {
    if (uc.challenge.targetUnit === "kg") {
      const progress = uc.progress + totalWeightKg;
      const done = progress >= uc.challenge.targetValue;
      await prisma.userChallenge.update({
        where: { id: uc.id },
        data: {
          progress,
          status: done ? "completed" : "active",
        },
      });
      if (done) {
        await recordLedger(
          userId,
          uc.challenge.rewardPoints,
          "challenge",
          `Challenge: ${uc.challenge.title}`,
          uc.challengeId
        );
      }
    }
  }

  const depositCount = await prisma.deposit.count({ where: { userId } });
  if (depositCount === 1) {
    const badge = await prisma.badge.findUnique({ where: { code: "pemula" } });
    if (badge) {
      await prisma.userBadge.upsert({
        where: { userId_badgeId: { userId, badgeId: badge.id } },
        create: { userId, badgeId: badge.id },
        update: {},
      });
    }
  }

  const updated = await prisma.user.findUnique({ where: { id: userId } });
  return { points, co2, totalPoints: updated?.totalPoints ?? 0 };
}
