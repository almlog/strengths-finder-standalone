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
  AnalysisOptions,
  ApplicationCounts,
  NightWorkRecord,
  XLSX_COLUMN_INDEX,
  LEAVE_KEYWORDS,
  NIGHT_WORK_START_HOUR,
  URGENCY_THRESHOLDS,
  BREAK_TIME_REQUIREMENTS,
  TIMELY_DEPARTURE_TIME,
  STANDARD_WORK_START_HOUR,
  HALF_DAY_KEYWORDS,
  FULL_DAY_KEYWORDS,
  // 厳密な申請キーワード（偽陰性対策）
  LATE_APPLICATION_KEYWORDS,
  TRAIN_DELAY_APPLICATION_KEYWORDS,
  FLEXTIME_EXACT_KEYWORDS,
  EARLY_LEAVE_APPLICATION_KEYWORDS,
  HALF_DAY_APPLICATION_KEYWORDS,
  EARLY_START_APPLICATION_KEYWORDS,
  MENSTRUAL_LEAVE_KEYWORDS,
  CHILD_CARE_LEAVE_KEYWORDS,
  NURSING_CARE_LEAVE_KEYWORDS,
  POST_NIGHT_LEAVE_KEYWORDS,
  hasApplicationKeyword,
  hasExactApplicationKeyword,
  // 36協定・残業時間管理
  OVERTIME_THRESHOLDS,
  STANDARD_WORK_MINUTES,
  LEGAL_WORK_MINUTES,
  OvertimeAlertLevel,
  VIOLATION_URGENCY,
  // 振替出勤
  SUBSTITUTE_WORK_KEYWORDS,
} from '../models/AttendanceTypes';

/**
 * 勤怠分析サービス
 */
export class AttendanceService {

