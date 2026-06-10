import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Get the first user (assumes you have at least one user)
  const user = await prisma.user.findFirst();
  
  if (!user) {
    console.log('No user found. Please run prisma/seed.ts first.');
    return;
  }

  console.log(`Creating 7 days of deposit data for user: ${user.email}`);

  // Generate data for last 7 days
  const deposits = [];
  const today = new Date();

  for (let i = 6; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    
    // Random weight between 1-5 kg
    const weightKg = Math.floor(Math.random() * 5) + 1;
    // CO2 saved = weight * 2.5 (approximate)
    const co2SavedKg = weightKg * 2.5;
    // Points = weight * 100
    const points = Math.floor(weightKg * 100);

    deposits.push({
      userId: user.id,
      weightKg,
      co2SavedKg,
      points,
      location: `Setor Hari ${7-i}`,
      type: 'drop_point',
      createdAt: date,
    });

    console.log(`Day ${7-i}: ${weightKg}kg, ${points} pts`);
  }

  // Insert deposits
  for (const deposit of deposits) {
    await prisma.deposit.create({ data: deposit });
  }

  // Update user totals
  const totalWeight = deposits.reduce((sum, d) => sum + d.weightKg, 0);
  const totalPoints = deposits.reduce((sum, d) => sum + d.points, 0);
  const totalCO2 = deposits.reduce((sum, d) => sum + d.co2SavedKg, 0);

  await prisma.user.update({
    where: { id: user.id },
    data: {
      totalWeightKg: { increment: totalWeight },
      totalPoints: { increment: totalPoints },
      co2SavedKg: { increment: totalCO2 },
    },
  });

  console.log('\n✅ 7 days of deposit data created successfully!');
  console.log(`Total: ${totalWeight}kg, ${totalPoints} points, ${totalCO2.toFixed(1)}kg CO2 saved`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
