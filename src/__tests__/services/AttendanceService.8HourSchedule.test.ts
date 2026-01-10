/**
 * AttendanceService - 8時スケジュール検出テスト & 早出違反検出テスト
 * TDD: 8時出社スケジュールの残業除外ロジック、および早出フラグ未入力違反を検証
 */

import { AttendanceService } from '../../services/AttendanceService';
import { AttendanceRecord, LeaveType } from '../../models/AttendanceTypes';

describe('AttendanceService - 8時スケジュール検出', () => {
  describe('is8HourScheduleFromSheetName', () => {
    it('should detect 8時 schedule from sheet name with "800-" pattern', () => {
      expect(AttendanceService.is8HourScheduleFromSheetName('KDDI_日勤_800-1630～930-1800_1200')).toBe(true);
    });

    it('should detect 8時 schedule from sheet name with "_800_" pattern', () => {
      expect(AttendanceService.is8HourScheduleFromSheetName('Project_800_1700')).toBe(true);
    });

    it('should detect 8時 schedule from sheet name with "_8時" pattern', () => {
      expect(AttendanceService.is8HourScheduleFromSheetName('チームA_8時出社')).toBe(true);
    });

    it('should NOT detect 8時 schedule from standard 9時 sheet name', () => {
      expect(AttendanceService.is8HourScheduleFromSheetName('KDDI_日勤_900-1800')).toBe(false);
    });

    it('should NOT detect 8時 schedule from generic sheet name', () => {
      expect(AttendanceService.is8HourScheduleFromSheetName('開発チーム_2024年1月')).toBe(false);
    });
  });

  describe('calculateOvertimeMinutes - Excelの残業時間カラムを使用', () => {
    /**
     * 残業時間はExcelの「平日法定外残業(36協定用)」カラムから取得する
     * 楽楽勤怠が正しく計算した値を使用するため、計算ロジックは不要
     */
    const createMockRecord = (
      sheetName: string,
      actualWorkHours: string,
      overtimeHours: string = ''
    ): AttendanceRecord => ({
      employeeId: '1408008',
      employeeName: '松戸 胤人',
      department: '13D51210',
      position: '一般',
      date: new Date('2026-01-06'),
      dayOfWeek: '火',
      calendarType: 'weekday',
      calendarRaw: '平日',
      applicationContent: '',
      clockIn: new Date('2026-01-06T09:00:00'),
      clockOut: new Date('2026-01-06T20:50:00'),
      originalClockIn: null,
      originalClockOut: null,
      earlyStartFlag: false,
      altxOvertimeIn: null,
      altxOvertimeOut: null,
      privateOutTime: null,
      privateReturnTime: null,
      breakTimeMinutes: 60,
      nightBreakModification: '',
      nightWorkMinutes: '',
      actualWorkHours,
      overtimeHours,
      lateMinutes: '',
      earlyLeaveMinutes: '',
      remarks: '',
      sheetName,
    });

    it('should get overtime from Excel for 8時 schedule employee', () => {
      // 8時カレンダー登録者も通常通りExcelの残業時間を取得
      const record = createMockRecord('KDDI_日勤_800-1630～930-1800_1200', '10:50', '2:50');
      const overtime = AttendanceService.calculateOvertimeMinutes(record);
      expect(overtime).toBe(170); // 2:50 = 170分
    });

    it('should get overtime from Excel for 9時 schedule employee', () => {
      const record = createMockRecord('KDDI_日勤_900-1800', '10:50', '2:50');
      const overtime = AttendanceService.calculateOvertimeMinutes(record);
      // Excelの「平日法定外残業(36協定用)」カラムから取得: 2:50 = 170分
      expect(overtime).toBe(170);
    });

    it('should get overtime from Excel for generic sheet name', () => {
      const record = createMockRecord('開発チーム_2024年1月', '9:00', '1:00');
      const overtime = AttendanceService.calculateOvertimeMinutes(record);
      // Excelの「平日法定外残業(36協定用)」カラムから取得: 1:00 = 60分
      expect(overtime).toBe(60);
    });

    it('should return 0 when Excel overtime column is empty', () => {
      const record = createMockRecord('開発チーム_2024年1月', '8:00', '');
      const overtime = AttendanceService.calculateOvertimeMinutes(record);
      expect(overtime).toBe(0);
    });
  });
});