  /**
   * 振替出勤かどうかを判定
   * applicationContent に振替出勤キーワードが含まれていれば true
   */
  static isSubstituteWork(record: AttendanceRecord): boolean {
    const content = record.applicationContent || '';
    return SUBSTITUTE_WORK_KEYWORDS.some(kw => content.includes(kw));
  }

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
   * Excelシリアル値をDateに変換
   * Excelの日付シリアル値は1900年1月1日を1とする連番
   * （Excelの1900年うるう年バグを考慮）
   */
  private static excelSerialToDate(serial: number): Date {
    // Excelのエポック: 1899年12月30日（1900年1月1日が1になるよう調整）
    const excelEpoch = new Date(1899, 11, 30);
    const millisecondsPerDay = 24 * 60 * 60 * 1000;
    return new Date(excelEpoch.getTime() + serial * millisecondsPerDay);
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

    // 数値の場合（Excelシリアル日付）
    if (typeof value === 'number' && value > 0) {
      // 日付部分のみ（小数点以下は時刻）
      return this.excelSerialToDate(Math.floor(value));
    }

    // 文字列の場合
    const str = String(value).trim();
    if (!str) return null;

    // YYYY-MM-DD または YYYY/MM/DD 形式
    const matchYMD = str.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
    if (matchYMD) {
      const [, year, month, day] = matchYMD;
      return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    }

    // M/D/YY または M/D/YYYY 形式（Excel raw:false出力）
    const matchMDY = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
    if (matchMDY) {
      const [, month, day, yearStr] = matchMDY;
      let year = parseInt(yearStr);
      // 2桁年号を4桁に変換（00-99 → 2000-2099）
      if (year < 100) {
        year += 2000;
      }
      return new Date(year, parseInt(month) - 1, parseInt(day));
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

    // 数値の場合（Excelシリアル日時）
    // 整数部分が日付、小数部分が時刻（1日を1として表現）
    if (typeof value === 'number' && value > 0) {
      return this.excelSerialToDate(value);
    }

    // 文字列の場合
    const str = String(value).trim();
    if (!str) return null;

    // YYYY-MM-DD HH:MM または YYYY/MM/DD HH:MM 形式
    const matchYMD = str.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})\s+(\d{1,2}):(\d{2})/);
    if (matchYMD) {
      const [, year, month, day, hour, minute] = matchYMD;
      return new Date(
        parseInt(year),
        parseInt(month) - 1,
        parseInt(day),
        parseInt(hour),
        parseInt(minute)
      );
    }

    // M/D/YY H:MM または M/D/YYYY H:MM 形式（Excel raw:false出力）
    const matchMDY = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})\s+(\d{1,2}):(\d{2})/);
    if (matchMDY) {
      const [, month, day, yearStr, hour, minute] = matchMDY;
      let year = parseInt(yearStr);
      // 2桁年号を4桁に変換（00-99 → 2000-2099）
      if (year < 100) {
        year += 2000;
      }
      return new Date(
        year,
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
   * 深夜帯勤務かどうか判定
   * 22:00は深夜加給の開始時刻なので、22:00ちょうどの退勤は含めない
   * 22:01以降の退勤、または0:00〜4:59（翌日未明）の退勤を深夜帯勤務と判定
   */
  static isNightWork(record: AttendanceRecord): boolean {
    if (!record.clockOut) return false;
    const hour = record.clockOut.getHours();
    const minute = record.clockOut.getMinutes();
    // 22:01以降（22時台で1分以上、または23時台）
    if (hour === NIGHT_WORK_START_HOUR && minute > 0) return true;
    if (hour > NIGHT_WORK_START_HOUR) return true;
    // 0:00〜4:59（翌日未明）
    if (hour < 5) return true;
    return false;
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
   *
   * 以下の休暇は1日単位で取得され、出退勤打刻が不要なため全休として扱う：
   * - FULL_DAY_KEYWORDS: 有休、欠勤、特休など
   * - 生理休暇 (MENSTRUAL_LEAVE_KEYWORDS)
   * - 子の看護休暇 (CHILD_CARE_LEAVE_KEYWORDS)
   * - 介護休暇 (NURSING_CARE_LEAVE_KEYWORDS)
   * - 明け休 (POST_NIGHT_LEAVE_KEYWORDS)
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

    // 全休チェック（基本キーワード）
    for (const keyword of FULL_DAY_KEYWORDS) {
      if (applicationContent.includes(keyword)) {
        return 'full_day';
      }
    }

    // 1日単位の特別休暇（打刻不要）
    // 生理休暇
    if (hasApplicationKeyword(applicationContent, MENSTRUAL_LEAVE_KEYWORDS)) {
      return 'full_day';
    }

    // 子の看護休暇
    if (hasApplicationKeyword(applicationContent, CHILD_CARE_LEAVE_KEYWORDS)) {
      return 'full_day';
    }

    // 介護休暇
    if (hasApplicationKeyword(applicationContent, NURSING_CARE_LEAVE_KEYWORDS)) {
      return 'full_day';
    }

    // 明け休
    if (hasApplicationKeyword(applicationContent, POST_NIGHT_LEAVE_KEYWORDS)) {
      return 'full_day';
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
   * 残業時間と法定外残業時間を計算
   * - 休憩時間修正申請がない場合、休憩1:00固定として実働を再計算
   *   （楽楽勤怠が自動で1:15に増加させるが、実際の休憩は1:00のため）
   * - 半休時の自動15分休憩も無視（全額戻す）
   * - 残業: max(0, 調整後実働 - 7h45m(465分)) ← 所定労働時間超過
   * - 法定外: max(0, 調整後実働 - 8h(480分)) ← 法定労働時間超過（36協定用）
   * - 休日出勤: 両方とも実働時間の全量
   */
  static calculateOvertimeDetails(record: AttendanceRecord): {
    overtimeMinutes: number;
    legalOvertimeMinutes: number;
  } {
    const actualWorkMinutes = this.parseTimeToMinutes(record.actualWorkHours);

    // 休日出勤は実働時間全体が残業 = 法定外残業（振替出勤は平日扱い）
    if (record.calendarType !== 'weekday' && !this.isSubstituteWork(record)) {
      return {
        overtimeMinutes: actualWorkMinutes,
        legalOvertimeMinutes: actualWorkMinutes,
      };
    }

    // 休憩時間調整: 楽楽勤怠の自動増加分を実働に戻す
    const adjustedWorkMinutes = actualWorkMinutes + this.getBreakAdjustmentMinutes(record);

    // 平日: 調整後実働から所定/法定の閾値を引いて計算
    return {
      overtimeMinutes: Math.max(0, adjustedWorkMinutes - STANDARD_WORK_MINUTES),
      legalOvertimeMinutes: Math.max(0, adjustedWorkMinutes - LEGAL_WORK_MINUTES),
    };
  }

  /**
   * 休憩時間の調整分（分）を返す
   * - 休憩時間修正申請がある場合: 0（Excelの値をそのまま使用）
   * - 休憩 > 60分: 超過分を戻す（楽楽勤怠の自動増加1:15→1:00）
   * - 休憩 < 60分: 全額戻す（半休時の自動15分休憩を無視）
   * - 休憩 = 60分: 0（調整不要）
   */
  private static getBreakAdjustmentMinutes(record: AttendanceRecord): number {
    const applicationContent = record.applicationContent || '';

    // 休憩時間修正申請がある場合は調整しない
    if (applicationContent.includes('休憩時間修正')) {
      return 0;
    }

    const breakMinutes = record.breakTimeMinutes;

    if (breakMinutes > 60) {
      // 自動増加分（例: 75-60=15）を実働に戻す
      return breakMinutes - 60;
    }

    if (breakMinutes > 0 && breakMinutes < 60) {
      // 半休時の自動付与分（例: 15分）を全額戻す
      return breakMinutes;
    }

    return 0;
  }

  /**
   * 残業時間を取得（分）- 所定労働時間超過分
   * 後方互換メソッド。内部でcalculateOvertimeDetails()を使用。
   */
  static calculateOvertimeMinutes(record: AttendanceRecord): number {
    return this.calculateOvertimeDetails(record).overtimeMinutes;
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

    // 全休は定時退社から除外（出勤していない日は定時退社の判定対象外）
    if (leaveType === 'full_day') {
      return false;
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
   * シート名から始業時刻を抽出
   * 形式: "KDDI_日勤_800-1630～930-1800_1200..." → { hour: 8, minute: 0 }
   *
   * パターン:
   *   - _XXX-XXXX または -XXX-XXXX 形式（3-4桁の数字）
   *   - _X:XX-XX:XX または -X:XX-XX:XX 形式（コロン区切り）
   *
   * シート名に含まれる最初の時間パターンがデフォルトの始業時刻
   *
   * @param sheetName シート名
   * @returns 始業時刻（hour, minute）またはnull
   */
  static parseScheduledStartTimeFromSheetName(sheetName: string): { hour: number; minute: number } | null {
    if (!sheetName) return null;

    // パターン1: _800-1630 または -800-1630 形式（3-4桁の数字）
    // [_-] は _ または - にマッチ
    const matchNumeric = sheetName.match(/[_-](\d{3,4})-\d{3,4}/);
    if (matchNumeric) {
      const startTimeStr = matchNumeric[1];
      let hour: number;
      let minute: number;

      if (startTimeStr.length === 3) {
        // 800 → 8:00, 830 → 8:30
        hour = parseInt(startTimeStr[0], 10);
        minute = parseInt(startTimeStr.slice(1), 10);
      } else {
        // 1000 → 10:00
        hour = parseInt(startTimeStr.slice(0, 2), 10);
        minute = parseInt(startTimeStr.slice(2), 10);
      }

      // 妥当性チェック
      if (hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59) {
        return { hour, minute };
      }
    }

    // パターン2: _9:00-17:30 または -9:00-17:30 形式（コロン区切り）
    const matchColon = sheetName.match(/[_-](\d{1,2}):(\d{2})-\d{1,2}:\d{2}/);
    if (matchColon) {
      const hour = parseInt(matchColon[1], 10);
      const minute = parseInt(matchColon[2], 10);

      // 妥当性チェック
      if (hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59) {
        return { hour, minute };
      }
    }

    return null;
  }

  /**
   * 申請内容から始業時刻を抽出
   * 形式:
   *   - "830-1700/1200-1300/7.75/5" → { hour: 8, minute: 30 }
   *   - "残業終了,900-1730/1200-1300/7.75/5" → { hour: 9, minute: 0 }
   *
   * @param applicationContent 申請内容
   * @returns 始業時刻（hour, minute）またはnull
   */
  static parseScheduledStartTime(applicationContent: string): { hour: number; minute: number } | null {
    if (!applicationContent) return null;

    // 始業時刻パターン: 3-4桁の数字（830, 930, 1000など）
    // 形式1: "HHMM-HHMM/..." の先頭部分
    // 形式2: "申請タイプ,HHMM-HHMM/..." カンマ区切り
    // (?:^|,) は先頭またはカンマの後にマッチ
    const match = applicationContent.match(/(?:^|,)(\d{3,4})-\d{3,4}/);
    if (!match) return null;

    const startTimeStr = match[1];
    let hour: number;
    let minute: number;

    if (startTimeStr.length === 3) {
      // 830 → 8:30
      hour = parseInt(startTimeStr[0], 10);
      minute = parseInt(startTimeStr.slice(1), 10);
    } else {
      // 1000 → 10:00
      hour = parseInt(startTimeStr.slice(0, 2), 10);
      minute = parseInt(startTimeStr.slice(2), 10);
    }

    // 妥当性チェック
    if (hour < 0 || hour > 23 || minute < 0 || minute > 59) {
      return null;
    }

    return { hour, minute };
  }

  /**
   * 早出フラグ未入力違反をチェック
   * - 申請内容に始業時刻がある場合、その時刻より前の出勤で早出フラグがなければ違反
   * - 申請内容に始業時刻がない場合、9時より前の出勤で早出フラグがなければ違反
   * - 休日は対象外
   * - 休暇申請がある場合は対象外
   * - 早出申請がある場合も対象外
   * - 時差出勤申請がある場合も対象外
   *
   * 【偽陰性対策】厳密なキーワードマッチングを使用
   * 「早出したいです」「時差出勤を検討中」等の無関係な文言を誤検出しない
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

    const applicationContent = record.applicationContent || '';

    // 厳密な早出申請キーワードをチェック
    if (hasApplicationKeyword(applicationContent, EARLY_START_APPLICATION_KEYWORDS)) {
      return false;
    }

    // 時差出勤をチェック（完全一致: Excelデータでは「時差出勤」のみで記録される）
    if (hasExactApplicationKeyword(applicationContent, FLEXTIME_EXACT_KEYWORDS)) {
      return false;
    }

    // 1. 申請内容から始業時刻を抽出（優先）
    let scheduledStart = this.parseScheduledStartTime(applicationContent);

    // 2. 申請内容になければシート名から抽出
    if (!scheduledStart) {
      scheduledStart = this.parseScheduledStartTimeFromSheetName(record.sheetName || '');
    }

    // 出勤時刻を分に変換
    const clockInHour = record.clockIn.getHours();
    const clockInMinute = record.clockIn.getMinutes();
    const clockInTotalMinutes = clockInHour * 60 + clockInMinute;

    // 3. 始業時刻を決定（申請内容 → シート名 → デフォルト9時）
    const scheduledHour = scheduledStart?.hour ?? STANDARD_WORK_START_HOUR;
    const scheduledMinute = scheduledStart?.minute ?? 0;
    const scheduledTotalMinutes = scheduledHour * 60 + scheduledMinute;

    // 出勤時刻が始業時刻より前かチェック
    if (clockInTotalMinutes < scheduledTotalMinutes) {
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

    // 時差出勤をチェック（完全一致: Excelデータでは「時差出勤」のみで記録される）
    if (hasExactApplicationKeyword(applicationContent, FLEXTIME_EXACT_KEYWORDS)) {
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
   *
   * 深夜労働がある場合に、以下の条件をすべて満たす場合に違反と判定：
   * 1. 深夜労働時間が一定時間（30分）以上ある
   * 2. 基本的な休憩時間が不足している（労基法：6時間超→45分、8時間超→60分）
   * 3. 深夜休憩修正が入力されていない
   * 4. 休憩時間修正申請がない
   *
   * 22:15退勤など深夜帯勤務が短時間で、かつ必要な休憩を取得している場合は
   * 違反として検出しない。
   */
  static hasNightBreakApplicationMissing(record: AttendanceRecord): boolean {
    // 深夜労働時間がない場合は対象外
    const nightWorkMinutesStr = record.nightWorkMinutes || '';
    if (!nightWorkMinutesStr || nightWorkMinutesStr === '' || nightWorkMinutesStr === '0:00') {
      return false;
    }

    // 深夜労働時間を分に変換
    const nightWorkMinutes = this.parseTimeToMinutes(nightWorkMinutesStr);

    // 深夜労働が30分未満の場合は対象外（軽微な超過は違反としない）
    const NIGHT_WORK_THRESHOLD_MINUTES = 30;
    if (nightWorkMinutes < NIGHT_WORK_THRESHOLD_MINUTES) {
      return false;
    }

    // 実働時間と休憩時間を取得
    const actualWorkMinutes = this.parseTimeToMinutes(record.actualWorkHours);
    const breakMinutes = record.breakTimeMinutes || 0;
    const requiredBreakMinutes = this.calculateRequiredBreakMinutes(actualWorkMinutes);

    // 基本的な休憩時間が十分に取得されている場合は対象外
    // （勤務時間に対して必要な休憩を満たしている）
    if (breakMinutes >= requiredBreakMinutes) {
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

    // 深夜労働が30分以上あり、かつ休憩時間が不足している = 申請漏れ
    return true;
  }

  /**
   * 日次の詳細分析
   */
  static analyzeDailyRecord(record: AttendanceRecord): DailyAttendanceAnalysis {
    const leaveType = this.determineLeaveType(record.applicationContent);
    const actualWorkMinutes = this.parseTimeToMinutes(record.actualWorkHours);

    const isHolidayWork = record.calendarType !== 'weekday' && !!record.clockIn && !this.isSubstituteWork(record);
    const { overtimeMinutes, legalOvertimeMinutes } = this.calculateOvertimeDetails(record);
    const rawLateMinutes = this.parseTimeToMinutes(record.lateMinutes);
    const earlyLeaveMinutes = this.parseTimeToMinutes(record.earlyLeaveMinutes);

    // 8時スケジュールの遅刻除外判定
    // 8時カレンダーで9時スケジュール未設定の従業員が9時出社した場合の1時間遅刻は除外
    const shouldExcludeLate = this.shouldExcludeLateFor8HourSchedule(record, rawLateMinutes);
    const lateMinutes = shouldExcludeLate ? 0 : rawLateMinutes;

    // 休憩時間: 調整後の値で判定（自動増加/自動付与を除外）
    const breakAdjustment = this.getBreakAdjustmentMinutes(record);
    const breakMinutes = Math.max(0, (record.breakTimeMinutes || 0) - breakAdjustment);
    const adjustedWorkMinutes = actualWorkMinutes + breakAdjustment;
    const adjustedRequiredBreakMinutes = this.calculateRequiredBreakMinutes(adjustedWorkMinutes);

    // 休憩違反判定: 調整後実働6時間超で休憩が必要時間未満の場合
    const hasBreakViolation = adjustedWorkMinutes > BREAK_TIME_REQUIREMENTS.THRESHOLD_6H_MINUTES &&
                             breakMinutes < adjustedRequiredBreakMinutes;

    // 打刻漏れ判定: 片方でも欠落していれば違反（休暇日を除く）
    // - 出社ありで退社なし: 退社打刻漏れ
    // - 出社なしで退社あり: 出社打刻漏れ
    // - 両方なし（実働もなし）: 完全未入力
    const hasClockIn = record.clockIn !== null;
    const hasClockOut = record.clockOut !== null;
    const hasMissingClock = record.calendarType === 'weekday' &&
      leaveType === 'none' &&
      (
        (hasClockIn && !hasClockOut) ||  // 退社打刻のみ欠落
        (!hasClockIn && hasClockOut) ||  // 出社打刻のみ欠落
        (!hasClockIn && !hasClockOut && actualWorkMinutes === 0)  // 両方欠落（実働なし）
      );

    const isTimelyDep = this.isTimelyDeparture(record, leaveType);

    // 早出フラグ未入力違反チェック
    const hasEarlyStartViolation = this.hasEarlyStartViolation(record, leaveType);

    // 申請漏れ検出ロジック
    // 遅刻申請漏れは計算後のlateMinutes（8時スケジュール除外後）を使用
    const hasLateApplicationMissing = this.hasLateApplicationMissingWithMinutes(record, lateMinutes);
    const hasEarlyLeaveApplicationMissing = this.hasEarlyLeaveApplicationMissing(record);
    const hasTimeLeavePunchMissing = this.hasTimeLeavePunchMissing(record);
    const hasNightBreakApplicationMissing = this.hasNightBreakApplicationMissing(record);

    // 備考欄チェックは楽楽勤怠側で管理されるため無効化（2026-01-30）
    // const remarksCheck = this.checkRemarksRequired(record);
    // const hasRemarksMissing = remarksCheck.isRequired && remarksCheck.isMissing;
    // const remarksFormatCheck = this.checkRemarksFormat(record.remarks || '');
    // const hasRemarksFormatWarning = remarksCheck.isRequired && !remarksCheck.isMissing && !remarksFormatCheck.isValid;

    // 違反リスト作成（申請漏れベース）
    const violations: ViolationType[] = [];
    if (hasMissingClock) violations.push('missing_clock');
    if (hasBreakViolation) violations.push('break_violation');
    if (hasLateApplicationMissing) violations.push('late_application_missing');
    if (hasEarlyLeaveApplicationMissing) violations.push('early_leave_application_missing');
    if (hasEarlyStartViolation) violations.push('early_start_application_missing');
    if (hasTimeLeavePunchMissing) violations.push('time_leave_punch_missing');
    if (hasNightBreakApplicationMissing) violations.push('night_break_application_missing');
    // 備考欄チェックは無効化（楽楽勤怠側で管理）
    // if (hasRemarksMissing) violations.push('remarks_missing');
    // if (hasRemarksFormatWarning) violations.push('remarks_format_warning');

    return {
      record,
      leaveType,
      isHolidayWork,
      isTimelyDeparture: isTimelyDep,
      overtimeMinutes,
      legalOvertimeMinutes,
      lateMinutes,
      earlyLeaveMinutes,
      actualBreakMinutes: breakMinutes,
      requiredBreakMinutes: adjustedRequiredBreakMinutes,
      hasBreakViolation,
      hasMissingClock,
      hasEarlyStartViolation,
      violations,
    };
  }

  /**
   * 申請種別ごとのカウントを取得（個人分析PDF用）
   * 楽楽勤怠マニュアルの申請一覧に基づくカウント
   */
  static countApplications(records: AttendanceRecord[]): ApplicationCounts {
    // === 勤務関連（9項目） ===
    let overtime = 0;           // 残業申請
    let earlyStart = 0;         // 早出申請
    let earlyStartBreak = 0;    // 早出中抜け時間帯申請
    let lateEarlyLeave = 0;     // 遅刻・早退申請
    let trainDelay = 0;         // 電車遅延申請
    let flextime = 0;           // 時差出勤申請
    let breakModification = 0;  // 休憩時間修正申請
    let standby = 0;            // 待機申請
    let nightDuty = 0;          // 宿直申請

    // === 休暇・休日関連（15項目） ===
    let annualLeave = 0;            // 有休申請（全休）
    let amLeave = 0;                // 午前有休
    let pmLeave = 0;                // 午後有休
    let hourlyLeave = 0;            // 時間有休申請
    let holidayWork = 0;            // 休出申請
    let substituteWork = 0;         // 振替出勤申請
    let substituteHoliday = 0;      // 振替休日申請
    let compensatoryLeave = 0;      // 代休申請
    let absence = 0;                // 欠勤申請
    let specialLeave = 0;           // 特休申請
    let menstrualLeave = 0;         // 生理休暇申請
    let childCareLeave = 0;         // 子の看護休暇申請
    let hourlyChildCareLeave = 0;   // 時間子の看護休暇申請
    let nursingCareLeave = 0;       // 介護休暇申請
    let hourlyNursingCareLeave = 0; // 時間介護休暇申請
    let postNightLeave = 0;         // 明け休申請

    // === その他 ===
    let other = 0;

    for (const record of records) {
      const app = record.applicationContent || '';

      // 空文字またはスケジュール情報のみの場合は早出フラグのみチェック
      if (!app || this.isScheduleOnly(app)) {
        // 早出フラグがある場合のみカウント
        if (record.earlyStartFlag) {
          earlyStart++;
        }
        continue;
      }

      // マッチしたかどうかのフラグ
      let matched = false;

      // === 勤務関連 ===

      // 残業申請: 残業, 残業開始, 残業終了
      if (app.includes('残業')) {
        overtime++;
        matched = true;
      }

      // 早出中抜け時間帯申請（早出より先にチェック）
      if (app.includes('早出中抜け')) {
        earlyStartBreak++;
        matched = true;
      }
      // 早出申請: 早出, 早出開始（早出中抜けを除く）
      else if (app.includes('早出') || record.earlyStartFlag) {
        earlyStart++;
        matched = true;
      }

      // 遅刻・早退申請: 遅刻, 早退, 遅刻・早退
      if (app.includes('遅刻') || app.includes('早退')) {
        lateEarlyLeave++;
        matched = true;
      }

      // 電車遅延申請
      if (app.includes('電車遅延') || app.includes('遅延届') || app.includes('遅延申請')) {
        trainDelay++;
        matched = true;
      }

      // 時差出勤申請
      if (app.includes('時差出勤') || app.includes('時差勤務')) {
        flextime++;
        matched = true;
      }

      // 休憩時間修正申請
      if (app.includes('休憩修正') || app.includes('休憩時間修正') || app.includes('深夜休憩')) {
        breakModification++;
        matched = true;
      }

      // 待機申請
      if (app.includes('待機')) {
        standby++;
        matched = true;
      }

      // 宿直申請
      if (app.includes('宿直')) {
        nightDuty++;
        matched = true;
      }

      // === 休暇・休日関連 ===

      // 時間有休申請（有休時間、時間有休）- 先にチェック
      const isHourlyLeave = app.includes('有休時間') || app.includes('時間有休');
      if (isHourlyLeave) {
        hourlyLeave++;
        matched = true;
      }

      // 午前有休
      const isAmLeave = app.includes('午前有休') || app.includes('AM有休') || app.includes('午前休');
      if (isAmLeave) {
        amLeave++;
        matched = true;
      }

      // 午後有休
      const isPmLeave = app.includes('午後有休') || app.includes('PM有休') || app.includes('午後休');
      if (isPmLeave) {
        pmLeave++;
        matched = true;
      }

      // 有休申請（全休）- 午前/午後/時間有休を除外
      if ((app.includes('有休') || app.includes('有給') || app.includes('年休')) &&
          !isHourlyLeave && !isAmLeave && !isPmLeave) {
        annualLeave++;
        matched = true;
      }

      // 休出申請（休日出勤）
      if (app.includes('休出') || app.includes('休日出勤')) {
        holidayWork++;
        matched = true;
      }

      // 振替出勤申請
      if (app.includes('振替出勤') || (app.includes('振出') && !app.includes('振休'))) {
        substituteWork++;
        matched = true;
      }

      // 振替休日申請
      if (app.includes('振替休日') || app.includes('振休')) {
        substituteHoliday++;
        matched = true;
      }

      // 代休申請
      if (app.includes('代休')) {
        compensatoryLeave++;
        matched = true;
      }

      // 欠勤申請
      if (app.includes('欠勤')) {
        absence++;
        matched = true;
      }

      // 特休申請
      if (app.includes('特休') || app.includes('特別休暇')) {
        specialLeave++;
        matched = true;
      }

      // 生理休暇申請
      if (app.includes('生理休暇')) {
        menstrualLeave++;
        matched = true;
      }

      // 時間子の看護休暇申請（看護休暇より先にチェック）
      if (app.includes('看護休暇時間') || app.includes('時間看護休暇')) {
        hourlyChildCareLeave++;
        matched = true;
      }
      // 子の看護休暇申請
      else if (app.includes('看護休暇') || app.includes('子の看護')) {
        childCareLeave++;
        matched = true;
      }

      // 時間介護休暇申請（介護休暇より先にチェック）
      if (app.includes('介護休暇時間') || app.includes('時間介護休暇')) {
        hourlyNursingCareLeave++;
        matched = true;
      }
      // 介護休暇申請
      else if (app.includes('介護休暇')) {
        nursingCareLeave++;
        matched = true;
      }

      // 明け休申請
      if (app.includes('明け休')) {
        postNightLeave++;
        matched = true;
      }

      // === その他 ===
      // マニュアル一覧に該当しない申請
      if (!matched) {
        other++;
      }
    }

    return {
      // 勤務関連
      overtime,
      earlyStart,
      earlyStartBreak,
      lateEarlyLeave,
      trainDelay,
      flextime,
      breakModification,
      standby,
      nightDuty,
      // 休暇・休日関連
      annualLeave,
      amLeave,
      pmLeave,
      hourlyLeave,
      holidayWork,
      substituteWork,
      substituteHoliday,
      compensatoryLeave,
      absence,
      specialLeave,
      menstrualLeave,
      childCareLeave,
      hourlyChildCareLeave,
      nursingCareLeave,
      hourlyNursingCareLeave,
      postNightLeave,
      // その他
      other,
    };
  }

  /**
   * 申請内容がスケジュール情報のみかどうか判定
   * 形式: "900-1730/1200-1300/7.75/5" のようなパターン
   */
  private static isScheduleOnly(applicationContent: string): boolean {
    if (!applicationContent) return true;

    // スケジュールパターン: 数字-数字/数字-数字/数字.数字/数字
    const schedulePattern = /^\d{3,4}-\d{3,4}\/\d{3,4}-\d{3,4}\/[\d.]+\/\d+$/;
    return schedulePattern.test(applicationContent.trim());
  }

  /**
   * 総就業時間を計算（個人分析PDF用）
   * @param records 勤怠レコード
   * @returns 総就業時間（分）
   */
  static calculateTotalWorkMinutes(records: AttendanceRecord[]): number {
    let totalMinutes = 0;

    for (const record of records) {
      const workHours = record.actualWorkHours || '';
      if (workHours) {
        // "H:MM" 形式をパース
        const [hours, minutes] = workHours.split(':').map(s => parseInt(s, 10) || 0);
        totalMinutes += hours * 60 + minutes;
      }
    }

    return totalMinutes;
  }

  /**
   * 従業員ごとの月次サマリーを作成
   */
  static createEmployeeMonthlySummary(
    employeeId: string,
    records: AttendanceRecord[],
    options: AnalysisOptions = {}
  ): EmployeeMonthlySummary {
    const { includeToday = false } = options;
    const firstRecord = records[0];
    const dailyAnalyses = records.map(r => this.analyzeDailyRecord(r));

    const violations: AttendanceViolation[] = [];

    let totalWorkDays = 0;
    let holidayWorkDays = 0;
    let totalOvertimeMinutes = 0;
    let totalLegalOvertimeMinutes = 0;
    let lateDays = 0;
    let earlyLeaveDays = 0;
    let timelyDepartureDays = 0;
    let fullDayLeaveDays = 0;
    let halfDayLeaveDays = 0;
    let breakViolationDays = 0;
    let missingClockDays = 0;
    let earlyStartViolationDays = 0;
    let nightWorkDays = 0;

    // 営業日カウント（予兆計算用）
    let passedWeekdays = 0;        // 経過営業日数（分析対象期間内の平日）
    let totalWeekdaysInMonth = 0;  // 月間営業日数（カレンダー上の平日合計）

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // まず全レコードから月間営業日数をカウント
    for (const record of records) {
      if (record.calendarType === 'weekday') {
        totalWeekdaysInMonth++;
      }
    }

    for (const analysis of dailyAnalyses) {
      const record = analysis.record;

      // 日付フィルタリング: includeToday=falseなら今日以降をスキップ、trueなら未来のみスキップ
      if (includeToday) {
        // 明日以降はスキップ
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        if (record.date >= tomorrow) continue;
      } else {
        // 今日以降はスキップ（デフォルト）
        if (record.date >= today) continue;
      }

      // 経過営業日カウント（分析対象期間内の平日）
      if (record.calendarType === 'weekday') {
        passedWeekdays++;
      }

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
      totalLegalOvertimeMinutes += analysis.legalOvertimeMinutes;

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

      // 深夜帯勤務（22:00以降退勤）
      if (this.isNightWork(record)) {
        nightWorkDays++;
      }

      // 備考欄チェックは楽楽勤怠側で管理されるため無効化（2026-01-30）
      // if (analysis.violations.includes('remarks_missing')) {
      //   const remarksCheck = this.checkRemarksRequired(record);
      //   violations.push({
      //     employeeId,
      //     employeeName: firstRecord.employeeName,
      //     department: firstRecord.department,
      //     date: record.date,
      //     type: 'remarks_missing',
      //     details: remarksCheck.requiredReason || '備考欄未入力',
      //   });
      // }

      // if (analysis.violations.includes('remarks_format_warning')) {
      //   violations.push({
      //     employeeId,
      //     employeeName: firstRecord.employeeName,
      //     department: firstRecord.department,
      //     date: record.date,
      //     type: 'remarks_format_warning',
      //     details: `備考「${record.remarks}」が短すぎます`,
      //   });
      // }
    }

    // 申請カウントと総就業時間を計算
    const applicationCounts = this.countApplications(records);
    const totalWorkMinutes = this.calculateTotalWorkMinutes(records);

    return {
      employeeId,
      employeeName: firstRecord.employeeName,
      department: firstRecord.department,
      sheetName: firstRecord.sheetName,
      totalWorkDays,
      holidayWorkDays,
      totalOvertimeMinutes,
      totalLegalOvertimeMinutes,
      lateDays,
      earlyLeaveDays,
      timelyDepartureDays,
      fullDayLeaveDays,
      halfDayLeaveDays,
      breakViolationDays,
      missingClockDays,
      earlyStartViolationDays,
      nightWorkDays,
      violations,
      // 営業日情報（予兆計算用）
      passedWeekdays,
      totalWeekdaysInMonth,
      // 個人分析PDF用
      applicationCounts,
      totalWorkMinutes,
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
      const totalLegalOvertimeMinutes = summaries.reduce((sum, s) => sum + s.totalLegalOvertimeMinutes, 0);
      const holidayWorkCount = summaries.reduce((sum, s) => sum + s.holidayWorkDays, 0);
      const breakViolations = summaries.reduce((sum, s) => sum + s.breakViolationDays, 0);
      const missingClockCount = summaries.reduce((sum, s) => sum + s.missingClockDays, 0);
      const totalViolations = summaries.reduce((sum, s) => sum + s.violations.length, 0);

      results.push({
        department,
        employeeCount: summaries.length,
        totalOvertimeMinutes,
        averageOvertimeMinutes: Math.round(totalOvertimeMinutes / summaries.length),
        totalLegalOvertimeMinutes,
        averageLegalOvertimeMinutes: Math.round(totalLegalOvertimeMinutes / summaries.length),
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
   * @param records 勤怠レコード
   * @param options 分析オプション（includeToday: 今日を含めるか）
   */
  static analyzeExtended(records: AttendanceRecord[], options: AnalysisOptions = {}): ExtendedAnalysisResult {
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
      employeeSummaries.push(this.createEmployeeMonthlySummary(employeeId, recs, options));
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

    // 深夜帯勤務レコードを収集（22:00以降退勤）
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const nightWorkRecords: NightWorkRecord[] = [];
    for (const record of records) {
      // includeToday対応の日付フィルタ
      if (options.includeToday) {
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        if (record.date >= tomorrow) continue;
      } else {
        if (record.date >= today) continue;
      }
      if (this.isNightWork(record)) {
        nightWorkRecords.push({
          employeeName: record.employeeName,
          department: record.department,
          date: record.date,
          clockOut: record.clockOut!,
        });
      }
    }
    // 日付順にソート
    nightWorkRecords.sort((a, b) => a.date.getTime() - b.date.getTime());

    // 日付範囲を取得
    const dates = records.map(r => r.date).filter(d => d !== null);
    const minDate = dates.length > 0 ? new Date(Math.min(...dates.map(d => d.getTime()))) : new Date();
    const maxDate = dates.length > 0 ? new Date(Math.max(...dates.map(d => d.getTime()))) : new Date();

    // ユニークなシート名
    const uniqueSheets = [...new Set(records.map(r => r.sheetName))];

    // 緊急度別カウント
    // 高緊急度: 残業45時間以上 OR 法令違反（休憩違反、深夜休憩申請漏れ）
    const highCount = employeeSummaries.filter(emp => {
      const overtimeLevel = this.getOvertimeAlertLevel(emp.totalLegalOvertimeMinutes);
      const isOvertimeHigh = ['exceeded', 'caution', 'serious', 'severe', 'critical', 'illegal'].includes(overtimeLevel);
      const hasHighViolation = emp.violations.some(v => VIOLATION_URGENCY[v.type] === 'high');
      return isOvertimeHigh || hasHighViolation;
    }).length;
    // 中緊急度: 届出漏れ（遅刻・早退・早出・時間有休）
    const mediumCount = employeeSummaries.filter(emp =>
      emp.violations.some(v => VIOLATION_URGENCY[v.type] === 'medium')
    ).length;
    // 低緊急度は使用しないが互換性のため0を設定
    const lowCount = 0;

    const summary: AnalysisSummary = {
      totalEmployees: employeeSummaries.length,
      employeesWithIssues: employeeSummaries.filter(s =>
        s.violations.length > 0 || s.totalLegalOvertimeMinutes >= 45 * 60
      ).length,
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
      nightWorkRecords,
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
      '出勤日数', '休日出勤日数', '残業時間', '法定外残業', '平均残業/日',
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
        this.formatMinutesToTime(s.totalLegalOvertimeMinutes),
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
