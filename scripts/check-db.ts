import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function buildLast7DaysChart(
  deposits: { createdAt: Date; weightKg: number }[],
  now: Date
) {
  const labels = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];
  const buckets: number[] = Array(7).fill(0);

  for (let i = 6; i >= 0; i--) {
    const day = startOfDay(now);
    day.setDate(day.getDate() - i);
    const key = day.getTime();
    console.log(`Checking offset -${i} day: ${day.toISOString()} (local: ${day.toString()}) key=${key}`);
    const matches = deposits.filter((d) => {
      const sod = startOfDay(d.createdAt);
      const isMatch = sod.getTime() === key;
      if (isMatch || i === 0) {
        // Log to see why it matches or not
        console.log(`  Deposit ${d.createdAt.toISOString()} sod=${sod.toISOString()} (local: ${sod.toString()}) matches=${isMatch}`);
      }
      return isMatch;
    });
    const count = matches.length;
    buckets[6 - i] = count;
  }

  return labels.map((label, i) => ({ label, depositCount: buckets[i] }));
}

async function main() {
  const user = await prisma.user.findUnique({
    where: { email: "putra.wijaya@email.com" },
    include: { deposits: true }
  });

  if (!user) {
    console.log("User not found");
    return;
  }

  const now = new Date();
  const weekAgo = new Date(now);
  weekAgo.setDate(weekAgo.getDate() - 7);

  const depositsLast7Days = user.deposits.filter(
    (d) => d.createdAt >= weekAgo
  );

  console.log("Prisma query deposits count:", depositsLast7Days.length);
  const chart = buildLast7DaysChart(depositsLast7Days, now);
  console.log("Chart output:", JSON.stringify(chart, null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
