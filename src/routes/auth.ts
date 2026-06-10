import { Router } from "express";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import {
  signAccessToken,
  issueRefreshToken,
  rotateRefreshToken,
  revokeAllRefreshTokens,
  hashToken,
} from "../lib/tokens.js";
import { generateReferralCode, applyReferralOnRegister } from "../lib/referral.js";
import { audit } from "../lib/audit.js";
import { authLimiter } from "../middleware/rateLimit.js";

const router = Router();
router.use(authLimiter);

const registerSchema = z.object({
  fullName: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  phone: z.string().min(8),
  address: z.string().min(5),
  referralCode: z.string().optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

function publicUser(user: {
  id: string;
  email: string;
  fullName: string;
  phone: string;
  address: string;
  profilePhotoUrl: string | null;
  status: string;
  rank: string;
  memberSince: Date;
  verified: boolean;
}) {
  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    phone: user.phone,
    address: user.address,
    profilePhotoUrl: user.profilePhotoUrl,
    status: user.status,
    rank: user.rank,
    memberSince: user.memberSince,
    verified: user.verified,
  };
}

async function authResponse(userId: string) {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  const accessToken = signAccessToken(user.id, user.email);
  const refreshToken = await issueRefreshToken(user.id);
  return { user: publicUser(user), accessToken, refreshToken, token: accessToken };
}

router.post("/register", async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const existing = await prisma.user.findUnique({
    where: { email: parsed.data.email },
  });
  if (existing) {
    res.status(409).json({ error: "Email already registered" });
    return;
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 10);
  let code = generateReferralCode(parsed.data.fullName);
  while (await prisma.user.findUnique({ where: { referralCode: code } })) {
    code = generateReferralCode(parsed.data.fullName);
  }

  const user = await prisma.user.create({
    data: {
      email: parsed.data.email,
      passwordHash,
      fullName: parsed.data.fullName,
      phone: parsed.data.phone,
      address: parsed.data.address,
      referralCode: code,
      verified: false,
      preferences: { create: {} },
    },
  });

  await applyReferralOnRegister(user.id, parsed.data.referralCode);
  await audit(user.id, "register", "auth", { email: user.email });
  const tokens = await authResponse(user.id);
  res.status(201).json(tokens);
});

router.post("/login", async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const user = await prisma.user.findUnique({
    where: { email: parsed.data.email },
  });
  if (!user?.passwordHash || !(await bcrypt.compare(parsed.data.password, user.passwordHash))) {
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }

  await audit(user.id, "login", "auth");
  res.json(await authResponse(user.id));
});

router.post("/oauth/:provider", async (req, res) => {
  const provider = req.params.provider;
  if (!["google", "facebook"].includes(provider)) {
    res.status(400).json({ error: "Unsupported provider" });
    return;
  }

  const body = z
    .object({
      providerId: z.string().min(1),
      email: z.string().email(),
      fullName: z.string().min(2),
      phone: z.string().optional(),
      address: z.string().optional(),
    })
    .safeParse(req.body);

  if (!body.success) {
    res.status(400).json({ error: body.error.flatten() });
    return;
  }

  let oauth = await prisma.oAuthAccount.findUnique({
    where: {
      provider_providerId: { provider, providerId: body.data.providerId },
    },
    include: { user: true },
  });

  if (!oauth) {
    let user = await prisma.user.findUnique({ where: { email: body.data.email } });
    if (!user) {
      let code = generateReferralCode(body.data.fullName);
      while (await prisma.user.findUnique({ where: { referralCode: code } })) {
        code = generateReferralCode(body.data.fullName);
      }
      user = await prisma.user.create({
        data: {
          email: body.data.email,
          fullName: body.data.fullName,
          phone: body.data.phone ?? "0000000000",
          address: body.data.address ?? "-",
          referralCode: code,
          verified: true,
          preferences: { create: {} },
        },
      });
    }
    oauth = await prisma.oAuthAccount.create({
      data: {
        userId: user.id,
        provider,
        providerId: body.data.providerId,
      },
      include: { user: true },
    });
  }

  await audit(oauth.userId, "oauth_login", "auth", { provider });
  res.json(await authResponse(oauth.userId));
});

