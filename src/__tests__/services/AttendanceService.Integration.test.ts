/**
 * AttendanceService - 統合テスト
 * 様々な違反シナリオを網羅的にテスト
 *
 * 勤務条件:
 * - 出社: 9:00
 * - 退社: 17:30
 * - 休憩: 12:00-13:00（1時間）
 */

import { AttendanceService } from '../../services/AttendanceService';
import { AttendanceRecord, ViolationType, VIOLATION_DISPLAY_INFO } from '../../models/AttendanceTypes';

// テスト用のベースレコード作成ヘルパー
const createTestRecord = (
  employeeId: string,
  employeeName: string,
  overrides: Partial<AttendanceRecord> = {}
): AttendanceRecord => ({
  employeeId,
  employeeName,
  department: 'テスト部門',
  position: '一般',
  date: new Date('2026-01-06'),
  dayOfWeek: '火',
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

describe('AttendanceService - 統合テスト（様々な違反シナリオ）', () => {

  // ============================================
  // 1. 正常ケース（違反なし）
  // ============================================
  describe('正常ケース', () => {
    it('001_正常出勤: 9:00-17:30 休憩1時間 - 違反なし', () => {
      const record = createTestRecord('D001', '正常 太郎', {
        clockIn: new Date('2026-01-06T09:00:00'),
        clockOut: new Date('2026-01-06T17:30:00'),
        breakTimeMinutes: 60,
        actualWorkHours: '7:30',
        lateMinutes: '',
        earlyLeaveMinutes: '',
      });

      const analysis = AttendanceService.analyzeDailyRecord(record);

      expect(analysis.violations).toHaveLength(0);
      expect(analysis.lateMinutes).toBe(0);
      expect(analysis.earlyLeaveMinutes).toBe(0);
    });

    it('002_時差出勤（事前申請）: 10:00-18:30 - 違反なし', () => {
      const record = createTestRecord('D002', '時差 花子', {
        clockIn: new Date('2026-01-06T10:00:00'),
        clockOut: new Date('2026-01-06T18:30:00'),
        applicationContent: '時差出勤申請',
        lateMinutes: '',
        earlyLeaveMinutes: '',
      });

      const analysis = AttendanceService.analyzeDailyRecord(record);

      expect(analysis.violations).not.toContain('late_application_missing');
    });

    it('003_半休（午前）+ 13:00出社: - 違反なし', () => {
      const record = createTestRecord('D003', '半休 一郎', {
        clockIn: new Date('2026-01-06T13:00:00'),
        clockOut: new Date('2026-01-06T17:30:00'),
        applicationContent: '午前半休',
        lateMinutes: '4:00',  // システム上は遅刻として記録されるが、半休申請で除外
      });

      const analysis = AttendanceService.analyzeDailyRecord(record);

      expect(analysis.violations).not.toContain('late_application_missing');
    });
  });

  // ============================================
  // 2. 遅刻関連
  // ============================================
  describe('遅刻関連の違反検出', () => {
    it('101_遅刻（申請なし）: 9:30出社 - 届出漏れ検出', () => {
      const record = createTestRecord('D101', '遅刻 無申請', {
        clockIn: new Date('2026-01-06T09:30:00'),
        clockOut: new Date('2026-01-06T17:30:00'),
        lateMinutes: '0:30',
        applicationContent: '',
      });

      const analysis = AttendanceService.analyzeDailyRecord(record);

      expect(analysis.violations).toContain('late_application_missing');
      expect(analysis.lateMinutes).toBe(30);
    });

    it('102_遅刻（遅刻申請あり）: 9:30出社 - 違反なし', () => {
      const record = createTestRecord('D102', '遅刻 申請済', {
        clockIn: new Date('2026-01-06T09:30:00'),
        clockOut: new Date('2026-01-06T17:30:00'),
        lateMinutes: '0:30',
        applicationContent: '遅刻申請',
      });

      const analysis = AttendanceService.analyzeDailyRecord(record);

      expect(analysis.violations).not.toContain('late_application_missing');
    });

    it('103_電車遅延（申請あり）: 9:20出社 - 違反なし', () => {
      const record = createTestRecord('D103', '電車 遅延', {
        clockIn: new Date('2026-01-06T09:20:00'),
        clockOut: new Date('2026-01-06T17:30:00'),
        lateMinutes: '0:20',
        applicationContent: '電車遅延申請',
      });

      const analysis = AttendanceService.analyzeDailyRecord(record);

      expect(analysis.violations).not.toContain('late_application_missing');
    });

    it('104_大幅遅刻（3時間・申請なし）: 12:00出社 - 届出漏れ検出', () => {
      const record = createTestRecord('D104', '大遅刻 太郎', {
        clockIn: new Date('2026-01-06T12:00:00'),
        clockOut: new Date('2026-01-06T17:30:00'),
        lateMinutes: '3:00',
        applicationContent: '',
      });

      const analysis = AttendanceService.analyzeDailyRecord(record);

      expect(analysis.violations).toContain('late_application_missing');
      expect(analysis.lateMinutes).toBe(180);
    });

    it('105_大幅遅刻（3時間・午前半休）: 12:00出社 - 違反なし', () => {
      const record = createTestRecord('D105', '半休 利用', {
        clockIn: new Date('2026-01-06T12:00:00'),
        clockOut: new Date('2026-01-06T17:30:00'),
        lateMinutes: '3:00',
        applicationContent: '午前半休',
      });

      const analysis = AttendanceService.analyzeDailyRecord(record);

      expect(analysis.violations).not.toContain('late_application_missing');
    });
  });

  // ============================================
  // 3. 早退関連
  // ============================================
  describe('早退関連の違反検出', () => {
    it('201_早退（申請なし）: 16:30退社 - 届出漏れ検出', () => {
      const record = createTestRecord('D201', '早退 無申請', {
        clockIn: new Date('2026-01-06T09:00:00'),
        clockOut: new Date('2026-01-06T16:30:00'),
        earlyLeaveMinutes: '1:00',
        applicationContent: '',
      });

      const analysis = AttendanceService.analyzeDailyRecord(record);

      expect(analysis.violations).toContain('early_leave_application_missing');
      expect(analysis.earlyLeaveMinutes).toBe(60);
    });

    it('202_早退（早退申請あり）: 16:30退社 - 違反なし', () => {
      const record = createTestRecord('D202', '早退 申請済', {
        clockIn: new Date('2026-01-06T09:00:00'),
        clockOut: new Date('2026-01-06T16:30:00'),
        earlyLeaveMinutes: '1:00',
        applicationContent: '早退申請',
      });

      const analysis = AttendanceService.analyzeDailyRecord(record);

      expect(analysis.violations).not.toContain('early_leave_application_missing');
    });

    it('203_早退（午後半休）: 13:00退社 - 違反なし', () => {
      const record = createTestRecord('D203', '午後 半休', {
        clockIn: new Date('2026-01-06T09:00:00'),
        clockOut: new Date('2026-01-06T13:00:00'),
        earlyLeaveMinutes: '4:30',
        applicationContent: '午後半休',
      });

      const analysis = AttendanceService.analyzeDailyRecord(record);

      expect(analysis.violations).not.toContain('early_leave_application_missing');
    });

    it('204_早退（遅刻・早退申請）: 15:00退社 - 違反なし', () => {
      const record = createTestRecord('D204', '遅早 申請', {
        clockIn: new Date('2026-01-06T09:00:00'),
        clockOut: new Date('2026-01-06T15:00:00'),
        earlyLeaveMinutes: '2:30',
        applicationContent: '遅刻・早退申請',
      });

      const analysis = AttendanceService.analyzeDailyRecord(record);

      expect(analysis.violations).not.toContain('early_leave_application_missing');
    });
  });

  // ============================================
  // 4. 早出関連
  // ============================================
  describe('早出関連の違反検出', () => {
    it('301_早出（フラグなし・申請なし）: 8:00出社 - 届出漏れ検出', () => {
      const record = createTestRecord('D301', '早出 無申請', {
        clockIn: new Date('2026-01-06T08:00:00'),
        clockOut: new Date('2026-01-06T17:30:00'),
        earlyStartFlag: false,
        applicationContent: '',
      });

      const analysis = AttendanceService.analyzeDailyRecord(record);

      expect(analysis.violations).toContain('early_start_application_missing');
      expect(analysis.hasEarlyStartViolation).toBe(true);
    });

    it('302_早出（フラグあり）: 8:00出社 - 違反なし', () => {
      const record = createTestRecord('D302', '早出 フラグ', {
        clockIn: new Date('2026-01-06T08:00:00'),
        clockOut: new Date('2026-01-06T17:30:00'),
        earlyStartFlag: true,
        applicationContent: '',
      });

      const analysis = AttendanceService.analyzeDailyRecord(record);

      expect(analysis.violations).not.toContain('early_start_application_missing');
    });

    it('303_早出（早出申請あり）: 7:30出社 - 違反なし', () => {
      const record = createTestRecord('D303', '早出 申請済', {
        clockIn: new Date('2026-01-06T07:30:00'),
        clockOut: new Date('2026-01-06T17:30:00'),
        earlyStartFlag: false,
        applicationContent: '早出申請',
      });

      const analysis = AttendanceService.analyzeDailyRecord(record);

      expect(analysis.violations).not.toContain('early_start_application_missing');
    });

    it('304_ギリギリ早出（8:59出社・フラグなし）: - 届出漏れ検出', () => {
      const record = createTestRecord('D304', 'ギリギリ 早出', {
        clockIn: new Date('2026-01-06T08:59:00'),
        clockOut: new Date('2026-01-06T17:30:00'),
        earlyStartFlag: false,
        applicationContent: '',
      });

      const analysis = AttendanceService.analyzeDailyRecord(record);

      expect(analysis.violations).toContain('early_start_application_missing');
    });

    it('305_9時ちょうど出社: - 違反なし', () => {
      const record = createTestRecord('D305', '定時 出社', {
        clockIn: new Date('2026-01-06T09:00:00'),
        clockOut: new Date('2026-01-06T17:30:00'),
        earlyStartFlag: false,
        applicationContent: '',
      });

      const analysis = AttendanceService.analyzeDailyRecord(record);

      expect(analysis.violations).not.toContain('early_start_application_missing');
    });
  });

  // ============================================
  // 5. 時間有休打刻関連
  // ============================================
  describe('時間有休打刻関連の違反検出', () => {
    it('401_時間有休（打刻なし）: - 打刻漏れ検出', () => {
      const record = createTestRecord('D401', '時間有休 打刻漏れ', {
        applicationContent: '時間有休申請',
        privateOutTime: null,
        privateReturnTime: null,
      });

      const analysis = AttendanceService.analyzeDailyRecord(record);

      expect(analysis.violations).toContain('time_leave_punch_missing');
    });

    it('402_時間有休（打刻あり）: - 違反なし', () => {
      const record = createTestRecord('D402', '時間有休 打刻済', {
        applicationContent: '時間有休申請',
        privateOutTime: new Date('2026-01-06T14:00:00'),
        privateReturnTime: new Date('2026-01-06T15:00:00'),
      });

      const analysis = AttendanceService.analyzeDailyRecord(record);

      expect(analysis.violations).not.toContain('time_leave_punch_missing');
    });

    it('403_時間有休（外出のみ）: - 打刻漏れ検出', () => {
      const record = createTestRecord('D403', '時間有休 片方漏れ', {
        applicationContent: '時間有休申請',
        privateOutTime: new Date('2026-01-06T14:00:00'),
        privateReturnTime: null,
      });

      const analysis = AttendanceService.analyzeDailyRecord(record);

      expect(analysis.violations).toContain('time_leave_punch_missing');
    });

    it('404_時間有休（戻りのみ）: - 打刻漏れ検出', () => {
      const record = createTestRecord('D404', '時間有休 片方漏れ2', {
        applicationContent: '時間有休申請',
        privateOutTime: null,
        privateReturnTime: new Date('2026-01-06T15:00:00'),
      });

      const analysis = AttendanceService.analyzeDailyRecord(record);

      expect(analysis.violations).toContain('time_leave_punch_missing');
    });

    it('405_時間有休申請なし（打刻なしでもOK）: - 違反なし', () => {
      const record = createTestRecord('D405', '通常 勤務', {
        applicationContent: '',
        privateOutTime: null,
        privateReturnTime: null,
      });

      const analysis = AttendanceService.analyzeDailyRecord(record);

      expect(analysis.violations).not.toContain('time_leave_punch_missing');
    });
  });

  // ============================================
  // 6. 深夜休憩関連
  // ============================================
  describe('深夜休憩関連の違反検出', () => {
    /**
     * 深夜休憩違反の検出条件:
     * 1. 深夜労働時間が30分以上ある
     * 2. 基本的な休憩時間が不足している（労基法：6時間超→45分、8時間超→60分）
     * 3. 深夜休憩修正が入力されていない
     * 4. 休憩時間修正申請がない
     */
    it('501_深夜労働（休憩修正なし、休憩不足）: - 届出漏れ検出', () => {
      const record = createTestRecord('D501', '深夜 休憩漏れ', {
        clockIn: new Date('2026-01-06T09:00:00'),
        clockOut: new Date('2026-01-06T23:00:00'),
        nightWorkMinutes: '1:00',           // 1時間の深夜労働（>= 30分）
        nightBreakModification: '',
        applicationContent: '',
        actualWorkHours: '13:00',           // 13時間勤務（8時間超で60分休憩必要）
        breakTimeMinutes: 45,               // 45分の休憩（60分に対して不足）
      });

      const analysis = AttendanceService.analyzeDailyRecord(record);

      expect(analysis.violations).toContain('night_break_application_missing');
    });

    it('501b_深夜労働（休憩修正なし、休憩十分）: - 違反なし', () => {
      const record = createTestRecord('D501b', '深夜 休憩足りる', {
        clockIn: new Date('2026-01-06T09:00:00'),
        clockOut: new Date('2026-01-06T23:00:00'),
        nightWorkMinutes: '1:00',           // 1時間の深夜労働
        nightBreakModification: '',
        applicationContent: '',
        actualWorkHours: '13:00',           // 13時間勤務
        breakTimeMinutes: 60,               // 60分の休憩（十分）
      });

      const analysis = AttendanceService.analyzeDailyRecord(record);

      expect(analysis.violations).not.toContain('night_break_application_missing');
    });

    it('501c_深夜労働（30分未満、休憩不足）: - 違反なし（軽微な超過）', () => {
      // ユーザーケース: 22:15退勤など深夜帯勤務が短時間
      const record = createTestRecord('D501c', '深夜 軽微超過', {
        clockIn: new Date('2026-01-06T09:00:00'),
        clockOut: new Date('2026-01-06T22:15:00'),
        nightWorkMinutes: '0:15',           // 15分の深夜労働（< 30分）
        nightBreakModification: '',
        applicationContent: '',
        actualWorkHours: '12:00',           // 12時間勤務
        breakTimeMinutes: 75,               // 休憩は十分
      });

      const analysis = AttendanceService.analyzeDailyRecord(record);

      expect(analysis.violations).not.toContain('night_break_application_missing');
    });

    it('502_深夜労働（休憩修正あり）: - 違反なし', () => {
      const record = createTestRecord('D502', '深夜 休憩申請', {
        clockIn: new Date('2026-01-06T09:00:00'),
        clockOut: new Date('2026-01-06T23:00:00'),
        nightWorkMinutes: '1:00',
        nightBreakModification: '0:15',
        applicationContent: '',
        actualWorkHours: '13:00',
        breakTimeMinutes: 45,               // 休憩不足だが修正あり
      });

      const analysis = AttendanceService.analyzeDailyRecord(record);

      expect(analysis.violations).not.toContain('night_break_application_missing');
    });

    it('503_深夜労働（休憩時間修正申請あり）: - 違反なし', () => {
      const record = createTestRecord('D503', '深夜 修正申請', {
        clockIn: new Date('2026-01-06T09:00:00'),
        clockOut: new Date('2026-01-06T23:00:00'),
        nightWorkMinutes: '1:00',
        nightBreakModification: '',
        applicationContent: '休憩時間修正申請',
        actualWorkHours: '13:00',
        breakTimeMinutes: 45,               // 休憩不足だが申請あり
      });

      const analysis = AttendanceService.analyzeDailyRecord(record);

      expect(analysis.violations).not.toContain('night_break_application_missing');
    });

    it('504_深夜労働なし: - 違反なし', () => {
      const record = createTestRecord('D504', '日中 勤務', {
        clockIn: new Date('2026-01-06T09:00:00'),
        clockOut: new Date('2026-01-06T21:00:00'),
        nightWorkMinutes: '',
        nightBreakModification: '',
        applicationContent: '',
      });

      const analysis = AttendanceService.analyzeDailyRecord(record);

      expect(analysis.violations).not.toContain('night_break_application_missing');
    });
  });

  // ============================================
  // 7. 複合ケース
  // ============================================
  describe('複合ケース（複数違反）', () => {
    it('601_遅刻＋早退（両方申請なし）: - 両方検出', () => {
      const record = createTestRecord('D601', '遅刻早退 両方', {
        clockIn: new Date('2026-01-06T09:30:00'),
        clockOut: new Date('2026-01-06T16:30:00'),
        lateMinutes: '0:30',
        earlyLeaveMinutes: '1:00',
        applicationContent: '',
      });

      const analysis = AttendanceService.analyzeDailyRecord(record);

      expect(analysis.violations).toContain('late_application_missing');
      expect(analysis.violations).toContain('early_leave_application_missing');
    });

    it('602_早出＋深夜（両方申請なし、休憩不足）: - 両方検出', () => {
      const record = createTestRecord('D602', '早出深夜 両方', {
        clockIn: new Date('2026-01-06T07:00:00'),
        clockOut: new Date('2026-01-06T23:00:00'),
        earlyStartFlag: false,
        nightWorkMinutes: '1:00',           // 1時間の深夜労働（>= 30分）
        nightBreakModification: '',
        applicationContent: '',
        actualWorkHours: '15:00',           // 15時間勤務（8時間超で60分休憩必要）
        breakTimeMinutes: 45,               // 45分の休憩（60分に対して不足）
      });

      const analysis = AttendanceService.analyzeDailyRecord(record);

      expect(analysis.violations).toContain('early_start_application_missing');
      expect(analysis.violations).toContain('night_break_application_missing');
    });

    it('603_時間有休＋遅刻（時間有休申請のみ）: - 両方検出', () => {
      const record = createTestRecord('D603', '時間有休遅刻', {
        clockIn: new Date('2026-01-06T10:00:00'),
        clockOut: new Date('2026-01-06T17:30:00'),
        lateMinutes: '1:00',
        applicationContent: '時間有休申請',
        privateOutTime: null,
        privateReturnTime: null,
      });

      const analysis = AttendanceService.analyzeDailyRecord(record);

      // 時間有休申請では遅刻は除外されない
      expect(analysis.violations).toContain('late_application_missing');
      expect(analysis.violations).toContain('time_leave_punch_missing');
    });
  });

  // ============================================
  // 8. エッジケース
  // ============================================
  describe('エッジケース', () => {
    it('701_遅刻0分: - 違反なし', () => {
      const record = createTestRecord('D701', '遅刻 ゼロ', {
        lateMinutes: '0:00',
        applicationContent: '',
      });

      const analysis = AttendanceService.analyzeDailyRecord(record);

      expect(analysis.violations).not.toContain('late_application_missing');
    });

    it('702_早退0分: - 違反なし', () => {
      const record = createTestRecord('D702', '早退 ゼロ', {
        earlyLeaveMinutes: '0:00',
        applicationContent: '',
      });

      const analysis = AttendanceService.analyzeDailyRecord(record);

      expect(analysis.violations).not.toContain('early_leave_application_missing');
    });

    it('703_深夜労働0分: - 違反なし', () => {
      const record = createTestRecord('D703', '深夜 ゼロ', {
        nightWorkMinutes: '0:00',
        nightBreakModification: '',
        applicationContent: '',
      });

      const analysis = AttendanceService.analyzeDailyRecord(record);

      expect(analysis.violations).not.toContain('night_break_application_missing');
    });

    it('704_空文字の遅刻時間: - 違反なし', () => {
      const record = createTestRecord('D704', '遅刻 空', {
        lateMinutes: '',
        applicationContent: '',
      });

      const analysis = AttendanceService.analyzeDailyRecord(record);

      expect(analysis.violations).not.toContain('late_application_missing');
    });
  });

  // ============================================
  // 9. 申請キーワードのバリエーション
  // ============================================
  describe('申請キーワードのバリエーション', () => {
    it('801_「遅刻・早退申請」で遅刻除外: ', () => {
      const record = createTestRecord('D801', '遅刻早退 申請', {
        lateMinutes: '0:30',
        applicationContent: '遅刻・早退申請',
      });

      const analysis = AttendanceService.analyzeDailyRecord(record);

      expect(analysis.violations).not.toContain('late_application_missing');
    });

    /**
     * 「時差出勤申請」で遅刻除外
     * 【偽陰性対策】「時差出勤」だけでなく「時差出勤申請」を使用
     */
    it('802_「時差出勤申請」で遅刻除外: ', () => {
      const record = createTestRecord('D802', '時差 出勤', {
        lateMinutes: '1:00',
        applicationContent: '時差出勤申請', // 厳密なキーワード
      });

      const analysis = AttendanceService.analyzeDailyRecord(record);

      expect(analysis.violations).not.toContain('late_application_missing');
    });

    /**
     * 「午前半休」で遅刻除外
     * 【偽陰性対策】「半休」だけでなく「午前半休」等の正式名称を使用
     */
    it('803_「午前半休」で遅刻除外: ', () => {
      const record = createTestRecord('D803', '半休 遅刻', {
        lateMinutes: '3:00',
        applicationContent: '午前半休', // 厳密なキーワード
      });

      const analysis = AttendanceService.analyzeDailyRecord(record);

      expect(analysis.violations).not.toContain('late_application_missing');
    });

    /**
     * 「早出申請」で早出除外
     * 【偽陰性対策】「早出」だけでなく「早出申請」を使用
     */
    it('804_「早出申請」で早出除外: ', () => {
      const record = createTestRecord('D804', '早出 申請', {
        clockIn: new Date('2026-01-06T08:00:00'),
        earlyStartFlag: false,
        applicationContent: '早出申請', // 厳密なキーワード
      });

      const analysis = AttendanceService.analyzeDailyRecord(record);

      expect(analysis.violations).not.toContain('early_start_application_missing');
    });
  });

  // ============================================
  // 10. VIOLATION_DISPLAY_INFO の確認
  // ============================================
  describe('VIOLATION_DISPLAY_INFO の検証', () => {
    it('全ての違反タイプに表示情報が定義されている', () => {
      const violationTypes: ViolationType[] = [
        'missing_clock',
        'break_violation',
        'late_application_missing',
        'early_leave_application_missing',
        'early_start_application_missing',
        'time_leave_punch_missing',
        'night_break_application_missing',
      ];

      violationTypes.forEach(type => {
        expect(VIOLATION_DISPLAY_INFO[type]).toBeDefined();
        expect(VIOLATION_DISPLAY_INFO[type].displayName).toBeTruthy();
        expect(VIOLATION_DISPLAY_INFO[type].possibleApplications.length).toBeGreaterThan(0);
        expect(VIOLATION_DISPLAY_INFO[type].notes).toBeTruthy();
      });
    });
  });
});
