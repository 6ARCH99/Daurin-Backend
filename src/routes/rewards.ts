import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";
import { redeemLimiter } from "../middleware/rateLimit.js";
import { recordLedger } from "../lib/points.js";
import { audit } from "../lib/audit.js";
import { notify } from "../lib/notify.js";

const router = Router();
router.use(requireAuth);

const POINTS_PER_RP = 10;
const REDEEM_TIERS = [
  { amountRp: 5000, points: 500 },
  { amountRp: 10000, points: 1000 },
  { amountRp: 25000, points: 2500 },
  { amountRp: 50000, points: 5000 },
];

router.get("/balance", async (req, res) => {
  const userId = req.auth!.userId;
  const user = await prisma.user.findUnique({ where: { id: userId } });
  const earned = await prisma.pointLedger.aggregate({
    where: { userId, amount: { gt: 0 } },
    _sum: { amount: true },
  });
  const spent = await prisma.pointLedger.aggregate({
    where: { userId, amount: { lt: 0 } },
    _sum: { amount: true },
  });
  const totalIn = earned._sum.amount ?? 0;
  const totalOut = Math.abs(spent._sum.amount ?? 0);
  const available = user?.totalPoints ?? 0;

  const nextTier = REDEEM_TIERS.find((t) => t.points > available);
  const progress = nextTier
    ? {
        nextAmountRp: nextTier.amountRp,
        pointsNeeded: nextTier.points - available,
        progressPercent: Math.min(100, Math.round((available / nextTier.points) * 100)),
      }
    : null;

  res.json({
    data: {
      available,
      totalEarned: totalIn,
      totalSpent: totalOut,
      pointsPerRp: POINTS_PER_RP,
      nextReward: progress,
    },
  });
});

router.get("/history", async (req, res) => {
  const type = req.query.type as string | undefined;
  const list = await prisma.pointLedger.findMany({
    where: {
      userId: req.auth!.userId,
      ...(type ? { type } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  res.json({ data: list });
});

router.get("/ewallet", async (req, res) => {
  const wallet = await prisma.eWallet.findUnique({
    where: { userId: req.auth!.userId },
  });
  res.json({ data: wallet });
});

router.put("/ewallet", async (req, res) => {
  const parsed = z
    .object({
      platform: z.enum(["gopay", "ovo", "dana", "shopeepay"]),
      phone: z.string().min(8),
    })
    .safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const wallet = await prisma.eWallet.upsert({
    where: { userId: req.auth!.userId },
    create: {
      userId: req.auth!.userId,
      platform: parsed.data.platform,
      phone: parsed.data.phone,
      verified: true,
    },
    update: {
      platform: parsed.data.platform,
      phone: parsed.data.phone,
      verified: true,
    },
  });
  res.json({ data: wallet });
});

router.post("/redeem", redeemLimiter, async (req, res) => {
  const parsed = z
    .object({
      platform: z.enum(["gopay", "ovo", "dana", "shopeepay"]),
      amountRp: z.number().int().positive(),
    })
    .safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const tier = REDEEM_TIERS.find((t) => t.amountRp === parsed.data.amountRp);
  if (!tier) {
    res.status(400).json({ error: "Invalid redemption amount" });
    return;
  }

  const user = await prisma.user.findUnique({ where: { id: req.auth!.userId } });
  if (!user || user.totalPoints < tier.points) {
    res.status(400).json({ error: "Insufficient points" });
    return;
  }

  const wallet = await prisma.eWallet.findUnique({
    where: { userId: req.auth!.userId },
  });
  if (!wallet || wallet.platform !== parsed.data.platform || !wallet.verified) {
    res.status(400).json({
      error: "Verify e-wallet number before redemption",
    });
    return;
  }

  const redemption = await prisma.pointRedemption.create({
    data: {
      userId: req.auth!.userId,
      platform: parsed.data.platform,
      amountRp: parsed.data.amountRp,
      points: tier.points,
      status: "processing",
      externalRef: `PENDING_${Date.now()}`,
    },
  });

  await recordLedger(
    req.auth!.userId,
    -tier.points,
    "redemption",
    `Tukar ke ${parsed.data.platform}`,
    redemption.id
  );

  await prisma.activity.create({
    data: {
      userId: req.auth!.userId,
      type: "redemption",
      title: "Tukar Poin",
      description: `Ke ${parsed.data.platform}`,
      pointsDelta: -tier.points,
    },
  });

  await audit(req.auth!.userId, "redeem_start", "reward", { redemptionId: redemption.id });

  setTimeout(async () => {
    const fail = Math.random() < 0.05;
    if (fail) {
      await prisma.pointRedemption.update({
        where: { id: redemption.id },
        data: { status: "failed", failReason: "Provider timeout" },
      });
      await recordLedger(
        req.auth!.userId,
        tier.points,
        "redemption_rollback",
        "Rollback — pencairan gagal",
        redemption.id
      );
      await notify(req.auth!.userId, "redemption_failed", { redemptionId: redemption.id });
    } else {
      await prisma.pointRedemption.update({
        where: { id: redemption.id },
        data: { status: "completed", completedAt: new Date() },
      });
      await notify(req.auth!.userId, "redemption_success", { redemptionId: redemption.id });
    }
  }, 2000);

  res.status(201).json({
    data: {
      redemptionId: redemption.id,
      status: "processing",
      pointsDeducted: tier.points,
      amountRp: parsed.data.amountRp,
    },
  });
});

export default router;
