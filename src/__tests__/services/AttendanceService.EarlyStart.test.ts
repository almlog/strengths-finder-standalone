/**
 * AttendanceService - 早出フラグ判定テスト
 *
 * TDD: 申請内容（applicationContent）の始業時刻を考慮した早出判定
 * - 申請内容に始業時刻（830-1700形式）がある場合、その時刻通りなら早出フラグ不要
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
  calendarRaw: '平日',
  clockIn: null,
  clockOut: null,
  breakTimeMinutes: 60,
  actualWorkHours: '8:00',
  lateMinutes: null,
  earlyLeaveMinutes: null,
  overtime36: '0:00',
  applicationContent: '',
  remarks: '',
  earlyStartFlag: false,
  privateOutTime: null,
  privateReturnTime: null,
  nightBreakModification: '',
  ...overrides,
});

describe('AttendanceService.parseScheduledStartTime - 申請内容から始業時刻抽出', () => {
  it('830-1700形式から8:30を抽出', () => {
    const result = AttendanceService.parseScheduledStartTime('830-1700/1200-1300/7.75/5');
    expect(result).toEqual({ hour: 8, minute: 30 });
  });

  it('930-1800形式から9:30を抽出', () => {
    const result = AttendanceService.parseScheduledStartTime('930-1800/1200-1300/7.75/5');
    expect(result).toEqual({ hour: 9, minute: 30 });
  });

  it('900-1730形式から9:00を抽出', () => {
    const result = AttendanceService.parseScheduledStartTime('900-1730/1200-1300/7.75/5');
    expect(result).toEqual({ hour: 9, minute: 0 });
  });

  it('1000-1900形式から10:00を抽出', () => {
    const result = AttendanceService.parseScheduledStartTime('1000-1900/1200-1300/7.75/5');
    expect(result).toEqual({ hour: 10, minute: 0 });
  });

  it('空文字列の場合はnullを返す', () => {
    const result = AttendanceService.parseScheduledStartTime('');
    expect(result).toBeNull();
  });

  it('不正な形式の場合はnullを返す', () => {
    const result = AttendanceService.parseScheduledStartTime('invalid');
    expect(result).toBeNull();
  });

  it('申請内容にスケジュール情報がない場合はnullを返す', () => {
    const result = AttendanceService.parseScheduledStartTime('リモート勤務');
    expect(result).toBeNull();
  });

  // カンマ区切り形式のテスト（申請タイプ,スケジュール）
  it('残業終了,900-1730形式から9:00を抽出', () => {
    const result = AttendanceService.parseScheduledStartTime('残業終了,900-1730/1200-1300/7.75/5');
    expect(result).toEqual({ hour: 9, minute: 0 });
  });

  it('午後有休,900-1730形式から9:00を抽出', () => {
    const result = AttendanceService.parseScheduledStartTime('午後有休,900-1730/1200-1300/7.75/5');
    expect(result).toEqual({ hour: 9, minute: 0 });
  });

  it('早出,830-1700形式から8:30を抽出', () => {
    const result = AttendanceService.parseScheduledStartTime('早出,830-1700/1200-1300/7.75/5');
    expect(result).toEqual({ hour: 8, minute: 30 });
  });
});

describe('AttendanceService.hasEarlyStartViolation - 申請内容の始業時刻を考慮した早出判定', () => {
  describe('申請内容の始業時刻通りに出勤した場合', () => {
    it('830始業スケジュールで8:30出勤は早出フラグ不要', () => {
      const record = createBaseRecord({
        applicationContent: '830-1700/1200-1300/7.75/5',
        clockIn: new Date('2026-01-15 08:30'),
        earlyStartFlag: false,
      });
      const result = AttendanceService.hasEarlyStartViolation(record, 'none');
      expect(result).toBe(false);
    });

    it('830始業スケジュールで8:35出勤は早出フラグ不要', () => {
      const record = createBaseRecord({
        applicationContent: '830-1700/1200-1300/7.75/5',
        clockIn: new Date('2026-01-15 08:35'),
        earlyStartFlag: false,
      });
      const result = AttendanceService.hasEarlyStartViolation(record, 'none');
      expect(result).toBe(false);
    });

    it('930始業スケジュールで9:30出勤は早出フラグ不要', () => {
      const record = createBaseRecord({
        applicationContent: '930-1800/1200-1300/7.75/5',
        clockIn: new Date('2026-01-15 09:30'),
        earlyStartFlag: false,
      });
      const result = AttendanceService.hasEarlyStartViolation(record, 'none');
      expect(result).toBe(false);
    });
  });

  describe('申請内容の始業時刻より前に出勤した場合', () => {
    it('830始業スケジュールで8:00出勤は早出フラグが必要', () => {
      const record = createBaseRecord({
        applicationContent: '830-1700/1200-1300/7.75/5',
        clockIn: new Date('2026-01-15 08:00'),
        earlyStartFlag: false,
      });
      const result = AttendanceService.hasEarlyStartViolation(record, 'none');
      expect(result).toBe(true);
    });

    it('930始業スケジュールで9:00出勤は早出フラグが必要', () => {
      const record = createBaseRecord({
        applicationContent: '930-1800/1200-1300/7.75/5',
        clockIn: new Date('2026-01-15 09:00'),
        earlyStartFlag: false,
      });
      const result = AttendanceService.hasEarlyStartViolation(record, 'none');
      expect(result).toBe(true);
    });

    it('早出フラグがあれば違反にならない', () => {
      const record = createBaseRecord({
        applicationContent: '830-1700/1200-1300/7.75/5',
        clockIn: new Date('2026-01-15 08:00'),
        earlyStartFlag: true,
      });
      const result = AttendanceService.hasEarlyStartViolation(record, 'none');
      expect(result).toBe(false);
    });
  });

  describe('申請内容にスケジュールがない場合（既存動作: 9時基準）', () => {
    it('スケジュールなしで9時より前の出勤は早出フラグが必要', () => {
      const record = createBaseRecord({
        applicationContent: 'リモート勤務',
        clockIn: new Date('2026-01-15 08:30'),
        earlyStartFlag: false,
      });
      const result = AttendanceService.hasEarlyStartViolation(record, 'none');
      expect(result).toBe(true);
    });

    it('スケジュールなしで9時以降の出勤は早出フラグ不要', () => {
      const record = createBaseRecord({
        applicationContent: 'リモート勤務',
        clockIn: new Date('2026-01-15 09:00'),
        earlyStartFlag: false,
      });
      const result = AttendanceService.hasEarlyStartViolation(record, 'none');
      expect(result).toBe(false);
    });

    it('申請内容が空の場合、9時基準で判定', () => {
      const record = createBaseRecord({
        applicationContent: '',
        clockIn: new Date('2026-01-15 08:30'),
        earlyStartFlag: false,
      });
      const result = AttendanceService.hasEarlyStartViolation(record, 'none');
      expect(result).toBe(true);
    });
  });
});
