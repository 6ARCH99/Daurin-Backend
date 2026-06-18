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

  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [depositsLast7Days, depositsThisWeek, depositsPriorWeek, depositsThisMonthCount, activeChallenges, activities] =
    await Promise.all([
      prisma.depositTransaction.findMany({
        where: { userId, status: "verified", verifiedAt: { gte: weekAgo } },
        orderBy: { verifiedAt: "asc" },
      }),
      prisma.depositTransaction.aggregate({
        where: { userId, status: "verified", verifiedAt: { gte: weekAgo } },
        _sum: { totalWeightKg: true },
      }),
      prisma.depositTransaction.aggregate({
        where: {
          userId,
          status: "verified",
          verifiedAt: {
            gte: new Date(weekAgo.getTime() - 7 * 86400000),
            lt: weekAgo,
          },
        },
        _sum: { totalWeightKg: true },
      }),
      prisma.depositTransaction.count({
        where: { userId, status: "verified", verifiedAt: { gte: startOfMonth } },
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

  const depositCount = await prisma.depositTransaction.count({ where: { userId, status: "verified" } });
  
  // Using totalWeightKg * 1.5 as a mock conversion to co2SavedKg since it's not stored on DepositTransaction
  const co2ThisWeek = (depositsThisWeek._sum.totalWeightKg ?? 0) * 1.5;
  const co2PriorWeek = (depositsPriorWeek._sum.totalWeightKg ?? 0) * 1.5;
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
      stats: {
        totalWeightKg: user.totalWeightKg,
        activeDays: user.activeDays,
        treesSaved: Math.floor(user.totalWeightKg * 0.1),
        waterSavedLiters: Math.floor(user.totalWeightKg * 5.2),
        energySavedKwh: Math.floor(user.totalWeightKg * 0.4),
      },
      deposits: {
        totalCount: depositCount,
        thisMonth: depositsThisMonthCount,
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
  deposits: { verifiedAt: Date | null; totalWeightKg: number }[],
  now: Date
) {
  const dayNames = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];
  const labels: string[] = [];
  const buckets: number[] = Array(7).fill(0);

  for (let i = 6; i >= 0; i--) {
    const day = startOfDay(now);
    day.setDate(day.getDate() - i);
    const key = day.getTime();
    
    // Sum weightKg instead of count for better chart visibility
    const dailyDeposits = deposits.filter(
      (d) => d.verifiedAt && startOfDay(d.verifiedAt).getTime() === key
    );
    const totalWeight = dailyDeposits.reduce((acc, d) => acc + d.totalWeightKg, 0);
    
    labels.push(dayNames[day.getDay()]);
    buckets[6 - i] = totalWeight;
  }

  return labels.map((label, i) => ({ label, depositCount: buckets[i] }));
}

export default router;
