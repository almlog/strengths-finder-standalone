// src/utils/capacityUtilization.ts
// 工数稼働率の算出（有休調整なし・生の差異のみ）

export interface CapacityUtilizationInput {
  expectedMinutesPassed: number;
  actualMinutes: number;
}

export interface CapacityUtilizationResult {
  rate: number;
  delta: number;
}

export function calculateCapacityUtilization(
  { expectedMinutesPassed, actualMinutes }: CapacityUtilizationInput
): CapacityUtilizationResult {
  const base = Math.max(1, expectedMinutesPassed);
  return {
    rate: (actualMinutes / base) * 100,
    delta: actualMinutes - expectedMinutesPassed,
  };
}
