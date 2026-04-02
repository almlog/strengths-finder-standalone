// src/models/AttendanceTypes.ts
// 勤怠分析機能の型定義

/**
 * 分析オプション
 */
export interface AnalysisOptions {
  /** 今日の日付を分析対象に含めるか（デフォルト: false） */
  includeToday?: boolean;
}

/**
 * カレンダー種別
 */
export type CalendarType = 'weekday' | 'statutory_holiday' | 'non_statutory_holiday';

/**
 * 入力漏れの種類
 */
export type MissingEntryType =
  | 'clockIn'           // 計算開始のみ欠落
  | 'clockOut'          // 計算終了のみ欠落
  | 'both'              // 計算開始・終了とも欠落
  | 'altxOvertimeIn'    // AltX残業出のみ欠落
  | 'altxOvertimeOut';  // AltX残業退のみ欠落

/**
 * 緊急度レベル
 */
export type UrgencyLevel = 'high' | 'medium' | 'low';

/**
 * 勤怠レコード（XLSXの1行に対応）
 */
export interface AttendanceRecord {
  employeeId: string;      // 社員番号
  employeeName: string;    // 氏名
  department: string;      // 部門
  position: string;        // 役職
  date: Date;              // 日付
  dayOfWeek: string;       // 曜日
  calendarType: CalendarType; // カレンダー種別
  calendarRaw: string;     // カレンダー生値（"8時～"等の判定用）
  applicationContent: string; // 申請内容
  clockIn: Date | null;    // 計算開始時刻（旧：出社）
  clockOut: Date | null;   // 計算終了時刻（旧：退社）
  originalClockIn: Date | null;  // 出社時刻（元データ参照用）
  originalClockOut: Date | null; // 退社時刻（元データ参照用）
  earlyStartFlag: boolean;       // 早出フラグ（"1"が入力されていればtrue）
  altxOvertimeIn: Date | null;   // AltX残業出
  altxOvertimeOut: Date | null;  // AltX残業退
  privateOutTime: Date | null;   // 私用外出時刻
  privateReturnTime: Date | null; // 私用戻り時刻
  breakTimeMinutes: number;      // 休憩時間（分）
  nightBreakModification: string; // 深夜休憩修正
  nightWorkMinutes: string;      // 深夜労働時間
  actualWorkHours: string; // 実働時間
  workHours?: string;      // 勤務時間（有休時間の法定外残業調整に使用）
  overtimeHours: string;   // 平日法定外残業(36協定用)
  lateMinutes: string;     // 遅刻
  earlyLeaveMinutes: string; // 早退
  remarks: string;         // 備考
  sheetName: string;       // 元のシート名（プロジェクト/勤務形態）
}

/**
 * 入力漏れ情報
 */
export interface MissingEntry {
  employeeId: string;
  employeeName: string;
  department: string;
  date: Date;
  type: MissingEntryType;
  sheetName: string;
}

/**
 * 従業員ごとの分析結果
 */
export interface EmployeeAnalysisResult {
  employeeId: string;
  employeeName: string;
  department: string;
  sheetName: string;
  missingEntries: MissingEntry[];
  urgencyLevel: UrgencyLevel;
  consecutiveMissingDays: number;
  totalMissingDays: number;
}

/**
 * 分析サマリー
 */
export interface AnalysisSummary {
  totalEmployees: number;
  employeesWithIssues: number;
  highUrgencyCount: number;
  mediumUrgencyCount: number;
  lowUrgencyCount: number;
  analysisDateRange: {
    start: Date;
    end: Date;
  };
  sheetNames: string[];
}

/**
 * 全体分析結果
 */
export interface AttendanceAnalysisResult {
  summary: AnalysisSummary;
  employeeResults: EmployeeAnalysisResult[];
  allRecords: AttendanceRecord[];
  analyzedAt: Date;
}

/**
 * XLSXカラムマッピング
 */
