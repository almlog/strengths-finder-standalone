/**
 * AttendanceService - 休暇種別判定テスト
 *
 * TDD: 生理休暇など1日単位の休暇が正しく全休と判定され、
 * 打刻漏れ扱いにならないことを検証
 */

import AttendanceService from '../../services/AttendanceService';
import { AttendanceRecord } from '../../models/AttendanceTypes';

// テスト用のベースレコード
const createBaseRecord = (overrides: Partial<AttendanceRecord> = {}): AttendanceRecord => ({
  employeeId: 'E001',
  employeeName: 'テスト太郎',
  department: 'テスト部',
  date: new Date('2026-01-15'),
  dayOfWeek: '水',
  calendarType: 'weekday',
  clockIn: null,
  clockOut: null,
  breakTimeMinutes: 0,
  actualWorkHours: '0:00',
  lateMinutes: null,
  earlyLeaveMinutes: null,
  overtime36: '0:00',
  applicationContent: '',
  remarks: '',
  earlyStartFlag: '',
  privateOutTime: null,
  privateReturnTime: null,
  nightBreakModification: '',
  ...overrides,
});

describe('AttendanceService.determineLeaveType - 休暇種別判定', () => {
  describe('1日単位の休暇が正しく全休と判定される', () => {
    it('生理休暇は全休と判定される', () => {
      const result = AttendanceService.determineLeaveType('生理休暇');
      expect(result).toBe('full_day');
    });

    it('生理休は全休と判定される', () => {
      const result = AttendanceService.determineLeaveType('生理休');
      expect(result).toBe('full_day');
    });

    it('子の看護休暇は全休と判定される', () => {
      const result = AttendanceService.determineLeaveType('子の看護休暇');
      expect(result).toBe('full_day');
    });

    it('看護休暇は全休と判定される', () => {
      const result = AttendanceService.determineLeaveType('看護休暇');
      expect(result).toBe('full_day');
    });

    it('介護休暇は全休と判定される', () => {
      const result = AttendanceService.determineLeaveType('介護休暇');
      expect(result).toBe('full_day');
    });

    it('明け休は全休と判定される', () => {
      const result = AttendanceService.determineLeaveType('明け休');
      expect(result).toBe('full_day');
    });
  });

  describe('既存の全休判定が維持される', () => {
    it('有休は全休と判定される', () => {
      const result = AttendanceService.determineLeaveType('有休');
      expect(result).toBe('full_day');
    });

    it('欠勤は全休と判定される', () => {
      const result = AttendanceService.determineLeaveType('欠勤');
      expect(result).toBe('full_day');
    });

    it('特休は全休と判定される', () => {
      const result = AttendanceService.determineLeaveType('特休');
      expect(result).toBe('full_day');
    });
  });

  describe('半休判定が維持される', () => {
    it('午前半休は半休（午前）と判定される', () => {
      const result = AttendanceService.determineLeaveType('午前半休');
      expect(result).toBe('half_day_am');
    });

    it('午後半休は半休（午後）と判定される', () => {
      const result = AttendanceService.determineLeaveType('午後半休');
      expect(result).toBe('half_day_pm');
    });
  });
});

describe('AttendanceService.analyzeDailyRecord - 打刻漏れ判定', () => {
  describe('1日単位の休暇では打刻漏れにならない', () => {
    it('生理休暇の日は打刻漏れにならない', () => {
      const record = createBaseRecord({
        applicationContent: '生理休暇',
        clockIn: null,
        clockOut: null,
      });

      const result = AttendanceService.analyzeDailyRecord(record);

      expect(result.leaveType).toBe('full_day');
      expect(result.hasMissingClock).toBe(false);
      expect(result.violations).not.toContain('missing_clock');
    });

    it('子の看護休暇の日は打刻漏れにならない', () => {
      const record = createBaseRecord({
        applicationContent: '子の看護休暇',
        clockIn: null,
        clockOut: null,
      });

      const result = AttendanceService.analyzeDailyRecord(record);

      expect(result.leaveType).toBe('full_day');
      expect(result.hasMissingClock).toBe(false);
      expect(result.violations).not.toContain('missing_clock');
    });

    it('介護休暇の日は打刻漏れにならない', () => {
      const record = createBaseRecord({
        applicationContent: '介護休暇',
        clockIn: null,
        clockOut: null,
      });

      const result = AttendanceService.analyzeDailyRecord(record);

      expect(result.leaveType).toBe('full_day');
      expect(result.hasMissingClock).toBe(false);
      expect(result.violations).not.toContain('missing_clock');
    });

    it('明け休の日は打刻漏れにならない', () => {
      const record = createBaseRecord({
        applicationContent: '明け休',
        clockIn: null,
        clockOut: null,
      });

      const result = AttendanceService.analyzeDailyRecord(record);

      expect(result.leaveType).toBe('full_day');
      expect(result.hasMissingClock).toBe(false);
      expect(result.violations).not.toContain('missing_clock');
    });
  });

  describe('申請がない平日は打刻漏れになる（既存動作の確認）', () => {
    it('申請なしで出退勤なしは打刻漏れ', () => {
      const record = createBaseRecord({
        applicationContent: '',
        clockIn: null,
        clockOut: null,
      });

      const result = AttendanceService.analyzeDailyRecord(record);

      expect(result.leaveType).toBe('none');
      expect(result.hasMissingClock).toBe(true);
      expect(result.violations).toContain('missing_clock');
    });
  });
});
