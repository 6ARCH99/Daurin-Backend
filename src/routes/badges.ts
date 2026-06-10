import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();
router.use(requireAuth);

router.get("/", async (req, res) => {
  const userId = req.auth!.userId;

  const [allBadges, earned] = await Promise.all([
    prisma.badge.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.userBadge.findMany({
      where: { userId },
      include: { badge: true },
      orderBy: { earnedAt: "desc" },
    }),
  ]);

  const earnedById = new Map(
    earned.map((ub) => [
      ub.badgeId,
      {
        id: ub.badge.id,
        code: ub.badge.code,
        name: ub.badge.name,
        description: ub.badge.description,
        icon: ub.badge.icon,
        earnedAt: ub.earnedAt,
      },
    ])
  );

  const earnedList = allBadges
    .filter((b) => earnedById.has(b.id))
    .map((b) => earnedById.get(b.id)!);

  const lockedList = allBadges
    .filter((b) => !earnedById.has(b.id))
    .map((b) => ({
      id: b.id,
      code: b.code,
      name: b.name,
      description: b.description,
      icon: b.icon,
    }));

  const totalCount = allBadges.length;
  const earnedCount = earnedList.length;
  const percent = totalCount ? Math.round((earnedCount / totalCount) * 100) : 0;

  res.json({
    data: {
      progress: { earnedCount, totalCount, percent },
      earned: earnedList,
      locked: lockedList,
    },
  });
});

export default router;