export const XLSX_COLUMN_INDEX = {
  EMPLOYEE_ID: 0,           // 社員番号 (Index 1)
  EMPLOYEE_NAME: 1,         // 氏名 (Index 2)
  DEPARTMENT: 2,            // 部門 (Index 3)
  POSITION: 3,              // 役職 (Index 4)
  DATE: 4,                  // 日付 (Index 5)
  DAY_OF_WEEK: 5,           // 曜日 (Index 6)
  CALENDAR_TYPE: 6,         // カレンダー (Index 7)
  APPLICATION_CONTENT: 7,   // 申請内容 (Index 8)
  ORIGINAL_CLOCK_IN: 8,     // 出社（元データ）(Index 9)
  EARLY_START_FLAG: 9,      // 早出フラグ (Index 10)
  ORIGINAL_CLOCK_OUT: 10,   // 退社（元データ）(Index 11)
  CALC_START: 11,           // 計算開始 (Index 12)
  CALC_END: 12,             // 計算終了 (Index 13)
  ALTX_OVERTIME_IN: 16,     // AltX残業出 (Index 17)
  ALTX_OVERTIME_OUT: 17,    // AltX残業退 (Index 18)
  PRIVATE_OUT_TIME: 28,     // 私用外出 (Index 29)
  PRIVATE_RETURN_TIME: 29,  // 私用戻り (Index 30)
  BREAK_TIME: 36,           // 休憩時間 (Index 37)
  NIGHT_BREAK_MODIFICATION: 38, // 深夜休憩修正 (Index 39)
  ACTUAL_WORK_HOURS: 39,    // 実働時間 (Index 40)
  WORK_HOURS: 40,            // 勤務時間 (Index 41) — 有休時間の法定外残業調整に使用
  NIGHT_WORK_MINUTES: 45,   // 深夜労働 (Index 46)
  LATE_MINUTES: 49,         // 遅刻 (Index 50)
  EARLY_LEAVE_MINUTES: 50,  // 早退 (Index 51)
  LEGAL_OVERTIME_36: 58,    // 平日法定外残業(36協定用) (Index 59)
  REMARKS: 60,              // 備考 (Index 61)
} as const;

/**
 * 休暇関連のキーワード（入力漏れ除外条件）
 */
export const LEAVE_KEYWORDS = [
  '有休', '有給',
  '振休', '振替休日',
  '代休',
  '特休', '特別休暇',
  '欠勤',
  '公休',
  '育休', '育児休暇',
  '産休', '産前産後休暇',
  '介護休暇',
  '慶弔休暇',
  '年末年始',
] as const;

/**
 * 緊急度判定の閾値
 */
export const URGENCY_THRESHOLDS = {
  HIGH: 5,    // 5日以上
  MEDIUM: 3,  // 3日以上
} as const;

/**
 * 緊急度表示用アイコン
 */
export const URGENCY_ICONS: Record<UrgencyLevel, string> = {
  high: '🔴',
  medium: '🟡',
  low: '🟢',
} as const;

// ============================================
// 追加分析機能の型定義
// ============================================

/**
 * 違反の種類（申請漏れベース）
 */
export type ViolationType =
  | 'missing_clock'                    // 出退勤時刻なし
  | 'break_violation'                  // 休憩時間違反
  | 'late_application_missing'         // 遅刻関連の届出漏れ
  | 'early_leave_application_missing'  // 早退関連の届出漏れ
  | 'early_start_application_missing'  // 早出関連の届出漏れ
  | 'time_leave_punch_missing'         // 時間有休打刻漏れ（私用外出/戻り）
  | 'night_break_application_missing'  // 深夜休憩関連の届出漏れ
  | 'remarks_missing'                  // 備考欄未入力（申請に対して）
  | 'remarks_format_warning';          // 備考欄フォーマット警告

/**
 * 届出漏れの表示情報
 * displayName: 一覧表示用の短い名称
 * possibleApplications: マウスオーバーで表示する可能性のある届出一覧
 * notes: 注意書き・対応方法のヒント
 */
export interface ViolationDisplayInfo {
  displayName: string;
  possibleApplications: string[];
  notes: string;
}

/**
 * 違反タイプごとの表示情報マッピング
 * 楽楽勤怠マニュアル v02 に基づく
 */
