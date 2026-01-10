// 残業時間取得バグのテスト
// バグ: calculateOvertimeMinutes() がExcelの残業時間カラムを使用せず計算している
// 期待: record.overtimeHours（平日法定外残業(36協定用)カラム）の値を使用する

import { AttendanceService } from '../../services/AttendanceService';
import { AttendanceRecord } from '../../models/AttendanceTypes';

/**
 * テスト用のレコードを作成（残業時間をExcel値と計算値で別々に設定可能）
 * @param overtimeHoursFromExcel Excelの平日法定外残業(36協定用)カラムの値
 * @param actualWorkHours 実働時間カラムの値
 */
const createTestRecordWithOvertime = (
  overtimeHoursFromExcel: string,
  actualWorkHours: string,
  overrides: Partial<AttendanceRecord> = {}
): AttendanceRecord => ({
  employeeId: 'TEST001',
  employeeName: 'テスト太郎',
  department: '開発部',
  position: '一般',
  date: new Date('2025-12-01'),
  dayOfWeek: '月',
  calendarType: 'weekday',
  calendarRaw: '平日',
  applicationContent: '',
  clockIn: new Date('2025-12-01T09:00:00'),
  clockOut: new Date('2025-12-01T18:00:00'),
  originalClockIn: new Date('2025-12-01T09:00:00'),
  originalClockOut: new Date('2025-12-01T18:00:00'),
  earlyStartFlag: false,
  altxOvertimeIn: null,
  altxOvertimeOut: null,
  privateOutTime: null,
  privateReturnTime: null,
  breakTimeMinutes: 60,
  nightBreakModification: '',
  nightWorkMinutes: '',
  actualWorkHours, // 実働時間
  overtimeHours: overtimeHoursFromExcel, // Excelの残業時間カラム
  lateMinutes: '',
  earlyLeaveMinutes: '',
  remarks: '',
  sheetName: 'テストシート',
  ...overrides,
});

