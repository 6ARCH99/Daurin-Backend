import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";
import { audit } from "../lib/audit.js";

const router = Router();

router.get("/faq", async (_req, res) => {
  const faqs = await prisma.faq.findMany({ orderBy: { category: "asc" } });
  res.json({ data: faqs });
});

router.get("/faq/search", async (req, res) => {
  const q = String(req.query.q ?? "").trim().toLowerCase();
  if (!q) {
    res.status(400).json({ error: "Query parameter q is required" });
    return;
  }
  const all = await prisma.faq.findMany();
  const data = all.filter(
    (f) =>
      f.question.toLowerCase().includes(q) ||
      f.answer.toLowerCase().includes(q) ||
      f.keywords.toLowerCase().includes(q)
  );
  res.json({ data });
});

router.post("/live-chat/session", requireAuth, async (req, res) => {
  res.json({
    data: {
      sessionId: `chat_${req.auth!.userId}_${Date.now()}`,
      widgetUrl: process.env.LIVE_CHAT_URL ?? "https://example.com/chat-widget",
      status: "ready",
    },
  });
});

router.post("/support/ticket", requireAuth, async (req, res) => {
  const parsed = z
    .object({
      subject: z.string().min(3),
      message: z.string().min(10),
    })
    .safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const ticket = await prisma.supportTicket.create({
    data: {
      userId: req.auth!.userId,
      subject: parsed.data.subject,
      message: parsed.data.message,
    },
  });
  await audit(req.auth!.userId, "support_ticket", "help", { ticketId: ticket.id });
  console.log(`[support-email] ticket ${ticket.id} → ${parsed.data.subject}`);
  res.status(201).json({ data: ticket });
});

export default router;