export const VIOLATION_DISPLAY_INFO: Record<ViolationType, ViolationDisplayInfo> = {
  missing_clock: {
    displayName: '打刻漏れ',
    possibleApplications: ['打刻忘れ／打刻訂正'],
    notes: '【重要】この状態では月締め（出勤簿提出）ができません。打刻訂正申請を行ってください。',
  },
  break_violation: {
    displayName: '休憩時間違反',
    possibleApplications: ['休憩時間修正申請', '休憩時間追加申請'],
    notes: '労働時間6時間超で45分、8時間超で60分の休憩が必要です。',
  },
  late_application_missing: {
    displayName: '届出漏れ（遅刻）',
    possibleApplications: [
      '遅刻・早退申請',
      '電車遅延申請',
      '時差出勤申請（事前申請のみ）',
      '有休申請（半休・事前申請のみ）',
    ],
    notes: '電車遅延の場合は「電車遅延申請」を提出し、到着時刻を跨ぐ遅延証明書（スクショ可）の添付が必要です。例：9:10到着の場合、08:00-09:00と09:00-10:00の遅延情報を添付。',
  },
  early_leave_application_missing: {
    displayName: '届出漏れ（早退）',
    possibleApplications: [
      '遅刻・早退申請',
      '有休申請（半休・事前申請のみ）',
    ],
    notes: '早退が発生した場合は「遅刻・早退申請」を提出してください。半休は事前申請が原則です。',
  },
  early_start_application_missing: {
    displayName: '届出漏れ（早出）',
    possibleApplications: ['早出申請', '早出フラグ入力', '時差出勤申請'],
    notes: '客先常駐者は出勤簿の「早出フラグ」に「1」を入力。内勤者は「早出申請」または「時差出勤申請」の提出・承認が必要です。時差出勤は始業・終業をセットで変更する制度です。',
  },
  time_leave_punch_missing: {
    displayName: '打刻漏れ（時間有休）',
    possibleApplications: ['私用外出', '私用戻り'],
    notes: '時間有休申請時は、退社時に「私用外出」、戻り時に「私用戻り」の打刻が必須です。打刻がないと有休残数が過剰に減算される場合があります。',
  },
  night_break_application_missing: {
    displayName: '届出漏れ（深夜休憩）',
    possibleApplications: ['休憩時間修正申請（深夜休憩修正）'],
    notes: '深夜（22:00-05:00）の休憩は自動計算されません。「休憩時間修正申請」で深夜休憩時間を申告し、深夜割増を正しく計算してください。',
  },
  remarks_missing: {
    displayName: '備考欄未入力',
    possibleApplications: [],
    notes: '申請内容に対して備考欄の記載が必要です。「【事由】＋【詳細】」形式で記載してください。例：直行直帰→訪問先と業務目的、遅延→路線名と遅延時間',
  },
  remarks_format_warning: {
    displayName: '備考欄フォーマット',
    possibleApplications: [],
    notes: '備考欄は「【事由】＋【詳細】」形式での記載を推奨します。例：「JR山手線遅延 20分」「K社ビル（水道橋）面談のため」',
  },
};

/**
 * 休暇申請の種類
 */
export type LeaveType =
  | 'full_day'           // 全休
  | 'half_day_am'        // 午前半休
  | 'half_day_pm'        // 午後半休
  | 'none';              // 休暇なし

/**
 * 勤怠違反情報
 */
export interface AttendanceViolation {
  employeeId: string;
  employeeName: string;
  department: string;
  date: Date;
  type: ViolationType;
  details: string;        // 違反の詳細説明
  requiredBreakMinutes?: number;  // 必要休憩時間（分）
  actualBreakMinutes?: number;    // 実際の休憩時間（分）
}

/**
 * 従業員の日次詳細分析
 */
export interface DailyAttendanceAnalysis {
  record: AttendanceRecord;
  leaveType: LeaveType;
  isHolidayWork: boolean;        // 休日出勤
  isTimelyDeparture: boolean;    // 定時退社
  overtimeMinutes: number;       // 残業時間（分）- 所定超過(7h45m基準)
  legalOvertimeMinutes: number;  // 法定外残業時間（分）- 法定超過(8h基準、36協定用)
  lateMinutes: number;           // 遅刻時間（分）
  earlyLeaveMinutes: number;     // 早退時間（分）
  actualBreakMinutes: number;    // 実際の休憩時間（分）
  requiredBreakMinutes: number;  // 必要な休憩時間（分）
  hasBreakViolation: boolean;    // 休憩時間違反
  hasMissingClock: boolean;      // 出退勤時刻なし
  hasEarlyStartViolation: boolean; // 早出フラグ未入力違反（9時前出社）
  violations: ViolationType[];   // 違反リスト
}

