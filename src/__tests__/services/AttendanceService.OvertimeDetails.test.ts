// 残業時間2値計算テスト
// 残業時間（所定超過: 7h45m基準）と法定外残業時間（法定超過: 8h基準）を分離して計算
//
// ルール:
// - 残業時間 = max(0, 実働時間 - 7h45m(465分))
// - 法定外残業時間 = max(0, 実働時間 - 8h(480分)) ← 36協定用
// - 休日出勤: 両方とも実働時間の全量
// - 半休・時間休: 閾値は変わらず（実働時間ベース）

import { AttendanceService } from '../../services/AttendanceService';
import { AttendanceRecord } from '../../models/AttendanceTypes';

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

describe('AttendanceService - 残業時間2値計算（所定超過 / 法定外超過）', () => {
  describe('calculateOvertimeDetails - 平日の2値計算', () => {
    it('7h45m勤務: 残業=0分, 法定外=0分（所定ちょうど）', () => {
      const record = createTestRecord('7:45');
      const result = AttendanceService.calculateOvertimeDetails(record);
      expect(result.overtimeMinutes).toBe(0);
      expect(result.legalOvertimeMinutes).toBe(0);
    });

    it('8h00m勤務: 残業=15分, 法定外=0分（法定内残業のみ）', () => {
      const record = createTestRecord('8:00');
      const result = AttendanceService.calculateOvertimeDetails(record);
      expect(result.overtimeMinutes).toBe(15);
      expect(result.legalOvertimeMinutes).toBe(0);
    });

    it('8h01m勤務: 残業=16分, 法定外=1分（法定超過開始）', () => {
      const record = createTestRecord('8:01');
      const result = AttendanceService.calculateOvertimeDetails(record);
      expect(result.overtimeMinutes).toBe(16);
      expect(result.legalOvertimeMinutes).toBe(1);
    });

    it('9h00m勤務: 残業=75分, 法定外=60分', () => {
      const record = createTestRecord('9:00');
      const result = AttendanceService.calculateOvertimeDetails(record);
      expect(result.overtimeMinutes).toBe(75);
      expect(result.legalOvertimeMinutes).toBe(60);
    });

    it('10h30m勤務: 残業=165分, 法定外=150分', () => {
      const record = createTestRecord('10:30');
      const result = AttendanceService.calculateOvertimeDetails(record);
      expect(result.overtimeMinutes).toBe(165);
      expect(result.legalOvertimeMinutes).toBe(150);
    });

    it('7h00m勤務: 残業=0分, 法定外=0分（所定未満）', () => {
      const record = createTestRecord('7:00');
      const result = AttendanceService.calculateOvertimeDetails(record);
      expect(result.overtimeMinutes).toBe(0);
      expect(result.legalOvertimeMinutes).toBe(0);
    });

    it('実働時間が空: 残業=0分, 法定外=0分', () => {
      const record = createTestRecord('');
      const result = AttendanceService.calculateOvertimeDetails(record);
      expect(result.overtimeMinutes).toBe(0);
      expect(result.legalOvertimeMinutes).toBe(0);
    });
  });

  describe('calculateOvertimeDetails - 境界値テスト', () => {
    it('7h44m: 残業=0分, 法定外=0分（所定未満）', () => {
      const record = createTestRecord('7:44');
      const result = AttendanceService.calculateOvertimeDetails(record);
      expect(result.overtimeMinutes).toBe(0);
      expect(result.legalOvertimeMinutes).toBe(0);
    });

    it('7h46m: 残業=1分, 法定外=0分（所定超過1分）', () => {
      const record = createTestRecord('7:46');
      const result = AttendanceService.calculateOvertimeDetails(record);
      expect(result.overtimeMinutes).toBe(1);
      expect(result.legalOvertimeMinutes).toBe(0);
    });

    it('7h59m: 残業=14分, 法定外=0分（法定ギリギリ手前）', () => {
      const record = createTestRecord('7:59');
      const result = AttendanceService.calculateOvertimeDetails(record);
      expect(result.overtimeMinutes).toBe(14);
      expect(result.legalOvertimeMinutes).toBe(0);
    });
  });

  describe('calculateOvertimeDetails - 半休勤務（閾値は7.75h/8hのまま）', () => {
    it('半休で4h00m勤務: 残業=0分, 法定外=0分', () => {
      const record = createTestRecord('4:00', {
        applicationContent: '午前半休',
        clockIn: new Date('2025-12-01T13:00:00'),
      });
      const result = AttendanceService.calculateOvertimeDetails(record);
      expect(result.overtimeMinutes).toBe(0);
      expect(result.legalOvertimeMinutes).toBe(0);
    });

    it('半休で8h30m勤務: 残業=45分, 法定外=30分', () => {
      const record = createTestRecord('8:30', {
        applicationContent: '午前半休',
        clockIn: new Date('2025-12-01T13:00:00'),
      });
      const result = AttendanceService.calculateOvertimeDetails(record);
      expect(result.overtimeMinutes).toBe(45);
      expect(result.legalOvertimeMinutes).toBe(30);
    });
  });

  describe('calculateOvertimeDetails - 休日出勤（全量=残業=法定外）', () => {
    it('法定休日6h00m: 残業=360分, 法定外=360分', () => {
      const record = createTestRecord('6:00', {
        calendarType: 'statutory_holiday',
        calendarRaw: '法定休',
      });
      const result = AttendanceService.calculateOvertimeDetails(record);
      expect(result.overtimeMinutes).toBe(360);
      expect(result.legalOvertimeMinutes).toBe(360);
    });

    it('所定休日4h00m: 残業=240分, 法定外=240分', () => {
      const record = createTestRecord('4:00', {
        calendarType: 'non_statutory_holiday',
        calendarRaw: '法定外',
      });
      const result = AttendanceService.calculateOvertimeDetails(record);
      expect(result.overtimeMinutes).toBe(240);
      expect(result.legalOvertimeMinutes).toBe(240);
    });
  });

  describe('calculateOvertimeMinutes - 後方互換（所定超過を返す）', () => {
    it('所定超過分を返す', () => {
      const record = createTestRecord('9:00');
      const result = AttendanceService.calculateOvertimeMinutes(record);
      expect(result).toBe(75); // 9h - 7h45m = 1h15m = 75分
    });
  });

  describe('月次サマリーでの2値累積', () => {
    it('3日分の残業・法定外が正しく合計される', () => {
      const records: AttendanceRecord[] = [
        createTestRecord('9:00', { date: new Date('2025-12-01') }),  // 残業75, 法定外60
        createTestRecord('8:30', { date: new Date('2025-12-02') }),  // 残業45, 法定外30
        createTestRecord('10:00', { date: new Date('2025-12-03') }), // 残業135, 法定外120
      ];

      const summary = AttendanceService.createEmployeeMonthlySummary('TEST001', records);

      expect(summary.totalOvertimeMinutes).toBe(255);       // 75+45+135
      expect(summary.totalLegalOvertimeMinutes).toBe(210);   // 60+30+120
    });

    it('平日+休日混合の累積', () => {
      const records: AttendanceRecord[] = [
        createTestRecord('9:00', { date: new Date('2025-12-01') }),  // 平日: 残業75, 法定外60
        createTestRecord('5:00', {                                    // 休日: 残業300, 法定外300
          date: new Date('2025-12-06'),
          calendarType: 'non_statutory_holiday',
          calendarRaw: '法定外',
        }),
      ];

      const summary = AttendanceService.createEmployeeMonthlySummary('TEST001', records);

      expect(summary.totalOvertimeMinutes).toBe(375);       // 75+300
      expect(summary.totalLegalOvertimeMinutes).toBe(360);   // 60+300
    });
  });
});
