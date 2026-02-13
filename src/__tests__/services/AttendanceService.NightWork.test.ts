/**
 * AttendanceService - 深夜帯勤務実績テスト
 *
 * TDD: 22:00超（22:01以降）退勤の深夜帯勤務判定ロジック
 * - 22:00からが深夜加給対象なので、22:00ちょうどの退勤は含めない
 * - 22:01以降に退勤している場合のみ深夜帯勤務と判定
 * - 違反ではなく「注意喚起」として可視化
 */

import AttendanceService from '../../services/AttendanceService';
import { AttendanceRecord, NIGHT_WORK_START_HOUR } from '../../models/AttendanceTypes';

// テスト用のベースレコード
const createBaseRecord = (overrides: Partial<AttendanceRecord> = {}): AttendanceRecord => ({
  employeeId: 'E001',
  employeeName: 'テスト太郎',
  department: 'テスト部',
  position: '一般',
  date: new Date('2026-01-15'),
  dayOfWeek: '木',
  calendarType: 'weekday',
  calendarRaw: '平日',
  applicationContent: '',
  clockIn: new Date('2026-01-15T09:00:00'),
  clockOut: null,
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
  actualWorkHours: '8:00',
  overtimeHours: '0:00',
  lateMinutes: '',
  earlyLeaveMinutes: '',
  remarks: '',
  sheetName: 'テストシート',
  ...overrides,
});

describe('NIGHT_WORK_START_HOUR 定数', () => {
  it('22時が閾値として定義されている', () => {
    expect(NIGHT_WORK_START_HOUR).toBe(22);
  });
});

describe('AttendanceService.isNightWork - 深夜帯勤務判定', () => {
  it('22:00ちょうど退勤 → 深夜帯勤務ではない（22:00は深夜加給の開始時刻）', () => {
    const record = createBaseRecord({
      clockOut: new Date('2026-01-15T22:00:00'),
    });
    expect(AttendanceService.isNightWork(record)).toBe(false);
  });

  it('22:01退勤 → 深夜帯勤務と判定', () => {
    const record = createBaseRecord({
      clockOut: new Date('2026-01-15T22:01:00'),
    });
    expect(AttendanceService.isNightWork(record)).toBe(true);
  });

  it('21:59退勤 → 深夜帯勤務ではない', () => {
    const record = createBaseRecord({
      clockOut: new Date('2026-01-15T21:59:00'),
    });
    expect(AttendanceService.isNightWork(record)).toBe(false);
  });

  it('23:30退勤 → 深夜帯勤務と判定', () => {
    const record = createBaseRecord({
      clockOut: new Date('2026-01-15T23:30:00'),
    });
    expect(AttendanceService.isNightWork(record)).toBe(true);
  });

  it('clockOut が null → 深夜帯勤務ではない', () => {
    const record = createBaseRecord({
      clockOut: null,
    });
    expect(AttendanceService.isNightWork(record)).toBe(false);
  });

  it('17:30退勤（定時） → 深夜帯勤務ではない', () => {
    const record = createBaseRecord({
      clockOut: new Date('2026-01-15T17:30:00'),
    });
    expect(AttendanceService.isNightWork(record)).toBe(false);
  });

  it('0:30退勤（翌日未明） → 深夜帯勤務と判定', () => {
    const record = createBaseRecord({
      clockOut: new Date('2026-01-16T00:30:00'),
    });
    expect(AttendanceService.isNightWork(record)).toBe(true);
  });
});

describe('月次サマリーの nightWorkDays カウント', () => {
  it('深夜帯勤務が2日ある場合、nightWorkDays = 2', () => {
    const records: AttendanceRecord[] = [
      createBaseRecord({
        date: new Date('2026-01-10'),
        clockIn: new Date('2026-01-10T09:00:00'),
        clockOut: new Date('2026-01-10T22:30:00'),
        actualWorkHours: '12:30',
        overtimeHours: '4:30',
      }),
      createBaseRecord({
        date: new Date('2026-01-11'),
        clockIn: new Date('2026-01-11T09:00:00'),
        clockOut: new Date('2026-01-11T18:00:00'),
        actualWorkHours: '8:00',
        overtimeHours: '0:00',
      }),
      createBaseRecord({
        date: new Date('2026-01-12'),
        clockIn: new Date('2026-01-12T09:00:00'),
        clockOut: new Date('2026-01-12T23:00:00'),
        actualWorkHours: '13:00',
        overtimeHours: '5:00',
      }),
    ];

    const summary = AttendanceService.createEmployeeMonthlySummary('E001', records, { includeToday: true });
    expect(summary.nightWorkDays).toBe(2);
  });

  it('深夜帯勤務がない場合、nightWorkDays = 0', () => {
    const records: AttendanceRecord[] = [
      createBaseRecord({
        date: new Date('2026-01-10'),
        clockIn: new Date('2026-01-10T09:00:00'),
        clockOut: new Date('2026-01-10T18:00:00'),
        actualWorkHours: '8:00',
      }),
    ];

    const summary = AttendanceService.createEmployeeMonthlySummary('E001', records, { includeToday: true });
    expect(summary.nightWorkDays).toBe(0);
  });
});

describe('拡張分析結果の nightWorkRecords', () => {
  it('深夜帯勤務レコードが正しく収集される', () => {
    const records: AttendanceRecord[] = [
      createBaseRecord({
        employeeId: 'E001',
        employeeName: '山田太郎',
        department: '開発部',
        date: new Date('2026-01-10'),
        clockIn: new Date('2026-01-10T09:00:00'),
        clockOut: new Date('2026-01-10T22:15:00'),
        actualWorkHours: '12:15',
        overtimeHours: '4:15',
        remarks: '納期対応',
      }),
      createBaseRecord({
        employeeId: 'E001',
        employeeName: '山田太郎',
        department: '開発部',
        date: new Date('2026-01-11'),
        clockIn: new Date('2026-01-11T09:00:00'),
        clockOut: new Date('2026-01-11T17:30:00'),
        actualWorkHours: '7:30',
        overtimeHours: '0:00',
      }),
      createBaseRecord({
        employeeId: 'E002',
        employeeName: '佐藤花子',
        department: '営業部',
        date: new Date('2026-01-10'),
        clockIn: new Date('2026-01-10T09:00:00'),
        clockOut: new Date('2026-01-10T23:00:00'),
        actualWorkHours: '13:00',
        overtimeHours: '5:00',
        remarks: '顧客対応',
      }),
    ];

    const result = AttendanceService.analyzeExtended(records, { includeToday: true });
    expect(result.nightWorkRecords).toHaveLength(2);

    // 日付順にソートされていることを確認
    expect(result.nightWorkRecords[0].employeeName).toBe('山田太郎');
    expect(result.nightWorkRecords[0].department).toBe('開発部');
    expect(result.nightWorkRecords[0].clockOut.getHours()).toBe(22);

    expect(result.nightWorkRecords[1].employeeName).toBe('佐藤花子');
    expect(result.nightWorkRecords[1].clockOut.getHours()).toBe(23);
  });

  it('深夜帯勤務がない場合、nightWorkRecords は空配列', () => {
    const records: AttendanceRecord[] = [
      createBaseRecord({
        date: new Date('2026-01-10'),
        clockIn: new Date('2026-01-10T09:00:00'),
        clockOut: new Date('2026-01-10T18:00:00'),
        actualWorkHours: '8:00',
      }),
    ];

    const result = AttendanceService.analyzeExtended(records, { includeToday: true });
    expect(result.nightWorkRecords).toHaveLength(0);
  });
});
