// src/__tests__/services/AttendanceService.ApplicationCount.test.ts
// 個人分析PDF機能 - 申請カウントのテスト

import AttendanceService from '../../services/AttendanceService';
import { AttendanceRecord, CalendarType } from '../../models/AttendanceTypes';

/**
 * テスト用の勤怠レコードを作成するヘルパー
 */
function createTestRecord(overrides: Partial<AttendanceRecord> = {}): AttendanceRecord {
  const baseDate = new Date('2026-01-15');
  return {
    employeeId: 'EMP001',
    employeeName: 'テスト太郎',
    department: 'テスト部',
    position: '一般',
    date: baseDate,
    dayOfWeek: '水',
    calendarType: 'weekday' as CalendarType,
    calendarRaw: '',
    applicationContent: '',
    clockIn: new Date('2026-01-15T09:00:00'),
    clockOut: new Date('2026-01-15T18:00:00'),
    originalClockIn: new Date('2026-01-15T09:00:00'),
    originalClockOut: new Date('2026-01-15T18:00:00'),
    earlyStartFlag: false,
    altxOvertimeIn: null,
    altxOvertimeOut: null,
    privateOutTime: null,
    privateReturnTime: null,
    breakTimeMinutes: 60,
    nightBreakModification: '',
    nightWorkMinutes: '',
    actualWorkHours: '8:00',
    overtimeHours: '',
    lateMinutes: '',
    earlyLeaveMinutes: '',
    remarks: '',
    sheetName: 'テストシート',
    ...overrides,
  };
}

