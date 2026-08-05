// src/utils/employeeActivityPeriod.ts
// 正社員の個別活動期間（入社日・退社日）による経過営業日数の補正
//
// パートナーはCSVのworkDays等から入場/退場を自動反映できるが、正社員の
// XLSXフォーマットは変更しない方針のため、ユーザーが手動で設定した
// 活動期間がある場合のみ、経過営業日数を平日カウントで再計算する。
// 国民の祝日は @holiday-jp/holiday_jp で除外する。

import holiday_jp from '@holiday-jp/holiday_jp';

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
    if (day !== 0 && day !== 6 && !holiday_jp.isHoliday(cur)) count++;
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
  targetMonth?: string;  // 'YYYY/MM'（e-staffing CSVの対象年月）
}

// 'YYYY/MM' 形式（e-staffing CSVの対象年月）から、その月の1日〜末日のDateレンジを返す。
// 不正な形式ならundefinedを返す。
export function resolveTargetMonthRange(targetMonth: string): { start: Date; end: Date } | undefined {
  const m = targetMonth.trim().match(/^(\d{4})\/(\d{1,2})$/);
  if (!m) return undefined;
  const year = Number(m[1]);
  const month = Number(m[2]); // 1-indexed
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0); // 月の末日（次月0日目）
  return { start, end };
}

// パートナーの経過営業日数を求める。
//
// workDays+absentDays+leaveDays（実績データの合計）は、正社員のpassedWeekdays
// （カレンダー種別から集計した経過営業日数）と違い、実績ベースの合計であるため、
// この3項目に含まれない休暇区分があると本来のカレンダー営業日数より
// 少なく出てしまうことがある。契約開始日が分かる場合は、正社員と同じ
// 「カレンダー計算」に統一し、契約開始日が無い場合のみ実績合計を使う。
// 手動で活動期間が設定されている場合は、それを最優先する。
//
// 分析期間(analysisStart/elapsedEnd)は本来、正社員XLSXの日付範囲から
// 算出したものだが、パートナーは正社員データ無しで単独分析される
// 可能性があるため、CSV自身が持つ「対象年月」があればそちらを優先する。
// 対象月が現在進行中の場合は今日時点までにクリップする。
export function resolvePartnerElapsedDays(
  record: PartnerElapsedDaysRecord,
  manualPeriod: EmployeeActivityPeriod | undefined,
  analysisStart: Date,
  elapsedEnd: Date,
  now: Date = new Date()
): number {
  const attendanceBasedDefault = record.workDays + record.absentDays + record.leaveDays;

  const targetMonthRange = record.targetMonth ? resolveTargetMonthRange(record.targetMonth) : undefined;
  let effectiveAnalysisStart = analysisStart;
  let effectiveElapsedEnd = elapsedEnd;
  if (targetMonthRange) {
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);
    effectiveAnalysisStart = targetMonthRange.start;
    effectiveElapsedEnd = targetMonthRange.end < today ? targetMonthRange.end : today;
  }

  let calendarBasedDefault = attendanceBasedDefault;
  const contractStartDate = record.contractStart ? parseSlashDate(record.contractStart) : undefined;
  if (contractStartDate) {
    const contractEndDate = record.contractEnd ? parseSlashDate(record.contractEnd) : undefined;
    const effectiveStart = contractStartDate > effectiveAnalysisStart ? contractStartDate : effectiveAnalysisStart;
    const effectiveEnd = contractEndDate && contractEndDate < effectiveElapsedEnd ? contractEndDate : effectiveElapsedEnd;
    calendarBasedDefault = countWeekdaysInRange(effectiveStart, effectiveEnd);
  }

  return resolveEmployeePassedWeekdays(calendarBasedDefault, manualPeriod, effectiveAnalysisStart, effectiveElapsedEnd);
}
