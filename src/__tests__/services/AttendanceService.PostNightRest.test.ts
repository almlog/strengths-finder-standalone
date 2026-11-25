/**
 * AttendanceService.detectPostNightRestViolations - 明け休未取得の検出テスト
 *
 * 労務ルール:
 * 所定就業時間終了後、深夜（22:00-6:00）にわたり実働7時間45分以上の勤務を
 * させた場合、その翌日は明け休として原則就業させない。
 *
 * 判定: ある日の勤務が深夜時間帯(22:00-6:00)にかかり、かつ実働時間が
 * 7時間45分(465分)以上の場合、翌日（日付が連続している場合のみ）に
 * 明け休申請が無く、かつ実際に勤務実績がある場合は違反とする。
 */

import { AttendanceService } from '../../services/AttendanceService';
import { AttendanceRecord } from '../../models/AttendanceTypes';

const createRecord = (overrides: Partial<AttendanceRecord> = {}): AttendanceRecord => ({
  employeeId: 'E001',
  employeeName: 'テスト太郎',
  department: '開発部',
  position: '一般',
  date: new Date('2026-11-10'),
  dayOfWeek: '火',
  calendarType: 'weekday',
  calendarRaw: '平日',
  applicationContent: '',
  clockIn: new Date('2026-11-10T09:00:00'),
  clockOut: new Date('2026-11-10T17:30:00'),
  originalClockIn: new Date('2026-11-10T09:00:00'),
  originalClockOut: new Date('2026-11-10T17:30:00'),
  earlyStartFlag: false,
  altxOvertimeIn: null,
  altxOvertimeOut: null,
  privateOutTime: null,
  privateReturnTime: null,
  breakTimeMinutes: 60,
  nightBreakModification: '',
  nightWorkMinutes: '',
  actualWorkHours: '7:30',
  overtimeHours: '',
  lateMinutes: '',
  earlyLeaveMinutes: '',
  remarks: '',
  sheetName: 'テストシート',
  ...overrides,
});