describe('AttendanceService - 早出フラグ未入力違反検出', () => {
  const createEarlyStartRecord = (
    clockInHour: number,
    earlyStartFlag: boolean,
    applicationContent: string = ''
  ): AttendanceRecord => ({
    employeeId: '1234567',
    employeeName: 'テスト 太郎',
    department: '開発部',
    position: '一般',
    date: new Date('2026-01-06'),
    dayOfWeek: '火',
    calendarType: 'weekday',
    calendarRaw: '平日',
    applicationContent,
    clockIn: new Date(`2026-01-06T${String(clockInHour).padStart(2, '0')}:00:00`),
    clockOut: new Date('2026-01-06T18:00:00'),
    originalClockIn: null,
    originalClockOut: null,
    earlyStartFlag,
    altxOvertimeIn: null,
    altxOvertimeOut: null,
    privateOutTime: null,
    privateReturnTime: null,
    breakTimeMinutes: 60,
    nightBreakModification: '',
    nightWorkMinutes: '',
    actualWorkHours: '8:00',
    overtimeHours: '',
    lateMinutes: '',
    earlyLeaveMinutes: '',
    remarks: '',
    sheetName: '開発チーム',
  });

  describe('hasEarlyStartViolation', () => {
    it('should detect violation when clocked in before 9:00 without early start flag', () => {
      const record = createEarlyStartRecord(8, false);
      const hasViolation = AttendanceService.hasEarlyStartViolation(record, 'none');
      expect(hasViolation).toBe(true);
    });

    it('should NOT detect violation when clocked in before 9:00 WITH early start flag', () => {
      const record = createEarlyStartRecord(8, true);
      const hasViolation = AttendanceService.hasEarlyStartViolation(record, 'none');
      expect(hasViolation).toBe(false);
    });

    it('should NOT detect violation when clocked in at 9:00 or later', () => {
      const record = createEarlyStartRecord(9, false);
      const hasViolation = AttendanceService.hasEarlyStartViolation(record, 'none');
      expect(hasViolation).toBe(false);
    });

    it('should NOT detect violation when clocked in at 10:00', () => {
      const record = createEarlyStartRecord(10, false);
      const hasViolation = AttendanceService.hasEarlyStartViolation(record, 'none');
      expect(hasViolation).toBe(false);
    });

    it('should NOT detect violation when on full day leave', () => {
      const record = createEarlyStartRecord(8, false);
      const hasViolation = AttendanceService.hasEarlyStartViolation(record, 'full_day');
      expect(hasViolation).toBe(false);
    });

    it('should NOT detect violation when 早出申請 is present', () => {
      const record = createEarlyStartRecord(8, false, '早出申請');
      const hasViolation = AttendanceService.hasEarlyStartViolation(record, 'none');
      expect(hasViolation).toBe(false);
    });

    it('should detect violation at 7:00 without early start flag', () => {
      const record = createEarlyStartRecord(7, false);
      const hasViolation = AttendanceService.hasEarlyStartViolation(record, 'none');
      expect(hasViolation).toBe(true);
    });
  });

  describe('analyzeDailyRecord - early start violation included', () => {
    it('should include early_start_application_missing in violations array', () => {
      const record = createEarlyStartRecord(8, false);
      const analysis = AttendanceService.analyzeDailyRecord(record);
      expect(analysis.hasEarlyStartViolation).toBe(true);
      expect(analysis.violations).toContain('early_start_application_missing');
    });

    it('should NOT include early_start_application_missing when flag is set', () => {
      const record = createEarlyStartRecord(8, true);
      const analysis = AttendanceService.analyzeDailyRecord(record);
      expect(analysis.hasEarlyStartViolation).toBe(false);
      expect(analysis.violations).not.toContain('early_start_application_missing');
    });
  });
});

