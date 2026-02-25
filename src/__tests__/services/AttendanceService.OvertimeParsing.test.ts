// 残業時間計算テスト
// 新ロジック: calculateOvertimeMinutes() は実働時間 - 所定労働時間(7h45m=465分) で計算
// Excelの「平日法定外残業(36協定用)」カラムは使用しない

import { AttendanceService } from '../../services/AttendanceService';
import { AttendanceRecord } from '../../models/AttendanceTypes';

/**
 * テスト用のレコードを作成
 * @param actualWorkHours 実働時間カラムの値（新ロジックのデータソース）
 */
const createTestRecord = (
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
  actualWorkHours,
  overtimeHours: '', // 新ロジックでは使用しない
  lateMinutes: '',
  earlyLeaveMinutes: '',
  remarks: '',
  sheetName: 'テストシート',
  ...overrides,
});

describe('AttendanceService - 残業時間計算（所定超過ベース）', () => {
  describe('calculateOvertimeMinutes - 実働時間から所定超過分を計算', () => {
    // 残業 = max(0, 実働時間 - 7h45m(465分))
    it('実働10h30m: 残業=165分（10:30-7:45=2:45）', () => {
      const record = createTestRecord('10:30');
      expect(AttendanceService.calculateOvertimeMinutes(record)).toBe(165);
    });

    it('実働9h00m: 残業=75分（9:00-7:45=1:15）', () => {
      const record = createTestRecord('9:00');
      expect(AttendanceService.calculateOvertimeMinutes(record)).toBe(75);
    });

    it('実働8h00m: 残業=15分（法定内残業のみ）', () => {
      const record = createTestRecord('8:00');
      expect(AttendanceService.calculateOvertimeMinutes(record)).toBe(15);
    });

    it('実働7h45m（所定ちょうど）: 残業=0分', () => {
      const record = createTestRecord('7:45');
      expect(AttendanceService.calculateOvertimeMinutes(record)).toBe(0);
    });

    it('残業なし（実働が空）: 0分', () => {
      const record = createTestRecord('');
      expect(AttendanceService.calculateOvertimeMinutes(record)).toBe(0);
    });

    it('30分残業: 実働8h15m → 残業=30分', () => {
      const record = createTestRecord('8:15');
      expect(AttendanceService.calculateOvertimeMinutes(record)).toBe(30);
    });

    it('長時間残業: 実働13h15m → 残業=330分(5h30m)', () => {
      const record = createTestRecord('13:15');
      expect(AttendanceService.calculateOvertimeMinutes(record)).toBe(330);
    });
  });

  describe('休日出勤時の残業計算', () => {
    it('休日出勤は実働時間全体が残業', () => {
      const record = createTestRecord('6:00', {
        calendarType: 'statutory_holiday',
        calendarRaw: '法定休日',
      });
      expect(AttendanceService.calculateOvertimeMinutes(record)).toBe(360);
    });

    it('法定外休日も実働時間全体が残業', () => {
      const record = createTestRecord('4:00', {
        calendarType: 'non_statutory_holiday',
        calendarRaw: '法定外休日',
      });
      expect(AttendanceService.calculateOvertimeMinutes(record)).toBe(240);
    });
  });

  describe('8時出社カレンダー登録者の残業計算', () => {
    it('8時カレンダー登録者も実働時間ベースで計算', () => {
      const record = createTestRecord('10:00', {
        sheetName: 'KDDI_日勤_800-1630_開発部',
      });
      // 10:00 - 7:45 = 2:15 = 135分
      expect(AttendanceService.calculateOvertimeMinutes(record)).toBe(135);
    });
  });

  describe('月次サマリーでの残業合計', () => {
    it('複数日の残業が正しく合計される', () => {
      const records: AttendanceRecord[] = [
        createTestRecord('10:00', { date: new Date('2025-12-01') }), // 135分
        createTestRecord('9:30', { date: new Date('2025-12-02') }),  // 105分
        createTestRecord('11:00', { date: new Date('2025-12-03') }), // 195分
      ];

      const summary = AttendanceService.createEmployeeMonthlySummary('TEST001', records);

      // 135 + 105 + 195 = 435分
      expect(summary.totalOvertimeMinutes).toBe(435);
    });
  });
});
