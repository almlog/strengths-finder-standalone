/**
 * AttendanceService - 申請漏れ検出テスト
 * TDD RED Phase: 申請漏れの検出ロジックを検証
 *
 * 検出対象:
 * - 遅刻申請漏れ (late_application_missing)
 * - 早出申請漏れ (early_start_application_missing)
 * - 時間有休打刻漏れ (time_leave_punch_missing)
 * - 深夜休憩申請漏れ (night_break_application_missing)
 */

import { AttendanceService } from '../../services/AttendanceService';
import { AttendanceRecord } from '../../models/AttendanceTypes';

// テスト用のベースレコード作成ヘルパー
const createBaseRecord = (overrides: Partial<AttendanceRecord> = {}): AttendanceRecord => ({
  employeeId: '1234567',
  employeeName: 'テスト 太郎',
  department: '開発部',
  position: '一般',
  date: new Date('2026-01-06'),
  dayOfWeek: '火',
  calendarType: 'weekday',
  calendarRaw: '平日',
  applicationContent: '',
  clockIn: new Date('2026-01-06T09:00:00'),
  clockOut: new Date('2026-01-06T18:00:00'),
  originalClockIn: new Date('2026-01-06T09:00:00'),
  originalClockOut: new Date('2026-01-06T18:00:00'),
  earlyStartFlag: false,
  altxOvertimeIn: null,
  altxOvertimeOut: null,
  breakTimeMinutes: 60,
  actualWorkHours: '8:00',
  overtimeHours: '',
  lateMinutes: '',
  earlyLeaveMinutes: '',
  remarks: '',
  sheetName: '開発チーム',
  // 新規フィールド
  privateOutTime: null,
  privateReturnTime: null,
  nightBreakModification: '',
  nightWorkMinutes: '',
  ...overrides,
});

