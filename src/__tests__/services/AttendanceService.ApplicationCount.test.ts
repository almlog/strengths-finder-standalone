// src/__tests__/services/AttendanceService.ApplicationCount.test.ts
// 申請カウント機能テスト（楽楽勤怠マニュアル準拠）

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

describe('申請カウント機能（楽楽勤怠マニュアル準拠）', () => {
  describe('勤務関連申請', () => {
    test('残業申請をカウントする', () => {
      const records: AttendanceRecord[] = [
        createTestRecord({ applicationContent: '残業終了,900-1730/1200-1300/7.75/5' }),
        createTestRecord({ applicationContent: '残業開始' }),
        createTestRecord({ applicationContent: '残業' }),
      ];

      const result = AttendanceService.countApplications(records);
      expect(result.overtime).toBe(3);
    });

    test('早出申請をカウントする', () => {
      const records: AttendanceRecord[] = [
        createTestRecord({ applicationContent: '早出開始' }),
        createTestRecord({ applicationContent: '早出' }),
        createTestRecord({ earlyStartFlag: true }),  // フラグもカウント
      ];

      const result = AttendanceService.countApplications(records);
      expect(result.earlyStart).toBe(3);
    });

    test('早出中抜け時間帯申請をカウントする', () => {
      const records: AttendanceRecord[] = [
        createTestRecord({ applicationContent: '早出中抜け' }),
      ];

      const result = AttendanceService.countApplications(records);
      expect(result.earlyStartBreak).toBe(1);
    });

    test('遅刻・早退申請をカウントする', () => {
      const records: AttendanceRecord[] = [
        createTestRecord({ applicationContent: '遅刻' }),
        createTestRecord({ applicationContent: '早退' }),
        createTestRecord({ applicationContent: '遅刻・早退' }),
      ];

      const result = AttendanceService.countApplications(records);
      expect(result.lateEarlyLeave).toBe(3);
    });

    test('電車遅延申請をカウントする', () => {
      const records: AttendanceRecord[] = [
        createTestRecord({ applicationContent: '電車遅延' }),
        createTestRecord({ applicationContent: '電車遅延申請' }),
        createTestRecord({ applicationContent: '遅延届' }),
      ];

      const result = AttendanceService.countApplications(records);
      expect(result.trainDelay).toBe(3);
    });

    test('時差出勤申請をカウントする', () => {
      const records: AttendanceRecord[] = [
        createTestRecord({ applicationContent: '時差出勤' }),
        createTestRecord({ applicationContent: '時差勤務' }),
      ];

      const result = AttendanceService.countApplications(records);
      expect(result.flextime).toBe(2);
    });

    test('休憩時間修正申請をカウントする', () => {
      const records: AttendanceRecord[] = [
        createTestRecord({ applicationContent: '休憩修正' }),
        createTestRecord({ applicationContent: '休憩時間修正' }),
        createTestRecord({ applicationContent: '深夜休憩' }),
      ];

      const result = AttendanceService.countApplications(records);
      expect(result.breakModification).toBe(3);
    });

    test('待機申請をカウントする', () => {
      const records: AttendanceRecord[] = [
        createTestRecord({ applicationContent: '待機' }),
      ];

      const result = AttendanceService.countApplications(records);
      expect(result.standby).toBe(1);
    });

    test('宿直申請をカウントする', () => {
      const records: AttendanceRecord[] = [
        createTestRecord({ applicationContent: '宿直' }),
      ];

      const result = AttendanceService.countApplications(records);
      expect(result.nightDuty).toBe(1);
    });
  });

  describe('休暇・休日関連申請', () => {
    test('有休（全休）をカウントする', () => {
      const records: AttendanceRecord[] = [
        createTestRecord({ applicationContent: '有休' }),
        createTestRecord({ applicationContent: '有給' }),
        createTestRecord({ applicationContent: '年休' }),
      ];

      const result = AttendanceService.countApplications(records);
      expect(result.annualLeave).toBe(3);
    });

    test('午前有休をカウントする', () => {
      const records: AttendanceRecord[] = [
        createTestRecord({ applicationContent: '午前有休' }),
        createTestRecord({ applicationContent: '午前有休,900-1730/1200-1300/7.75/5' }),
        createTestRecord({ applicationContent: '午前休' }),
      ];

      const result = AttendanceService.countApplications(records);
      expect(result.amLeave).toBe(3);
    });

    test('午後有休をカウントする', () => {
      const records: AttendanceRecord[] = [
        createTestRecord({ applicationContent: '午後有休' }),
        createTestRecord({ applicationContent: '午後有休,900-1730/1200-1300/7.75/5' }),
        createTestRecord({ applicationContent: '午後休' }),
      ];

      const result = AttendanceService.countApplications(records);
      expect(result.pmLeave).toBe(3);
    });

    test('時間有休をカウントする', () => {
      const records: AttendanceRecord[] = [
        createTestRecord({ applicationContent: '有休時間' }),
        createTestRecord({ applicationContent: '時間有休' }),
      ];

      const result = AttendanceService.countApplications(records);
      expect(result.hourlyLeave).toBe(2);
    });

    test('有休（全休）は午前/午後/時間有休を除外してカウントする', () => {
      const records: AttendanceRecord[] = [
        createTestRecord({ applicationContent: '有休' }),         // 全休
        createTestRecord({ applicationContent: '午前有休' }),     // 午前休
        createTestRecord({ applicationContent: '午後有休' }),     // 午後休
        createTestRecord({ applicationContent: '有休時間' }),     // 時間有休
      ];

      const result = AttendanceService.countApplications(records);
      expect(result.annualLeave).toBe(1);  // 全休は1件のみ
      expect(result.amLeave).toBe(1);
      expect(result.pmLeave).toBe(1);
      expect(result.hourlyLeave).toBe(1);
    });

    test('休出（休日出勤）申請をカウントする', () => {
      const records: AttendanceRecord[] = [
        createTestRecord({ applicationContent: '休出' }),
        createTestRecord({ applicationContent: '休日出勤' }),
      ];

      const result = AttendanceService.countApplications(records);
      expect(result.holidayWork).toBe(2);
    });

    test('振替出勤申請をカウントする', () => {
      const records: AttendanceRecord[] = [
        createTestRecord({ applicationContent: '振替出勤' }),
        createTestRecord({ applicationContent: '振出' }),
      ];

      const result = AttendanceService.countApplications(records);
      expect(result.substituteWork).toBe(2);
    });

    test('振替休日申請をカウントする', () => {
      const records: AttendanceRecord[] = [
        createTestRecord({ applicationContent: '振替休日' }),
        createTestRecord({ applicationContent: '振休' }),
      ];

      const result = AttendanceService.countApplications(records);
      expect(result.substituteHoliday).toBe(2);
    });

    test('代休申請をカウントする', () => {
      const records: AttendanceRecord[] = [
        createTestRecord({ applicationContent: '代休' }),
      ];

      const result = AttendanceService.countApplications(records);
      expect(result.compensatoryLeave).toBe(1);
    });

    test('欠勤申請をカウントする', () => {
      const records: AttendanceRecord[] = [
        createTestRecord({ applicationContent: '欠勤' }),
        createTestRecord({ applicationContent: '欠勤' }),
      ];

      const result = AttendanceService.countApplications(records);
      expect(result.absence).toBe(2);
    });

    test('特休申請をカウントする', () => {
      const records: AttendanceRecord[] = [
        createTestRecord({ applicationContent: '特休' }),
        createTestRecord({ applicationContent: '特別休暇' }),
      ];

      const result = AttendanceService.countApplications(records);
      expect(result.specialLeave).toBe(2);
    });

    test('生理休暇申請をカウントする', () => {
      const records: AttendanceRecord[] = [
        createTestRecord({ applicationContent: '生理休暇' }),
      ];

      const result = AttendanceService.countApplications(records);
      expect(result.menstrualLeave).toBe(1);
    });

    test('子の看護休暇申請をカウントする', () => {
      const records: AttendanceRecord[] = [
        createTestRecord({ applicationContent: '看護休暇' }),
        createTestRecord({ applicationContent: '子の看護' }),
      ];

      const result = AttendanceService.countApplications(records);
      expect(result.childCareLeave).toBe(2);
    });

    test('時間子の看護休暇申請をカウントする', () => {
      const records: AttendanceRecord[] = [
        createTestRecord({ applicationContent: '看護休暇時間' }),
        createTestRecord({ applicationContent: '時間看護休暇' }),
      ];

      const result = AttendanceService.countApplications(records);
      expect(result.hourlyChildCareLeave).toBe(2);
    });

    test('介護休暇申請をカウントする', () => {
      const records: AttendanceRecord[] = [
        createTestRecord({ applicationContent: '介護休暇' }),
      ];

      const result = AttendanceService.countApplications(records);
      expect(result.nursingCareLeave).toBe(1);
    });

    test('時間介護休暇申請をカウントする', () => {
      const records: AttendanceRecord[] = [
        createTestRecord({ applicationContent: '介護休暇時間' }),
        createTestRecord({ applicationContent: '時間介護休暇' }),
      ];

      const result = AttendanceService.countApplications(records);
      expect(result.hourlyNursingCareLeave).toBe(2);
    });

    test('明け休申請をカウントする', () => {
      const records: AttendanceRecord[] = [
        createTestRecord({ applicationContent: '明け休' }),
      ];

      const result = AttendanceService.countApplications(records);
      expect(result.postNightLeave).toBe(1);
    });
  });

  describe('その他の申請', () => {
    test('マニュアル一覧にない申請は「その他」としてカウントする', () => {
      const records: AttendanceRecord[] = [
        createTestRecord({ applicationContent: '直行' }),
        createTestRecord({ applicationContent: '直帰' }),
        createTestRecord({ applicationContent: '打刻修正' }),
        createTestRecord({ applicationContent: '慶弔休暇' }),
      ];

      const result = AttendanceService.countApplications(records);
      expect(result.other).toBe(4);
    });

    test('スケジュール情報のみの場合はカウントしない', () => {
      const records: AttendanceRecord[] = [
        createTestRecord({ applicationContent: '900-1730/1200-1300/7.75/5' }),
        createTestRecord({ applicationContent: '830-1700/1200-1300/7.75/5' }),
        createTestRecord({ applicationContent: '' }),
      ];

      const result = AttendanceService.countApplications(records);
      expect(result.other).toBe(0);
    });

    test('空の配列に対しては全て0を返す', () => {
      const result = AttendanceService.countApplications([]);
      expect(result.overtime).toBe(0);
      expect(result.earlyStart).toBe(0);
      expect(result.annualLeave).toBe(0);
      expect(result.absence).toBe(0);
      expect(result.other).toBe(0);
    });
  });

  describe('実データパターン', () => {
    test('1月度の実データパターンを正しくカウントする', () => {
      const records: AttendanceRecord[] = [
        createTestRecord({ applicationContent: '残業終了,900-1730/1200-1300/7.75/5' }),
        createTestRecord({ applicationContent: '午後有休,900-1730/1200-1300/7.75/5' }),
        createTestRecord({ applicationContent: '有休' }),
        createTestRecord({ applicationContent: '有休' }),
        createTestRecord({ applicationContent: '有休' }),
        createTestRecord({ applicationContent: '電車遅延' }),
        createTestRecord({ applicationContent: '有休時間' }),
        createTestRecord({ applicationContent: '欠勤' }),
        createTestRecord({ applicationContent: '生理休暇' }),
        createTestRecord({ applicationContent: '早出開始' }),
        createTestRecord({ applicationContent: '午前有休' }),
        createTestRecord({ applicationContent: '900-1730/1200-1300/7.75/5' }),  // スケジュールのみ
      ];

      const result = AttendanceService.countApplications(records);
      expect(result.overtime).toBe(1);
      expect(result.earlyStart).toBe(1);
      expect(result.trainDelay).toBe(1);
      expect(result.annualLeave).toBe(3);
      expect(result.amLeave).toBe(1);
      expect(result.pmLeave).toBe(1);
      expect(result.hourlyLeave).toBe(1);
      expect(result.absence).toBe(1);
      expect(result.menstrualLeave).toBe(1);
      expect(result.other).toBe(0);
    });
  });

  describe('calculateTotalWorkMinutes - 総就業時間の計算', () => {
    test('実働時間から総就業時間を計算する', () => {
      const records: AttendanceRecord[] = [
        createTestRecord({ actualWorkHours: '8:00' }),
        createTestRecord({ actualWorkHours: '9:30' }),
        createTestRecord({ actualWorkHours: '7:45' }),
      ];

      const result = AttendanceService.calculateTotalWorkMinutes(records);
      // 8:00 = 480分, 9:30 = 570分, 7:45 = 465分 → 合計1515分
      expect(result).toBe(1515);
    });

    test('実働時間が空の場合は0として扱う', () => {
      const records: AttendanceRecord[] = [
        createTestRecord({ actualWorkHours: '8:00' }),
        createTestRecord({ actualWorkHours: '' }),
        createTestRecord({ actualWorkHours: '8:00' }),
      ];

      const result = AttendanceService.calculateTotalWorkMinutes(records);
      expect(result).toBe(960);
    });

    test('空の配列に対しては0を返す', () => {
      const result = AttendanceService.calculateTotalWorkMinutes([]);
      expect(result).toBe(0);
    });
  });

  describe('EmployeeMonthlySummary に申請カウントが含まれる', () => {
    test('analyzeExtended の結果に applicationCounts が含まれる', () => {
      const records: AttendanceRecord[] = [
        createTestRecord({
          date: new Date('2026-01-15'),
          applicationContent: '電車遅延',
          actualWorkHours: '8:00',
        }),
        createTestRecord({
          date: new Date('2026-01-16'),
          applicationContent: '有休',
          actualWorkHours: '0:00',
        }),
      ];

      const result = AttendanceService.analyzeExtended(records);
      const summary = result.employeeSummaries[0];

      expect(summary.applicationCounts).toBeDefined();
      expect(summary.applicationCounts.trainDelay).toBe(1);
      expect(summary.applicationCounts.annualLeave).toBe(1);
    });

    test('analyzeExtended の結果に totalWorkMinutes が含まれる', () => {
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
      expect(summary.totalWorkMinutes).toBe(1020);
    });
  });
});

describe('出勤率計算', () => {
  test('欠勤がない場合は出勤率100%', () => {
    const totalWeekdays = 20;
    const absenceDays = 0;
    const attendanceRate = Math.round(((totalWeekdays - absenceDays) / totalWeekdays) * 100);
    expect(attendanceRate).toBe(100);
  });

  test('有休を取得しても出勤率100%', () => {
    // 有休は欠勤ではないので出勤率に影響しない
    const totalWeekdays = 20;
    const absenceDays = 0;  // 有休は欠勤にカウントしない
    const attendanceRate = Math.round(((totalWeekdays - absenceDays) / totalWeekdays) * 100);
    expect(attendanceRate).toBe(100);
  });

  test('欠勤があると出勤率が下がる', () => {
    const totalWeekdays = 20;
    const absenceDays = 2;
    const attendanceRate = Math.round(((totalWeekdays - absenceDays) / totalWeekdays) * 100);
    expect(attendanceRate).toBe(90);  // (20-2)/20 = 90%
  });
});
