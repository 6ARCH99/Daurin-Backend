import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();
router.use(requireAuth);

router.get("/", async (req, res) => {
  const userId = req.auth!.userId;
  const limit = Math.min(Number(req.query.limit) || 10, 50);

  const [me, topUsers] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, fullName: true, totalPoints: true, activeDays: true },
    }),
    prisma.user.findMany({
      orderBy: { totalPoints: "desc" },
      take: limit,
      select: { id: true, fullName: true, totalPoints: true, activeDays: true },
    }),
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
    points: u.totalPoints,
    activeDays: u.activeDays,
    isUser: u.id === me.id,
  }));

  const meRow = {
    rank: meRank,
    userId: me.id,
    name: "Kamu",
    points: me.totalPoints,
    activeDays: me.activeDays,
    isUser: true,
  };

  const list = rows.some((r) => r.userId === me.id)
    ? rows
    : rows.length < limit
      ? [...rows, meRow]
      : [...rows.slice(0, limit - 1), meRow];

  res.json({ data: { list } });
});

export default router;

