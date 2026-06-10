import { Request, Response, NextFunction } from "express";
import { verifyAccessToken } from "../lib/tokens.js";

export type AuthPayload = { userId: string; email: string };

declare global {
  namespace Express {
    interface Request {
      auth?: AuthPayload;
    }
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  try {
    const token = header.slice(7);
    const payload = verifyAccessToken(token);
    req.auth = { userId: payload.userId, email: payload.email };
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
  }
}

/** Operator endpoints (dev: header X-Operator-Key) */
export function requireOperator(req: Request, res: Response, next: NextFunction) {
  const key = req.headers["x-operator-key"];
  const expected = process.env.OPERATOR_KEY ?? "operator-dev-key";
  if (key !== expected) {
    res.status(403).json({ error: "Operator access denied" });
    return;
  }
  next();
}