router.post("/otp/send", async (req, res) => {
  const parsed = z
    .object({
      phone: z.string().min(8),
      email: z.string().email().optional(),
      purpose: z.enum(["register", "login"]).default("register"),
    })
    .safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const code = String(Math.floor(100000 + Math.random() * 900000));
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

  await prisma.otpCode.create({
    data: {
      phone: parsed.data.phone,
      email: parsed.data.email,
      code,
      purpose: parsed.data.purpose,
      expiresAt,
    },
  });

  console.log(`[OTP] ${parsed.data.phone} → ${code} (dev only)`);
  res.json({
    data: {
      sent: true,
      expiresAt,
      devCode: process.env.NODE_ENV === "production" ? undefined : code,
    },
  });
});

router.post("/otp/resend", async (req, res) => {
  const parsed = z
    .object({
      phone: z.string().min(8),
      email: z.string().email().optional(),
      purpose: z.enum(["register", "login"]).default("register"),
    })
    .safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const code = String(Math.floor(100000 + Math.random() * 900000));
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
  await prisma.otpCode.create({
    data: {
      phone: parsed.data.phone,
      email: parsed.data.email,
      code,
      purpose: parsed.data.purpose,
      expiresAt,
    },
  });
  console.log(`[OTP resend] ${parsed.data.phone} → ${code}`);
  res.json({
    data: { sent: true, expiresAt, devCode: process.env.NODE_ENV === "production" ? undefined : code },
  });
});

router.post("/otp/verify", async (req, res) => {
  const parsed = z
    .object({
      phone: z.string().min(8),
      code: z.string().length(6),
      purpose: z.enum(["register", "login"]).default("register"),
    })
    .safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const otp = await prisma.otpCode.findFirst({
    where: {
      phone: parsed.data.phone,
      purpose: parsed.data.purpose,
      verified: false,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: "desc" },
  });

  if (!otp || otp.code !== parsed.data.code) {
    res.status(400).json({ error: "Invalid or expired OTP" });
    return;
  }

  await prisma.otpCode.update({
    where: { id: otp.id },
    data: { verified: true },
  });

  if (otp.userId) {
    await prisma.user.update({
      where: { id: otp.userId },
      data: { verified: true },
    });
    res.json({ data: { verified: true, ...(await authResponse(otp.userId)) } });
    return;
  }

  res.json({ data: { verified: true } });
});

router.post("/forgot-password", async (req, res) => {
  const parsed = z.object({ email: z.string().email() }).safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const user = await prisma.user.findUnique({
    where: { email: parsed.data.email },
  });

  if (user) {
    const raw = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash: hashToken(raw),
        expiresAt,
      },
    });
    const resetUrl = `${process.env.APP_URL ?? "http://localhost:5173"}/reset-password?token=${raw}`;
    console.log(`[reset-password] ${parsed.data.email} → ${resetUrl}`);
  }

  res.json({
    data: {
      message: "If the email exists, a reset link has been sent.",
    },
  });
});

router.post("/reset-password", async (req, res) => {
  const parsed = z
    .object({
      token: z.string().min(1),
      password: z.string().min(8),
    })
    .safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const row = await prisma.passwordResetToken.findUnique({
    where: { tokenHash: hashToken(parsed.data.token) },
  });
  if (!row || row.usedAt || row.expiresAt < new Date()) {
    res.status(400).json({ error: "Invalid or expired reset token" });
    return;
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 10);
  await prisma.user.update({
    where: { id: row.userId },
    data: { passwordHash },
  });
  await prisma.passwordResetToken.update({
    where: { id: row.id },
    data: { usedAt: new Date() },
  });
  await revokeAllRefreshTokens(row.userId);
  await audit(row.userId, "reset_password", "auth");
  res.json({ data: { success: true } });
});

router.post("/refresh", async (req, res) => {
  const parsed = z.object({ refreshToken: z.string().min(1) }).safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const result = await rotateRefreshToken(parsed.data.refreshToken);
  if (!result) {
    res.status(401).json({ error: "Invalid refresh token" });
    return;
  }

  res.json({
    user: publicUser(result.user),
    accessToken: result.accessToken,
    refreshToken: result.refreshToken,
    token: result.accessToken,
  });
});

router.post("/logout", async (req, res) => {
  const parsed = z.object({ refreshToken: z.string().optional() }).safeParse(req.body);
  const userId = (req as { auth?: { userId: string } }).auth?.userId;

  if (parsed.data?.refreshToken) {
    const tokenHash = hashToken(parsed.data.refreshToken);
    await prisma.refreshToken.updateMany({
      where: { tokenHash },
      data: { revokedAt: new Date() },
    });
  }
  if (userId) {
    await revokeAllRefreshTokens(userId);
    await audit(userId, "logout", "auth");
  }

  res.json({ data: { success: true } });
});

export default router;
