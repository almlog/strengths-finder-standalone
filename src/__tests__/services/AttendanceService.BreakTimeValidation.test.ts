// 時間有休と休憩時間の検証テスト
// 評価指摘2: 時間有休の休憩控除ロジックの検証

import { AttendanceService } from '../../services/AttendanceService';
import { AttendanceRecord } from '../../models/AttendanceTypes';

/**
 * テスト用の基本レコードを作成
 */
const createTestRecord = (
  id: string,
  name: string,
  overrides: Partial<AttendanceRecord> = {}
): AttendanceRecord => ({
  employeeId: id,
  employeeName: name,
  department: '開発部',
  position: '一般',
  date: new Date('2026-01-06'), // 平日（月曜）
  dayOfWeek: '月',
  calendarType: 'weekday',
  calendarRaw: '平日',
  applicationContent: '',
  clockIn: new Date('2026-01-06T09:00:00'),
  clockOut: new Date('2026-01-06T17:30:00'),
  originalClockIn: new Date('2026-01-06T09:00:00'),
  originalClockOut: new Date('2026-01-06T17:30:00'),
  earlyStartFlag: false,
  altxOvertimeIn: null,
  altxOvertimeOut: null,
  privateOutTime: null,
  privateReturnTime: null,
  breakTimeMinutes: 60, // 標準1時間休憩
  nightBreakModification: '',
  nightWorkMinutes: '',
  actualWorkHours: '7:30', // 9:00-17:30 - 1h break = 7:30
  overtimeHours: '',
  lateMinutes: '',
  earlyLeaveMinutes: '',
  remarks: '',
  sheetName: 'テストシート',
  ...overrides,
});

