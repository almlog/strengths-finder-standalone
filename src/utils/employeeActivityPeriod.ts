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

// 'YYYY/MM/DD' 形式（e-staffing CSVの契約開始/契約終了）をDateにパースする。
// 不正な形式ならundefinedを返す。
function parseSlashDate(value: string): Date | undefined {
  const m = value.trim().match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})$/);
  if (!m) return undefined;
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

export interface PartnerElapsedDaysRecord {
  workDays: number;
  absentDays: number;
  leaveDays: number;
  contractStart: string; // 'YYYY/MM/DD' or ''
  contractEnd: string;   // 'YYYY/MM/DD' or ''
}

// パートナーの経過営業日数を求める。
//
// workDays+absentDays+leaveDays（実績データの合計）は、正社員のpassedWeekdays
// （カレンダー種別から集計した経過営業日数）と違い、実績ベースの合計であるため、
// この3項目に含まれない休暇区分があると本来のカレンダー営業日数より
// 少なく出てしまうことがある。契約開始日が分かる場合は、正社員と同じ
// 「カレンダー計算」に統一し、契約開始日が無い場合のみ実績合計を使う。
// 手動で活動期間が設定されている場合は、それを最優先する。
export function resolvePartnerElapsedDays(
  record: PartnerElapsedDaysRecord,
  manualPeriod: EmployeeActivityPeriod | undefined,
  analysisStart: Date,
  elapsedEnd: Date
): number {
  const attendanceBasedDefault = record.workDays + record.absentDays + record.leaveDays;

  let calendarBasedDefault = attendanceBasedDefault;
  const contractStartDate = record.contractStart ? parseSlashDate(record.contractStart) : undefined;
  if (contractStartDate) {
    const contractEndDate = record.contractEnd ? parseSlashDate(record.contractEnd) : undefined;
    const effectiveStart = contractStartDate > analysisStart ? contractStartDate : analysisStart;
    const effectiveEnd = contractEndDate && contractEndDate < elapsedEnd ? contractEndDate : elapsedEnd;
    calendarBasedDefault = countWeekdaysInRange(effectiveStart, effectiveEnd);
  }

  return resolveEmployeePassedWeekdays(calendarBasedDefault, manualPeriod, analysisStart, elapsedEnd);
}
