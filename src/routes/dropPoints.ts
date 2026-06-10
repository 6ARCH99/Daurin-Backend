import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { seedDropPoints } from "../../prisma/seed-droppoints.js";

const router = Router();

function parseMaterials(raw: string) {
  try {
    return JSON.parse(raw) as string[];
  } catch {
    return [];
  }
}

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function mapDropPoint(dp: {
  id: string;
  name: string;
  address: string;
  city: string;
  lat: number;
  lng: number;
  phone: string | null;
  openTime: string;
  closeTime: string;
  rating: number;
  reviewCount: number;
  isOpen: boolean;
  materials: string;
}, distanceKm?: number) {
  return {
    id: dp.id,
    name: dp.name,
    address: dp.address,
    city: dp.city,
    lat: dp.lat,
    lng: dp.lng,
    phone: dp.phone,
    openTime: dp.openTime,
    closeTime: dp.closeTime,
    rating: dp.rating,
    reviewCount: dp.reviewCount,
    isOpen: dp.isOpen,
    materials: parseMaterials(dp.materials),
    distanceKm: distanceKm != null ? Math.round(distanceKm * 10) / 10 : undefined,
  };
}

router.get("/", async (req, res) => {
  const material = String(req.query.material ?? "").toLowerCase();
  const q = String(req.query.q ?? "").trim().toLowerCase();
  const lat = req.query.lat ? Number(req.query.lat) : null;
  const lng = req.query.lng ? Number(req.query.lng) : null;

  // Check if drop points exist, if not seed them
  const dropPointCount = await prisma.dropPoint.count();
  if (dropPointCount === 0) {
    console.log("🔄 Drop points empty, auto-seeding drop point data...");
    await seedDropPoints();
  }

  let list = await prisma.dropPoint.findMany();
  if (material && material !== "semua" && material !== "all") {
    list = list.filter((dp) =>
      parseMaterials(dp.materials).some((m) => m.toLowerCase().includes(material))
    );
  }
  if (q) {
    list = list.filter(
      (dp) =>
        dp.name.toLowerCase().includes(q) ||
        dp.address.toLowerCase().includes(q) ||
        dp.city.toLowerCase().includes(q)
    );
  }

  let mapped = list.map((dp) => {
    const dist =
      lat != null && lng != null ? haversineKm(lat, lng, dp.lat, dp.lng) : undefined;
    return mapDropPoint(dp, dist);
  });

  if (lat != null && lng != null) {
    mapped = mapped.sort((a, b) => (a.distanceKm ?? 0) - (b.distanceKm ?? 0));
  }

  res.json({ data: mapped });
});

router.get("/:id/status", async (req, res) => {
  const dp = await prisma.dropPoint.findUnique({
    where: { id: req.params.id },
    select: { id: true, isOpen: true, openTime: true, closeTime: true },
  });
  if (!dp) {
    res.status(404).json({ error: "Drop point not found" });
    return;
  }
  res.json({ data: { isOpen: dp.isOpen, openTime: dp.openTime, closeTime: dp.closeTime } });
});

router.get("/:id", async (req, res) => {
  const dp = await prisma.dropPoint.findUnique({ where: { id: req.params.id } });
  if (!dp) {
    res.status(404).json({ error: "Drop point not found" });
    return;
  }
  const lat = req.query.lat ? Number(req.query.lat) : undefined;
  const lng = req.query.lng ? Number(req.query.lng) : undefined;
  const dist =
    lat != null && lng != null ? haversineKm(lat, lng, dp.lat, dp.lng) : undefined;
  res.json({ data: mapDropPoint(dp, dist) });
});

export default router;
