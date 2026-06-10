import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { impactFromWeightKg } from "../lib/climate.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();
router.use(requireAuth);

/** GET /api/climate-impact — metrics, trend, comparison, ranking */
router.get("/", async (req, res) => {
  const userId = req.auth!.userId;
  const now = new Date();
  const sixMonthsAgo = new Date(now);
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
  sixMonthsAgo.setDate(1);
  sixMonthsAgo.setHours(0, 0, 0, 0);

  const [user, userDeposits, allUsers] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId } }),
    prisma.deposit.findMany({
      where: { userId, createdAt: { gte: sixMonthsAgo } },
      orderBy: { createdAt: "asc" },
    }),
    prisma.user.findMany({
      select: { id: true, totalWeightKg: true, co2SavedKg: true },
    }),
  ]);

  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const impact = impactFromWeightKg(user.totalWeightKg);
  const trend = buildSixMonthTrend(userDeposits, now);
  const community = communityStats(allUsers, userId);

  res.json({
    data: {
      impactMetrics: impact,
      conversionBasisKg: user.totalWeightKg,
      contributionTrend6Months: trend,
      comparison: {
        userKgPerMonth: community.userMonthlyKg,
        communityAvgKgPerMonth: community.avgMonthlyKg,
        unit: "kg",
      },
      communityRank: {
        percentileTop: community.percentileTop,
        label: `Top ${community.percentileTop}%`,
        totalUsers: allUsers.length,
      },
    },
  });
});

function buildSixMonthTrend(
  deposits: { createdAt: Date; weightKg: number }[],
  now: Date
) {
  const monthNames = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "Mei",
    "Jun",
    "Jul",
    "Agu",
    "Sep",
    "Okt",
    "Nov",
    "Des",
  ];
  const buckets: { key: string; label: string; weightKg: number }[] = [];

  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    buckets.push({
      key,
      label: monthNames[d.getMonth()],
      weightKg: 0,
    });
  }

  for (const dep of deposits) {
    const key = `${dep.createdAt.getFullYear()}-${dep.createdAt.getMonth()}`;
    const bucket = buckets.find((b) => b.key === key);
    if (bucket) bucket.weightKg += dep.weightKg;
  }

  const values = buckets.map((b) => Math.round(b.weightKg * 10) / 10);
  const last = values[values.length - 1] ?? 0;
  const prev = values[values.length - 2] ?? 0;
  const changePercent =
    prev === 0 ? 0 : Math.round(((last - prev) / prev) * 100);

  return {
    labels: buckets.map((b) => b.label),
    weightKg: values,
    changePercentFromLastMonth: changePercent,
  };
}

function communityStats(
  users: { id: string; totalWeightKg: number }[],
  userId: string
) {
  const monthlyKg = users.map((u) => u.totalWeightKg / 6);
  const avg =
    monthlyKg.reduce((a, b) => a + b, 0) / (monthlyKg.length || 1);
  const current = users.find((u) => u.id === userId);
  const userMonthly = (current?.totalWeightKg ?? 0) / 6;

  const sorted = [...users].sort(
    (a, b) => b.totalWeightKg - a.totalWeightKg
  );
  const rankIndex = sorted.findIndex((u) => u.id === userId);
  const percentileTop =
    rankIndex < 0
      ? 50
      : Math.max(
          1,
          Math.round(((rankIndex + 1) / sorted.length) * 100)
        );

  return {
    userMonthlyKg: Math.round(userMonthly * 10) / 10,
    avgMonthlyKg: Math.round(avg * 10) / 10,
    percentileTop,
  };
}

export default router;
