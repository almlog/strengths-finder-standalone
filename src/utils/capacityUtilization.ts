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

export interface MemberElapsedDays {
  passedWeekdays: number;
}

// メンバー全員が同じ経過営業日数だったと仮定せず、各自の経過営業日数を
// 個別に合算する。月途中でJOINしたメンバーがいても、その人の分だけ
// 正しく少ない基準工数になる。
export function sumExpectedCapacityMinutes(
  members: MemberElapsedDays[],
  minutesPerDay: number
): number {
  return members.reduce((sum, m) => sum + m.passedWeekdays * minutesPerDay, 0);
}
