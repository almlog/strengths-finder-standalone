// 振替出勤の休日出勤判定・残業計算テスト
//
// Bug: カレンダー休日に振替出勤した場合、休日出勤としてカウントされてしまう
// 期待: 振替出勤は平日扱い（isHolidayWork = false、残業計算も平日閾値）

import { AttendanceService } from '../../services/AttendanceService';
import { AttendanceRecord } from '../../models/AttendanceTypes';

const createTestRecord = (
  overrides?: Partial<AttendanceRecord>
): AttendanceRecord => ({
  employeeId: 'TEST001',
  employeeName: 'テスト太郎',
  department: '開発部',
  position: '一般',
  date: new Date('2025-12-06'),
  dayOfWeek: '土',
  calendarType: 'non_statutory_holiday',
  calendarRaw: '法定外',
  applicationContent: '',
  clockIn: new Date('2025-12-06T09:00:00'),
  clockOut: new Date('2025-12-06T18:00:00'),
  originalClockIn: new Date('2025-12-06T09:00:00'),
  originalClockOut: new Date('2025-12-06T18:00:00'),
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
  lateMinutes: '',
  earlyLeaveMinutes: '',
  remarks: '',
  sheetName: 'テストシート',
  ...(overrides || {}),
});

describe('AttendanceService - 振替出勤の休日出勤判定', () => {
  describe('analyzeDailyRecord - isHolidayWork', () => {
    it('カレンダー休日 + 振替出勤申請 → isHolidayWork = false', () => {
      const record = createTestRecord({
        applicationContent: '振替出勤',
        calendarType: 'non_statutory_holiday',
      });
      const result = AttendanceService.analyzeDailyRecord(record);
      expect(result.isHolidayWork).toBe(false);
    });

    it('カレンダー休日 + 振出申請 → isHolidayWork = false', () => {
      const record = createTestRecord({
        applicationContent: '振出',
        calendarType: 'statutory_holiday',
      });
      const result = AttendanceService.analyzeDailyRecord(record);
      expect(result.isHolidayWork).toBe(false);
    });

    it('カレンダー休日 + 休日出勤申請 → isHolidayWork = true（従来通り）', () => {
      const record = createTestRecord({
        applicationContent: '休日出勤',
        calendarType: 'non_statutory_holiday',
      });
      const result = AttendanceService.analyzeDailyRecord(record);
      expect(result.isHolidayWork).toBe(true);
    });

    it('カレンダー休日 + 申請なし + 出勤あり → isHolidayWork = true（従来通り）', () => {
      const record = createTestRecord({
        applicationContent: '',
        calendarType: 'non_statutory_holiday',
      });
      const result = AttendanceService.analyzeDailyRecord(record);
      expect(result.isHolidayWork).toBe(true);
    });

    it('平日 + 振替出勤申請 → isHolidayWork = false（平日なので影響なし）', () => {
      const record = createTestRecord({
        applicationContent: '振替出勤',
        calendarType: 'weekday',
        calendarRaw: '平日',
      });
      const result = AttendanceService.analyzeDailyRecord(record);
      expect(result.isHolidayWork).toBe(false);
    });
  });

  describe('calculateOvertimeDetails - 振替出勤は平日閾値で計算', () => {
    it('振替出勤 + 8h勤務 → 残業=15分, 法定外=0分（平日閾値7h45m/8h適用）', () => {
      const record = createTestRecord({
        applicationContent: '振替出勤',
        calendarType: 'non_statutory_holiday',
        actualWorkHours: '8:00',
      });
      const result = AttendanceService.calculateOvertimeDetails(record);
      expect(result.overtimeMinutes).toBe(15);
      expect(result.legalOvertimeMinutes).toBe(0);
    });

    it('振替出勤 + 9h勤務 → 残業=75分, 法定外=60分（平日閾値適用）', () => {
      const record = createTestRecord({
        applicationContent: '振替出勤',
        calendarType: 'statutory_holiday',
        actualWorkHours: '9:00',
      });
      const result = AttendanceService.calculateOvertimeDetails(record);
      expect(result.overtimeMinutes).toBe(75);
      expect(result.legalOvertimeMinutes).toBe(60);
    });

    it('休日出勤（振替なし）+ 8h勤務 → 残業=480分, 法定外=480分（全量）', () => {
      const record = createTestRecord({
        applicationContent: '休日出勤',
        calendarType: 'non_statutory_holiday',
        actualWorkHours: '8:00',
      });
      const result = AttendanceService.calculateOvertimeDetails(record);
      expect(result.overtimeMinutes).toBe(480);
      expect(result.legalOvertimeMinutes).toBe(480);
    });
  });

  describe('月次サマリー - 振替出勤は休日出勤カウントに含まれない', () => {
    it('振替出勤日は holidayWorkDays にカウントされない', () => {
      const records: AttendanceRecord[] = [
        createTestRecord({
          applicationContent: '振替出勤',
          calendarType: 'non_statutory_holiday',
          date: new Date('2025-12-06'),
          actualWorkHours: '8:00',
        }),
        createTestRecord({
          applicationContent: '休日出勤',
          calendarType: 'non_statutory_holiday',
          date: new Date('2025-12-13'),
          actualWorkHours: '5:00',
        }),
      ];

      const summary = AttendanceService.createEmployeeMonthlySummary('TEST001', records);
      expect(summary.holidayWorkDays).toBe(1); // 休日出勤のみ
    });
  });

  describe('振替休日（平日に取得） - 未入力違反にならない', () => {
    it('平日 + 振替休日申請 + 出退勤なし → hasMissingClock = false（休暇扱い）', () => {
      const record = createTestRecord({
        calendarType: 'weekday',
        calendarRaw: '平日',
        applicationContent: '振替休日',
        clockIn: null,
        clockOut: null,
        actualWorkHours: '',
        date: new Date('2025-12-08'),
        dayOfWeek: '月',
      });
      const result = AttendanceService.analyzeDailyRecord(record);
      expect(result.hasMissingClock).toBe(false);
      expect(result.leaveType).toBe('full_day');
    });

    it('平日 + 振休申請 + 出退勤なし → hasMissingClock = false', () => {
      const record = createTestRecord({
        calendarType: 'weekday',
        calendarRaw: '平日',
        applicationContent: '振休',
        clockIn: null,
        clockOut: null,
        actualWorkHours: '',
        date: new Date('2025-12-08'),
        dayOfWeek: '月',
      });
      const result = AttendanceService.analyzeDailyRecord(record);
      expect(result.hasMissingClock).toBe(false);
      expect(result.leaveType).toBe('full_day');
    });

    it('平日 + 振替休日 → 残業計算は0（実働なし）', () => {
      const record = createTestRecord({
        calendarType: 'weekday',
        calendarRaw: '平日',
        applicationContent: '振替休日',
        clockIn: null,
        clockOut: null,
        actualWorkHours: '',
        date: new Date('2025-12-08'),
        dayOfWeek: '月',
      });
      const result = AttendanceService.analyzeDailyRecord(record);
      expect(result.overtimeMinutes).toBe(0);
      expect(result.legalOvertimeMinutes).toBe(0);
    });

    it('振替休日は violations（違反リスト）に何も追加しない', () => {
      const record = createTestRecord({
        calendarType: 'weekday',
        calendarRaw: '平日',
        applicationContent: '振替休日',
        clockIn: null,
        clockOut: null,
        actualWorkHours: '',
        date: new Date('2025-12-08'),
        dayOfWeek: '月',
      });
      const result = AttendanceService.analyzeDailyRecord(record);
      expect(result.violations).toEqual([]);
    });
  });
});
