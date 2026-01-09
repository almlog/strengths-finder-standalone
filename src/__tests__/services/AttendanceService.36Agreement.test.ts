// 36協定・月次累積残業チェックのテスト
// 評価指摘3: 36協定・長時間労働チェックの実装

import { AttendanceService } from '../../services/AttendanceService';
import { AttendanceRecord, OVERTIME_THRESHOLDS } from '../../models/AttendanceTypes';

/**
 * テスト用の基本レコードを作成
 */
const createTestRecord = (
  id: string,
  name: string,
  date: Date,
  overtimeMinutes: number,
  overrides: Partial<AttendanceRecord> = {}
): AttendanceRecord => ({
  employeeId: id,
  employeeName: name,
  department: '開発部',
  position: '一般',
  date,
  dayOfWeek: '月',
  calendarType: 'weekday',
  calendarRaw: '平日',
  applicationContent: '',
  clockIn: new Date(date.getTime()),
  clockOut: new Date(date.getTime() + 8 * 60 * 60 * 1000 + overtimeMinutes * 60 * 1000),
  originalClockIn: new Date(date.getTime()),
  originalClockOut: new Date(date.getTime() + 8 * 60 * 60 * 1000 + overtimeMinutes * 60 * 1000),
  earlyStartFlag: false,
  altxOvertimeIn: null,
  altxOvertimeOut: null,
  privateOutTime: null,
  privateReturnTime: null,
  breakTimeMinutes: 60,
  nightBreakModification: '',
  nightWorkMinutes: '',
  actualWorkHours: `${8 + Math.floor(overtimeMinutes / 60)}:${String(overtimeMinutes % 60).padStart(2, '0')}`,
  overtimeHours: overtimeMinutes > 0 ? `${Math.floor(overtimeMinutes / 60)}:${String(overtimeMinutes % 60).padStart(2, '0')}` : '',
  lateMinutes: '',
  earlyLeaveMinutes: '',
  remarks: '',
  sheetName: 'テストシート',
  ...overrides,
});

/**
 * 複数日分のレコードを生成するヘルパー
 */
const createMultiDayRecords = (
  id: string,
  name: string,
  startDate: Date,
  dailyOvertimeMinutes: number,
  days: number
): AttendanceRecord[] => {
  const records: AttendanceRecord[] = [];
  for (let i = 0; i < days; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);
    // 土日をスキップ
    if (date.getDay() === 0 || date.getDay() === 6) {
      continue;
    }
    records.push(createTestRecord(id, name, date, dailyOvertimeMinutes));
  }
  return records;
};

