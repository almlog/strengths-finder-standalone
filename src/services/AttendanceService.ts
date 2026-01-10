// src/services/AttendanceService.ts
// 勤怠分析サービス

import * as XLSX from 'xlsx';
import {
  AttendanceRecord,
  MissingEntry,
  EmployeeAnalysisResult,
  AnalysisSummary,
  AttendanceAnalysisResult,
  CalendarType,
  MissingEntryType,
  UrgencyLevel,
  LeaveType,
  ViolationType,
  AttendanceViolation,
  DailyAttendanceAnalysis,
  EmployeeMonthlySummary,
  DepartmentSummary,
  ExtendedAnalysisResult,
  XLSX_COLUMN_INDEX,
  LEAVE_KEYWORDS,
  URGENCY_THRESHOLDS,
  BREAK_TIME_REQUIREMENTS,
  TIMELY_DEPARTURE_TIME,
  STANDARD_WORK_START_HOUR,
  HALF_DAY_KEYWORDS,
  FULL_DAY_KEYWORDS,
  // 厳密な申請キーワード（偽陰性対策）
  LATE_APPLICATION_KEYWORDS,
  TRAIN_DELAY_APPLICATION_KEYWORDS,
  FLEXTIME_APPLICATION_KEYWORDS,
  EARLY_LEAVE_APPLICATION_KEYWORDS,
  HALF_DAY_APPLICATION_KEYWORDS,
  EARLY_START_APPLICATION_KEYWORDS,
  hasApplicationKeyword,
  // 36協定・残業時間管理
  OVERTIME_THRESHOLDS,
  OvertimeAlertLevel,
} from '../models/AttendanceTypes';

/**
 * 勤怠分析サービス
 */
export class AttendanceService {

  /**
   * XLSXファイルをパースして勤怠レコードを取得
   */
  static async parseXlsx(file: File): Promise<AttendanceRecord[]> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (e) => {
        try {
          const data = e.target?.result;
          const workbook = XLSX.read(data, { type: 'binary', cellDates: true });
          const allRecords: AttendanceRecord[] = [];

          workbook.SheetNames.forEach(sheetName => {
            const sheet = workbook.Sheets[sheetName];
            const jsonData = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
              header: 1,
              defval: '',
              raw: false,
            });

            // Skip header row (row 0), parse each data row
            for (let i = 1; i < jsonData.length; i++) {
              const row = jsonData[i] as unknown[];
              const record = this.parseRow(row, sheetName);
              if (record) {
                allRecords.push(record);
              }
            }
          });

