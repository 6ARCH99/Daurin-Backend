import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();
router.use(requireAuth);

router.get("/code", async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.auth!.userId },
    select: { referralCode: true },
  });
  res.json({ data: { code: user?.referralCode } });
});

router.get("/stats", async (req, res) => {
  const userId = req.auth!.userId;
  const events = await prisma.referralEvent.findMany({
    where: { referrerId: userId },
    include: { referee: { select: { fullName: true, memberSince: true } } },
  });

  const invited = events.length;
  const bonusTotal = events.reduce((s, e) => s + e.bonusPoints, 0);

  res.json({
    data: {
      code: (
        await prisma.user.findUnique({
          where: { id: userId },
          select: { referralCode: true },
        })
      )?.referralCode,
      invited,
      joined: invited,
      totalBonusPoints: bonusTotal,
      referrals: events.map((e) => ({
        name: e.referee.fullName,
        joinedAt: e.referee.memberSince,
        bonusPoints: e.bonusPoints,
      })),
    },
  });
});

router.post("/validate", async (req, res) => {
  const parsed = z.object({ code: z.string().min(3) }).safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const referrer = await prisma.user.findUnique({
    where: { referralCode: parsed.data.code.trim().toUpperCase() },
    select: { id: true, fullName: true },
  });
  if (!referrer) {
    res.status(404).json({ error: "Invalid referral code" });
    return;
  }
  res.json({
    data: { valid: true, referrerName: referrer.fullName },
  });
});

export default router;
