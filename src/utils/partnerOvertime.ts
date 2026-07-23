// src/utils/partnerOvertime.ts
// パートナー（e-staffing）の法定外残業計算
// CSVのovertimeMinutesを正とする（独自の再計算式は使わない）

export interface PartnerOvertimeSource {
  totalMinutes: number;
  workDays: number;
  overtimeMinutes: number;
}

export function getPartnerOvertimeMinutes(record: PartnerOvertimeSource): number {
  return record.overtimeMinutes;
}