describe('AttendanceService - 残業時間取得のバグ修正', () => {
  describe('calculateOvertimeMinutes - Excelの残業時間カラムを使用', () => {
    /**
     * バグの再現テスト
     * Excel: 平日法定外残業(36協定用) = 2:30 (150分)
     * 実働時間 = 10:30
     * 期待: 150分（Excelの値を使用）
     * バグ: 10:30 - 8:00 = 2:30 = 150分 (たまたま一致するが計算ロジックが間違い)
     */
    it('Excelの残業時間カラムの値を正しく取得する（2時間30分）', () => {
      const record = createTestRecordWithOvertime('2:30', '10:30');
      const overtimeMinutes = AttendanceService.calculateOvertimeMinutes(record);
      expect(overtimeMinutes).toBe(150); // 2:30 = 150分
    });

    /**
     * バグが顕在化するケース
     * Excel: 平日法定外残業(36協定用) = 1:00 (60分)
     * 実働時間 = 9:00 (8時間勤務 + 1時間休憩 - 1時間残業がない計算上の実働)
     * 期待: 60分（Excelの値を使用）
     * バグ: 9:00 - 8:00 = 1:00 = 60分になるが、休憩引いてない等で不一致の可能性
     */
    it('Excelの残業時間カラムの値を正しく取得する（1時間）', () => {
      const record = createTestRecordWithOvertime('1:00', '9:00');
      const overtimeMinutes = AttendanceService.calculateOvertimeMinutes(record);
      expect(overtimeMinutes).toBe(60); // 1:00 = 60分
    });

    /**
     * 重要: 実働時間と残業時間が不一致のケース
     * Excel: 平日法定外残業(36協定用) = 3:00 (180分)
     * 実働時間 = 8:00（所定労働時間のみ）
     * 期待: 180分（Excelの値を使用）
     * バグ: 8:00 - 8:00 = 0分（完全に間違い）
     */
    it('実働時間が8時間でも残業カラムに値があれば残業として取得', () => {
      const record = createTestRecordWithOvertime('3:00', '8:00');
      const overtimeMinutes = AttendanceService.calculateOvertimeMinutes(record);
      expect(overtimeMinutes).toBe(180); // 3:00 = 180分
    });

    /**
     * 残業なしのケース
     * Excel: 残業カラムが空
     * 実働時間 = 8:00
     * 期待: 0分
     */
    it('残業カラムが空の場合は0分', () => {
      const record = createTestRecordWithOvertime('', '8:00');
      const overtimeMinutes = AttendanceService.calculateOvertimeMinutes(record);
      expect(overtimeMinutes).toBe(0);
    });

    /**
     * 残業カラムが0:00のケース
     */
    it('残業カラムが0:00の場合は0分', () => {
      const record = createTestRecordWithOvertime('0:00', '10:00');
      const overtimeMinutes = AttendanceService.calculateOvertimeMinutes(record);
      expect(overtimeMinutes).toBe(0);
    });

    /**
     * 30分単位の残業
     */
    it('30分単位の残業を正しく取得', () => {
      const record = createTestRecordWithOvertime('0:30', '8:30');
      const overtimeMinutes = AttendanceService.calculateOvertimeMinutes(record);
      expect(overtimeMinutes).toBe(30);
    });

    /**
     * 長時間残業のケース
     */
    it('長時間残業（5時間30分）を正しく取得', () => {
      const record = createTestRecordWithOvertime('5:30', '13:30');
      const overtimeMinutes = AttendanceService.calculateOvertimeMinutes(record);
      expect(overtimeMinutes).toBe(330); // 5:30 = 330分
    });
  });

  describe('休日出勤時の残業計算', () => {
    /**
     * 休日出勤は従来通り全時間を残業として扱う
     * （36協定用カラムは平日専用なので休日は別計算）
     */
    it('休日出勤は実働時間全体が残業', () => {
      const record = createTestRecordWithOvertime('', '6:00', {
        calendarType: 'statutory_holiday',
        calendarRaw: '法定休日',
      });
      const overtimeMinutes = AttendanceService.calculateOvertimeMinutes(record);
      // 休日は実働時間全体が残業（6時間 = 360分）
      expect(overtimeMinutes).toBe(360);
    });

    it('法定外休日も実働時間全体が残業', () => {
      const record = createTestRecordWithOvertime('', '4:00', {
        calendarType: 'non_statutory_holiday',
        calendarRaw: '法定外休日',
      });
      const overtimeMinutes = AttendanceService.calculateOvertimeMinutes(record);
      expect(overtimeMinutes).toBe(240); // 4時間 = 240分
    });
  });

  describe('8時出社カレンダー登録者の残業計算', () => {
    /**
     * 8時出社カレンダー登録者も通常通りExcelの残業時間を取得する
     * 8時カレンダー特殊処理は「遅刻誤検出」防止であり、残業時間とは無関係
     */
    it('8時カレンダー登録者もExcelの残業時間を正しく取得', () => {
      const record = createTestRecordWithOvertime('2:00', '10:00', {
        sheetName: 'KDDI_日勤_800-1630_開発部',
      });
      const overtimeMinutes = AttendanceService.calculateOvertimeMinutes(record);
      expect(overtimeMinutes).toBe(120); // 2:00 = 120分（Excelの値を使用）
    });
  });

  describe('月次サマリーでの残業合計', () => {
    /**
     * 複数日の残業合計が正しく計算される
     */
    it('複数日の残業が正しく合計される', () => {
      const records: AttendanceRecord[] = [
        createTestRecordWithOvertime('2:00', '10:00', {
          date: new Date('2025-12-01'),
        }),
        createTestRecordWithOvertime('1:30', '9:30', {
          date: new Date('2025-12-02'),
        }),
        createTestRecordWithOvertime('3:00', '11:00', {
          date: new Date('2025-12-03'),
        }),
      ];

      const summary = AttendanceService.createEmployeeMonthlySummary('TEST001', records);

      // 2:00(120) + 1:30(90) + 3:00(180) = 390分
      expect(summary.totalOvertimeMinutes).toBe(390);
    });
  });
});
