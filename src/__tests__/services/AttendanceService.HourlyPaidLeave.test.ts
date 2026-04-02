// 時間有休（有休時間）の法定外残業計算テスト
//
// ルール:
// - 有休時間が申請されている日で、勤務時間 > 実働時間 の場合:
//   有休分 = 勤務時間 - 実働時間
//   法定外残業 = max(0, (実働+breakAdj) - (480 + 有休分))
//   所定超過残業 = max(0, (実働+breakAdj) - (465 + 有休分))
// - 有休時間がない日は従来通り
// - 他の申請（休憩時間修正等）と併記されていても有休時間の調整は適用される

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
  date: new Date('2026-02-10'),
  dayOfWeek: '火',
  calendarType: 'weekday',
  calendarRaw: '平日',
  applicationContent: '',
  clockIn: new Date('2026-02-10T09:00:00'),
  clockOut: new Date('2026-02-10T18:00:00'),
  originalClockIn: new Date('2026-02-10T09:00:00'),
  originalClockOut: new Date('2026-02-10T18:00:00'),
  earlyStartFlag: false,
  altxOvertimeIn: null,
  altxOvertimeOut: null,
  privateOutTime: null,
  privateReturnTime: null,
  breakTimeMinutes: 60,
  nightBreakModification: '',
  nightWorkMinutes: '',
  actualWorkHours,
  workHours: actualWorkHours, // デフォルト: 有休なし（勤務=実働）
  overtimeHours: '',
  lateMinutes: '',
  earlyLeaveMinutes: '',
  remarks: '',
  sheetName: 'テストシート',
  ...overrides,
});

