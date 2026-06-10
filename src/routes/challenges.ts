import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();
router.use(requireAuth);

function progressPercent(progress: number, target: number) {
  if (!target) return 0;
  return Math.min(100, Math.round((progress / target) * 100));
}

router.get("/overview", async (req, res) => {
  const userId = req.auth!.userId;
  const now = new Date();

  const [allBadges, earnedBadges, allChallenges, userChallenges, topUsers] =
    await Promise.all([
      prisma.badge.findMany({ orderBy: { createdAt: "asc" }, take: 6 }),
      prisma.userBadge.findMany({
        where: { userId },
        include: { badge: true },
        orderBy: { earnedAt: "desc" },
      }),
      prisma.challenge.findMany({
        where: { endsAt: { gt: now } },
        orderBy: [{ isFeatured: "desc" }, { endsAt: "asc" }],
      }),
      prisma.userChallenge.findMany({
        where: { userId, status: "active" },
        include: { challenge: true },
      }),
      prisma.user.findMany({
        orderBy: { totalPoints: "desc" },
        take: 5,
        select: { id: true, fullName: true, totalPoints: true },
      }),
    ]);

  const me = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, fullName: true, totalPoints: true },
  });

  if (!me) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const joinCounts = await prisma.userChallenge.groupBy({
    by: ["challengeId"],
    _count: { challengeId: true },
  });
  const joinCountMap = new Map(
    joinCounts.map((x) => [x.challengeId, x._count.challengeId])
  );

  const featured =
    allChallenges.find((c) => c.isFeatured) ?? allChallenges[0] ?? null;
  const featuredUser = featured
    ? userChallenges.find((uc) => uc.challengeId === featured.id) ?? null
    : null;

  const active = userChallenges
    .filter((uc) => !uc.challenge.isFeatured)
    .map((uc) => ({
      id: uc.challenge.id,
      userChallengeId: uc.id,
      title: uc.challenge.title,
      description: uc.challenge.description,
      difficulty: uc.challenge.difficulty,
      durationDays: uc.challenge.durationDays,
      endsAt: uc.challenge.endsAt,
      rewardPoints: uc.challenge.rewardPoints,
      progress: uc.progress,
      target: uc.challenge.targetValue,
      unit: uc.challenge.targetUnit,
      progressPercent: progressPercent(uc.progress, uc.challenge.targetValue),
      joinedCount: joinCountMap.get(uc.challengeId) ?? 0,
      status: uc.status,
    }));

  const userChallengeIds = new Set(userChallenges.map((uc) => uc.challengeId));
  const available = allChallenges
    .filter((c) => !c.isFeatured && !userChallengeIds.has(c.id))
    .map((c) => ({
      id: c.id,
      title: c.title,
      description: c.description,
      difficulty: c.difficulty,
      durationDays: c.durationDays,
      endsAt: c.endsAt,
      rewardPoints: c.rewardPoints,
      joinedCount: joinCountMap.get(c.id) ?? 0,
    }));

  const meRank =
    (await prisma.user.count({ where: { totalPoints: { gt: me.totalPoints } } })) +
    1;

  const leaderboardBase = topUsers.map((u, idx) => ({
    rank: idx + 1,
    userId: u.id,
    name: u.id === me.id ? "Kamu" : u.fullName,
    points: u.totalPoints,
    isUser: u.id === me.id,
  }));

  const meEntry = {
    rank: meRank,
    userId: me.id,
    name: "Kamu",
    points: me.totalPoints,
    isUser: true,
  };

  const leaderboard = leaderboardBase.some((x) => x.userId === me.id)
    ? leaderboardBase
    : leaderboardBase.length < 5
      ? [...leaderboardBase, meEntry]
      : [...leaderboardBase.slice(0, 4), meEntry];

  const earnedSet = new Set(earnedBadges.map((ub) => ub.badge.code));
  const badges = allBadges.map((b) => ({
    id: b.id,
    code: b.code,
    name: b.name,
    icon: b.icon,
    active: earnedSet.has(b.code),
  }));

  res.json({
    data: {
      featuredChallenge: featured
        ? {
            id: featured.id,
            title: featured.title,
            description: featured.description,
            difficulty: featured.difficulty,
            durationDays: featured.durationDays,
            endsAt: featured.endsAt,
            rewardPoints: featured.rewardPoints,
            progress: featuredUser?.progress ?? 0,
            target: featured.targetValue,
            unit: featured.targetUnit,
            progressPercent: progressPercent(
              featuredUser?.progress ?? 0,
              featured.targetValue
            ),
            joinedCount: joinCountMap.get(featured.id) ?? 0,
            joined: Boolean(featuredUser),
          }
        : null,
      activeChallenges: active,
      availableChallenges: available,
      leaderboard,
      badges,
    },
  });
});

router.post("/:id/join", async (req, res) => {
  const userId = req.auth!.userId;
  const id = String(req.params.id);

  const challenge = await prisma.challenge.findUnique({ where: { id } });
  if (!challenge) {
    res.status(404).json({ error: "Challenge not found" });
    return;
  }

  const userChallenge = await prisma.userChallenge.upsert({
    where: { userId_challengeId: { userId, challengeId: id } },
    create: {
      userId,
      challengeId: id,
      progress: 0,
      status: "active",
    },
    update: { status: "active" },
  });

  res.json({ data: { id: userChallenge.id } });
});

router.delete("/:id/cancel", async (req, res) => {
  const userId = req.auth!.userId;
  const id = String(req.params.id);

  const userChallenge = await prisma.userChallenge.findUnique({
    where: { userId_challengeId: { userId, challengeId: id } },
  });

  if (!userChallenge) {
    res.status(404).json({ error: "Challenge not found or not joined" });
    return;
  }

  await prisma.userChallenge.update({
    where: { id: userChallenge.id },
    data: { status: "cancelled" },
  });

  res.json({ data: { success: true } });
});

export default router;
