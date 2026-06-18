import { Router } from "express";
import crypto from "crypto";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { requireAuth, requireOperator } from "../middleware/auth.js";
import { depositLimiter } from "../middleware/rateLimit.js";
import { awardVerifiedDeposit } from "../lib/points.js";
import { audit } from "../lib/audit.js";
import { notify } from "../lib/notify.js";

const router = Router();

const categorySchema = z.object({
  category: z.string().min(1),
  weightKg: z.number().positive(),
});

const createSchema = z.object({
  dropPointId: z.string().min(1),
  categories: z.array(categorySchema).min(1),
});

router.post("/", requireAuth, depositLimiter, async (req, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const dp = await prisma.dropPoint.findUnique({
    where: { id: parsed.data.dropPointId },
  });
  if (!dp) {
    res.status(404).json({ error: "Drop point not found" });
    return;
  }

  const totalWeightKg = parsed.data.categories.reduce((s, c) => s + c.weightKg, 0);
  const verificationToken = crypto.randomBytes(16).toString("hex");

  const txn = await prisma.depositTransaction.create({
    data: {
      userId: req.auth!.userId,
      dropPointId: dp.id,
      type: "drop_point",
      status: "pending",
      verificationToken,
      totalWeightKg,
      categoriesJson: JSON.stringify(parsed.data.categories),
    },
  });

  await audit(req.auth!.userId, "deposit_create", "deposit", { txnId: txn.id });

  res.status(201).json({
    data: {
      transactionId: txn.id,
      verificationToken,
      qrPayload: `SUARABUMI:${verificationToken}`,
      status: "pending",
      totalWeightKg,
      dropPoint: { id: dp.id, name: dp.name },
    },
  });
});

router.get("/verify/:token", async (req, res) => {
  const txn = await prisma.depositTransaction.findUnique({
    where: { verificationToken: req.params.token },
    include: { dropPoint: true, user: { select: { fullName: true, email: true } } },
  });
  if (!txn) {
    res.status(404).json({ error: "Transaction not found" });
    return;
  }
  res.json({
    data: {
      id: txn.id,
      status: txn.status,
      totalWeightKg: txn.totalWeightKg,
      categories: JSON.parse(txn.categoriesJson),
      user: txn.user,
      dropPoint: txn.dropPoint,
    },
  });
});

router.post(
  "/:id/verify",
  requireOperator,
  depositLimiter,
  async (req, res) => {
    const parsed = z
      .object({
        categories: z.array(categorySchema).optional(),
        operatorId: z.string().optional(),
      })
      .safeParse(req.body);

    const txn = await prisma.depositTransaction.findUnique({
      where: { id: req.params.id },
      include: { dropPoint: true },
    });
    if (!txn) {
      res.status(404).json({ error: "Transaction not found" });
      return;
    }
    if (txn.status === "verified") {
      res.status(400).json({ error: "Already verified" });
      return;
    }

    const categories =
      parsed.success && parsed.data.categories?.length
        ? parsed.data.categories
        : (JSON.parse(txn.categoriesJson) as { category: string; weightKg: number }[]);

    const totalWeightKg = categories.reduce((s, c) => s + c.weightKg, 0);
    const location = txn.dropPoint?.name ?? "Drop Point";

    const result = await awardVerifiedDeposit(
      txn.userId,
      txn.id,
      totalWeightKg,
      categories,
      location,
      "drop_point"
    );

    await prisma.depositTransaction.update({
      where: { id: txn.id },
      data: { verifiedBy: parsed.data?.operatorId ?? "operator" },
    });

    await notify(txn.userId, "points_earned", {
      points: result.points,
      totalPoints: result.totalPoints,
    });
    await audit(txn.userId, "deposit_verified", "deposit", { txnId: txn.id });

    res.json({ data: { ...result, status: "verified" } });
  }
);

router.get("/history", requireAuth, async (req, res) => {
  const list = await prisma.depositTransaction.findMany({
    where: { userId: req.auth!.userId },
    orderBy: { createdAt: "desc" },
    take: 50,
    include: { dropPoint: true },
  });
  res.json({
    data: list.map((t) => ({
      id: t.id,
      status: t.status,
      type: t.type,
      totalWeightKg: t.totalWeightKg,
      pointsAwarded: t.pointsAwarded,
      dropPoint: t.dropPoint?.name,
      createdAt: t.createdAt,
      verifiedAt: t.verifiedAt,
      categories: t.categoriesJson ? JSON.parse(t.categoriesJson) : [],
    })),
  });
});

export default router;
