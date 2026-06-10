import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { co2FromWeightKg, pointsFromDeposit } from "../src/lib/climate.js";
import { seedLeaderboard } from "./seed-leaderboard.js";
import { seedDropPoints } from "./seed-droppoints.js";

const prisma = new PrismaClient();

async function main() {
  await prisma.notificationQueue.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.supportTicket.deleteMany();
  await prisma.faq.deleteMany();
  await prisma.referralEvent.deleteMany();
  await prisma.pointLedger.deleteMany();
  await prisma.pointRedemption.deleteMany();
  await prisma.depositTransaction.deleteMany();
  await prisma.pickupSchedule.deleteMany();
  await prisma.activity.deleteMany();
  await prisma.userBadge.deleteMany();
  await prisma.userChallenge.deleteMany();
  await prisma.deposit.deleteMany();
  await prisma.challenge.deleteMany();
  await prisma.badge.deleteMany();
  await prisma.dropPoint.deleteMany();
  await prisma.eWallet.deleteMany();
  await prisma.userPreferences.deleteMany();
  await prisma.oAuthAccount.deleteMany();
  await prisma.passwordResetToken.deleteMany();
  await prisma.otpCode.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.user.deleteMany();

  const passwordHash = await bcrypt.hash("password123", 10);

  const demoUser = await prisma.user.create({
    data: {
      email: "putra.wijaya@email.com",
      passwordHash,
      fullName: "Putra Wijaya",
      phone: "+62 812-3456-7890",
      address: "Kelapa Gading, Jakarta Utara",
      status: "active",
      rank: "Top 12% Contributor",
      memberSince: new Date("2026-01-15"),
      verified: true,
      referralCode: "PUTRA24",
      totalPoints: 12450,
      preferences: { create: {} },
      eWallet: {
        create: {
          platform: "gopay",
          phone: "08123456789",
          verified: true,
        },
      },
      co2SavedKg: 127.5,
      totalWeightKg: 145,
      activeDays: 89,
      profilePhotoUrl: null,
    },
  });

  const peers = [
    { fullName: "Budi Santoso", email: "budi@email.com", totalPoints: 8450, totalWeightKg: 120 },
    { fullName: "Siti Nurhaliza", email: "siti@email.com", totalPoints: 7890, totalWeightKg: 110 },
    { fullName: "Ahmad Rizki", email: "ahmad@email.com", totalPoints: 7320, totalWeightKg: 95 },
    { fullName: "Dewi Lestari", email: "dewi@email.com", totalPoints: 6420, totalWeightKg: 88 },
  ];

  const peerUsers = [];
  for (const p of peers) {
    const u = await prisma.user.create({
      data: {
        ...p,
        passwordHash,
        phone: "08120000000",
        address: "Jakarta",
        referralCode: p.email.split("@")[0].toUpperCase().slice(0, 8) + "01",
        co2SavedKg: co2FromWeightKg(p.totalWeightKg),
        activeDays: 60,
        preferences: { create: {} },
      },
    });
    peerUsers.push(u);
  }

  const badges = await Promise.all([
    prisma.badge.create({
      data: {
        code: "pemula",
        name: "Pemula Aktif",
        description: "Setor pertama kali",
        icon: "🌱",
      },
    }),
    prisma.badge.create({
      data: {
        code: "konsisten",
        name: "Konsisten",
        description: "Setor 10x berturut-turut",
        icon: "⭐",
      },
    }),
    prisma.badge.create({
      data: {
        code: "top_contributor",
        name: "Top Contributor",
        description: "Top 10% bulan ini",
        icon: "🏆",
      },
    }),
    prisma.badge.create({
      data: {
        code: "inspirator",
        name: "Inspirator",
        description: "Ajak 5 teman",
        icon: "🎯",
      },
    }),
    prisma.badge.create({
      data: {
        code: "eco_warrior",
        name: "Eco Warrior",
        description: "Kumpulkan 100 kg sampah",
        icon: "🌍",
      },
    }),
    prisma.badge.create({
      data: {
        code: "plastic_hunter",
        name: "Plastic Hunter",
        description: "Setor 50 kg plastik",
        icon: "♻️",
      },
    }),
    prisma.badge.create({
      data: {
        code: "streak_master",
        name: "Streak Master",
        description: "Aktif 30 hari berturut-turut",
        icon: "🔥",
      },
    }),
    prisma.badge.create({
      data: {
        code: "community_hero",
        name: "Community Hero",
        description: "Ajak 10 teman bergabung",
        icon: "👥",
      },
    }),
    prisma.badge.create({
      data: {
        code: "carbon_saver",
        name: "Carbon Saver",
        description: "Hemat 500 kg CO2",
        icon: "🌿",
      },
    }),
    prisma.badge.create({
      data: {
        code: "gold_collector",
        name: "Gold Collector",
        description: "Kumpulkan 10,000 poin",
        icon: "🥇",
      },
    }),
  ]);

  for (const badge of badges) {
    await prisma.userBadge.create({
      data: { userId: demoUser.id, badgeId: badge.id },
    });
  }

  const now = new Date();
  const challenges = await Promise.all([
    prisma.challenge.create({
      data: {
        title: "Setor 10 kg Minggu Ini",
        description: "Pilah 10 kg sampah dalam seminggu",
        targetValue: 10,
        targetUnit: "kg",
        rewardPoints: 500,
        difficulty: "medium",
        durationDays: 7,
        endsAt: new Date(now.getTime() + 3 * 86400000),
        isFeatured: true,
      },
    }),
    prisma.challenge.create({
      data: {
        title: "Bike to Work",
        description: "Gunakan sepeda untuk commute",
        targetValue: 5,
        targetUnit: "hari",
        rewardPoints: 400,
        difficulty: "easy",
        durationDays: 5,
        endsAt: new Date(now.getTime() + 8 * 86400000),
      },
    }),
    prisma.challenge.create({
      data: {
        title: "Zero Waste Lunch",
        description: "Makan siang tanpa sampah plastik",
        targetValue: 7,
        targetUnit: "hari",
        rewardPoints: 350,
        difficulty: "medium",
        durationDays: 7,
        endsAt: new Date(now.getTime() + 12 * 86400000),
      },
    }),
    prisma.challenge.create({
      data: {
        title: "Reusable Bag Challenge",
        description: "Selalu bawa tas belanja sendiri",
        targetValue: 14,
        targetUnit: "hari",
        rewardPoints: 600,
        difficulty: "medium",
        durationDays: 14,
        endsAt: new Date(now.getTime() + 20 * 86400000),
      },
    }),
    prisma.challenge.create({
      data: {
        title: "Composting Champion",
        description: "Mulai kompos sampah organik di rumah",
        targetValue: 30,
        targetUnit: "hari",
        rewardPoints: 1000,
        difficulty: "medium",
        durationDays: 30,
        endsAt: new Date(now.getTime() + 32 * 86400000),
      },
    }),
    prisma.challenge.create({
      data: {
        title: "Eco Shopping Week",
        description: "Belanja tanpa kemasan plastik",
        targetValue: 7,
        targetUnit: "hari",
        rewardPoints: 500,
        difficulty: "easy",
        durationDays: 7,
        endsAt: new Date(now.getTime() + 10 * 86400000),
      },
    }),
    prisma.challenge.create({
      data: {
        title: "Water Warrior",
        description: "Hemat air dengan shower maksimal 5 menit",
        targetValue: 14,
        targetUnit: "hari",
        rewardPoints: 700,
        difficulty: "easy",
        durationDays: 14,
        endsAt: new Date(now.getTime() + 18 * 86400000),
      },
    }),
    prisma.challenge.create({
      data: {
        title: "Green Commuter",
        description: "Gunakan transportasi umum setiap hari",
        targetValue: 21,
        targetUnit: "hari",
        rewardPoints: 900,
        difficulty: "hard",
        durationDays: 21,
        endsAt: new Date(now.getTime() + 25 * 86400000),
      },
    }),
    prisma.challenge.create({
      data: {
        title: "DIY Repair Challenge",
        description: "Perbaiki barang rusak daripada beli baru",
        targetValue: 10,
        targetUnit: "hari",
        rewardPoints: 600,
        difficulty: "medium",
        durationDays: 10,
        endsAt: new Date(now.getTime() + 14 * 86400000),
      },
    }),
    prisma.challenge.create({
      data: {
        title: "Plant a Tree",
        description: "Tanam minimal 3 pohon di sekitarmu",
        targetValue: 3,
        targetUnit: "pohon",
        rewardPoints: 800,
        difficulty: "easy",
        durationDays: 1,
        endsAt: new Date(now.getTime() + 6 * 86400000),
      },
    }),
  ]);

  await prisma.userChallenge.create({
    data: {
      userId: demoUser.id,
      challengeId: challenges[0].id,
      progress: 6.5,
      status: "active",
    },
  });
  await prisma.userChallenge.createMany({
    data: [
      { userId: demoUser.id, challengeId: challenges[1].id, progress: 3, status: "active" },
      { userId: demoUser.id, challengeId: challenges[2].id, progress: 4, status: "active" },
      { userId: demoUser.id, challengeId: challenges[3].id, progress: 6, status: "active" },
    ],
  });

  if (peerUsers.length) {
    const picks = [challenges[4], challenges[5], challenges[6], challenges[7], challenges[8], challenges[9]];
    await prisma.userChallenge.createMany({
      data: [
        { userId: peerUsers[0].id, challengeId: picks[0].id, progress: 2, status: "active" },
        { userId: peerUsers[0].id, challengeId: picks[1].id, progress: 1, status: "active" },
        { userId: peerUsers[1].id, challengeId: picks[1].id, progress: 4, status: "active" },
        { userId: peerUsers[1].id, challengeId: picks[2].id, progress: 3, status: "active" },
        { userId: peerUsers[2].id, challengeId: picks[2].id, progress: 5, status: "active" },
        { userId: peerUsers[3].id, challengeId: picks[3].id, progress: 6, status: "active" },
      ],
    });
  }

  const depositDays = [6, 5, 4, 3, 2, 1, 0];
  for (const offset of depositDays) {
    const d = new Date(now);
    d.setDate(d.getDate() - offset);
    const weight = offset % 2 === 0 ? 8 : 6.5;
    await prisma.deposit.create({
      data: {
        userId: demoUser.id,
        weightKg: weight,
        co2SavedKg: co2FromWeightKg(weight),
        points: pointsFromDeposit(weight),
        location: "Drop Point Sudirman",
        type: "drop_point",
        createdAt: d,
      },
    });
  }

  for (let m = 5; m >= 0; m--) {
    const d = new Date(now.getFullYear(), now.getMonth() - m, 15);
    const weight = 14 + m * 2;
    await prisma.deposit.create({
      data: {
        userId: demoUser.id,
        weightKg: weight,
        co2SavedKg: co2FromWeightKg(weight),
        points: pointsFromDeposit(weight),
        createdAt: d,
      },
    });
  }

  await prisma.activity.createMany({
    data: [
      {
        userId: demoUser.id,
        type: "deposit",
        title: "Setor Sampah",
        description: "8 kg — Drop Point Sudirman",
        pointsDelta: 450,
        createdAt: new Date(Date.now() - 2 * 3600000),
      },
      {
        userId: demoUser.id,
        type: "redemption",
        title: "Tukar Poin",
        description: "Ke GoPay",
        pointsDelta: -2000,
        createdAt: new Date(Date.now() - 86400000),
      },
      {
        userId: demoUser.id,
        type: "pickup",
        title: "Penjemputan",
        description: "Jl. Melati No. 15",
        pointsDelta: 680,
        createdAt: new Date(Date.now() - 3 * 86400000),
      },
    ],
  });

  const dropPoints = [
    {
      name: "Drop Point Sudirman Central",
      address: "Jl. Jenderal Sudirman No. 52-53, Jakarta Pusat",
      city: "Jakarta Pusat",
      lat: -6.2088,
      lng: 106.8456,
      phone: "+62 21 5789 1234",
      openTime: "07:00",
      closeTime: "20:00",
      rating: 4.8,
      reviewCount: 127,
      materials: JSON.stringify(["Plastik", "Kertas", "Logam", "Elektronik"]),
    },
    {
      name: "Bank Sampah Melati Bersih",
      address: "Jl. Melati Raya No. 15, Kebayoran Baru",
      city: "Jakarta Selatan",
      lat: -6.2441,
      lng: 106.7992,
      phone: "+62 21 7234 5678",
      openTime: "08:00",
      closeTime: "17:00",
      rating: 4.6,
      reviewCount: 89,
      materials: JSON.stringify(["Plastik", "Kertas", "Kaca"]),
    },
    {
      name: "DP Senayan Park",
      address: "Taman Senayan, Gelora Bung Karno",
      city: "Jakarta Pusat",
      lat: -6.2185,
      lng: 106.8028,
      openTime: "06:00",
      closeTime: "18:00",
      rating: 4.9,
      reviewCount: 203,
      materials: JSON.stringify(["Plastik", "Kertas", "Logam", "Kaca"]),
    },
  ];

  for (const dp of dropPoints) {
    await prisma.dropPoint.create({ data: dp });
  }

  await prisma.faq.createMany({
    data: [
      {
        question: "Bagaimana cara mendapatkan poin?",
        answer: "Setor sampah terpilah di drop point atau jadwalkan penjemputan. Poin diberikan setelah setor diverifikasi operator.",
        keywords: "poin,setor,reward",
        category: "reward",
      },
      {
        question: "Berapa lama jadwal penjemputan sampah?",
        answer: "Penjemputan biasanya dilakukan dalam jendela 2 jam sesuai jadwal yang Anda pilih.",
        keywords: "penjemputan,jadwal",
        category: "pickup",
      },
      {
        question: "Apakah bisa menukar poin dengan uang?",
        answer: "Ya, poin dapat ditukar ke GoPay, OVO, Dana, atau ShopeePay melalui Reward Centre.",
        keywords: "tukar,uang,ewallet",
        category: "reward",
      },
    ],
  });

  console.log("Seed complete.");
  console.log("Demo login: putra.wijaya@email.com / password123");
  console.log("Referral code: PUTRA24 | Operator key: operator-dev-key");

  // Always seed leaderboard and drop points data for both demo and new accounts
  console.log("\n🔄 Running leaderboard seed...");
  await seedLeaderboard();

  console.log("\n🔄 Running drop points seed...");
  await seedDropPoints();

  console.log("\n✅ All seeds completed successfully!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