describe('AttendanceService - 時間有休と休憩時間の検証', () => {
  /**
   * 評価指摘:
   * 「所定の休憩時間を削って退社時間を早めることは禁止」
   * 例: 12:00-13:00が休憩時間の日に、11:00-14:00の時間有休を取る場合、
   *     休憩1時間が正しく控除されているか検証
   */
  describe('時間有休と休憩時間の重複検出（将来実装予定）', () => {
    /**
     * 正常ケース: 時間有休が休憩時間と重複しない
     * 例: 14:00-16:00の時間有休
     */
    it('BT001_時間有休が休憩時間外 - 問題なし', () => {
      const record = createTestRecord('BT001', '正常テスト', {
        applicationContent: '時間有休 14:00-16:00',
        privateOutTime: new Date('2026-01-06T14:00:00'),
        privateReturnTime: new Date('2026-01-06T16:00:00'),
        breakTimeMinutes: 60, // 休憩1時間は別途取得済み
        actualWorkHours: '5:30', // 7:30 - 2h = 5:30
      });

      const analysis = AttendanceService.analyzeDailyRecord(record);

      // 時間有休の打刻はあるので違反なし
      expect(analysis.violations).not.toContain('time_leave_punch_missing');
    });

    /**
     * 将来検証対象: 時間有休が休憩時間と重複するケース
     * 現状のシステムでは検出できないが、将来的に警告を出すべきケース
     *
     * 例: 11:00-14:00の時間有休を取得し、12:00-13:00の休憩も含めて
     *     3時間の有休消化としてカウントされている可能性がある
     */
    it('BT002_時間有休が休憩時間と重複 - 将来的に警告すべきケース', () => {
      const record = createTestRecord('BT002', '重複テスト', {
        applicationContent: '時間有休 11:00-14:00',
        privateOutTime: new Date('2026-01-06T11:00:00'),
        privateReturnTime: new Date('2026-01-06T14:00:00'),
        breakTimeMinutes: 60,
        actualWorkHours: '4:30', // 9-11時 + 14-17:30 = 4.5h
      });

      const analysis = AttendanceService.analyzeDailyRecord(record);

      // TODO: 将来的に 'time_leave_break_overlap_warning' を追加予定
      // 現在は打刻があれば違反なしと判定
      expect(analysis.violations).not.toContain('time_leave_punch_missing');

      // 将来実装時のテスト
      // expect(analysis.warnings).toContain('time_leave_break_overlap');
    });

    /**
     * 注意が必要なケース: 休憩時間が0になっている
     * 時間有休で休憩時間を埋めてしまった可能性
     */
    it('BT003_時間有休取得日に休憩0分 - 要注意', () => {
      const record = createTestRecord('BT003', '休憩なしテスト', {
        applicationContent: '時間有休 12:00-13:00',
        privateOutTime: new Date('2026-01-06T12:00:00'),
        privateReturnTime: new Date('2026-01-06T13:00:00'),
        breakTimeMinutes: 0, // 休憩0分（時間有休で埋めている可能性）
        actualWorkHours: '7:30', // 休憩を取っていない
      });

      const analysis = AttendanceService.analyzeDailyRecord(record);

      // 実働7.5時間で休憩0分は法定違反の可能性
      // 6時間超で45分必要
      expect(analysis.hasBreakViolation).toBe(true);
      expect(analysis.violations).toContain('break_violation');
    });
  });

  describe('法定休憩時間の違反検出（既存機能）', () => {
    /**
     * 6時間超の労働で45分未満の休憩
     */
    it('BT101_6時間超労働で休憩30分 - 違反', () => {
      const record = createTestRecord('BT101', '休憩不足', {
        actualWorkHours: '6:30', // 6時間30分労働
        breakTimeMinutes: 30, // 30分休憩（45分必要）
      });

      const analysis = AttendanceService.analyzeDailyRecord(record);

      expect(analysis.hasBreakViolation).toBe(true);
      expect(analysis.violations).toContain('break_violation');
    });

    /**
     * 8時間超の労働で60分未満の休憩
     */
    it('BT102_8時間超労働で休憩45分 - 違反', () => {
      const record = createTestRecord('BT102', '休憩不足', {
        actualWorkHours: '8:30', // 8時間30分労働
        breakTimeMinutes: 45, // 45分休憩（60分必要）
      });

      const analysis = AttendanceService.analyzeDailyRecord(record);

      expect(analysis.hasBreakViolation).toBe(true);
      expect(analysis.violations).toContain('break_violation');
    });

    /**
     * 正常: 8時間超労働で60分休憩
     */
    it('BT103_8時間超労働で休憩60分 - 正常', () => {
      const record = createTestRecord('BT103', '休憩十分', {
        actualWorkHours: '8:30', // 8時間30分労働
        breakTimeMinutes: 60, // 60分休憩
      });

      const analysis = AttendanceService.analyzeDailyRecord(record);

      expect(analysis.hasBreakViolation).toBe(false);
      expect(analysis.violations).not.toContain('break_violation');
    });
  });

  describe('休憩違反判定での休憩時間調整', () => {
    it('半休+自動15分休憩 → 休憩0分として判定、実働6h超なら違反', () => {
      // 午前半休、13:00-20:00、break=15(自動), 実働=6:45
      // 調整後: break=0, 実働=7:00(>6h) → 必要休憩45分 → 0 < 45 → 違反
      const record = createTestRecord('BT201', '半休自動休憩', {
        applicationContent: '午前半休',
        clockIn: new Date('2026-01-06T13:00:00'),
        clockOut: new Date('2026-01-06T20:00:00'),
        breakTimeMinutes: 15,
        actualWorkHours: '6:45', // 拘束7h - break15min
      });

      const analysis = AttendanceService.analyzeDailyRecord(record);

      expect(analysis.hasBreakViolation).toBe(true);
      expect(analysis.actualBreakMinutes).toBe(0);   // 自動15分は休憩ではない
      expect(analysis.requiredBreakMinutes).toBe(45); // 調整後実働7h > 6h
    });

    it('半休+自動15分休憩 → 実働6h以下なら違反なし', () => {
      // 午前半休、13:00-17:45、break=15(自動), 実働=4:30
      // 調整後: break=0, 実働=4:45(<6h) → 休憩不要 → 違反なし
      const record = createTestRecord('BT202', '半休短時間', {
        applicationContent: '午前半休',
        clockIn: new Date('2026-01-06T13:00:00'),
        clockOut: new Date('2026-01-06T17:45:00'),
        breakTimeMinutes: 15,
        actualWorkHours: '4:30',
      });

      const analysis = AttendanceService.analyzeDailyRecord(record);

      expect(analysis.hasBreakViolation).toBe(false);
      expect(analysis.actualBreakMinutes).toBe(0);
    });

    it('通常日+break75(自動増加) → 休憩60分として判定、違反なし', () => {
      // 9:00-21:00、break=75(自動), 実働=10:45
      // 調整後: break=60, 実働=11:00(>8h) → 必要休憩60分 → 60 >= 60 → 正常
      const record = createTestRecord('BT203', '通常日自動増加', {
        clockOut: new Date('2026-01-06T21:00:00'),
        breakTimeMinutes: 75,
        actualWorkHours: '10:45',
      });

      const analysis = AttendanceService.analyzeDailyRecord(record);

      expect(analysis.hasBreakViolation).toBe(false);
      expect(analysis.actualBreakMinutes).toBe(60);
    });

    it('休憩時間修正申請あり → Excel休憩値で判定', () => {
      // 休憩時間修正で30分に変更、実働8:30(>8h) → 必要60分 → 30 < 60 → 違反
      const record = createTestRecord('BT204', '休憩修正申請', {
        applicationContent: '休憩時間修正申請',
        clockOut: new Date('2026-01-06T18:00:00'),
        breakTimeMinutes: 30,
        actualWorkHours: '8:30',
      });

      const analysis = AttendanceService.analyzeDailyRecord(record);

      expect(analysis.hasBreakViolation).toBe(true);
      expect(analysis.actualBreakMinutes).toBe(30); // 申請値そのまま
      expect(analysis.requiredBreakMinutes).toBe(60);
    });
  });

  describe('休憩時間計算のヘルパー関数テスト', () => {
    /**
     * 必要休憩時間の計算
     */
    it('6時間以下は休憩不要', () => {
      const required = AttendanceService.calculateRequiredBreakMinutes(360); // 6時間ちょうど
      expect(required).toBe(0);
    });

    it('6時間超は45分必要', () => {
      const required = AttendanceService.calculateRequiredBreakMinutes(361); // 6時間1分
      expect(required).toBe(45);
    });

    it('8時間超は60分必要', () => {
      const required = AttendanceService.calculateRequiredBreakMinutes(481); // 8時間1分
      expect(required).toBe(60);
    });
  });
});

