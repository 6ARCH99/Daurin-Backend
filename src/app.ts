import express from "express";
import cors from "cors";
import path from "path";
import authRoutes from "./routes/auth.js";
import profileRoutes from "./routes/profile.js";
import dashboardRoutes from "./routes/dashboard.js";
import climateImpactRoutes from "./routes/climate-impact.js";
import challengeRoutes from "./routes/challenges.js";
import leaderboardRoutes from "./routes/leaderboard.js";
import badgesRoutes from "./routes/badges.js";
import settingsRoutes from "./routes/settings.js";
import helpRoutes from "./routes/help.js";
import dropPointRoutes from "./routes/dropPoints.js";
import depositRoutes from "./routes/deposits.js";
import pickupRoutes from "./routes/pickups.js";
import rewardRoutes from "./routes/rewards.js";
import referralRoutes from "./routes/referral.js";
import webhookRoutes from "./routes/webhooks.js";

export function createApp() {
  const app = express();

  app.use(cors());
  app.use(express.json());

  const uploadDir = process.env.UPLOAD_DIR ?? "./uploads";
  app.use("/uploads", express.static(path.resolve(uploadDir)));

  app.get("/", (_req, res) => {
    res.json({
      service: "Suarabumi API",
      framework: "Express.js",
      status: "running",
      docs: "See backend/API.md",
      demoLogin: {
        email: "putra.wijaya@email.com",
        password: "password123",
      },
      operatorKey: "Header X-Operator-Key (dev: operator-dev-key)",
    });
  });

  app.get("/health", (_req, res) => {
    res.json({ status: "ok", service: "suarabumi-api" });
  });

  app.use("/api/auth", authRoutes);
  app.use("/api/profile", profileRoutes);
  app.use("/api/dashboard", dashboardRoutes);
  app.use("/api/climate-impact", climateImpactRoutes);
  app.use("/api/challenges", challengeRoutes);
  app.use("/api/leaderboard", leaderboardRoutes);
  app.use("/api/badges", badgesRoutes);
  app.use("/api/settings", settingsRoutes);
  app.use("/api/help", helpRoutes);
  app.use("/api/drop-points", dropPointRoutes);
  app.use("/api/deposits", depositRoutes);
  app.use("/api/pickups", pickupRoutes);
  app.use("/api/rewards", rewardRoutes);
  app.use("/api/referral", referralRoutes);
  app.use("/api/webhooks", webhookRoutes);

  app.use(
    (
      err: Error,
      _req: express.Request,
      res: express.Response,
      _next: express.NextFunction
    ) => {
      console.error(err);
      res.status(500).json({ error: err.message ?? "Internal server error" });
    }
  );

  return app;
}
