/** Conversion factors per kg of sorted waste (aligned with prototype impact screen). */
const KG_TO_TREES = 4 / 145;
const KG_TO_WATER_LITERS = 230 / 145;
const KG_TO_ENERGY_KWH = 18 / 145;
const KG_TO_CO2_KG = 127.5 / 145;

export function impactFromWeightKg(totalWeightKg: number) {
  return {
    treesEquivalent: Math.round(totalWeightKg * KG_TO_TREES * 10) / 10,
    waterSavedLiters: Math.round(totalWeightKg * KG_TO_WATER_LITERS),
    energySavedKwh: Math.round(totalWeightKg * KG_TO_ENERGY_KWH * 10) / 10,
    co2SavedKg: Math.round(totalWeightKg * KG_TO_CO2_KG * 10) / 10,
  };
}

export function co2FromWeightKg(weightKg: number) {
  return Math.round(weightKg * KG_TO_CO2_KG * 100) / 100;
}

export function pointsFromDeposit(weightKg: number) {
  return Math.round(weightKg * 55);
}