describe('AttendanceService - 時間有休(有休時間)の法定外残業調整', () => {
  describe('有休時間なし（従来通り）', () => {
    it('workHours未設定: 従来と同じ計算', () => {
      const record = createTestRecord('9:00', { workHours: undefined });
      const result = AttendanceService.calculateOvertimeDetails(record);
      expect(result.overtimeMinutes).toBe(75);        // 540-465
      expect(result.legalOvertimeMinutes).toBe(60);    // 540-480
    });

    it('有休時間なしで勤務=実働: 従来と同じ計算', () => {
      const record = createTestRecord('9:00', { workHours: '9:00' });
      const result = AttendanceService.calculateOvertimeDetails(record);
      expect(result.overtimeMinutes).toBe(75);
      expect(result.legalOvertimeMinutes).toBe(60);
    });
  });

  describe('有休時間あり（法定基準を引き上げ）', () => {
    it('有休時間1:45 → 法定外・所定超過ともに0', () => {
      // 実働9:15(555分), 勤務11:00(660分), 有休分=1:45(105分)
      // break=75 → adj=15, adjusted=570
      // 法定外: max(0, 570 - (480+105)) = max(0, -15) = 0
      // 所定超過: max(0, 570 - (465+105)) = 0
      const record = createTestRecord('9:15', {
        workHours: '11:00',
        breakTimeMinutes: 75,
        applicationContent: '有休時間',
      });
      const result = AttendanceService.calculateOvertimeDetails(record);
      expect(result.legalOvertimeMinutes).toBe(0);
      expect(result.overtimeMinutes).toBe(0);
    });

    it('有休時間1:00で法定外が部分的に残る', () => {
      // 実働9:30(570分), 勤務10:30(630分), 有休分=1:00(60分)
      // break=75 → adj=15, adjusted=585
      // 法定外: max(0, 585 - (480+60)) = 45
      // 所定超過: max(0, 585 - (465+60)) = 60
      const record = createTestRecord('9:30', {
        workHours: '10:30',
        breakTimeMinutes: 75,
        applicationContent: '有休時間',
      });
      const result = AttendanceService.calculateOvertimeDetails(record);
      expect(result.legalOvertimeMinutes).toBe(45);
      expect(result.overtimeMinutes).toBe(60);
    });

    it('有休時間2:00で法定外がゼロに吸収される', () => {
      // 実働8:45(525分), 勤務10:45(645分), 有休分=2:00(120分)
      // break=75 → adj=15, adjusted=540
      // 法定外: max(0, 540 - (480+120)) = max(0, -60) = 0
      // 所定超過: max(0, 540 - (465+120)) = max(0, -45) = 0
      const record = createTestRecord('8:45', {
        workHours: '10:45',
        breakTimeMinutes: 75,
        applicationContent: '有休時間',
      });
      const result = AttendanceService.calculateOvertimeDetails(record);
      expect(result.legalOvertimeMinutes).toBe(0);
      expect(result.overtimeMinutes).toBe(0);
    });
  });

  describe('有休時間 + 他の申請との併記', () => {
    it('有休時間 + 休憩時間修正: breakAdj=0, 有休調整は適用', () => {
      // 実働9:00(540分), 勤務10:00(600分), 有休分=1:00(60分)
      // 休憩時間修正あり → adj=0, adjusted=540
      // 法定外: max(0, 540 - (480+60)) = 0
      // 所定超過: max(0, 540 - (465+60)) = 15
      const record = createTestRecord('9:00', {
        workHours: '10:00',
        breakTimeMinutes: 75,
        applicationContent: '有休時間,休憩時間修正',
      });
      const result = AttendanceService.calculateOvertimeDetails(record);
      expect(result.legalOvertimeMinutes).toBe(0);
      expect(result.overtimeMinutes).toBe(15);
    });

    it('有休時間を含む複合申請でも調整が適用される', () => {
      // 実働9:15(555分), 勤務10:15(615分), 有休分=1:00(60分)
      // break=75 → adj=15, adjusted=570
      // 法定外: max(0, 570 - (480+60)) = 30
      // 所定超過: max(0, 570 - (465+60)) = 45
      const record = createTestRecord('9:15', {
        workHours: '10:15',
        breakTimeMinutes: 75,
        applicationContent: '有休時間,900-1800/1200-1300/8/5',
      });
      const result = AttendanceService.calculateOvertimeDetails(record);
      expect(result.legalOvertimeMinutes).toBe(30);
      expect(result.overtimeMinutes).toBe(45);
    });
  });

  describe('有休時間なし（午前/午後有休は影響しない）', () => {
    it('午前有休: 有休時間ではないため従来通り', () => {
      // 午前有休で4h勤務、workHours=8:00(勤務時間に有休分含む)
      // 有休時間ではないので調整なし
      const record = createTestRecord('4:00', {
        workHours: '8:00',
        applicationContent: '午前有休',
      });
      const result = AttendanceService.calculateOvertimeDetails(record);
      expect(result.overtimeMinutes).toBe(0);   // 240-465<0 → 0
      expect(result.legalOvertimeMinutes).toBe(0); // 240-480<0 → 0
    });

    it('午後有休: 有休時間ではないため従来通り', () => {
      const record = createTestRecord('4:00', {
        workHours: '8:00',
        applicationContent: '午後有休',
      });
      const result = AttendanceService.calculateOvertimeDetails(record);
      expect(result.overtimeMinutes).toBe(0);
      expect(result.legalOvertimeMinutes).toBe(0);
    });
  });

  describe('休日出勤: 有休時間の影響なし', () => {
    it('休日出勤は有休時間があっても全量が法定外', () => {
      const record = createTestRecord('6:00', {
        workHours: '7:00',
        calendarType: 'statutory_holiday',
        calendarRaw: '法定休',
        applicationContent: '有休時間',
      });
      const result = AttendanceService.calculateOvertimeDetails(record);
      expect(result.overtimeMinutes).toBe(360);     // 6h = 360分
      expect(result.legalOvertimeMinutes).toBe(360);
    });
  });

  describe('月次サマリーの累積', () => {
    it('有休時間日と通常日の混合で正しく累積される', () => {
      const records: AttendanceRecord[] = [
        // Day1: 通常日 9h, break=75 → adj=15, adjusted=555
        // OT465=90, OT480=75
        createTestRecord('9:00', {
          date: new Date('2026-02-02'),
          breakTimeMinutes: 75,
          workHours: '9:00',
        }),
        // Day2: 有休時間1h, 実働9:15, 勤務10:15, break=75 → adj=15, adjusted=570
        // OT465=max(0,570-(465+60))=45, OT480=max(0,570-(480+60))=30
        createTestRecord('9:15', {
          date: new Date('2026-02-03'),
          breakTimeMinutes: 75,
          workHours: '10:15',
          applicationContent: '有休時間',
        }),
        // Day3: 通常日 8:30, break=60 → adj=0, adjusted=510
        // OT465=45, OT480=30
        createTestRecord('8:30', {
          date: new Date('2026-02-04'),
          breakTimeMinutes: 60,
          workHours: '8:30',
        }),
      ];

      const summary = AttendanceService.createEmployeeMonthlySummary('TEST001', records);
      expect(summary.totalOvertimeMinutes).toBe(180);         // 90+45+45
      expect(summary.totalLegalOvertimeMinutes).toBe(135);     // 75+30+30
    });
  });
});
