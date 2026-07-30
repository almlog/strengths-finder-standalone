// 出社2/出社3利用時のギャップ休憩補正テスト
//
// 背景:
// 楽楽勤怠は午前有休取得時に所定休憩(12:00-13:00)が有休帯に含まれるため、
// 休憩時間がカウントされない。休憩時間修正申請も運用ルールで使用不可のため、
// 「退社→出社2（退社2→出社3）」のギャップで休憩を表現する運用がある。
//
// 仕様:
// - 出社2がある場合、「出社2 − 退社」のギャップを休憩時間に加算（午前有休に限らず常に）
// - 出社3がある場合、「出社3 − 退社2」のギャップも加算
// - 加算後の合計休憩が必要休憩（既存ルール: 6h超45分/8h超60分）未満なら従来どおり違反
//
// 注意: テストデータは実データを模した合成データのみ。個人情報は含めない。

import { AttendanceService } from '../../services/AttendanceService';
import { AttendanceRecord } from '../../models/AttendanceTypes';

const createTestRecord = (
  id: string,
  name: string,
  overrides: Partial<AttendanceRecord> = {}
): AttendanceRecord => ({
  employeeId: id,
  employeeName: name,
  department: '開発部',
  position: '一般',
  date: new Date('2026-07-02'), // 平日（木曜）
  dayOfWeek: '木',
  calendarType: 'weekday',
  calendarRaw: '平日',
  applicationContent: '',
  clockIn: new Date('2026-07-02T09:00:00'),
  clockOut: new Date('2026-07-02T17:30:00'),
  originalClockIn: new Date('2026-07-02T09:00:00'),
  originalClockOut: new Date('2026-07-02T17:30:00'),
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

describe('AttendanceService.getGapBreakMinutes - ギャップ休憩の算出', () => {
  it('GB001_出社2がない場合は0', () => {
    const record = createTestRecord('GB001', 'ギャップなし');
    expect(AttendanceService.getGapBreakMinutes(record)).toBe(0);
  });

  it('GB002_退社→出社2のギャップを休憩とする', () => {
    const record = createTestRecord('GB002', 'ギャップ45分', {
      clockOut: new Date('2026-07-02T19:00:00'),
      originalClockOut: new Date('2026-07-02T19:00:00'),
      clockIn2: new Date('2026-07-02T19:45:00'),
      clockOut2: new Date('2026-07-02T20:58:00'),
    });
    expect(AttendanceService.getGapBreakMinutes(record)).toBe(45);
  });

  it('GB003_出社3がある場合は退社2→出社3のギャップも加算', () => {
    const record = createTestRecord('GB003', '二重ギャップ', {
      clockOut: new Date('2026-07-02T15:00:00'),
      originalClockOut: new Date('2026-07-02T15:00:00'),
      clockIn2: new Date('2026-07-02T15:30:00'),
      clockOut2: new Date('2026-07-02T18:00:00'),
      clockIn3: new Date('2026-07-02T18:20:00'),
      clockOut3: new Date('2026-07-02T19:00:00'),
    });
    expect(AttendanceService.getGapBreakMinutes(record)).toBe(30 + 20);
  });

  it('GB004_退社がなく出社2のみの場合は計算不能として0', () => {
    const record = createTestRecord('GB004', '退社欠落', {
      clockOut: null,
      originalClockOut: null,
      clockIn2: new Date('2026-07-02T19:45:00'),
    });
    expect(AttendanceService.getGapBreakMinutes(record)).toBe(0);
  });

  it('GB005_負のギャップ（出社2が退社より前）は0として扱う', () => {
    const record = createTestRecord('GB005', '負ギャップ', {
      clockOut: new Date('2026-07-02T19:00:00'),
      originalClockOut: new Date('2026-07-02T19:00:00'),
      clockIn2: new Date('2026-07-02T18:00:00'),
    });
    expect(AttendanceService.getGapBreakMinutes(record)).toBe(0);
  });
});

describe('AttendanceService - ギャップ休憩加算後の違反判定', () => {
  /**
   * 実データ2026-07-02のパターンを模した合成データ（/D勤務・午前有休）
   * 13:00-19:00 + 19:45-20:58、休憩計上0、実働7:13
   * ギャップ45分を休憩として認めれば必要45分を満たし違反なし
   */
  it('GC001_午前有休で出社2ギャップ45分 - 休憩違反が解消される', () => {
    const record = createTestRecord('GC001', '午前有休D', {
      applicationContent: '午前有休,900-1730/1200-1300/7.75/D',
      clockIn: new Date('2026-07-02T13:00:00'),
      clockOut: new Date('2026-07-02T19:00:00'),
      originalClockIn: new Date('2026-07-02T13:00:00'),
      originalClockOut: new Date('2026-07-02T19:00:00'),
      clockIn2: new Date('2026-07-02T19:45:00'),
      clockOut2: new Date('2026-07-02T20:58:00'),
      breakTimeMinutes: 0,
      actualWorkHours: '7:13',
    });
    const analysis = AttendanceService.analyzeDailyRecord(record);
    expect(analysis.actualBreakMinutes).toBe(45);
    expect(analysis.hasBreakViolation).toBe(false);
    expect(analysis.violations).not.toContain('break_violation');
  });

  /**
   * 実データ2026-07-24のパターンを模した合成データ（/5勤務・午前有休）
   * 13:00-19:00 + 19:45-19:52、休憩計上15分（自動付与）、実働5:52
   * 自動付与15分は調整で0扱いになるが、ギャップ45分で必要45分を満たす
   */
  it('GC002_午前有休で自動付与15分+ギャップ45分 - 休憩違反が解消される', () => {
    const record = createTestRecord('GC002', '午前有休5', {
      applicationContent: '午前有休,900-1730/1200-1300/7.75/5',
      clockIn: new Date('2026-07-24T13:00:00'),
      clockOut: new Date('2026-07-24T19:00:00'),
      originalClockIn: new Date('2026-07-24T13:00:00'),
      originalClockOut: new Date('2026-07-24T19:00:00'),
      clockIn2: new Date('2026-07-24T19:45:00'),
      clockOut2: new Date('2026-07-24T19:52:00'),
      breakTimeMinutes: 15,
      actualWorkHours: '5:52',
      date: new Date('2026-07-24'),
      dayOfWeek: '金',
    });
    const analysis = AttendanceService.analyzeDailyRecord(record);
    expect(analysis.hasBreakViolation).toBe(false);
  });

  /**
   * ギャップを加算しても必要休憩に届かない場合は従来どおり違反
   */
  it('GC003_ギャップ10分では必要45分に不足 - 違反のまま', () => {
    const record = createTestRecord('GC003', 'ギャップ不足', {
      applicationContent: '午前有休,900-1730/1200-1300/7.75/D',
      clockIn: new Date('2026-07-02T13:00:00'),
      clockOut: new Date('2026-07-02T19:00:00'),
      originalClockOut: new Date('2026-07-02T19:00:00'),
      clockIn2: new Date('2026-07-02T19:10:00'),
      clockOut2: new Date('2026-07-02T20:10:00'),
      breakTimeMinutes: 0,
      actualWorkHours: '7:00',
    });
    const analysis = AttendanceService.analyzeDailyRecord(record);
    expect(analysis.actualBreakMinutes).toBe(10);
    expect(analysis.hasBreakViolation).toBe(true);
    expect(analysis.violations).toContain('break_violation');
  });

  /**
   * 午前有休でなくても出社2利用時はギャップを休憩として加算する
   */
  it('GC004_通常日の出社2利用 - ギャップが休憩に加算される', () => {
    const record = createTestRecord('GC004', '通常日ギャップ', {
      clockIn: new Date('2026-07-02T09:00:00'),
      clockOut: new Date('2026-07-02T15:00:00'),
      originalClockOut: new Date('2026-07-02T15:00:00'),
      clockIn2: new Date('2026-07-02T15:50:00'),
      clockOut2: new Date('2026-07-02T17:30:00'),
      breakTimeMinutes: 0,
      actualWorkHours: '6:30', // 390分 > 360分 → 必要45分
    });
    const analysis = AttendanceService.analyzeDailyRecord(record);
    expect(analysis.actualBreakMinutes).toBe(50);
    expect(analysis.hasBreakViolation).toBe(false);
  });

  /**
   * 出社2を使わない従来ケースの挙動は不変（リグレッションガード）
   */
  it('GC005_出社2なし・休憩0・実働7:30 - 従来どおり違反', () => {
    const record = createTestRecord('GC005', '従来違反', {
      breakTimeMinutes: 0,
      actualWorkHours: '7:30',
    });
    const analysis = AttendanceService.analyzeDailyRecord(record);
    expect(analysis.actualBreakMinutes).toBe(0);
    expect(analysis.hasBreakViolation).toBe(true);
  });

  it('GC006_出社2なし・休憩60分・実働7:30 - 従来どおり違反なし', () => {
    const record = createTestRecord('GC006', '従来正常');
    const analysis = AttendanceService.analyzeDailyRecord(record);
    expect(analysis.actualBreakMinutes).toBe(60);
    expect(analysis.hasBreakViolation).toBe(false);
  });

  /**
   * 午前有休で出社2を使わず連続勤務した場合は休憩未取得として違反
   * （ギャップ0＋計上休憩0 → 実働6時間超なら必要45分に対し0分）
   */
  it('GC007_午前有休で出社2未使用・実働6:30 - 休憩未取得として違反', () => {
    const record = createTestRecord('GC007', '午前有休未取得D', {
      applicationContent: '午前有休,900-1730/1200-1300/7.75/D',
      clockIn: new Date('2026-07-02T13:00:00'),
      clockOut: new Date('2026-07-02T19:30:00'),
      originalClockIn: new Date('2026-07-02T13:00:00'),
      originalClockOut: new Date('2026-07-02T19:30:00'),
      breakTimeMinutes: 0,
      actualWorkHours: '6:30',
    });
    const analysis = AttendanceService.analyzeDailyRecord(record);
    expect(analysis.actualBreakMinutes).toBe(0);
    expect(analysis.hasBreakViolation).toBe(true);
    expect(analysis.violations).toContain('break_violation');
  });

  /**
   * /5カレンダーの自動付与15分は「実際には取っていない」として除外されるため、
   * 出社2未使用なら同様に違反（既存の自動付与調整との組み合わせ確認）
   */
  it('GC008_午前有休(/5)で出社2未使用・自動付与15分のみ - 休憩未取得として違反', () => {
    const record = createTestRecord('GC008', '午前有休未取得5', {
      applicationContent: '午前有休,900-1730/1200-1300/7.75/5',
      clockIn: new Date('2026-07-24T13:00:00'),
      clockOut: new Date('2026-07-24T19:30:00'),
      originalClockIn: new Date('2026-07-24T13:00:00'),
      originalClockOut: new Date('2026-07-24T19:30:00'),
      breakTimeMinutes: 15,
      actualWorkHours: '6:15',
      date: new Date('2026-07-24'),
      dayOfWeek: '金',
    });
    const analysis = AttendanceService.analyzeDailyRecord(record);
    expect(analysis.actualBreakMinutes).toBe(0);
    expect(analysis.hasBreakViolation).toBe(true);
  });

  /**
   * 実働6時間ちょうど以下は労基法上休憩不要のため違反にしない（既存ルール維持）
   */
  it('GC009_午前有休で出社2未使用・実働6:00ちょうど - 違反なし', () => {
    const record = createTestRecord('GC009', '午前有休6時間', {
      applicationContent: '午前有休,900-1730/1200-1300/7.75/D',
      clockIn: new Date('2026-07-02T13:00:00'),
      clockOut: new Date('2026-07-02T19:00:00'),
      originalClockIn: new Date('2026-07-02T13:00:00'),
      originalClockOut: new Date('2026-07-02T19:00:00'),
      breakTimeMinutes: 0,
      actualWorkHours: '6:00',
    });
    const analysis = AttendanceService.analyzeDailyRecord(record);
    expect(analysis.hasBreakViolation).toBe(false);
  });
});
