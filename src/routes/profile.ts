import { Router } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();
router.use(requireAuth);

const uploadDir = process.env.UPLOAD_DIR ?? "./uploads";
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || ".jpg";
    cb(null, `profile-${Date.now()}${ext}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) {
      cb(new Error("Only image files are allowed"));
      return;
    }
    cb(null, true);
  },
});

const updateSchema = z.object({
  fullName: z.string().min(2).optional(),
  phone: z.string().min(8).optional(),
  address: z.string().min(5).optional(),
});

/** GET /api/profile — fetch profile (name, email, phone, address, status, rank) */
router.get("/", async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.auth!.userId },
    select: {
      id: true,
      fullName: true,
      email: true,
      phone: true,
      address: true,
      profilePhotoUrl: true,
      status: true,
      rank: true,
      memberSince: true,
      verified: true,
      referralCode: true,
    },
  });
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  res.json({ data: user });
});

/** PATCH /api/profile — update profile */
router.patch("/", async (req, res) => {
  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const user = await prisma.user.update({
    where: { id: req.auth!.userId },
    data: parsed.data,
    select: {
      id: true,
      fullName: true,
      email: true,
      phone: true,
      address: true,
      profilePhotoUrl: true,
      status: true,
      rank: true,
      memberSince: true,
      verified: true,
    },
  });
  res.json({ data: user });
});

/** POST /api/profile/photo — upload profile photo */
router.post("/photo", upload.single("photo"), async (req, res) => {
  if (!req.file) {
    res.status(400).json({ error: "Photo file is required (field: photo)" });
    return;
  }

  const photoUrl = `/uploads/${req.file.filename}`;
  const user = await prisma.user.update({
    where: { id: req.auth!.userId },
    data: { profilePhotoUrl: photoUrl },
    select: { profilePhotoUrl: true },
  });
  res.json({ data: user });
});

/** GET /api/profile/badges */
router.get("/badges", async (req, res) => {
  const badges = await prisma.userBadge.findMany({
    where: { userId: req.auth!.userId },
    include: { badge: true },
    orderBy: { earnedAt: "desc" },
  });
  res.json({
    data: badges.map((ub) => ({
      id: ub.badge.id,
      code: ub.badge.code,
      name: ub.badge.name,
      description: ub.badge.description,
      icon: ub.badge.icon,
      earnedAt: ub.earnedAt,
    })),
  });
});

/** GET /api/profile/activities */
router.get("/activities", async (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 10, 50);
  const activities = await prisma.activity.findMany({
    where: { userId: req.auth!.userId },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
  res.json({ data: activities });
});

/** GET /api/profile/stats — weight, points, challenges, active days */
router.get("/stats", async (req, res) => {
  const userId = req.auth!.userId;
  const [user, challengesCompleted] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        totalWeightKg: true,
        totalPoints: true,
        activeDays: true,
      },
    }),
    prisma.userChallenge.count({
      where: { userId, status: "completed" },
    }),
  ]);

  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  res.json({
    data: {
      totalWeightKg: user.totalWeightKg,
      totalPoints: user.totalPoints,
      challengesCompleted,
      activeDays: user.activeDays,
    },
  });
});

/** DELETE /api/profile — delete user account */
router.delete("/", async (req, res) => {
  const userId = req.auth!.userId;
  
  await prisma.user.delete({
    where: { id: userId },
  });
  
  res.json({ data: { message: "Account deleted successfully" } });
});

export default router;