describe('AttendanceService - 申請漏れ検出', () => {
  describe('遅刻申請漏れ (late_application_missing)', () => {
    it('should detect late application missing when late without application', () => {
      const record = createBaseRecord({
        lateMinutes: '0:30',
        applicationContent: '',
      });
      const analysis = AttendanceService.analyzeDailyRecord(record);
      expect(analysis.violations).toContain('late_application_missing');
    });

    it('should NOT detect late application missing when late with 遅刻申請', () => {
      const record = createBaseRecord({
        lateMinutes: '0:30',
        applicationContent: '遅刻申請',
      });
      const analysis = AttendanceService.analyzeDailyRecord(record);
      expect(analysis.violations).not.toContain('late_application_missing');
    });

    it('should NOT detect late application missing when late with 時差出勤申請', () => {
      const record = createBaseRecord({
        lateMinutes: '0:30',
        applicationContent: '時差出勤申請',
      });
      const analysis = AttendanceService.analyzeDailyRecord(record);
      expect(analysis.violations).not.toContain('late_application_missing');
    });

    it('should NOT detect late application missing when no late', () => {
      const record = createBaseRecord({
        lateMinutes: '',
        applicationContent: '',
      });
      const analysis = AttendanceService.analyzeDailyRecord(record);
      expect(analysis.violations).not.toContain('late_application_missing');
    });
  });

  describe('早出申請漏れ (early_start_application_missing)', () => {
    it('should detect early start application missing when clock in before 9:00 without flag or application', () => {
      const record = createBaseRecord({
        clockIn: new Date('2026-01-06T08:00:00'),
        earlyStartFlag: false,
        applicationContent: '',
      });
      const analysis = AttendanceService.analyzeDailyRecord(record);
      expect(analysis.violations).toContain('early_start_application_missing');
    });

    it('should NOT detect early start application missing when early start flag is set', () => {
      const record = createBaseRecord({
        clockIn: new Date('2026-01-06T08:00:00'),
        earlyStartFlag: true,
        applicationContent: '',
      });
      const analysis = AttendanceService.analyzeDailyRecord(record);
      expect(analysis.violations).not.toContain('early_start_application_missing');
    });

    it('should NOT detect early start application missing when 早出申請 is present', () => {
      const record = createBaseRecord({
        clockIn: new Date('2026-01-06T08:00:00'),
        earlyStartFlag: false,
        applicationContent: '早出申請',
      });
      const analysis = AttendanceService.analyzeDailyRecord(record);
      expect(analysis.violations).not.toContain('early_start_application_missing');
    });
  });

  describe('時間有休打刻漏れ (time_leave_punch_missing)', () => {
    it('should detect time leave punch missing when 時間有休申請 without 私用外出/戻り', () => {
      const record = createBaseRecord({
        applicationContent: '時間有休申請',
        privateOutTime: null,
        privateReturnTime: null,
      });
      const analysis = AttendanceService.analyzeDailyRecord(record);
      expect(analysis.violations).toContain('time_leave_punch_missing');
    });

    it('should NOT detect time leave punch missing when 時間有休申請 with both punches', () => {
      const record = createBaseRecord({
        applicationContent: '時間有休申請',
        privateOutTime: new Date('2026-01-06T11:00:00'),
        privateReturnTime: new Date('2026-01-06T14:00:00'),
      });
      const analysis = AttendanceService.analyzeDailyRecord(record);
      expect(analysis.violations).not.toContain('time_leave_punch_missing');
    });

    it('should detect time leave punch missing when only 私用外出 is present', () => {
      const record = createBaseRecord({
        applicationContent: '時間有休申請',
        privateOutTime: new Date('2026-01-06T11:00:00'),
        privateReturnTime: null,
      });
      const analysis = AttendanceService.analyzeDailyRecord(record);
      expect(analysis.violations).toContain('time_leave_punch_missing');
    });

    it('should NOT detect when no 時間有休申請', () => {
      const record = createBaseRecord({
        applicationContent: '',
        privateOutTime: null,
        privateReturnTime: null,
      });
      const analysis = AttendanceService.analyzeDailyRecord(record);
      expect(analysis.violations).not.toContain('time_leave_punch_missing');
    });
  });

  describe('深夜休憩申請漏れ (night_break_application_missing)', () => {
    it('should detect night break application missing when night work without 休憩時間修正申請', () => {
      const record = createBaseRecord({
        nightWorkMinutes: '2:00',
        nightBreakModification: '',
        applicationContent: '',
      });
      const analysis = AttendanceService.analyzeDailyRecord(record);
      expect(analysis.violations).toContain('night_break_application_missing');
    });

    it('should NOT detect night break application missing when night work with 休憩時間修正申請', () => {
      const record = createBaseRecord({
        nightWorkMinutes: '2:00',
        nightBreakModification: '0:30',
        applicationContent: '',
      });
      const analysis = AttendanceService.analyzeDailyRecord(record);
      expect(analysis.violations).not.toContain('night_break_application_missing');
    });

    it('should NOT detect night break application missing when 休憩時間修正申請 in applicationContent', () => {
      const record = createBaseRecord({
        nightWorkMinutes: '2:00',
        nightBreakModification: '',
        applicationContent: '休憩時間修正申請',
      });
      const analysis = AttendanceService.analyzeDailyRecord(record);
      expect(analysis.violations).not.toContain('night_break_application_missing');
    });

    it('should NOT detect when no night work', () => {
      const record = createBaseRecord({
        nightWorkMinutes: '',
        nightBreakModification: '',
      });
      const analysis = AttendanceService.analyzeDailyRecord(record);
      expect(analysis.violations).not.toContain('night_break_application_missing');
    });
  });

  describe('早退申請漏れ (early_leave_application_missing)', () => {
    it('should detect early leave application missing when early leave without application', () => {
      const record = createBaseRecord({
        earlyLeaveMinutes: '0:30',
        applicationContent: '',
      });
      const analysis = AttendanceService.analyzeDailyRecord(record);
      expect(analysis.violations).toContain('early_leave_application_missing');
    });

    it('should NOT detect early leave application missing when early leave with 早退申請', () => {
      const record = createBaseRecord({
        earlyLeaveMinutes: '0:30',
        applicationContent: '早退申請',
      });
      const analysis = AttendanceService.analyzeDailyRecord(record);
      expect(analysis.violations).not.toContain('early_leave_application_missing');
    });

    it('should NOT detect early leave application missing when early leave with 半休申請', () => {
      const record = createBaseRecord({
        earlyLeaveMinutes: '0:30',
        applicationContent: '半休申請',
      });
      const analysis = AttendanceService.analyzeDailyRecord(record);
      expect(analysis.violations).not.toContain('early_leave_application_missing');
    });

    it('should NOT detect early leave application missing when early leave with 午後半休', () => {
      const record = createBaseRecord({
        earlyLeaveMinutes: '0:30',
        applicationContent: '午後半休',
      });
      const analysis = AttendanceService.analyzeDailyRecord(record);
      expect(analysis.violations).not.toContain('early_leave_application_missing');
    });

    it('should NOT detect early leave application missing when no early leave', () => {
      const record = createBaseRecord({
        earlyLeaveMinutes: '',
        applicationContent: '',
      });
      const analysis = AttendanceService.analyzeDailyRecord(record);
      expect(analysis.violations).not.toContain('early_leave_application_missing');
    });
  });

  describe('遅刻申請漏れと半休申請', () => {
    it('should NOT detect late application missing when late with 半休申請', () => {
      const record = createBaseRecord({
        lateMinutes: '3:00',
        applicationContent: '半休申請',
      });
      const analysis = AttendanceService.analyzeDailyRecord(record);
      expect(analysis.violations).not.toContain('late_application_missing');
    });

    it('should NOT detect late application missing when late with 午前半休', () => {
      const record = createBaseRecord({
        lateMinutes: '3:00',
        applicationContent: '午前半休',
      });
      const analysis = AttendanceService.analyzeDailyRecord(record);
      expect(analysis.violations).not.toContain('late_application_missing');
    });
  });

  describe('旧違反タイプが存在しないこと', () => {
    it('should NOT have old "late" violation type', () => {
      const record = createBaseRecord({
        lateMinutes: '0:30',
      });
      const analysis = AttendanceService.analyzeDailyRecord(record);
      expect(analysis.violations).not.toContain('late');
    });

    it('should NOT have old "early_start_missing_flag" violation type', () => {
      const record = createBaseRecord({
        clockIn: new Date('2026-01-06T08:00:00'),
        earlyStartFlag: false,
      });
      const analysis = AttendanceService.analyzeDailyRecord(record);
      expect(analysis.violations).not.toContain('early_start_missing_flag');
    });

    it('should NOT have old "early_leave" violation type', () => {
      const record = createBaseRecord({
        earlyLeaveMinutes: '0:30',
      });
      const analysis = AttendanceService.analyzeDailyRecord(record);
      expect(analysis.violations).not.toContain('early_leave');
    });
  });
});