describe('AttendanceService - 8時スケジュール遅刻除外', () => {
  const createLateRecord = (
    sheetName: string,
    lateMinutesStr: string,
    clockInHour: number,
    originalClockIn: Date | null
  ): AttendanceRecord => ({
    employeeId: '1408008',
    employeeName: '松戸 胤人',
    department: '13D51210',
    position: '一般',
    date: new Date('2026-01-06'),
    dayOfWeek: '火',
    calendarType: 'weekday',
    calendarRaw: '平日',
    applicationContent: '',
    clockIn: new Date(`2026-01-06T${String(clockInHour).padStart(2, '0')}:00:00`),
    clockOut: new Date('2026-01-06T18:00:00'),
    originalClockIn,
    originalClockOut: null,
    earlyStartFlag: false,
    altxOvertimeIn: null,
    altxOvertimeOut: null,
    privateOutTime: null,
    privateReturnTime: null,
    breakTimeMinutes: 60,
    nightBreakModification: '',
    nightWorkMinutes: '',
    actualWorkHours: '8:00',
    overtimeHours: '',
    lateMinutes: lateMinutesStr,
    earlyLeaveMinutes: '',
    remarks: '',
    sheetName,
  });

  describe('shouldExcludeLateFor8HourSchedule', () => {
    it('should exclude late for 8時 schedule with no schedule info and 1hour late at 9:00', () => {
      // 松戸さんのケース: 8時シート、出社カラムに日時（スケジュール情報なし）、1時間遅刻、9時出社
      const result = AttendanceService.shouldExcludeLateFor8HourSchedule(
        createLateRecord('KDDI_日勤_800-1630～930-1800_1200', '1:00', 9, new Date('2026-01-06T09:00:00')),
        60
      );
      expect(result).toBe(true);
    });

    it('should NOT exclude late when schedule info exists (originalClockIn = null)', () => {
      // 上間さんのケース: 8時シート、出社カラムにスケジュール情報（"900-1730/..."）
      // → originalClockInがnullになる
      const result = AttendanceService.shouldExcludeLateFor8HourSchedule(
        createLateRecord('KDDI_日勤_800-1630～930-1800_1200', '1:00', 9, null),
        60
      );
      expect(result).toBe(false);
    });

    it('should NOT exclude late for non-8時 schedule sheet', () => {
      const result = AttendanceService.shouldExcludeLateFor8HourSchedule(
        createLateRecord('KDDI_日勤_900-1800', '1:00', 9, new Date('2026-01-06T09:00:00')),
        60
      );
      expect(result).toBe(false);
    });

    it('should NOT exclude late when late is not exactly 60 minutes', () => {
      const result = AttendanceService.shouldExcludeLateFor8HourSchedule(
        createLateRecord('KDDI_日勤_800-1630～930-1800_1200', '0:30', 9, new Date('2026-01-06T09:00:00')),
        30
      );
      expect(result).toBe(false);
    });

    it('should NOT exclude late when clock in is not 9:00', () => {
      const result = AttendanceService.shouldExcludeLateFor8HourSchedule(
        createLateRecord('KDDI_日勤_800-1630～930-1800_1200', '2:00', 10, new Date('2026-01-06T10:00:00')),
        120
      );
      expect(result).toBe(false);
    });
  });

  describe('analyzeDailyRecord - late exclusion', () => {
    it('should exclude late violation for 8時 schedule employee with no schedule info', () => {
      const record = createLateRecord(
        'KDDI_日勤_800-1630～930-1800_1200',
        '1:00',
        9,
        new Date('2026-01-06T09:00:00')
      );
      const analysis = AttendanceService.analyzeDailyRecord(record);
      expect(analysis.lateMinutes).toBe(0);
      // lateMinutes=0 なので遅刻申請漏れにはならない
      expect(analysis.violations).not.toContain('late_application_missing');
    });

    it('should detect late application missing for employee with schedule info', () => {
      const record = createLateRecord(
        'KDDI_日勤_800-1630～930-1800_1200',
        '1:00',
        9,
        null  // originalClockIn = null means schedule info exists in column 8
      );
      const analysis = AttendanceService.analyzeDailyRecord(record);
      expect(analysis.lateMinutes).toBe(60);
      // 遅刻があり申請がない → 遅刻申請漏れ
      expect(analysis.violations).toContain('late_application_missing');
    });
  });
});
