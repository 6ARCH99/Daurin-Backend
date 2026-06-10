import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";
import { seedLeaderboard } from "../../prisma/seed-leaderboard.js";

const router = Router();
router.use(requireAuth);

router.get("/", async (req, res) => {
  const userId = req.auth!.userId;
  const limit = Math.min(Number(req.query.limit) || 20, 50);
  const wilayah = String(req.query.wilayah || "kota"); // rt, kota, provinsi, negara
  const periode = String(req.query.periode || "minggu"); // hari, minggu, bulan, tahun

  // Check if leaderboard data exists, if not seed it
  const userCount = await prisma.user.count();
  if (userCount <= 1) {
    console.log("🔄 Leaderboard empty, auto-seeding leaderboard data...");
    await seedLeaderboard();
  }

  // Calculate date range based on periode
  const now = new Date();
  let startDate = new Date();
  switch (periode) {
    case "hari":
      startDate.setDate(now.getDate() - 1);
      break;
    case "minggu":
      startDate.setDate(now.getDate() - 7);
      break;
    case "bulan":
      startDate.setMonth(now.getMonth() - 1);
      break;
    case "tahun":
      startDate.setFullYear(now.getFullYear() - 1);
      break;
  }

  // Get deposits within date range for ranking
  const depositsInRange = await prisma.deposit.findMany({
    where: {
      createdAt: { gte: startDate, lte: now },
    },
    select: {
      userId: true,
      weightKg: true,
      points: true,
    },
  });

  // Aggregate data per user
  const userStats = new Map();
  for (const d of depositsInRange) {
    const existing = userStats.get(d.userId) || { weight: 0, points: 0, deposits: 0 };
    existing.weight += d.weightKg;
    existing.points += d.points;
    existing.deposits += 1;
    userStats.set(d.userId, existing);
  }

  // Get user details
  const userIds = Array.from(userStats.keys());
  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, fullName: true, totalPoints: true, activeDays: true },
  });

  // Build ranked list
  let rankedUsers = users.map((u) => ({
    ...u,
    weight: userStats.get(u.id)?.weight || 0,
    deposits: userStats.get(u.id)?.deposits || 0,
    periodPoints: userStats.get(u.id)?.points || 0,
  }));

  // Sort by period points
  rankedUsers.sort((a, b) => b.periodPoints - a.periodPoints);

  const [me, topUsers] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, fullName: true, totalPoints: true, activeDays: true },
    }),
    Promise.resolve(rankedUsers.slice(0, limit)),
  ]);

  if (!me) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const meRank =
    (await prisma.user.count({ where: { totalPoints: { gt: me.totalPoints } } })) +
    1;

  const rows = topUsers.map((u, idx) => ({
    rank: idx + 1,
    userId: u.id,
    name: u.id === me.id ? "Kamu" : u.fullName,
    points: u.periodPoints || 0,
    weight: u.weight || 0,
    deposits: u.deposits || 0,
    activeDays: u.activeDays,
    isUser: u.id === me.id,
  }));

  const meRow = {
    rank: meRank,
    userId: me.id,
    name: "Kamu",
    points: 0,
    weight: 0,
    deposits: 0,
    activeDays: me.activeDays,
    isUser: true,
  };

  const list = rows.some((r) => r.userId === me.id)
    ? rows
    : rows.length < limit
      ? [...rows, meRow]
      : [...rows.slice(0, limit - 1), meRow];

  res.json({ data: { list, wilayah, periode } });
});

export default router;