          resolve(allRecords);
        } catch (error) {
          reject(new Error(`XLSXパース エラー: ${error instanceof Error ? error.message : 'Unknown error'}`));
        }
      };

      reader.onerror = () => {
        reject(new Error('ファイル読み込みに失敗しました'));
      };

      reader.readAsBinaryString(file);
    });
  }

  /**
   * 行データをAttendanceRecordにパース
   */
  private static parseRow(row: unknown[], sheetName: string): AttendanceRecord | null {
    // 空行またはヘッダー行をスキップ
    const employeeId = String(row[XLSX_COLUMN_INDEX.EMPLOYEE_ID] || '').trim();
    if (!employeeId || employeeId === '社員番号') {
      return null;
    }

    const dateValue = row[XLSX_COLUMN_INDEX.DATE];
    const date = this.parseDate(dateValue);
    if (!date) {
      return null;
    }

    const calendarRaw = String(row[XLSX_COLUMN_INDEX.CALENDAR_TYPE] || '');
    const calendarType = this.parseCalendarType(calendarRaw);

    // 休憩時間をパース（"1:00" 形式を分に変換）
    const breakTimeMinutes = this.parseTimeToMinutes(String(row[XLSX_COLUMN_INDEX.BREAK_TIME] || ''));

    // 早出フラグ: "1" が入力されていればtrue
    const earlyStartFlagValue = String(row[XLSX_COLUMN_INDEX.EARLY_START_FLAG] || '').trim();
    const earlyStartFlag = earlyStartFlagValue === '1';

    return {
      employeeId,
      employeeName: String(row[XLSX_COLUMN_INDEX.EMPLOYEE_NAME] || '').trim(),
      department: String(row[XLSX_COLUMN_INDEX.DEPARTMENT] || '').trim(),
      position: String(row[XLSX_COLUMN_INDEX.POSITION] || '').trim(),
      date,
      dayOfWeek: String(row[XLSX_COLUMN_INDEX.DAY_OF_WEEK] || '').trim(),
      calendarType,
      calendarRaw,
      applicationContent: String(row[XLSX_COLUMN_INDEX.APPLICATION_CONTENT] || '').trim(),
      // 出退勤時刻: 計算開始/終了カラムを使用
      clockIn: this.parseDateTime(row[XLSX_COLUMN_INDEX.CALC_START]),
      clockOut: this.parseDateTime(row[XLSX_COLUMN_INDEX.CALC_END]),
      // 元データの出社/退社も保持
      originalClockIn: this.parseDateTime(row[XLSX_COLUMN_INDEX.ORIGINAL_CLOCK_IN]),
      originalClockOut: this.parseDateTime(row[XLSX_COLUMN_INDEX.ORIGINAL_CLOCK_OUT]),
      // 早出フラグ
      earlyStartFlag,
      // AltX残業
      altxOvertimeIn: this.parseDateTime(row[XLSX_COLUMN_INDEX.ALTX_OVERTIME_IN]),
      altxOvertimeOut: this.parseDateTime(row[XLSX_COLUMN_INDEX.ALTX_OVERTIME_OUT]),
      // 私用外出/戻り（時間有休用）
      privateOutTime: this.parseDateTime(row[XLSX_COLUMN_INDEX.PRIVATE_OUT_TIME]),
      privateReturnTime: this.parseDateTime(row[XLSX_COLUMN_INDEX.PRIVATE_RETURN_TIME]),
      // 休憩時間
      breakTimeMinutes,
      // 深夜休憩修正
      nightBreakModification: String(row[XLSX_COLUMN_INDEX.NIGHT_BREAK_MODIFICATION] || '').trim(),
      // 深夜労働時間
      nightWorkMinutes: String(row[XLSX_COLUMN_INDEX.NIGHT_WORK_MINUTES] || '').trim(),
      actualWorkHours: String(row[XLSX_COLUMN_INDEX.ACTUAL_WORK_HOURS] || '').trim(),
      // 残業時間: 平日法定外残業(36協定用)を使用
      overtimeHours: String(row[XLSX_COLUMN_INDEX.LEGAL_OVERTIME_36] || '').trim(),
      lateMinutes: String(row[XLSX_COLUMN_INDEX.LATE_MINUTES] || '').trim(),
      earlyLeaveMinutes: String(row[XLSX_COLUMN_INDEX.EARLY_LEAVE_MINUTES] || '').trim(),
      remarks: String(row[XLSX_COLUMN_INDEX.REMARKS] || '').trim(),
      sheetName,
    };
  }

  /**
   * 日付文字列をDateにパース
   */
  private static parseDate(value: unknown): Date | null {
    if (!value) return null;

    // Date型の場合
    if (value instanceof Date) {
      return value;
    }

    // 文字列の場合 (YYYY-MM-DD または YYYY/MM/DD)
    const str = String(value).trim();
    if (!str) return null;

    const match = str.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
    if (match) {
      const [, year, month, day] = match;
      return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    }

    return null;
  }

  /**
   * 日時文字列をDateにパース
   */
  private static parseDateTime(value: unknown): Date | null {
    if (!value) return null;

    // Date型の場合
    if (value instanceof Date) {
      return value;
    }

    // 文字列の場合 (YYYY-MM-DD HH:MM または YYYY/MM/DD HH:MM)
    const str = String(value).trim();
    if (!str) return null;

    const match = str.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})\s+(\d{1,2}):(\d{2})/);
    if (match) {
      const [, year, month, day, hour, minute] = match;
      return new Date(
        parseInt(year),
        parseInt(month) - 1,
        parseInt(day),
        parseInt(hour),
        parseInt(minute)
      );
    }

    return null;
  }

  /**
   * カレンダー種別をパース
   * 「8時～」「9時～」等の時間指定は平日として扱う
   */
  private static parseCalendarType(value: string): CalendarType {
    if (value === '平日') return 'weekday';
    if (value === '法定休') return 'statutory_holiday';
    if (value === '法定外') return 'non_statutory_holiday';

    // 時間指定カレンダー（例: "8時～"、"9時～"）は平日扱い
    if (/^\d+時/.test(value)) {
      return 'weekday';
    }

    return 'non_statutory_holiday';
  }

  /**
   * 8時カレンダーメンバーかどうか判定
   * 8時カレンダーは実態として9時出社のため、遅刻判定を調整
   */
  static is8HourCalendar(calendarRaw: string): boolean {
    return /^8時/.test(calendarRaw);
  }

  /**
   * シート名から8時スケジュールを検出
   * シート名に "800" や "8:00" のパターンがある場合は8時スケジュール
   * 例: "KDDI_日勤_800-1630～930-1800_1200…"
   */
  static is8HourScheduleFromSheetName(sheetName: string): boolean {
    // パターン: "800-", "8:00-", "_800", "_8時" など
    return /[_-]800[-_～]|[_-]8:00[-_～]|_8時/.test(sheetName);
  }

  /**
   * 入力漏れを検出
   */
  static detectMissingEntries(records: AttendanceRecord[]): EmployeeAnalysisResult[] {
    // 従業員ごとにグループ化
    const employeeRecords = new Map<string, AttendanceRecord[]>();

    records.forEach(record => {
      const key = record.employeeId;
      if (!employeeRecords.has(key)) {
        employeeRecords.set(key, []);
      }
      employeeRecords.get(key)!.push(record);
    });

    const results: EmployeeAnalysisResult[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    employeeRecords.forEach((employeeData, employeeId) => {
      const missingEntries: MissingEntry[] = [];
      const firstRecord = employeeData[0];

      employeeData.forEach(record => {
        // 未来日付はスキップ
        if (record.date >= today) {
          return;
        }

        // 平日の出退勤チェック
        if (record.calendarType === 'weekday') {
          // 休暇申請がある場合はスキップ
          if (!this.hasLeaveApplication(record.applicationContent)) {
            // 入力漏れチェック
            const missingType = this.checkMissingEntry(record);
            if (missingType) {
              missingEntries.push({
                employeeId: record.employeeId,
                employeeName: record.employeeName,
                department: record.department,
                date: record.date,
                type: missingType,
                sheetName: record.sheetName,
              });
            }
          }
        }

        // AltX残業の入力漏れチェック（平日・休日問わず）
        const altxMissing = this.checkAltxOvertimeMissing(record);
        if (altxMissing) {
          missingEntries.push({
            employeeId: record.employeeId,
            employeeName: record.employeeName,
            department: record.department,
            date: record.date,
            type: altxMissing,
            sheetName: record.sheetName,
          });
        }
      });

      // 入力漏れがある場合のみ結果に追加
      if (missingEntries.length > 0) {
        // 日付順にソート
        missingEntries.sort((a, b) => a.date.getTime() - b.date.getTime());

        // 連続日数を計算
        const consecutiveDays = this.calculateConsecutiveDays(missingEntries);

        results.push({
          employeeId,
          employeeName: firstRecord.employeeName,
          department: firstRecord.department,
          sheetName: firstRecord.sheetName,
          missingEntries,
          urgencyLevel: this.calculateUrgency(consecutiveDays),
          consecutiveMissingDays: consecutiveDays,
          totalMissingDays: missingEntries.length,
        });
      }
    });

    // 緊急度順（高→中→低）、次に入力漏れ日数順でソート
    results.sort((a, b) => {
      const urgencyOrder = { high: 0, medium: 1, low: 2 };
      const urgencyDiff = urgencyOrder[a.urgencyLevel] - urgencyOrder[b.urgencyLevel];
      if (urgencyDiff !== 0) return urgencyDiff;
      return b.totalMissingDays - a.totalMissingDays;
    });

    return results;
  }

  /**
   * 休暇申請があるかチェック
   */
  private static hasLeaveApplication(applicationContent: string): boolean {
    if (!applicationContent) return false;
    return LEAVE_KEYWORDS.some(keyword => applicationContent.includes(keyword));
  }

  /**
   * 入力漏れの種類を判定
   * 通常の出退勤に加え、AltX残業の片方入力漏れも検出
   */
  private static checkMissingEntry(record: AttendanceRecord): MissingEntryType | null {
    const hasClockIn = record.clockIn !== null;
    const hasClockOut = record.clockOut !== null;

    // 出勤があるが退勤がない
    if (hasClockIn && !hasClockOut) {
      return 'clockOut';
    }

    // 退勤があるが出勤がない
    if (!hasClockIn && hasClockOut) {
      return 'clockIn';
    }

    // 両方ない（申請もない場合は入力漏れ）
    if (!hasClockIn && !hasClockOut) {
      // 実働時間がある場合は正常（計算済み）
      if (record.actualWorkHours && record.actualWorkHours !== '0:00') {
        return null;
      }
      return 'both';
    }

    return null;
  }

  /**
   * AltX残業の入力漏れを判定
   * 片方だけ入力されている場合は入力漏れとして検出（両方未入力は無視）
   */
  private static checkAltxOvertimeMissing(record: AttendanceRecord): MissingEntryType | null {
    const hasAltxIn = record.altxOvertimeIn !== null;
    const hasAltxOut = record.altxOvertimeOut !== null;

    // 片方だけ入力されている場合のみ入力漏れ
    if (hasAltxIn && !hasAltxOut) {
      return 'altxOvertimeOut';
    }

    if (!hasAltxIn && hasAltxOut) {
      return 'altxOvertimeIn';
    }

    // 両方入力済み、または両方未入力は正常
    return null;
  }

  /**
   * 連続入力漏れ日数を計算
   */
  private static calculateConsecutiveDays(entries: MissingEntry[]): number {
    if (entries.length === 0) return 0;
    if (entries.length === 1) return 1;

    let maxConsecutive = 1;
    let currentConsecutive = 1;

    for (let i = 1; i < entries.length; i++) {
      const prevDate = entries[i - 1].date;
      const currDate = entries[i].date;

      // 日付の差分を計算（ミリ秒）
      const diffDays = (currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24);

      // 土日を考慮（1-3日以内なら連続とみなす）
      if (diffDays <= 3) {
        currentConsecutive++;
        maxConsecutive = Math.max(maxConsecutive, currentConsecutive);
      } else {
        currentConsecutive = 1;
      }
    }

    return maxConsecutive;
  }

  /**
   * 緊急度を計算
   */
  static calculateUrgency(consecutiveDays: number): UrgencyLevel {
    if (consecutiveDays >= URGENCY_THRESHOLDS.HIGH) return 'high';
    if (consecutiveDays >= URGENCY_THRESHOLDS.MEDIUM) return 'medium';
    return 'low';
  }

  /**
   * 全体分析を実行
   */
  static analyzeAttendance(records: AttendanceRecord[]): AttendanceAnalysisResult {
    const employeeResults = this.detectMissingEntries(records);

    // 日付範囲を取得
    const dates = records.map(r => r.date).filter(d => d !== null);
    const minDate = dates.length > 0 ? new Date(Math.min(...dates.map(d => d.getTime()))) : new Date();
    const maxDate = dates.length > 0 ? new Date(Math.max(...dates.map(d => d.getTime()))) : new Date();

    // ユニークな従業員数
    const uniqueEmployees = new Set(records.map(r => r.employeeId));

    // ユニークなシート名
    const uniqueSheets = [...new Set(records.map(r => r.sheetName))];

    // 緊急度別カウント
    const highCount = employeeResults.filter(r => r.urgencyLevel === 'high').length;
    const mediumCount = employeeResults.filter(r => r.urgencyLevel === 'medium').length;
    const lowCount = employeeResults.filter(r => r.urgencyLevel === 'low').length;

    const summary: AnalysisSummary = {
      totalEmployees: uniqueEmployees.size,
      employeesWithIssues: employeeResults.length,
      highUrgencyCount: highCount,
      mediumUrgencyCount: mediumCount,
      lowUrgencyCount: lowCount,
      analysisDateRange: {
        start: minDate,
        end: maxDate,
      },
      sheetNames: uniqueSheets,
    };

    return {
      summary,
      employeeResults,
      allRecords: records,
      analyzedAt: new Date(),
    };
  }

  /**
   * 分析結果をCSVに変換
   */
  static exportToCsv(results: EmployeeAnalysisResult[]): string {
    const URGENCY_DISPLAY: Record<UrgencyLevel, string> = {
      high: '高',
      medium: '中',
      low: '低',
    };

    const MISSING_TYPE_DISPLAY: Record<string, string> = {
      clockIn: '計算開始のみ未入力',
      clockOut: '計算終了のみ未入力',
      both: '両方未入力',
      altxOvertimeIn: 'AltX残業出のみ未入力',
      altxOvertimeOut: 'AltX残業退のみ未入力',
    };

    // BOM付きUTF-8
    const BOM = '\uFEFF';

    const headers = ['社員番号', '氏名', '部門', 'プロジェクト', '入力漏れ日数', '緊急度', '入力漏れ日付', '詳細'];
    const rows = results.map(result => {
      const dates = result.missingEntries.map(e => this.formatDate(e.date)).join(', ');
      const types = [...new Set(result.missingEntries.map(e => MISSING_TYPE_DISPLAY[e.type]))].join(', ');

      return [
        result.employeeId,
        result.employeeName,
        result.department,
        result.sheetName,
        result.totalMissingDays.toString(),
        URGENCY_DISPLAY[result.urgencyLevel],
        dates,
        types,
      ].map(cell => `"${cell.replace(/"/g, '""')}"`).join(',');
    });

    return BOM + [headers.join(','), ...rows].join('\n');
  }

  /**
   * 日付をフォーマット
   */
  static formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * 日付範囲をフォーマット
   */
  static formatDateRange(start: Date, end: Date): string {
    return `${this.formatDate(start)} 〜 ${this.formatDate(end)}`;
  }

  // ============================================
  // 拡張分析機能
  // ============================================

  /**
   * 休暇種別を判定
   */
  static determineLeaveType(applicationContent: string): LeaveType {
    if (!applicationContent) return 'none';

    // 半休チェック（先にチェック - より具体的）
    for (const keyword of HALF_DAY_KEYWORDS) {
      if (applicationContent.includes(keyword)) {
        if (applicationContent.includes('午前') || applicationContent.includes('AM')) {
          return 'half_day_am';
        }
        if (applicationContent.includes('午後') || applicationContent.includes('PM')) {
          return 'half_day_pm';
        }
        return 'half_day_am'; // デフォルトは午前半休
      }
    }

    // 全休チェック
    for (const keyword of FULL_DAY_KEYWORDS) {
      if (applicationContent.includes(keyword)) {
        return 'full_day';
      }
    }

    return 'none';
  }

  /**
   * 時間文字列を分に変換 (HH:MM → minutes)
   */
  static parseTimeToMinutes(timeStr: string): number {
    if (!timeStr) return 0;
    const match = timeStr.match(/^(\d+):(\d{2})$/);
    if (!match) return 0;
    return parseInt(match[1]) * 60 + parseInt(match[2]);
  }

  /**
   * 分を時間文字列に変換 (minutes → HH:MM)
   */
  static formatMinutesToTime(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}:${String(mins).padStart(2, '0')}`;
  }

  /**
   * 必要な休憩時間を計算（労働基準法に基づく）
   */
  static calculateRequiredBreakMinutes(actualWorkMinutes: number): number {
    if (actualWorkMinutes > BREAK_TIME_REQUIREMENTS.THRESHOLD_8H_MINUTES) {
      return BREAK_TIME_REQUIREMENTS.REQUIRED_BREAK_8H;
    }
    if (actualWorkMinutes > BREAK_TIME_REQUIREMENTS.THRESHOLD_6H_MINUTES) {
      return BREAK_TIME_REQUIREMENTS.REQUIRED_BREAK_6H;
    }
    return 0;
  }

  /**
   * 残業時間を取得（分）
   * - 平日: Excelの「平日法定外残業(36協定用)」カラムを使用
   * - 休日出勤: 実働時間全体
   *
   * 注: 8時カレンダー登録者も通常通り残業時間を取得する。
   * 8時カレンダー特殊処理は「遅刻誤検出」の防止であり、残業時間とは無関係。
   */
  static calculateOvertimeMinutes(record: AttendanceRecord): number {
    // 休日出勤は実働時間全体が残業
    if (record.calendarType !== 'weekday') {
      const actualWorkMinutes = this.parseTimeToMinutes(record.actualWorkHours);
      return actualWorkMinutes;
    }

    // 平日はExcelの「平日法定外残業(36協定用)」カラムの値を使用
    // このカラムは楽楽勤怠が自動計算した36協定ベースの残業時間
    const overtimeFromExcel = this.parseTimeToMinutes(record.overtimeHours);
    return overtimeFromExcel;
  }

  /**
   * 定時退社かどうか判定
   * - 遅刻・早退・欠勤・休日出勤を除外
   * - 17:45前退社または休暇取得
   */
  static isTimelyDeparture(record: AttendanceRecord, leaveType: LeaveType): boolean {
    // 休日は対象外
    if (record.calendarType !== 'weekday') {
      return false;
    }

    // 全休は定時退社としてカウント
    if (leaveType === 'full_day') {
      return true;
    }

    // 遅刻・早退がある場合は対象外
    if (record.lateMinutes && record.lateMinutes !== '0:00') {
      return false;
    }
    if (record.earlyLeaveMinutes && record.earlyLeaveMinutes !== '0:00') {
      return false;
    }

    // 退勤時刻チェック
    if (!record.clockOut) {
      return false;
    }

    const [targetHour, targetMinute] = TIMELY_DEPARTURE_TIME.split(':').map(Number);
    const clockOutHour = record.clockOut.getHours();
    const clockOutMinute = record.clockOut.getMinutes();

    // 17:45以前に退社
    if (clockOutHour < targetHour || (clockOutHour === targetHour && clockOutMinute <= targetMinute)) {
      return true;
    }

    return false;
  }

  /**
   * 8時スケジュールの遅刻を除外すべきか判定
   *
   * 8時カレンダーのシートで、出社カラムにスケジュール情報（例: "900-1730/..."）が
   * 設定されていない従業員は、カレンダー上8時出社扱いとなり9時出社で1時間遅刻と記録される。
   * しかし実態として8時カレンダーは9時出社のため、この遅刻は除外する必要がある。
   *
   * 判定条件:
   * - シート名が8時スケジュール（800-パターン）
   * - originalClockInが有効な日時（スケジュール情報がない = 楽楽勤怠側で9時スケジュール未設定）
   * - 遅刻が60分（ちょうど1時間）
   * - 出社時刻が9時台
   */
  static shouldExcludeLateFor8HourSchedule(record: AttendanceRecord, lateMinutes: number): boolean {
    // 8時スケジュールのシートでない場合は除外しない
    if (!this.is8HourScheduleFromSheetName(record.sheetName)) {
      return false;
    }

    // 出社カラムにスケジュール情報がある場合（originalClockIn = null）は
    // 楽楽勤怠側で適切なスケジュールが設定されているので除外不要
    if (record.originalClockIn === null) {
      return false;
    }

    // 遅刻が60分（1時間）でない場合は除外しない
    if (lateMinutes !== 60) {
      return false;
    }

    // 出社時刻が9時台でない場合は除外しない
    if (!record.clockIn || record.clockIn.getHours() !== 9) {
      return false;
    }

    // すべての条件を満たす場合、遅刻を除外
    return true;
  }

  /**
   * 早出フラグ未入力違反をチェック
   * 9時より前に出社しているが、早出フラグが入力されていない場合は違反
   * - 休日は対象外
   * - 休暇申請がある場合は対象外
   * - 早出申請がある場合も対象外
   *
   * 【偽陰性対策】厳密なキーワードマッチングを使用
   * 「早出したいです」等の無関係な文言を誤検出しない
   */
  static hasEarlyStartViolation(record: AttendanceRecord, leaveType: LeaveType): boolean {
    // 休日は対象外
    if (record.calendarType !== 'weekday') {
      return false;
    }

    // 休暇申請がある場合は対象外
    if (leaveType !== 'none') {
      return false;
    }

    // 出社時刻がない場合は対象外
    if (!record.clockIn) {
      return false;
    }

    // 厳密な早出申請キーワードをチェック
    if (hasApplicationKeyword(record.applicationContent || '', EARLY_START_APPLICATION_KEYWORDS)) {
      return false;
    }

    // 出社時刻が9時より前かチェック
    const clockInHour = record.clockIn.getHours();
    if (clockInHour < STANDARD_WORK_START_HOUR) {
      // 早出フラグが入力されていない場合は違反
      return !record.earlyStartFlag;
    }

    return false;
  }

  /**
   * 遅刻申請漏れをチェック
   * 遅刻時間がある場合、遅刻申請または時差出勤申請がなければ申請漏れ
   */
  static hasLateApplicationMissing(record: AttendanceRecord): boolean {
    // 遅刻時間がない場合は対象外
    const lateMinutesStr = record.lateMinutes || '';
    if (!lateMinutesStr || lateMinutesStr === '' || lateMinutesStr === '0:00') {
      return false;
    }

    // 遅刻申請または時差出勤申請があれば問題なし
    const applicationContent = record.applicationContent || '';
    if (applicationContent.includes('遅刻') || applicationContent.includes('時差出勤')) {
      return false;
    }

    // 遅刻があるが申請がない = 申請漏れ
    return true;
  }

  /**
   * 遅刻申請漏れをチェック（計算後の遅刻時間を使用）
   * 8時スケジュール除外後の遅刻時間を考慮した判定
   * 遅刻申請、電車遅延申請、時差出勤申請、半休申請があれば除外
   *
   * 【偽陰性対策】厳密なキーワードマッチングを使用
   * 「遅刻しないよう注意」等の無関係な文言を誤検出しない
   */
  static hasLateApplicationMissingWithMinutes(record: AttendanceRecord, calculatedLateMinutes: number): boolean {
    // 計算後の遅刻時間がない場合は対象外
    if (calculatedLateMinutes <= 0) {
      return false;
    }

    const applicationContent = record.applicationContent || '';

    // 厳密な遅刻関連申請キーワードをチェック
    if (hasApplicationKeyword(applicationContent, LATE_APPLICATION_KEYWORDS)) {
      return false;
    }

    // 電車遅延申請をチェック
    if (hasApplicationKeyword(applicationContent, TRAIN_DELAY_APPLICATION_KEYWORDS)) {
      return false;
    }

    // 時差出勤申請をチェック
    if (hasApplicationKeyword(applicationContent, FLEXTIME_APPLICATION_KEYWORDS)) {
      return false;
    }

    // 半休申請をチェック（厳密版）
    if (hasApplicationKeyword(applicationContent, HALF_DAY_APPLICATION_KEYWORDS)) {
      return false;
    }

    // 遅刻があるが申請がない = 申請漏れ
    return true;
  }

  /**
   * 早退申請漏れをチェック
   * 早退時間がある場合、早退申請または半休申請がなければ申請漏れ
   *
   * 【偽陰性対策】厳密なキーワードマッチングを使用
   * 「早退予定あり」等の無関係な文言を誤検出しない
   */
  static hasEarlyLeaveApplicationMissing(record: AttendanceRecord): boolean {
    // 早退時間がない場合は対象外
    const earlyLeaveMinutesStr = record.earlyLeaveMinutes || '';
    if (!earlyLeaveMinutesStr || earlyLeaveMinutesStr === '' || earlyLeaveMinutesStr === '0:00') {
      return false;
    }

    const applicationContent = record.applicationContent || '';

    // 厳密な早退関連申請キーワードをチェック
    if (hasApplicationKeyword(applicationContent, EARLY_LEAVE_APPLICATION_KEYWORDS)) {
      return false;
    }

    // 半休申請をチェック（厳密版）
    if (hasApplicationKeyword(applicationContent, HALF_DAY_APPLICATION_KEYWORDS)) {
      return false;
    }

    // 早退があるが申請がない = 申請漏れ
    return true;
  }

  /**
   * 時間有休打刻漏れをチェック
   * 時間有休申請がある場合、私用外出と私用戻りの両方が必要
   */
  static hasTimeLeavePunchMissing(record: AttendanceRecord): boolean {
    // 時間有休申請がない場合は対象外
    const applicationContent = record.applicationContent || '';
    if (!applicationContent.includes('時間有休')) {
      return false;
    }

    // 私用外出・戻りの両方が入力されていれば問題なし
    if (record.privateOutTime && record.privateReturnTime) {
      return false;
    }

    // 時間有休申請があるが打刻が不完全 = 打刻漏れ
    return true;
  }

  /**
   * 深夜休憩申請漏れをチェック
   * 深夜労働がある場合、深夜休憩修正または休憩時間修正申請が必要
   */
  static hasNightBreakApplicationMissing(record: AttendanceRecord): boolean {
    // 深夜労働時間がない場合は対象外
    const nightWorkMinutesStr = record.nightWorkMinutes || '';
    if (!nightWorkMinutesStr || nightWorkMinutesStr === '' || nightWorkMinutesStr === '0:00') {
      return false;
    }

    // 深夜休憩修正が入力されていれば問題なし
    const nightBreakModification = record.nightBreakModification || '';
    if (nightBreakModification && nightBreakModification !== '' && nightBreakModification !== '0:00') {
      return false;
    }

    // 休憩時間修正申請があれば問題なし
    const applicationContent = record.applicationContent || '';
    if (applicationContent.includes('休憩時間修正')) {
      return false;
    }

    // 深夜労働があるが休憩修正がない = 申請漏れ
    return true;
  }

  /**
   * 日次の詳細分析
   */
  static analyzeDailyRecord(record: AttendanceRecord): DailyAttendanceAnalysis {
    const leaveType = this.determineLeaveType(record.applicationContent);
    const actualWorkMinutes = this.parseTimeToMinutes(record.actualWorkHours);
    const requiredBreakMinutes = this.calculateRequiredBreakMinutes(actualWorkMinutes);

    const isHolidayWork = record.calendarType !== 'weekday' && !!record.clockIn;
    const overtimeMinutes = this.calculateOvertimeMinutes(record);
    const rawLateMinutes = this.parseTimeToMinutes(record.lateMinutes);
    const earlyLeaveMinutes = this.parseTimeToMinutes(record.earlyLeaveMinutes);

    // 8時スケジュールの遅刻除外判定
    // 8時カレンダーで9時スケジュール未設定の従業員が9時出社した場合の1時間遅刻は除外
    const shouldExcludeLate = this.shouldExcludeLateFor8HourSchedule(record, rawLateMinutes);
    const lateMinutes = shouldExcludeLate ? 0 : rawLateMinutes;

    // 休憩時間: レコードから取得（breakTimeMinutesカラム）
    const breakMinutes = record.breakTimeMinutes || 0;

    // 休憩違反判定: 実働6時間超で休憩が必要時間未満の場合
    const hasBreakViolation = actualWorkMinutes > BREAK_TIME_REQUIREMENTS.THRESHOLD_6H_MINUTES &&
                             breakMinutes < requiredBreakMinutes;

    const hasMissingClock = record.calendarType === 'weekday' &&
      !record.clockIn && !record.clockOut &&
      leaveType === 'none' &&
      actualWorkMinutes === 0;

    const isTimelyDep = this.isTimelyDeparture(record, leaveType);

    // 早出フラグ未入力違反チェック
    const hasEarlyStartViolation = this.hasEarlyStartViolation(record, leaveType);

    // 申請漏れ検出ロジック
    // 遅刻申請漏れは計算後のlateMinutes（8時スケジュール除外後）を使用
    const hasLateApplicationMissing = this.hasLateApplicationMissingWithMinutes(record, lateMinutes);
    const hasEarlyLeaveApplicationMissing = this.hasEarlyLeaveApplicationMissing(record);
    const hasTimeLeavePunchMissing = this.hasTimeLeavePunchMissing(record);
    const hasNightBreakApplicationMissing = this.hasNightBreakApplicationMissing(record);

    // 備考欄チェック
    const remarksCheck = this.checkRemarksRequired(record);
    const hasRemarksMissing = remarksCheck.isRequired && remarksCheck.isMissing;
    const remarksFormatCheck = this.checkRemarksFormat(record.remarks || '');
    const hasRemarksFormatWarning = remarksCheck.isRequired && !remarksCheck.isMissing && !remarksFormatCheck.isValid;

    // 違反リスト作成（申請漏れベース）
    const violations: ViolationType[] = [];
    if (hasMissingClock) violations.push('missing_clock');
    if (hasBreakViolation) violations.push('break_violation');
    if (hasLateApplicationMissing) violations.push('late_application_missing');
    if (hasEarlyLeaveApplicationMissing) violations.push('early_leave_application_missing');
    if (hasEarlyStartViolation) violations.push('early_start_application_missing');
    if (hasTimeLeavePunchMissing) violations.push('time_leave_punch_missing');
    if (hasNightBreakApplicationMissing) violations.push('night_break_application_missing');
    if (hasRemarksMissing) violations.push('remarks_missing');
    if (hasRemarksFormatWarning) violations.push('remarks_format_warning');

    return {
      record,
      leaveType,
      isHolidayWork,
      isTimelyDeparture: isTimelyDep,
      overtimeMinutes,
      lateMinutes,
      earlyLeaveMinutes,
      actualBreakMinutes: breakMinutes,
      requiredBreakMinutes,
      hasBreakViolation,
      hasMissingClock,
      hasEarlyStartViolation,
      violations,
    };
  }

  /**
   * 従業員ごとの月次サマリーを作成
   */
  static createEmployeeMonthlySummary(
    employeeId: string,
    records: AttendanceRecord[]
  ): EmployeeMonthlySummary {
    const firstRecord = records[0];
    const dailyAnalyses = records.map(r => this.analyzeDailyRecord(r));

    const violations: AttendanceViolation[] = [];

    let totalWorkDays = 0;
    let holidayWorkDays = 0;
    let totalOvertimeMinutes = 0;
    let lateDays = 0;
    let earlyLeaveDays = 0;
    let timelyDepartureDays = 0;
    let fullDayLeaveDays = 0;
    let halfDayLeaveDays = 0;
    let breakViolationDays = 0;
    let missingClockDays = 0;
    let earlyStartViolationDays = 0;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (const analysis of dailyAnalyses) {
      const record = analysis.record;

      // 未来日付はスキップ
      if (record.date >= today) continue;

      // 出勤日カウント
      if (record.clockIn || record.clockOut) {
        totalWorkDays++;
      }

      // 休日出勤
      if (analysis.isHolidayWork) {
        holidayWorkDays++;
      }

      // 残業時間
      totalOvertimeMinutes += analysis.overtimeMinutes;

      // 遅刻申請漏れ
      if (analysis.violations.includes('late_application_missing')) {
        lateDays++;
        violations.push({
          employeeId,
          employeeName: firstRecord.employeeName,
          department: firstRecord.department,
          date: record.date,
          type: 'late_application_missing',
          details: `遅刻 ${this.formatMinutesToTime(analysis.lateMinutes)}`,
        });
      }

      // 早退申請漏れ
      if (analysis.violations.includes('early_leave_application_missing')) {
        earlyLeaveDays++;
        violations.push({
          employeeId,
          employeeName: firstRecord.employeeName,
          department: firstRecord.department,
          date: record.date,
          type: 'early_leave_application_missing',
          details: `早退 ${this.formatMinutesToTime(analysis.earlyLeaveMinutes)}`,
        });
      }

      // 定時退社
      if (analysis.isTimelyDeparture) {
        timelyDepartureDays++;
      }

      // 休暇
      if (analysis.leaveType === 'full_day') {
        fullDayLeaveDays++;
      } else if (analysis.leaveType === 'half_day_am' || analysis.leaveType === 'half_day_pm') {
        halfDayLeaveDays++;
      }

      // 休憩違反
      if (analysis.hasBreakViolation) {
        breakViolationDays++;
        violations.push({
          employeeId,
          employeeName: firstRecord.employeeName,
          department: firstRecord.department,
          date: record.date,
          type: 'break_violation',
          details: `必要休憩 ${analysis.requiredBreakMinutes}分に対し ${analysis.actualBreakMinutes}分`,
          requiredBreakMinutes: analysis.requiredBreakMinutes,
          actualBreakMinutes: analysis.actualBreakMinutes,
        });
      }

      // 出退勤時刻なし
      if (analysis.hasMissingClock) {
        missingClockDays++;
        violations.push({
          employeeId,
          employeeName: firstRecord.employeeName,
          department: firstRecord.department,
          date: record.date,
          type: 'missing_clock',
          details: '出退勤時刻なし',
        });
      }

      // 早出申請漏れ
      if (analysis.hasEarlyStartViolation) {
        earlyStartViolationDays++;
        const clockInTime = record.clockIn
          ? `${record.clockIn.getHours()}:${String(record.clockIn.getMinutes()).padStart(2, '0')}`
          : '';
        violations.push({
          employeeId,
          employeeName: firstRecord.employeeName,
          department: firstRecord.department,
          date: record.date,
          type: 'early_start_application_missing',
          details: `${clockInTime}出社`,
        });
      }

      // 時間有休打刻漏れ
      if (analysis.violations.includes('time_leave_punch_missing')) {
        violations.push({
          employeeId,
          employeeName: firstRecord.employeeName,
          department: firstRecord.department,
          date: record.date,
          type: 'time_leave_punch_missing',
          details: '私用外出/戻り未打刻',
        });
      }

      // 深夜休憩申請漏れ
      if (analysis.violations.includes('night_break_application_missing')) {
        violations.push({
          employeeId,
          employeeName: firstRecord.employeeName,
          department: firstRecord.department,
          date: record.date,
          type: 'night_break_application_missing',
          details: '深夜勤務あり',
        });
      }

      // 備考欄未入力
      if (analysis.violations.includes('remarks_missing')) {
        const remarksCheck = this.checkRemarksRequired(record);
        violations.push({
          employeeId,
          employeeName: firstRecord.employeeName,
          department: firstRecord.department,
          date: record.date,
          type: 'remarks_missing',
          details: remarksCheck.requiredReason || '備考欄未入力',
        });
      }

      // 備考欄フォーマット警告
      if (analysis.violations.includes('remarks_format_warning')) {
        violations.push({
          employeeId,
          employeeName: firstRecord.employeeName,
          department: firstRecord.department,
          date: record.date,
          type: 'remarks_format_warning',
          details: `備考「${record.remarks}」が短すぎます`,
        });
      }
    }

    return {
      employeeId,
      employeeName: firstRecord.employeeName,
      department: firstRecord.department,
      sheetName: firstRecord.sheetName,
      totalWorkDays,
      holidayWorkDays,
      totalOvertimeMinutes,
      lateDays,
      earlyLeaveDays,
      timelyDepartureDays,
      fullDayLeaveDays,
      halfDayLeaveDays,
      breakViolationDays,
      missingClockDays,
      earlyStartViolationDays,
      violations,
    };
  }

  /**
   * 部門別集計
   */
  static createDepartmentSummaries(
    employeeSummaries: EmployeeMonthlySummary[]
  ): DepartmentSummary[] {
    const departmentMap = new Map<string, EmployeeMonthlySummary[]>();

    for (const summary of employeeSummaries) {
      const dept = summary.department || '(未設定)';
      if (!departmentMap.has(dept)) {
        departmentMap.set(dept, []);
      }
      departmentMap.get(dept)!.push(summary);
    }

    const results: DepartmentSummary[] = [];

    departmentMap.forEach((summaries, department) => {
      const totalOvertimeMinutes = summaries.reduce((sum, s) => sum + s.totalOvertimeMinutes, 0);
      const holidayWorkCount = summaries.reduce((sum, s) => sum + s.holidayWorkDays, 0);
      const breakViolations = summaries.reduce((sum, s) => sum + s.breakViolationDays, 0);
      const missingClockCount = summaries.reduce((sum, s) => sum + s.missingClockDays, 0);
      const totalViolations = summaries.reduce((sum, s) => sum + s.violations.length, 0);

      results.push({
        department,
        employeeCount: summaries.length,
        totalOvertimeMinutes,
        averageOvertimeMinutes: Math.round(totalOvertimeMinutes / summaries.length),
        holidayWorkCount,
        totalViolations,
        breakViolations,
        missingClockCount,
      });
    });

    // 部門名でソート
    results.sort((a, b) => a.department.localeCompare(b.department));

    return results;
  }

  /**
   * 拡張分析を実行
   */
  static analyzeExtended(records: AttendanceRecord[]): ExtendedAnalysisResult {
    // 従業員ごとにグループ化
    const employeeRecords = new Map<string, AttendanceRecord[]>();
    records.forEach(record => {
      const key = record.employeeId;
      if (!employeeRecords.has(key)) {
        employeeRecords.set(key, []);
      }
      employeeRecords.get(key)!.push(record);
    });

    // 従業員ごとの月次サマリー作成
    const employeeSummaries: EmployeeMonthlySummary[] = [];
    employeeRecords.forEach((recs, employeeId) => {
      employeeSummaries.push(this.createEmployeeMonthlySummary(employeeId, recs));
    });

    // 部門別集計
    const departmentSummaries = this.createDepartmentSummaries(employeeSummaries);

    // 全違反を収集
    const allViolations: AttendanceViolation[] = [];
    for (const summary of employeeSummaries) {
      allViolations.push(...summary.violations);
    }

    // 日付順にソート
    allViolations.sort((a, b) => a.date.getTime() - b.date.getTime());

    // 日付範囲を取得
    const dates = records.map(r => r.date).filter(d => d !== null);
    const minDate = dates.length > 0 ? new Date(Math.min(...dates.map(d => d.getTime()))) : new Date();
    const maxDate = dates.length > 0 ? new Date(Math.max(...dates.map(d => d.getTime()))) : new Date();

    // ユニークなシート名
    const uniqueSheets = [...new Set(records.map(r => r.sheetName))];

    // 緊急度別カウント（出退勤時刻なしの連続日数で判定）
    const missingClockResults = this.detectMissingEntries(records);
    const highCount = missingClockResults.filter(r => r.urgencyLevel === 'high').length;
    const mediumCount = missingClockResults.filter(r => r.urgencyLevel === 'medium').length;
    const lowCount = missingClockResults.filter(r => r.urgencyLevel === 'low').length;

    const summary: AnalysisSummary = {
      totalEmployees: employeeSummaries.length,
      employeesWithIssues: employeeSummaries.filter(s => s.violations.length > 0).length,
      highUrgencyCount: highCount,
      mediumUrgencyCount: mediumCount,
      lowUrgencyCount: lowCount,
      analysisDateRange: {
        start: minDate,
        end: maxDate,
      },
      sheetNames: uniqueSheets,
    };

    return {
      summary,
      employeeSummaries,
      departmentSummaries,
      allViolations,
      analyzedAt: new Date(),
    };
  }

  /**
   * 拡張分析結果をCSVに変換
   */
  static exportExtendedToCsv(result: ExtendedAnalysisResult): string {
    const BOM = '\uFEFF';

    const headers = [
      '社員番号', '氏名', '部門', 'プロジェクト',
      '出勤日数', '休日出勤日数', '残業時間', '平均残業/日',
      '遅刻日数', '早退日数', '定時退社日数',
      '全休日数', '半休日数',
      '休憩違反日数', '出退勤なし日数', '違反総数'
    ];

    const rows = result.employeeSummaries.map(s => {
      const avgOvertime = s.totalWorkDays > 0
        ? Math.round(s.totalOvertimeMinutes / s.totalWorkDays)
        : 0;

      return [
        s.employeeId,
        s.employeeName,
        s.department,
        s.sheetName,
        s.totalWorkDays.toString(),
        s.holidayWorkDays.toString(),
        this.formatMinutesToTime(s.totalOvertimeMinutes),
        this.formatMinutesToTime(avgOvertime),
        s.lateDays.toString(),
        s.earlyLeaveDays.toString(),
        s.timelyDepartureDays.toString(),
        s.fullDayLeaveDays.toString(),
        s.halfDayLeaveDays.toString(),
        s.breakViolationDays.toString(),
        s.missingClockDays.toString(),
        s.violations.length.toString(),
      ].map(cell => `"${cell.replace(/"/g, '""')}"`).join(',');
    });

    return BOM + [headers.join(','), ...rows].join('\n');
  }

  // ============================================
  // 36協定・残業時間管理
  // ============================================

  /**
   * 月次残業時間のアラートレベルを判定（7段階）
   * @param overtimeMinutes 月間残業時間（分）
   * @returns アラートレベル
   */
  static getOvertimeAlertLevel(overtimeMinutes: number): OvertimeAlertLevel {
    const hours = overtimeMinutes / 60;

    if (hours >= OVERTIME_THRESHOLDS.SPECIAL_LIMIT_HOURS) {
      return 'illegal';     // 100h〜: 違法
    }
    if (hours >= OVERTIME_THRESHOLDS.CRITICAL_HOURS) {
      return 'critical';    // 80h〜: 危険（医師面接指導）
    }
    if (hours >= OVERTIME_THRESHOLDS.SEVERE_HOURS) {
      return 'severe';      // 70h〜: 重大（親会社報告）
    }
    if (hours >= OVERTIME_THRESHOLDS.SERIOUS_HOURS) {
      return 'serious';     // 65h〜: 深刻（残業禁止措置検討）
    }
    if (hours >= OVERTIME_THRESHOLDS.CAUTION_HOURS) {
      return 'caution';     // 55h〜: 警戒（残業抑制指示）
    }
    if (hours >= OVERTIME_THRESHOLDS.LIMIT_HOURS) {
      return 'exceeded';    // 45h〜: 超過（36協定基本上限）
    }
    if (hours >= OVERTIME_THRESHOLDS.WARNING_HOURS) {
      return 'warning';     // 35h〜: 注意（上長報告）
    }
    return 'normal';
  }

  /**
   * 月末に向けて残業時間が上限を超過するペースかどうか判定
   * @param currentOvertimeMinutes 現在までの残業時間（分）
   * @param dayOfMonth 現在の日付（1-31）
   * @param limitMinutes 月間上限（分）
   * @returns 超過ペースならtrue
   */
  static isOvertimeOnPaceToExceed(
    currentOvertimeMinutes: number,
    dayOfMonth: number,
    limitMinutes: number
  ): boolean {
    // 月の日数を30日と仮定して按分計算
    const expectedDays = 30;
    const expectedOvertimeAtThisPoint = (limitMinutes * dayOfMonth) / expectedDays;

    // 現在の残業時間が、このペースで月末に上限を超える見込みか
    return currentOvertimeMinutes > expectedOvertimeAtThisPoint;
  }

  /**
   * 年間残業時間が上限を超過しているか判定
   * @param annualOvertimeMinutes 年間残業時間（分）
   * @returns 超過していればtrue
   */
  static isAnnualOvertimeExceeded(annualOvertimeMinutes: number): boolean {
    const annualLimitMinutes = OVERTIME_THRESHOLDS.ANNUAL_LIMIT_HOURS * 60;
    return annualOvertimeMinutes >= annualLimitMinutes;
  }

  /**
   * 医師の面接指導が必要かどうか判定
   * 厚労省指針: 月80時間超は健康リスクが高い
   * @param overtimeMinutes 月間残業時間（分）
   * @returns 必要ならtrue
   */
  static needsMedicalGuidance(overtimeMinutes: number): boolean {
    const hours = overtimeMinutes / 60;
    return hours > OVERTIME_THRESHOLDS.CRITICAL_HOURS;
  }

  // ============================================
  // 備考欄チェック（マニュアルセクション4準拠）
  // ============================================

  /**
   * 備考欄必須キーワード
   * 申請内容にこれらが含まれる場合、備考欄の入力が必須
   */
  private static readonly REMARKS_REQUIRED_KEYWORDS = [
    { keyword: '直行', reason: '直行（訪問先・業務目的の記載が必要）' },
    { keyword: '直帰', reason: '直帰（訪問先・業務目的の記載が必要）' },
    { keyword: '遅延', reason: '遅延（路線名・遅延時間の記載が必要）' },
    { keyword: '打刻修正', reason: '打刻修正（理由の記載が必要）' },
    { keyword: '修正申請', reason: '修正申請（理由の記載が必要）' },
  ];

  /**
   * 備考欄が必要かどうかをチェック
   * @param record 勤怠レコード
   * @returns { isRequired: 必須かどうか, isMissing: 未入力かどうか, requiredReason: 必須理由 }
   */
  static checkRemarksRequired(record: AttendanceRecord): {
    isRequired: boolean;
    isMissing: boolean;
    requiredReason?: string;
  } {
    const applicationContent = record.applicationContent || '';
    const remarks = record.remarks || '';

    // AltX残業がある場合は備考欄必須
    if (record.altxOvertimeIn || record.altxOvertimeOut) {
      return {
        isRequired: true,
        isMissing: remarks.trim() === '',
        requiredReason: 'AltX残業（タスク内容の記載が必要）',
      };
    }

    // 申請内容から備考欄必須キーワードをチェック
    for (const { keyword, reason } of this.REMARKS_REQUIRED_KEYWORDS) {
      if (applicationContent.includes(keyword)) {
        return {
          isRequired: true,
          isMissing: remarks.trim() === '',
          requiredReason: reason,
        };
      }
    }

    // 備考欄不要
    return {
      isRequired: false,
      isMissing: false,
    };
  }

  /**
   * 備考欄のフォーマットをチェック
   * 推奨: 「【事由】＋【詳細】」形式、最低5文字以上
   * @param remarks 備考欄の内容
   * @returns { isValid: 有効かどうか, warning?: 警告メッセージ }
   */
  static checkRemarksFormat(remarks: string): {
    isValid: boolean;
    warning?: string;
  } {
    // 空の場合はフォーマットチェック対象外
    if (!remarks || remarks.trim() === '') {
      return { isValid: true };
    }

    const trimmedRemarks = remarks.trim();

    // 短すぎる場合は警告（5文字未満）
    if (trimmedRemarks.length < 5) {
      return {
        isValid: false,
        warning: '備考欄が短すぎます。「【事由】＋【詳細】」形式で具体的に記載してください。',
      };
    }

    // 5文字以上あれば有効
    return { isValid: true };
  }
}

export default AttendanceService;