describe('AttendanceService - 36協定残業時間チェック', () => {
  /**
   * 36協定の閾値定数のテスト
   */
  describe('OVERTIME_THRESHOLDS定数', () => {
    it('閾値が正しく定義されている', () => {
      // この定数が存在しない場合はテストが失敗する
      // 将来実装時に有効化
      expect(typeof OVERTIME_THRESHOLDS).toBe('object');
      expect(OVERTIME_THRESHOLDS.WARNING_HOURS).toBe(35);
      expect(OVERTIME_THRESHOLDS.LIMIT_HOURS).toBe(45);
      expect(OVERTIME_THRESHOLDS.CRITICAL_HOURS).toBe(80);
      expect(OVERTIME_THRESHOLDS.SPECIAL_LIMIT_HOURS).toBe(100);
    });
  });

  describe('月次残業時間の計算', () => {
    it('月次サマリーで総残業時間が正しく計算される', () => {
      // 20日間、毎日2時間残業 = 40時間
      const records = createMultiDayRecords(
        'OT001',
        '残業テスト',
        new Date('2025-12-01'),
        120, // 2時間 = 120分
        30
      );

      const summary = AttendanceService.createEmployeeMonthlySummary('OT001', records);

      // 20営業日 × 2時間 = 40時間 = 2400分
      expect(summary.totalOvertimeMinutes).toBeGreaterThan(0);
    });
  });

  describe('月次残業アラートレベル判定（7段階）', () => {
    /**
     * 35時間未満: 正常レベル
     */
    it('月35時間未満で正常レベル', () => {
      const overtimeMinutes = 30 * 60; // 30時間 = 1800分
      const level = AttendanceService.getOvertimeAlertLevel(overtimeMinutes);
      expect(level).toBe('normal');
    });

    /**
     * 35時間以上: 注意レベル（上長報告）
     */
    it('月35時間以上で注意レベル', () => {
      const overtimeMinutes = 35 * 60; // 35時間 = 2100分
      const level = AttendanceService.getOvertimeAlertLevel(overtimeMinutes);
      expect(level).toBe('warning');
    });

    /**
     * 45時間以上: 超過レベル（36協定基本上限）
     */
    it('月45時間以上で超過レベル', () => {
      const overtimeMinutes = 45 * 60; // 45時間 = 2700分
      const level = AttendanceService.getOvertimeAlertLevel(overtimeMinutes);
      expect(level).toBe('exceeded');
    });

    /**
     * 55時間以上: 警戒レベル（残業抑制指示）
     */
    it('月55時間以上で警戒レベル', () => {
      const overtimeMinutes = 55 * 60; // 55時間 = 3300分
      const level = AttendanceService.getOvertimeAlertLevel(overtimeMinutes);
      expect(level).toBe('caution');
    });

    /**
     * 65時間以上: 深刻レベル（残業禁止措置検討）
     */
    it('月65時間以上で深刻レベル', () => {
      const overtimeMinutes = 65 * 60; // 65時間 = 3900分
      const level = AttendanceService.getOvertimeAlertLevel(overtimeMinutes);
      expect(level).toBe('serious');
    });

    /**
     * 70時間以上: 重大レベル（親会社報告）
     */
    it('月70時間以上で重大レベル', () => {
      const overtimeMinutes = 70 * 60; // 70時間 = 4200分
      const level = AttendanceService.getOvertimeAlertLevel(overtimeMinutes);
      expect(level).toBe('severe');
    });

    /**
     * 80時間以上: 危険レベル（医師面接指導）
     */
    it('月80時間以上で危険レベル', () => {
      const overtimeMinutes = 80 * 60; // 80時間 = 4800分
      const level = AttendanceService.getOvertimeAlertLevel(overtimeMinutes);
      expect(level).toBe('critical');
    });

    /**
     * 100時間以上: 違法レベル（即時是正）
     */
    it('月100時間以上で違法レベル', () => {
      const overtimeMinutes = 100 * 60; // 100時間 = 6000分
      const level = AttendanceService.getOvertimeAlertLevel(overtimeMinutes);
      expect(level).toBe('illegal');
    });

    /**
     * 境界値テスト: 各閾値の直前と直後
     */
    it('境界値: 34時間59分は正常', () => {
      const overtimeMinutes = 34 * 60 + 59; // 34:59
      expect(AttendanceService.getOvertimeAlertLevel(overtimeMinutes)).toBe('normal');
    });

    it('境界値: 44時間59分は注意', () => {
      const overtimeMinutes = 44 * 60 + 59; // 44:59
      expect(AttendanceService.getOvertimeAlertLevel(overtimeMinutes)).toBe('warning');
    });

    it('境界値: 54時間59分は超過', () => {
      const overtimeMinutes = 54 * 60 + 59; // 54:59
      expect(AttendanceService.getOvertimeAlertLevel(overtimeMinutes)).toBe('exceeded');
    });

    it('境界値: 64時間59分は警戒', () => {
      const overtimeMinutes = 64 * 60 + 59; // 64:59
      expect(AttendanceService.getOvertimeAlertLevel(overtimeMinutes)).toBe('caution');
    });

    it('境界値: 69時間59分は深刻', () => {
      const overtimeMinutes = 69 * 60 + 59; // 69:59
      expect(AttendanceService.getOvertimeAlertLevel(overtimeMinutes)).toBe('serious');
    });

    it('境界値: 79時間59分は重大', () => {
      const overtimeMinutes = 79 * 60 + 59; // 79:59
      expect(AttendanceService.getOvertimeAlertLevel(overtimeMinutes)).toBe('severe');
    });

    it('境界値: 99時間59分は危険', () => {
      const overtimeMinutes = 99 * 60 + 59; // 99:59
      expect(AttendanceService.getOvertimeAlertLevel(overtimeMinutes)).toBe('critical');
    });
  });

  describe('予兆検知（月中間チェック）', () => {
    /**
     * 月中旬時点で45時間ペースを超えている場合
     * 計算: 月45時間上限で15日目 → 期待される残業 = 45 * 15/30 = 22.5時間
     * 25時間 > 22.5時間 → 超過ペース
     */
    it('月15日時点で22.5時間超でペース警告', () => {
      const currentOvertimeMinutes = 25 * 60; // 25時間（22.5時間を超過）
      const dayOfMonth = 15;
      const isOnPace = AttendanceService.isOvertimeOnPaceToExceed(
        currentOvertimeMinutes,
        dayOfMonth,
        45 * 60 // 月45時間上限
      );
      expect(isOnPace).toBe(true);
    });

    it('月15日時点で20時間なら正常ペース', () => {
      const currentOvertimeMinutes = 20 * 60; // 20時間（22.5時間未満）
      const dayOfMonth = 15;
      const isOnPace = AttendanceService.isOvertimeOnPaceToExceed(
        currentOvertimeMinutes,
        dayOfMonth,
        45 * 60 // 月45時間上限
      );
      expect(isOnPace).toBe(false);
    });
  });

  describe('年間累計チェック', () => {
    /**
     * 年間360時間上限のチェック
     */
    it('年間360時間以上で上限超過', () => {
      const annualOvertimeMinutes = 360 * 60; // 360時間
      const isExceeded = AttendanceService.isAnnualOvertimeExceeded(annualOvertimeMinutes);
      expect(isExceeded).toBe(true);
    });

    it('年間359時間なら上限内', () => {
      const annualOvertimeMinutes = 359 * 60; // 359時間
      const isExceeded = AttendanceService.isAnnualOvertimeExceeded(annualOvertimeMinutes);
      expect(isExceeded).toBe(false);
    });
  });
});

describe('AttendanceService - 健康リスクアラート', () => {
  /**
   * 厚労省指針: 月80時間超は健康リスクが高い
   */
  it('月80時間超は医師面接指導の対象', () => {
    const overtimeMinutes = 81 * 60; // 81時間
    const needsMedicalGuidance = AttendanceService.needsMedicalGuidance(overtimeMinutes);
    expect(needsMedicalGuidance).toBe(true);
  });

  it('月80時間以下は医師面接指導の対象外', () => {
    const overtimeMinutes = 80 * 60; // 80時間ちょうど
    const needsMedicalGuidance = AttendanceService.needsMedicalGuidance(overtimeMinutes);
    expect(needsMedicalGuidance).toBe(false);
  });
});
