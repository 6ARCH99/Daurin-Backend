import crypto from "crypto";
import jwt from "jsonwebtoken";
import { prisma } from "./prisma.js";

const ACCESS_TTL = "15m";
const REFRESH_DAYS = 30;

function secret() {
  return process.env.JWT_SECRET ?? "dev-secret";
}

export function signAccessToken(userId: string, email: string) {
  return jwt.sign({ userId, email, type: "access" }, secret(), {
    expiresIn: ACCESS_TTL,
  });
}

export function hashToken(raw: string) {
  return crypto.createHash("sha256").update(raw).digest("hex");
}

export async function issueRefreshToken(userId: string) {
  const raw = crypto.randomBytes(32).toString("hex");
  const tokenHash = hashToken(raw);
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + REFRESH_DAYS);
  await prisma.refreshToken.create({
    data: { userId, tokenHash, expiresAt },
  });
  return raw;
}

export async function rotateRefreshToken(raw: string) {
  const tokenHash = hashToken(raw);
  const row = await prisma.refreshToken.findUnique({ where: { tokenHash } });
  if (!row || row.revokedAt || row.expiresAt < new Date()) return null;
  await prisma.refreshToken.update({
    where: { id: row.id },
    data: { revokedAt: new Date() },
  });
  const user = await prisma.user.findUnique({ where: { id: row.userId } });
  if (!user) return null;
  const accessToken = signAccessToken(user.id, user.email);
  const refreshToken = await issueRefreshToken(user.id);
  return { user, accessToken, refreshToken };
}

export async function revokeAllRefreshTokens(userId: string) {
  await prisma.refreshToken.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

export function verifyAccessToken(token: string) {
  return jwt.verify(token, secret()) as {
    userId: string;
    email: string;
    type?: string;
  };
}