/**
 * 申請カウント（個人分析PDF用）
 * 楽楽勤怠マニュアルの申請一覧に基づく
 */
export interface ApplicationCounts {
  // === 勤務関連（9項目） ===
  overtime: number;               // 残業申請
  earlyStart: number;             // 早出申請
  earlyStartBreak: number;        // 早出中抜け時間帯申請
  lateEarlyLeave: number;         // 遅刻・早退申請
  trainDelay: number;             // 電車遅延申請
  flextime: number;               // 時差出勤申請
  breakModification: number;      // 休憩時間修正申請
  standby: number;                // 待機申請
  nightDuty: number;              // 宿直申請

  // === 休暇・休日関連（15項目） ===
  annualLeave: number;            // 有休申請（全休）
  amLeave: number;                // 午前有休
  pmLeave: number;                // 午後有休
  hourlyLeave: number;            // 時間有休申請
  holidayWork: number;            // 休出申請（休日出勤）
  substituteWork: number;         // 振替出勤申請
  substituteHoliday: number;      // 振替休日申請
  compensatoryLeave: number;      // 代休申請
  absence: number;                // 欠勤申請
  specialLeave: number;           // 特休申請
  menstrualLeave: number;         // 生理休暇申請
  childCareLeave: number;         // 子の看護休暇申請
  hourlyChildCareLeave: number;   // 時間子の看護休暇申請
  nursingCareLeave: number;       // 介護休暇申請
  hourlyNursingCareLeave: number; // 時間介護休暇申請
  postNightLeave: number;         // 明け休申請

  // === その他 ===
  other: number;                  // その他（マニュアル一覧外の申請）
}

/**
 * 従業員の月次サマリー
 */
export interface EmployeeMonthlySummary {
  employeeId: string;
  employeeName: string;
  department: string;
  sheetName: string;
  totalWorkDays: number;         // 総出勤日数
  holidayWorkDays: number;       // 休日出勤日数
  totalOvertimeMinutes: number;  // 総残業時間（分）- 所定超過
  totalLegalOvertimeMinutes: number; // 総法定外残業時間（分）- 法定超過(36協定用)
  lateDays: number;              // 遅刻日数
  earlyLeaveDays: number;        // 早退日数
  timelyDepartureDays: number;   // 定時退社日数
  fullDayLeaveDays: number;      // 全休日数
  halfDayLeaveDays: number;      // 半休日数
  breakViolationDays: number;    // 休憩違反日数
  missingClockDays: number;      // 出退勤時刻なし日数
  earlyStartViolationDays: number; // 早出フラグ未入力日数
  nightWorkDays: number;           // 深夜帯勤務日数（22:00以降退勤）
  violations: AttendanceViolation[]; // 全ての違反
  // 営業日情報（予兆計算用）
  passedWeekdays: number;        // 経過営業日数（分析対象期間内の平日）
  totalWeekdaysInMonth: number;  // 月間営業日数（カレンダー上の平日合計）
  // 個人分析PDF用（新規追加）
  applicationCounts: ApplicationCounts; // 申請カウント
  totalWorkMinutes: number;             // 月間総就業時間（分）
}

/**
 * 部門別集計
 */
export interface DepartmentSummary {
  department: string;
  employeeCount: number;           // 従業員数
  totalOvertimeMinutes: number;    // 部門総残業時間（分）
  averageOvertimeMinutes: number;  // 平均残業時間（分）
  totalLegalOvertimeMinutes: number;    // 部門総法定外残業時間（分）
  averageLegalOvertimeMinutes: number;  // 平均法定外残業時間（分）
  holidayWorkCount: number;        // 休日出勤数
  totalViolations: number;         // 総違反数
  breakViolations: number;         // 休憩違反数
  missingClockCount: number;       // 出退勤時刻なし数
}

/**
 * 拡張分析結果
 */
export interface ExtendedAnalysisResult {
  summary: AnalysisSummary;
  employeeSummaries: EmployeeMonthlySummary[];
  departmentSummaries: DepartmentSummary[];
  allViolations: AttendanceViolation[];
  nightWorkRecords: NightWorkRecord[];
  analyzedAt: Date;
}

