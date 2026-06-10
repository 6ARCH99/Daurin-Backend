const LEVELS = [
  { name: "Bronze", minPoints: 0 },
  { name: "Silver", minPoints: 3000 },
  { name: "Gold", minPoints: 8000 },
  { name: "Platinum", minPoints: 12000 },
  { name: "Diamond", minPoints: 16000 },
] as const;

export function levelProgress(totalPoints: number) {
  let current = LEVELS[0];
  let next = LEVELS[1];

  for (let i = 0; i < LEVELS.length; i++) {
    if (totalPoints >= LEVELS[i].minPoints) {
      current = LEVELS[i];
      next = LEVELS[i + 1] ?? LEVELS[i];
    }
  }

  const range = next.minPoints - current.minPoints || 1;
  const progress =
    next === current
      ? 100
      : Math.min(
          100,
          Math.round(
            ((totalPoints - current.minPoints) / range) * 100
          )
        );

  return {
    currentLevel: current.name,
    nextLevel: next.name,
    progressPercent: progress,
    pointsToNext: Math.max(0, next.minPoints - totalPoints),
  };
}
