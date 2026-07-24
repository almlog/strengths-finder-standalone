// src/utils/employeeActivityPeriod.ts
// 正社員の個別活動期間（入社日・退社日）による経過営業日数の補正
//
// パートナーはCSVのworkDays等から入場/退場を自動反映できるが、正社員の
// XLSXフォーマットは変更しない方針のため、ユーザーが手動で設定した
// 活動期間がある場合のみ、経過営業日数を平日カウントで再計算する。
// 祝日は考慮しない簡易カウント（土日を除くのみ）。

export interface EmployeeActivityPeriod {
  startDate?: string; // 'YYYY-MM-DD'
  endDate?: string;   // 'YYYY-MM-DD'
}

export function countWeekdaysInRange(start: Date, end: Date): number {
  if (start > end) return 0;
  let count = 0;
  const cur = new Date(start);
  cur.setHours(0, 0, 0, 0);
  const endDay = new Date(end);
  endDay.setHours(0, 0, 0, 0);
  while (cur <= endDay) {
    const day = cur.getDay();
    if (day !== 0 && day !== 6) count++;
    cur.setDate(cur.getDate() + 1);
  }
  return count;
}

export function resolveEmployeePassedWeekdays(
  defaultPassedWeekdays: number,
  period: EmployeeActivityPeriod | undefined,
  analysisStart: Date,
  elapsedEnd: Date
): number {
  if (!period || (!period.startDate && !period.endDate)) return defaultPassedWeekdays;

  const requestedStart = period.startDate ? new Date(period.startDate) : analysisStart;
  const requestedEnd = period.endDate ? new Date(period.endDate) : elapsedEnd;

  const startsLater = requestedStart > analysisStart;
  const endsEarlier = requestedEnd < elapsedEnd;

  // 実質的に範囲が狭まらないなら、簡易平日カウントで上書きせず元の値を信頼する
  // （元のpassedWeekdaysは祝日を考慮した正しいカレンダーに基づくため）
  if (!startsLater && !endsEarlier) return defaultPassedWeekdays;

  const effectiveStart = startsLater ? requestedStart : analysisStart;
  const effectiveEnd = endsEarlier ? requestedEnd : elapsedEnd;

  return countWeekdaysInRange(effectiveStart, effectiveEnd);
}