/**
 * 深夜帯勤務の閾値（労基法37条4項: 22:00〜5:00）
 * clockOut が22時以降の場合に深夜帯勤務と判定
 */
export const NIGHT_WORK_START_HOUR = 22 as const;

/**
 * 深夜帯勤務レコード
 */
export interface NightWorkRecord {
  employeeName: string;
  department: string;
  date: Date;
  clockOut: Date;
}

/**
 * 法定休憩時間の閾値（労働基準法）
 * - 6時間超: 45分以上
 * - 8時間超: 60分以上
 */
export const BREAK_TIME_REQUIREMENTS = {
  THRESHOLD_6H_MINUTES: 360,   // 6時間 = 360分
  THRESHOLD_8H_MINUTES: 480,   // 8時間 = 480分
  REQUIRED_BREAK_6H: 45,       // 6時間超は45分
  REQUIRED_BREAK_8H: 60,       // 8時間超は60分
} as const;

/**
 * 定時退社判定の基準時刻
 */
export const TIMELY_DEPARTURE_TIME = '17:45' as const;

/**
 * 定時出勤時刻（早出判定の基準）
 * 9時より前の出社で早出フラグがない場合は違反
 */
export const STANDARD_WORK_START_HOUR = 9 as const;

/**
 * 半休キーワード
 */
export const HALF_DAY_KEYWORDS = [
  '半休', '午前半休', '午後半休', 'AM半休', 'PM半休',
  '半日', '午前休', '午後休',
] as const;

/**
 * 全休キーワード
 */
export const FULL_DAY_KEYWORDS = [
  '全休', '終日', '1日',
  '有休', '有給', '年休',
  '振休', '振替休日',
  '代休',
  '特休', '特別休暇',
  '公休',
  '欠勤',
] as const;

// ============================================
// 厳密な申請キーワード（偽陰性対策）
// ============================================

/**
 * 遅刻関連の申請キーワード（厳密版）
 * 「遅刻」だけでなく「遅刻申請」等の正式な申請名を使用
 */
export const LATE_APPLICATION_KEYWORDS = [
  '遅刻申請',
  '遅刻・早退申請',
  '遅刻・早退',
  '遅刻届',
] as const;

/**
 * 電車遅延関連の申請キーワード（厳密版）
 */
export const TRAIN_DELAY_APPLICATION_KEYWORDS = [
  '電車遅延申請',
  '電車遅延届',
] as const;

/**
 * 時差出勤キーワード（完全一致用）
 * 楽楽勤怠では申請内容が「時差出勤」のみで記録される。
 * includes()では「時差出勤を検討中」等を誤検出するため完全一致で判定する。
 */
export const FLEXTIME_EXACT_KEYWORDS = [
  '時差出勤',
] as const;

/**
 * 早退関連の申請キーワード（厳密版）
 */
export const EARLY_LEAVE_APPLICATION_KEYWORDS = [
  '早退申請',
  '遅刻・早退申請',
  '遅刻・早退',
  '早退届',
  '早退',
] as const;

/**
 * 半休関連の申請キーワード（厳密版）
 * 「半休を取りたい」等の曖昧表現を除外し、正式な申請名のみ
 */
export const HALF_DAY_APPLICATION_KEYWORDS = [
  '午前半休',
  '午後半休',
  'AM半休',
  'PM半休',
  '午前休',
  '午後休',
  '午前有休',
  '午後有休',
  '半休申請',
  '半日休暇',
] as const;

/**
 * 早出関連の申請キーワード（厳密版）
 */
export const EARLY_START_APPLICATION_KEYWORDS = [
  '早出申請',
  '早出勤務申請',
  '早出届',
] as const;

/**
 * 休憩時間修正関連の申請キーワード（厳密版）
 */
export const BREAK_MODIFICATION_APPLICATION_KEYWORDS = [
  '休憩時間修正申請',
  '休憩修正申請',
  '深夜休憩修正',
] as const;

/**
 * 直行関連の申請キーワード
 */
export const DIRECT_GO_APPLICATION_KEYWORDS = [
  '直行',
  '直行申請',
  '直行届',
] as const;

/**
 * 直帰関連の申請キーワード
 */
export const DIRECT_RETURN_APPLICATION_KEYWORDS = [
  '直帰',
  '直帰申請',
  '直帰届',
] as const;

