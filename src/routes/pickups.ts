import { Router } from "express";
import crypto from "crypto";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { requireAuth, requireOperator } from "../middleware/auth.js";
import { awardVerifiedDeposit } from "../lib/points.js";
import { audit } from "../lib/audit.js";
import { notify } from "../lib/notify.js";

const router = Router();
router.use(requireAuth);

router.get("/", async (req, res) => {
  const status = req.query.status as string | undefined;
  const list = await prisma.pickupSchedule.findMany({
    where: {
      userId: req.auth!.userId,
      ...(status ? { status } : { status: { not: "cancelled" } }),
    },
    orderBy: { scheduledAt: "asc" },
  });
  res.json({ data: list });
});

router.post("/", async (req, res) => {
  const parsed = z
    .object({
      address: z.string().min(5),
      scheduledAt: z.string().datetime(),
      estimatedWeightKg: z.number().positive(),
      category: z.string().min(1).optional(),
    })
    .safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const pickup = await prisma.pickupSchedule.create({
    data: {
      userId: req.auth!.userId,
      address: parsed.data.address,
      scheduledAt: new Date(parsed.data.scheduledAt),
      estimatedWeightKg: parsed.data.estimatedWeightKg,
      status: "scheduled",
    },
  });

  const selectedCategory = parsed.data.category || "plastik";
  const verificationToken = crypto.randomBytes(16).toString("hex");
  await prisma.depositTransaction.create({
    data: {
      userId: req.auth!.userId,
      pickupId: pickup.id,
      type: "pickup",
      status: "pending",
      verificationToken,
      categoriesJson: JSON.stringify([
        { category: selectedCategory, weightKg: parsed.data.estimatedWeightKg },
      ]),
      totalWeightKg: parsed.data.estimatedWeightKg,
    },
  });

  await audit(req.auth!.userId, "pickup_create", "pickup", { pickupId: pickup.id });
  res.status(201).json({ data: pickup });
});

router.patch("/:id", async (req, res) => {
  const parsed = z
    .object({
      address: z.string().optional(),
      scheduledAt: z.string().datetime().optional(),
      estimatedWeightKg: z.number().positive().optional(),
    })
    .safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const existing = await prisma.pickupSchedule.findFirst({
    where: { id: req.params.id, userId: req.auth!.userId },
  });
  if (!existing) {
    res.status(404).json({ error: "Schedule not found" });
    return;
  }
  if (existing.status !== "scheduled") {
    res.status(400).json({ error: "Only scheduled pickups can be updated" });
    return;
  }

  const updated = await prisma.pickupSchedule.update({
    where: { id: existing.id },
    data: {
      address: parsed.data.address,
      scheduledAt: parsed.data.scheduledAt
        ? new Date(parsed.data.scheduledAt)
        : undefined,
      estimatedWeightKg: parsed.data.estimatedWeightKg,
    },
  });
  res.json({ data: updated });
});

router.delete("/:id", async (req, res) => {
  const existing = await prisma.pickupSchedule.findFirst({
    where: { id: req.params.id, userId: req.auth!.userId },
  });
  if (!existing) {
    res.status(404).json({ error: "Schedule not found" });
    return;
  }
  await prisma.pickupSchedule.update({
    where: { id: existing.id },
    data: { status: "cancelled" },
  });
  res.json({ data: { success: true } });
});

router.patch("/:id/courier-status", requireOperator, async (req, res) => {
  const parsed = z
    .object({
      status: z.enum(["in_transit", "completed", "scheduled"]),
      courierNote: z.string().optional(),
    })
    .safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const pickup = await prisma.pickupSchedule.update({
    where: { id: req.params.id },
    data: {
      status: parsed.data.status,
      courierNote: parsed.data.courierNote,
    },
  });

  await notify(pickup.userId, "pickup_status", {
    pickupId: pickup.id,
    status: pickup.status,
  });

  res.json({ data: pickup });
});

router.post("/:id/complete", requireOperator, async (req, res) => {
  const parsed = z
    .object({
      actualWeightKg: z.number().positive(),
      categories: z
        .array(z.object({ category: z.string(), weightKg: z.number().positive() }))
        .min(1)
        .optional(),
      operatorId: z.string().optional(),
    })
    .safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const pickup = await prisma.pickupSchedule.findUnique({
    where: { id: req.params.id },
    include: { depositTxn: true },
  });
  if (!pickup?.depositTxn) {
    res.status(404).json({ error: "Pickup not found" });
    return;
  }

  const finalCategories = parsed.data.categories ?? 
    (pickup.depositTxn.categoriesJson ? JSON.parse(pickup.depositTxn.categoriesJson) : []);

  // Update categories to reflect actual weight proportionally if not explicitly provided
  if (!parsed.data.categories && finalCategories.length > 0) {
    const origWeight = pickup.depositTxn.totalWeightKg || 1;
    for (const c of finalCategories) {
      c.weightKg = (c.weightKg / origWeight) * parsed.data.actualWeightKg;
    }
  }

  await prisma.pickupSchedule.update({
    where: { id: pickup.id },
    data: {
      status: "completed",
      actualWeightKg: parsed.data.actualWeightKg,
    },
  });

  const result = await awardVerifiedDeposit(
    pickup.userId,
    pickup.depositTxn.id,
    parsed.data.actualWeightKg,
    finalCategories,
    pickup.address,
    "pickup"
  );

  await prisma.depositTransaction.update({
    where: { id: pickup.depositTxn.id },
    data: { verifiedBy: parsed.data.operatorId ?? "courier" },
  });

  await notify(pickup.userId, "points_earned", { points: result.points });
  res.json({ data: { ...result, status: "completed" } });
});

export default router;