describe('申請カウント機能', () => {
  describe('countApplications - 申請種別ごとのカウント', () => {
    test('TC-APP-001: 遅刻申請をカウントする', () => {
      const records: AttendanceRecord[] = [
        createTestRecord({ date: new Date('2026-01-15'), applicationContent: '遅刻・早退申請' }),
        createTestRecord({ date: new Date('2026-01-16'), applicationContent: '遅刻申請' }),
        createTestRecord({ date: new Date('2026-01-17'), applicationContent: '' }),
      ];

      const result = AttendanceService.countApplications(records);
      expect(result.lateApplication).toBe(2);
    });

    test('TC-APP-002: 電車遅延申請をカウントする', () => {
      const records: AttendanceRecord[] = [
        createTestRecord({ date: new Date('2026-01-15'), applicationContent: '電車遅延申請' }),
        createTestRecord({ date: new Date('2026-01-16'), applicationContent: '電車遅延届' }),
        createTestRecord({ date: new Date('2026-01-17'), applicationContent: '' }),
      ];

      const result = AttendanceService.countApplications(records);
      expect(result.trainDelayApplication).toBe(2);
    });

    test('TC-APP-003: 早退申請をカウントする', () => {
      const records: AttendanceRecord[] = [
        createTestRecord({ date: new Date('2026-01-15'), applicationContent: '早退申請' }),
        createTestRecord({ date: new Date('2026-01-16'), applicationContent: '遅刻・早退申請' }),
        createTestRecord({ date: new Date('2026-01-17'), applicationContent: '' }),
      ];

      const result = AttendanceService.countApplications(records);
      // 遅刻・早退申請は早退としてもカウント
      expect(result.earlyLeaveApplication).toBe(2);
    });

    test('TC-APP-004: 早出申請/フラグをカウントする', () => {
      const records: AttendanceRecord[] = [
        createTestRecord({ date: new Date('2026-01-15'), applicationContent: '早出申請' }),
        createTestRecord({ date: new Date('2026-01-16'), earlyStartFlag: true }),
        createTestRecord({ date: new Date('2026-01-17'), applicationContent: '' }),
      ];

      const result = AttendanceService.countApplications(records);
      expect(result.earlyStartApplication).toBe(2);
    });

    test('TC-APP-005: 時差出勤申請をカウントする', () => {
      const records: AttendanceRecord[] = [
        createTestRecord({ date: new Date('2026-01-15'), applicationContent: '時差出勤申請' }),
        createTestRecord({ date: new Date('2026-01-16'), applicationContent: '時差勤務申請' }),
        createTestRecord({ date: new Date('2026-01-17'), applicationContent: '' }),
      ];

      const result = AttendanceService.countApplications(records);
      expect(result.flextimeApplication).toBe(2);
    });

    test('TC-APP-006: 休憩修正申請をカウントする', () => {
      const records: AttendanceRecord[] = [
        createTestRecord({ date: new Date('2026-01-15'), applicationContent: '休憩時間修正申請' }),
        createTestRecord({ date: new Date('2026-01-16'), applicationContent: '深夜休憩修正' }),
        createTestRecord({ date: new Date('2026-01-17'), applicationContent: '' }),
      ];

      const result = AttendanceService.countApplications(records);
      expect(result.breakModification).toBe(2);
    });

    test('TC-APP-007: 複数種類の申請が混在する場合', () => {
      const records: AttendanceRecord[] = [
        createTestRecord({ date: new Date('2026-01-15'), applicationContent: '遅刻・早退申請' }),
        createTestRecord({ date: new Date('2026-01-16'), applicationContent: '電車遅延申請' }),
        createTestRecord({ date: new Date('2026-01-17'), applicationContent: '早出申請' }),
        createTestRecord({ date: new Date('2026-01-18'), applicationContent: '時差出勤申請' }),
        createTestRecord({ date: new Date('2026-01-19'), applicationContent: '' }),
      ];

      const result = AttendanceService.countApplications(records);
      expect(result.lateApplication).toBe(1);      // 遅刻・早退
      expect(result.earlyLeaveApplication).toBe(1); // 遅刻・早退
      expect(result.trainDelayApplication).toBe(1);
      expect(result.earlyStartApplication).toBe(1);
      expect(result.flextimeApplication).toBe(1);
    });

    test('TC-APP-008: 申請がない場合は全て0を返す', () => {
      const records: AttendanceRecord[] = [
        createTestRecord({ date: new Date('2026-01-15'), applicationContent: '' }),
        createTestRecord({ date: new Date('2026-01-16'), applicationContent: '' }),
      ];

      const result = AttendanceService.countApplications(records);
      expect(result.lateApplication).toBe(0);
      expect(result.trainDelayApplication).toBe(0);
      expect(result.earlyLeaveApplication).toBe(0);
      expect(result.earlyStartApplication).toBe(0);
      expect(result.flextimeApplication).toBe(0);
      expect(result.breakModification).toBe(0);
    });

    test('TC-APP-009: 空の配列に対しては全て0を返す', () => {
      const result = AttendanceService.countApplications([]);
      expect(result.lateApplication).toBe(0);
      expect(result.trainDelayApplication).toBe(0);
      expect(result.earlyLeaveApplication).toBe(0);
      expect(result.earlyStartApplication).toBe(0);
      expect(result.flextimeApplication).toBe(0);
      expect(result.breakModification).toBe(0);
    });
  });

  describe('calculateTotalWorkMinutes - 総就業時間の計算', () => {
    test('TC-WORK-001: 実働時間から総就業時間を計算する', () => {
      const records: AttendanceRecord[] = [
        createTestRecord({ date: new Date('2026-01-15'), actualWorkHours: '8:00' }),
        createTestRecord({ date: new Date('2026-01-16'), actualWorkHours: '9:30' }),
        createTestRecord({ date: new Date('2026-01-17'), actualWorkHours: '7:45' }),
      ];

      const result = AttendanceService.calculateTotalWorkMinutes(records);
      // 8:00 = 480分, 9:30 = 570分, 7:45 = 465分 → 合計1515分
      expect(result).toBe(1515);
    });

    test('TC-WORK-002: 実働時間が空の場合は0として扱う', () => {
      const records: AttendanceRecord[] = [
        createTestRecord({ date: new Date('2026-01-15'), actualWorkHours: '8:00' }),
        createTestRecord({ date: new Date('2026-01-16'), actualWorkHours: '' }),
        createTestRecord({ date: new Date('2026-01-17'), actualWorkHours: '8:00' }),
      ];

      const result = AttendanceService.calculateTotalWorkMinutes(records);
      // 8:00 + 0 + 8:00 = 960分
      expect(result).toBe(960);
    });

    test('TC-WORK-003: 空の配列に対しては0を返す', () => {
      const result = AttendanceService.calculateTotalWorkMinutes([]);
      expect(result).toBe(0);
    });
  });

  describe('EmployeeMonthlySummary に申請カウントが含まれる', () => {
    test('TC-SUM-001: analyzeExtended の結果に applicationCounts が含まれる', () => {
      const records: AttendanceRecord[] = [
        createTestRecord({
          date: new Date('2026-01-15'),
          applicationContent: '遅刻・早退申請',
          actualWorkHours: '8:00',
        }),
        createTestRecord({
          date: new Date('2026-01-16'),
          applicationContent: '電車遅延申請',
          actualWorkHours: '8:00',
        }),
      ];

      const result = AttendanceService.analyzeExtended(records);
      const summary = result.employeeSummaries[0];

      expect(summary.applicationCounts).toBeDefined();
      expect(summary.applicationCounts.lateApplication).toBe(1);
      expect(summary.applicationCounts.trainDelayApplication).toBe(1);
    });

    test('TC-SUM-002: analyzeExtended の結果に totalWorkMinutes が含まれる', () => {
      const records: AttendanceRecord[] = [
        createTestRecord({
          date: new Date('2026-01-15'),
          actualWorkHours: '8:00',
        }),
        createTestRecord({
          date: new Date('2026-01-16'),
          actualWorkHours: '9:00',
        }),
      ];

      const result = AttendanceService.analyzeExtended(records);
      const summary = result.employeeSummaries[0];

      expect(summary.totalWorkMinutes).toBeDefined();
      expect(summary.totalWorkMinutes).toBe(1020); // 8h + 9h = 17h = 1020分
    });
  });
});