/**
 * 打刻修正関連の申請キーワード
 */
export const CLOCK_MODIFICATION_APPLICATION_KEYWORDS = [
  '打刻修正',
  '打刻修正申請',
  '出退勤修正',
  '勤怠修正',
] as const;

/**
 * 時間有休関連のキーワード
 */
export const HOURLY_LEAVE_KEYWORDS = [
  '時間有休',
  '有休時間',
  '時間休',
] as const;

/**
 * 振替出勤関連のキーワード
 */
export const SUBSTITUTE_WORK_KEYWORDS = [
  '振替出勤',
  '振出',
] as const;

/**
 * 振替休日関連のキーワード
 */
export const SUBSTITUTE_HOLIDAY_KEYWORDS = [
  '振替休日',
  '振休',
] as const;

/**
 * 休日出勤関連のキーワード
 */
export const HOLIDAY_WORK_KEYWORDS = [
  '休日出勤',
  '休出',
] as const;

/**
 * 代休関連のキーワード
 */
export const COMPENSATORY_LEAVE_KEYWORDS = [
  '代休',
] as const;

/**
 * 欠勤関連のキーワード
 */
export const ABSENCE_KEYWORDS = [
  '欠勤',
] as const;

/**
 * 特別休暇関連のキーワード
 */
export const SPECIAL_LEAVE_KEYWORDS = [
  '特休',
  '特別休暇',
] as const;

/**
 * 慶弔休暇関連のキーワード
 */
export const CONDOLENCE_LEAVE_KEYWORDS = [
  '慶弔',
  '慶弔休暇',
] as const;

/**
 * 生理休暇関連のキーワード
 */
export const MENSTRUAL_LEAVE_KEYWORDS = [
  '生理休暇',
  '生理休',
] as const;

/**
 * 子の看護休暇関連のキーワード
 */
export const CHILD_CARE_LEAVE_KEYWORDS = [
  '子の看護休暇',
  '看護休暇',
  '子看護',
] as const;

/**
 * 介護休暇関連のキーワード
 */
export const NURSING_CARE_LEAVE_KEYWORDS = [
  '介護休暇',
  '介護休',
] as const;

/**
 * 明け休関連のキーワード
 */
export const POST_NIGHT_LEAVE_KEYWORDS = [
  '明け休',
  '明休',
] as const;

/**
 * 申請キーワードを検証する関数
 * 文字列に指定されたキーワードが含まれるかチェック
 */
export function hasApplicationKeyword(
  applicationContent: string,
  keywords: readonly string[]
): boolean {
  if (!applicationContent) return false;
  return keywords.some(keyword => applicationContent.includes(keyword));
}

/**
 * 申請キーワードを完全一致で検証する関数
 * applicationContent全体が指定キーワードと完全一致するかチェック。
 * 「時差出勤を検討中」等の部分一致を除外するために使用。
 */
export function hasExactApplicationKeyword(
  applicationContent: string,
  keywords: readonly string[]
): boolean {
  if (!applicationContent) return false;
  const trimmed = applicationContent.trim();
  return keywords.some(keyword => trimmed === keyword);
}

// ============================================
// 36協定・残業時間管理
// ============================================

/**
 * 残業時間の閾値（36協定・厚労省指針に基づく）
 * - 35時間: 注意ライン（上長報告義務）
 * - 45時間: 36協定の基本上限
 * - 55時間: 警戒ライン（残業抑制指示）
 * - 65時間: 深刻ライン（残業禁止措置の検討）
 * - 70時間: 重大ライン（親会社報告）
 * - 80時間: 健康リスク警告（医師面接指導の目安）
 * - 100時間: 特別条項適用時でも超過不可
 */
export const OVERTIME_THRESHOLDS = {
  WARNING_HOURS: 35,          // 注意ライン（上長報告）
  LIMIT_HOURS: 45,            // 月45時間（36協定基本上限）
  CAUTION_HOURS: 55,          // 警戒ライン
  SERIOUS_HOURS: 65,          // 深刻ライン
  SEVERE_HOURS: 70,           // 重大ライン（親会社報告）
  CRITICAL_HOURS: 80,         // 健康リスクライン
  SPECIAL_LIMIT_HOURS: 100,   // 特別条項でも超過不可
  ANNUAL_LIMIT_HOURS: 360,    // 年360時間上限
} as const;