describe('AttendanceService - 時間有休の打刻検証（既存機能）', () => {
  /**
   * 既存のテストケース 401-405 の補完
   */
  describe('私用外出/戻り打刻の必須チェック', () => {
    it('時間有休申請ありで両方打刻あり - 正常', () => {
      const record = createTestRecord('TV001', '打刻あり', {
        applicationContent: '時間有休',
        privateOutTime: new Date('2026-01-06T14:00:00'),
        privateReturnTime: new Date('2026-01-06T16:00:00'),
      });

      const analysis = AttendanceService.analyzeDailyRecord(record);

      expect(analysis.violations).not.toContain('time_leave_punch_missing');
    });

    it('時間有休申請ありで外出のみ打刻 - 違反', () => {
      const record = createTestRecord('TV002', '外出のみ', {
        applicationContent: '時間有休',
        privateOutTime: new Date('2026-01-06T14:00:00'),
        privateReturnTime: null,
      });

      const analysis = AttendanceService.analyzeDailyRecord(record);

      expect(analysis.violations).toContain('time_leave_punch_missing');
    });

    it('時間有休申請ありで戻りのみ打刻 - 違反', () => {
      const record = createTestRecord('TV003', '戻りのみ', {
        applicationContent: '時間有休',
        privateOutTime: null,
        privateReturnTime: new Date('2026-01-06T16:00:00'),
      });

      const analysis = AttendanceService.analyzeDailyRecord(record);

      expect(analysis.violations).toContain('time_leave_punch_missing');
    });

    it('時間有休申請ありで両方未打刻 - 違反', () => {
      const record = createTestRecord('TV004', '未打刻', {
        applicationContent: '時間有休',
        privateOutTime: null,
        privateReturnTime: null,
      });

      const analysis = AttendanceService.analyzeDailyRecord(record);

      expect(analysis.violations).toContain('time_leave_punch_missing');
    });

    it('時間有休申請なしで打刻なし - 正常', () => {
      const record = createTestRecord('TV005', '申請なし', {
        applicationContent: '',
        privateOutTime: null,
        privateReturnTime: null,
      });

      const analysis = AttendanceService.analyzeDailyRecord(record);

      expect(analysis.violations).not.toContain('time_leave_punch_missing');
    });
  });
});
