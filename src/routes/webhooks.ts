import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { recordLedger } from "../lib/points.js";
import { audit } from "../lib/audit.js";

const router = Router();

/** E-wallet provider callback (simulate Midtrans/Xendit style) */
router.post("/ewallet/redemption", async (req, res) => {
  const parsed = z
    .object({
      externalRef: z.string(),
      status: z.enum(["completed", "failed"]),
      failReason: z.string().optional(),
    })
    .safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const redemption = await prisma.pointRedemption.findFirst({
    where: { externalRef: parsed.data.externalRef },
  });
  if (!redemption) {
    res.status(404).json({ error: "Redemption not found" });
    return;
  }

  if (redemption.status === "completed" || redemption.status === "failed") {
    res.json({ data: { alreadyProcessed: true } });
    return;
  }

  if (parsed.data.status === "completed") {
    await prisma.pointRedemption.update({
      where: { id: redemption.id },
      data: { status: "completed", completedAt: new Date() },
    });
  } else {
    await prisma.pointRedemption.update({
      where: { id: redemption.id },
      data: {
        status: "failed",
        failReason: parsed.data.failReason ?? "Provider failed",
      },
    });
    await recordLedger(
      redemption.userId,
      redemption.points,
      "redemption_rollback",
      "Rollback — webhook failed",
      redemption.id
    );
  }

  await audit(redemption.userId, "ewallet_webhook", "webhook", parsed.data);
  res.json({ data: { ok: true } });
});

export default router;
