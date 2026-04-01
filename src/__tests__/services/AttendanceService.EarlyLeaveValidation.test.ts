/**
 * Bug Fix: 早退申請違反の誤判定テスト
 *
 * 申請内容が「早退」（単独）の場合や「午前有休」「午後有休」の場合に
 * 早退申請違反として誤検出されないことを検証
 */
import AttendanceService from '../../services/AttendanceService';
import { AttendanceRecord } from '../../models/AttendanceTypes';

function createRecord(overrides: Partial<AttendanceRecord>): AttendanceRecord {
  return {
    employeeId: 'E001',
    employeeName: 'テスト太郎',
    department: '開発部',
    position: '',
    date: new Date('2026-03-15'),
    dayOfWeek: '月',
    calendarType: 'weekday' as const,
    calendarRaw: '',
    applicationContent: '',
    clockIn: null,
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
    actualWorkHours: '',
    overtimeHours: '',
    lateMinutes: '',
    earlyLeaveMinutes: '',
    remarks: '',
    sheetName: '',
    ...overrides,
  };
}

describe('hasEarlyLeaveApplicationMissing - 早退申請違反判定', () => {
  // 早退時間がない場合は対象外
  it('早退時間がない場合は false', () => {
    const record = createRecord({ earlyLeaveMinutes: '' });
    expect(AttendanceService.hasEarlyLeaveApplicationMissing(record)).toBe(false);
  });

  // 既存キーワード: 早退申請、早退届 → 正しく除外
  it('「早退申請」がある場合は false', () => {
    const record = createRecord({
      earlyLeaveMinutes: '1:00',
      applicationContent: '早退申請',
    });
    expect(AttendanceService.hasEarlyLeaveApplicationMissing(record)).toBe(false);
  });

  it('「早退届」がある場合は false', () => {
    const record = createRecord({
      earlyLeaveMinutes: '1:00',
      applicationContent: '早退届',
    });
    expect(AttendanceService.hasEarlyLeaveApplicationMissing(record)).toBe(false);
  });

  // Bug Fix: 申請内容が単に「早退」のケース
  it('申請内容が「早退」単独の場合は false（バグ修正）', () => {
    const record = createRecord({
      earlyLeaveMinutes: '1:00',
      applicationContent: '早退',
    });
    expect(AttendanceService.hasEarlyLeaveApplicationMissing(record)).toBe(false);
  });

  // Bug Fix: 午前有休・午後有休による早退
  it('「午前有休」がある場合は false（バグ修正）', () => {
    const record = createRecord({
      earlyLeaveMinutes: '0:30',
      applicationContent: '午前有休',
    });
    expect(AttendanceService.hasEarlyLeaveApplicationMissing(record)).toBe(false);
  });

  it('「午後有休」がある場合は false（バグ修正）', () => {
    const record = createRecord({
      earlyLeaveMinutes: '0:30',
      applicationContent: '午後有休',
    });
    expect(AttendanceService.hasEarlyLeaveApplicationMissing(record)).toBe(false);
  });

  // 申請がない場合は true（申請漏れ）
  it('早退時間があり申請がない場合は true', () => {
    const record = createRecord({
      earlyLeaveMinutes: '1:00',
      applicationContent: '',
    });
    expect(AttendanceService.hasEarlyLeaveApplicationMissing(record)).toBe(true);
  });

  it('早退時間がありスケジュール情報のみの場合は true', () => {
    const record = createRecord({
      earlyLeaveMinutes: '1:00',
      applicationContent: '900-1730/1200-1300/7.75/5',
    });
    expect(AttendanceService.hasEarlyLeaveApplicationMissing(record)).toBe(true);
  });
});
