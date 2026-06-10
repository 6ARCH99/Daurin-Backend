import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { levelProgress } from "../lib/levels.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();
router.use(requireAuth);

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

/** GET /api/dashboard — full home dashboard payload */
router.get("/", async (req, res) => {
  const userId = req.auth!.userId;
  const now = new Date();
  const weekAgo = new Date(now);
  weekAgo.setDate(weekAgo.getDate() - 7);

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const [depositsLast7Days, depositsThisWeek, depositsPriorWeek, activeChallenges, activities] =
    await Promise.all([
      prisma.deposit.findMany({
        where: { userId, createdAt: { gte: weekAgo } },
        orderBy: { createdAt: "asc" },
      }),
      prisma.deposit.aggregate({
        where: { userId, createdAt: { gte: weekAgo } },
        _sum: { co2SavedKg: true },
      }),
      prisma.deposit.aggregate({
        where: {
          userId,
          createdAt: {
            gte: new Date(weekAgo.getTime() - 7 * 86400000),
            lt: weekAgo,
          },
        },
        _sum: { co2SavedKg: true },
      }),
      prisma.userChallenge.findMany({
        where: { userId, status: "active" },
        include: { challenge: true },
      }),
      prisma.activity.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
    ]);

  const depositCount = await prisma.deposit.count({ where: { userId } });
  const co2ThisWeek = depositsThisWeek._sum.co2SavedKg ?? 0;
  const co2PriorWeek = depositsPriorWeek._sum.co2SavedKg ?? 0;
  const co2WeeklyDelta = Math.round((co2ThisWeek - co2PriorWeek) * 10) / 10;

  const chart = buildLast7DaysChart(depositsLast7Days, now);
  const level = levelProgress(user.totalPoints);

  res.json({
    data: {
      points: {
        total: user.totalPoints,
        ...level,
      },
      co2: {
        totalSavedKg: user.co2SavedKg,
        weeklyDeltaKg: co2WeeklyDelta,
      },
      deposits: {
        totalCount: depositCount,
        memberSince: user.memberSince,
      },
      depositChartLast7Days: chart,
      activeChallenges: activeChallenges.map((uc) => ({
        id: uc.id,
        challengeId: uc.challengeId,
        title: uc.challenge.title,
        description: uc.challenge.description,
        progress: uc.progress,
        target: uc.challenge.targetValue,
        unit: uc.challenge.targetUnit,
        progressPercent: Math.min(
          100,
          Math.round((uc.progress / uc.challenge.targetValue) * 100)
        ),
        rewardPoints: uc.challenge.rewardPoints,
        endsAt: uc.challenge.endsAt,
        status: uc.status,
      })),
      recentActivities: activities,
    },
  });
});

function buildLast7DaysChart(
  deposits: { createdAt: Date; weightKg: number }[],
  now: Date
) {
  const labels = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];
  const buckets: number[] = Array(7).fill(0);

  for (let i = 6; i >= 0; i--) {
    const day = startOfDay(now);
    day.setDate(day.getDate() - i);
    const key = day.getTime();
    const count = deposits.filter(
      (d) => startOfDay(d.createdAt).getTime() === key
    ).length;
    buckets[6 - i] = count;
  }

  return labels.map((label, i) => ({ label, depositCount: buckets[i] }));
}

export default router;
