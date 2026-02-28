/**
 * AttendanceService - 定時退社判定テスト
 *
 * 定時退社率が100%を超過するバグの修正テスト
 * 原因: 全休（有休等）を定時退社としてカウントしていた
 * 修正: 全休は定時退社の判定対象外とする
 */

import AttendanceService from '../../services/AttendanceService';
import { AttendanceRecord } from '../../models/AttendanceTypes';

const createBaseRecord = (overrides: Partial<AttendanceRecord> = {}): AttendanceRecord => ({
  employeeId: 'E001',
  employeeName: 'テスト太郎',
  department: 'テスト部',
  date: new Date('2026-01-15'),
  dayOfWeek: '水',
  calendarType: 'weekday',
  calendarRaw: '平日',
  clockIn: new Date('2026-01-15T09:00:00'),
  clockOut: new Date('2026-01-15T17:30:00'),
  breakTimeMinutes: 60,
  actualWorkHours: '7:30',
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

describe('AttendanceService.isTimelyDeparture - 定時退社判定', () => {
  describe('基本判定', () => {
    it('17:30退勤（17:45以前）は定時退社', () => {
      const record = createBaseRecord({
        clockOut: new Date('2026-01-15T17:30:00'),
      });
      expect(AttendanceService.isTimelyDeparture(record, 'none')).toBe(true);
    });

    it('17:45退勤は定時退社', () => {
      const record = createBaseRecord({
        clockOut: new Date('2026-01-15T17:45:00'),
      });
      expect(AttendanceService.isTimelyDeparture(record, 'none')).toBe(true);
    });

    it('17:46退勤は定時退社ではない', () => {
      const record = createBaseRecord({
        clockOut: new Date('2026-01-15T17:46:00'),
      });
      expect(AttendanceService.isTimelyDeparture(record, 'none')).toBe(false);
    });

    it('18:00退勤は定時退社ではない', () => {
      const record = createBaseRecord({
        clockOut: new Date('2026-01-15T18:00:00'),
      });
      expect(AttendanceService.isTimelyDeparture(record, 'none')).toBe(false);
    });
  });

  describe('休暇の扱い', () => {
    it('全休（有休等）は定時退社にカウントしない', () => {
      const record = createBaseRecord({
        clockIn: null,
        clockOut: null,
        applicationContent: '有休',
      });
      expect(AttendanceService.isTimelyDeparture(record, 'full_day')).toBe(false);
    });

    it('午前半休は定時退社の判定対象（17:45以前退勤なら定時退社）', () => {
      const record = createBaseRecord({
        clockIn: new Date('2026-01-15T13:00:00'),
        clockOut: new Date('2026-01-15T17:30:00'),
      });
      expect(AttendanceService.isTimelyDeparture(record, 'half_day_am')).toBe(true);
    });
  });

  describe('除外条件', () => {
    it('休日は対象外', () => {
      const record = createBaseRecord({
        calendarType: 'statutory_holiday',
        clockOut: new Date('2026-01-15T17:00:00'),
      });
      expect(AttendanceService.isTimelyDeparture(record, 'none')).toBe(false);
    });

    it('遅刻ありは対象外', () => {
      const record = createBaseRecord({
        lateMinutes: '0:30',
        clockOut: new Date('2026-01-15T17:30:00'),
      });
      expect(AttendanceService.isTimelyDeparture(record, 'none')).toBe(false);
    });

    it('早退ありは対象外', () => {
      const record = createBaseRecord({
        earlyLeaveMinutes: '0:30',
        clockOut: new Date('2026-01-15T17:00:00'),
      });
      expect(AttendanceService.isTimelyDeparture(record, 'none')).toBe(false);
    });

    it('退勤打刻なしは対象外', () => {
      const record = createBaseRecord({
        clockOut: null,
      });
      expect(AttendanceService.isTimelyDeparture(record, 'none')).toBe(false);
    });
  });
});