/** 所定労働時間（分）: 7時間45分 */
export const STANDARD_WORK_MINUTES = 465 as const;

/** 法定労働時間（分）: 8時間 */
export const LEGAL_WORK_MINUTES = 480 as const;

/**
 * 残業アラートレベル（7段階）
 */
export type OvertimeAlertLevel =
  | 'normal'    // 正常（35時間未満）
  | 'warning'   // 注意（35時間以上）- 上長報告
  | 'exceeded'  // 超過（45時間以上）- 36協定基本上限
  | 'caution'   // 警戒（55時間以上）- 残業抑制指示
  | 'serious'   // 深刻（65時間以上）- 残業禁止措置検討
  | 'severe'    // 重大（70時間以上）- 親会社報告
  | 'critical'  // 危険（80時間以上）- 医師面接指導
  | 'illegal';  // 違法（100時間以上）- 即時是正

/**
 * 違反タイプの緊急度レベル
 * - high: 法令違反（即時是正が必要）
 * - medium: 届出漏れ（申請が必要）
 * - none: 緊急度別カウントには含めない（問題ありにはカウント）
 */
export type ViolationUrgencyLevel = 'high' | 'medium' | 'none';

/**
 * 違反タイプから緊急度を判定するマッピング
 */
export const VIOLATION_URGENCY: Record<ViolationType, ViolationUrgencyLevel> = {
  // 法令違反（高緊急度）
  break_violation: 'high',                    // 休憩時間違反（労働基準法違反）
  night_break_application_missing: 'high',    // 深夜休憩申請漏れ（深夜労働規制）

  // 届出漏れ（中緊急度）
  late_application_missing: 'medium',         // 届出漏れ（遅刻）
  early_leave_application_missing: 'medium',  // 届出漏れ（早退）
  early_start_application_missing: 'medium',  // 届出漏れ（早出）
  time_leave_punch_missing: 'medium',         // 時間有休の私用外出打刻漏れ

  // 問題ありにはカウントするが、緊急度別には含めない
  missing_clock: 'none',           // 打刻漏れ（月締め不可だが法令違反ではない）
  remarks_missing: 'none',         // 備考未入力
  remarks_format_warning: 'none',  // 備考フォーマット警告
};

/**
 * 従業員の違反から高緊急度の違反数をカウント
 */
export function countHighUrgencyViolations(violations: AttendanceViolation[]): number {
  return violations.filter(v => VIOLATION_URGENCY[v.type] === 'high').length;
}

/**
 * 従業員の違反から中緊急度の違反数をカウント
 */
export function countMediumUrgencyViolations(violations: AttendanceViolation[]): number {
  return violations.filter(v => VIOLATION_URGENCY[v.type] === 'medium').length;
}

/**
 * 残業アラートの表示情報
 */
export const OVERTIME_ALERT_INFO: Record<OvertimeAlertLevel, { label: string; color: string; description: string; action: string }> = {
  normal: {
    label: '正常',
    color: 'green',
    description: '残業時間は正常範囲内です。',
    action: '',
  },
  warning: {
    label: '注意',
    color: 'yellow',
    description: '月35時間を超過しています。',
    action: '上長への報告が必要です',
  },
  exceeded: {
    label: '超過',
    color: 'orange',
    description: '36協定の月45時間上限を超過しています。',
    action: '特別条項の確認が必要です',
  },
  caution: {
    label: '警戒',
    color: 'orange-dark',
    description: '月55時間を超過しています。',
    action: '残業抑制指示を検討してください',
  },
  serious: {
    label: '深刻',
    color: 'vermilion',
    description: '月65時間を超過しています。',
    action: '残業禁止措置の検討が必要です',
  },
  severe: {
    label: '重大',
    color: 'red-orange',
    description: '月70時間を超過しています。',
    action: '親会社への報告が必要です',
  },
  critical: {
    label: '危険',
    color: 'red',
    description: '月80時間超は健康リスクが高まります。',
    action: '医師の面接指導を実施してください',
  },
  illegal: {
    label: '違法',
    color: 'darkred',
    description: '月100時間は特別条項でも超過不可です。',
    action: '直ちに是正が必要です',
  },
};
