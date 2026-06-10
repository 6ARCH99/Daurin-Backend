import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";
import { revokeAllRefreshTokens } from "../lib/tokens.js";
import { audit } from "../lib/audit.js";

const router = Router();
router.use(requireAuth);

router.get("/account-status", async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.auth!.userId },
    select: {
      status: true,
      verified: true,
      memberSince: true,
      email: true,
    },
  });
  res.json({ data: user });
});

router.get("/preferences", async (req, res) => {
  const prefs = await prisma.userPreferences.upsert({
    where: { userId: req.auth!.userId },
    create: { userId: req.auth!.userId },
    update: {},
  });
  res.json({ data: prefs });
});

const prefsSchema = z.object({
  pushPoints: z.boolean().optional(),
  pushPickup: z.boolean().optional(),
  pushChallenge: z.boolean().optional(),
  pushReward: z.boolean().optional(),
  emailNewsletter: z.boolean().optional(),
  emailPromo: z.boolean().optional(),
  language: z.string().optional(),
  defaultDepositMethod: z.enum(["pickup", "drop_point"]).optional(),
  showOnLeaderboard: z.boolean().optional(),
});

router.patch("/preferences", async (req, res) => {
  const parsed = prefsSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const prefs = await prisma.userPreferences.upsert({
    where: { userId: req.auth!.userId },
    create: { userId: req.auth!.userId, ...parsed.data },
    update: parsed.data,
  });
  await audit(req.auth!.userId, "update_preferences", "settings");
  res.json({ data: prefs });
});

router.patch("/password", async (req, res) => {
  const parsed = z
    .object({
      currentPassword: z.string().min(1),
      newPassword: z.string().min(8),
    })
    .safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const user = await prisma.user.findUnique({ where: { id: req.auth!.userId } });
  if (!user?.passwordHash || !(await bcrypt.compare(parsed.data.currentPassword, user.passwordHash))) {
    res.status(401).json({ error: "Current password is incorrect" });
    return;
  }

  const passwordHash = await bcrypt.hash(parsed.data.newPassword, 10);
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash },
  });
  await revokeAllRefreshTokens(user.id);
  await audit(user.id, "change_password", "settings");
  res.json({ data: { success: true } });
});

export default router;