describe('AttendanceService.detectPostNightRestViolations', () => {
  it('深夜(翌2:00)にわたり実働7:45以上・翌日に明け休なく就業 → 違反を検出する', () => {
    const records = [
      createRecord({
        date: new Date('2026-11-10'),
        clockIn: new Date('2026-11-10T09:00:00'),
        clockOut: new Date('2026-11-11T02:00:00'), // 翌2:00まで
        actualWorkHours: '8:00',
      }),
      createRecord({
        date: new Date('2026-11-11'),
        applicationContent: '',
        clockIn: new Date('2026-11-11T09:00:00'),
        clockOut: new Date('2026-11-11T17:30:00'),
        actualWorkHours: '7:30',
      }),
    ];

    const violations = AttendanceService.detectPostNightRestViolations(records);

    expect(violations).toHaveLength(1);
    expect(violations[0].type).toBe('post_night_rest_missing');
    expect(violations[0].date).toEqual(new Date('2026-11-11'));
  });

  it('翌日に明け休申請がある場合は違反としない', () => {
    const records = [
      createRecord({
        date: new Date('2026-11-10'),
        clockOut: new Date('2026-11-11T02:00:00'),
        actualWorkHours: '8:00',
      }),
      createRecord({
        date: new Date('2026-11-11'),
        applicationContent: '明け休',
        clockIn: new Date('2026-11-11T09:00:00'),
        clockOut: new Date('2026-11-11T17:30:00'),
        actualWorkHours: '7:30',
      }),
    ];

    expect(AttendanceService.detectPostNightRestViolations(records)).toHaveLength(0);
  });

  it('翌日に出勤実績がない場合（正しく明け休扱い）は違反としない', () => {
    const records = [
      createRecord({
        date: new Date('2026-11-10'),
        clockOut: new Date('2026-11-11T02:00:00'),
        actualWorkHours: '8:00',
      }),
      createRecord({
        date: new Date('2026-11-11'),
        applicationContent: '',
        clockIn: null,
        clockOut: null,
        actualWorkHours: '',
      }),
    ];

    expect(AttendanceService.detectPostNightRestViolations(records)).toHaveLength(0);
  });

  it('深夜にかかっていない（通常退社20:00）場合は実働時間に関わらず違反としない', () => {
    const records = [
      createRecord({
        date: new Date('2026-11-10'),
        clockOut: new Date('2026-11-10T20:00:00'),
        actualWorkHours: '10:30',
      }),
      createRecord({
        date: new Date('2026-11-11'),
        clockIn: new Date('2026-11-11T09:00:00'),
        clockOut: new Date('2026-11-11T17:30:00'),
        actualWorkHours: '7:30',
      }),
    ];

    expect(AttendanceService.detectPostNightRestViolations(records)).toHaveLength(0);
  });

  it('深夜にかかっているが実働7:45未満の場合は違反としない', () => {
    const records = [
      createRecord({
        date: new Date('2026-11-10'),
        clockIn: new Date('2026-11-10T17:00:00'),
        clockOut: new Date('2026-11-10T23:30:00'), // 深夜だが実働は短い
        actualWorkHours: '6:00',
      }),
      createRecord({
        date: new Date('2026-11-11'),
        clockIn: new Date('2026-11-11T09:00:00'),
        clockOut: new Date('2026-11-11T17:30:00'),
        actualWorkHours: '7:30',
      }),
    ];

    expect(AttendanceService.detectPostNightRestViolations(records)).toHaveLength(0);
  });

  it('レコードの日付が連続していない（間が空いている）場合は違反としない', () => {
    const records = [
      createRecord({
        date: new Date('2026-11-10'),
        clockOut: new Date('2026-11-11T02:00:00'),
        actualWorkHours: '8:00',
      }),
      createRecord({
        date: new Date('2026-11-12'), // 11日ではなく12日（間が空いている）
        clockIn: new Date('2026-11-12T09:00:00'),
        clockOut: new Date('2026-11-12T17:30:00'),
        actualWorkHours: '7:30',
      }),
    ];

    expect(AttendanceService.detectPostNightRestViolations(records)).toHaveLength(0);
  });

  it('レコードが日付順でなくても正しく判定する（内部でソートする）', () => {
    const records = [
      createRecord({
        date: new Date('2026-11-11'),
        clockIn: new Date('2026-11-11T09:00:00'),
        clockOut: new Date('2026-11-11T17:30:00'),
        actualWorkHours: '7:30',
      }),
      createRecord({
        date: new Date('2026-11-10'),
        clockOut: new Date('2026-11-11T02:00:00'),
        actualWorkHours: '8:00',
      }),
    ];

    expect(AttendanceService.detectPostNightRestViolations(records)).toHaveLength(1);
  });

  it('境界値: 退社ちょうど22:00は深夜帯に含まない（22:00までの長時間勤務は対象外）', () => {
    const records = [
      createRecord({
        date: new Date('2026-11-10'),
        clockIn: new Date('2026-11-10T09:00:00'),
        clockOut: new Date('2026-11-10T22:00:00'), // 9:00-22:00の定時シフト（実働11:45相当）
        actualWorkHours: '11:45',
      }),
      createRecord({
        date: new Date('2026-11-11'),
        clockIn: new Date('2026-11-11T09:00:00'),
        clockOut: new Date('2026-11-11T17:30:00'),
        actualWorkHours: '7:30',
      }),
    ];

    expect(AttendanceService.detectPostNightRestViolations(records)).toHaveLength(0);
  });

  it('境界値: 退社22:01は深夜帯に含む', () => {
    const records = [
      createRecord({
        date: new Date('2026-11-10'),
        clockIn: new Date('2026-11-10T13:00:00'),
        clockOut: new Date('2026-11-10T22:01:00'),
        actualWorkHours: '8:00',
      }),
      createRecord({
        date: new Date('2026-11-11'),
        clockIn: new Date('2026-11-11T09:00:00'),
        clockOut: new Date('2026-11-11T17:30:00'),
        actualWorkHours: '7:30',
      }),
    ];

    expect(AttendanceService.detectPostNightRestViolations(records)).toHaveLength(1);
  });

  it('境界値: 退社ちょうど6:00は深夜帯に含まない', () => {
    const records = [
      createRecord({
        date: new Date('2026-11-10'),
        clockIn: new Date('2026-11-10T21:00:00'),
        clockOut: new Date('2026-11-11T06:00:00'),
        actualWorkHours: '8:00',
      }),
      createRecord({
        date: new Date('2026-11-11'),
        clockIn: new Date('2026-11-11T09:00:00'),
        clockOut: new Date('2026-11-11T17:30:00'),
        actualWorkHours: '7:30',
      }),
    ];

    expect(AttendanceService.detectPostNightRestViolations(records)).toHaveLength(0);
  });

  it('出退勤時刻が欠落している日は判定対象外', () => {
    const records = [
      createRecord({
        date: new Date('2026-11-10'),
        clockIn: null,
        clockOut: null,
        actualWorkHours: '8:00',
      }),
      createRecord({
        date: new Date('2026-11-11'),
        clockIn: new Date('2026-11-11T09:00:00'),
        clockOut: new Date('2026-11-11T17:30:00'),
        actualWorkHours: '7:30',
      }),
    ];

    expect(AttendanceService.detectPostNightRestViolations(records)).toHaveLength(0);
  });

  it('レコードが1件のみの場合は違反なし（翌日データが存在しない）', () => {
    const records = [
      createRecord({
        date: new Date('2026-11-10'),
        clockOut: new Date('2026-11-11T02:00:00'),
        actualWorkHours: '8:00',
      }),
    ];

    expect(AttendanceService.detectPostNightRestViolations(records)).toHaveLength(0);
  });
});
