import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const mockUsers = [
  { name: 'Ahmad Wijaya', weight: 125.5, deposits: 45 },
  { name: 'Budi Santoso', weight: 118.3, deposits: 42 },
  { name: 'Citra Dewi', weight: 112.0, deposits: 38 },
  { name: 'Dedi Kurniawan', weight: 108.5, deposits: 36 },
  { name: 'Eka Putri', weight: 102.2, deposits: 34 },
  { name: 'Faisal Rahman', weight: 98.7, deposits: 32 },
  { name: 'Gita Nirmala', weight: 95.3, deposits: 30 },
  { name: 'Hendra Gunawan', weight: 92.0, deposits: 29 },
  { name: 'Indah Permata', weight: 88.5, deposits: 27 },
  { name: 'Joko Susilo', weight: 85.2, deposits: 26 },
  { name: 'Kartika Sari', weight: 82.0, deposits: 25 },
  { name: 'Lukman Hakim', weight: 78.5, deposits: 23 },
  { name: 'Maya Anggraini', weight: 75.2, deposits: 22 },
  { name: 'Nanda Pratama', weight: 72.0, deposits: 21 },
  { name: 'Olivia Marpaung', weight: 68.5, deposits: 19 },
  { name: 'Pandu Wicaksono', weight: 65.2, deposits: 18 },
  { name: 'Qori Amalia', weight: 62.0, deposits: 17 },
  { name: 'Rudi Hartono', weight: 58.5, deposits: 16 },
];

export async function seedLeaderboard() {
  console.log('Creating mock leaderboard data...\n');

  const createdUsers = [];

  for (let i = 0; i < mockUsers.length; i++) {
    const mock = mockUsers[i];
    const email = `leaderboard${i + 1}@demo.com`;
    const phone = `0812${String(i + 1).padStart(8, '0')}`;
    
    // Generate unique referral code
    const referralCode = `LB${Date.now()}${i}`;

    try {
      const user = await prisma.user.create({
        data: {
          email,
          passwordHash: await bcrypt.hash('demo123456', 10),
          fullName: mock.name,
          phone,
          address: `Jl. Demo No. ${i + 1}, Jakarta`,
          status: 'active',
          rank: i < 3 ? 'Gold' : i < 10 ? 'Silver' : 'Bronze',
          verified: true,
          totalPoints: Math.floor(mock.weight * 100),
          co2SavedKg: mock.weight * 2.5,
          totalWeightKg: mock.weight,
          activeDays: Math.floor(mock.deposits * 0.7),
          referralCode,
        },
      });

      // Create corresponding deposits for weight tracking
      for (let d = 0; d < mock.deposits; d++) {
        const depositDate = new Date();
        depositDate.setDate(depositDate.getDate() - Math.floor(Math.random() * 30));
        
        await prisma.deposit.create({
          data: {
            userId: user.id,
            weightKg: mock.weight / mock.deposits,
            co2SavedKg: (mock.weight / mock.deposits) * 2.5,
            points: Math.floor((mock.weight / mock.deposits) * 100),
            location: `Setor #${d + 1}`,
            type: Math.random() > 0.5 ? 'drop_point' : 'pickup',
            createdAt: depositDate,
          },
        });
      }

      createdUsers.push({ rank: i + 1, name: mock.name, weight: mock.weight, deposits: mock.deposits });
      console.log(`✅ Rank #${i + 1}: ${mock.name} - ${mock.weight}kg (${mock.deposits} deposits)`);
    } catch (err) {
      console.error(`❌ Failed to create user ${mock.name}:`, err.message);
    }
  }

  console.log('\n📊 Leaderboard Summary:');
  console.log('═'.repeat(50));
  createdUsers.slice(0, 10).forEach(u => {
    console.log(`#${u.rank.toString().padStart(2)} ${u.name.padEnd(20)} ${u.weight.toFixed(1)}kg`);
  });
  console.log('...');
  createdUsers.slice(-3).forEach(u => {
    console.log(`#${u.rank.toString().padStart(2)} ${u.name.padEnd(20)} ${u.weight.toFixed(1)}kg`);
  });
  console.log('═'.repeat(50));
  console.log(`\n✅ Total: ${createdUsers.length} users created`);
}

// Standalone execution for direct script runs
if (import.meta.url === `file://${process.argv[1]}`) {
  seedLeaderboard()
    .catch((e) => {
      console.error(e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
