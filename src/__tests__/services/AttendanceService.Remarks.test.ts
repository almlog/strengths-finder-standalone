// 備考欄チェック機能のテスト（TDD: RED phase）
// マニュアル準拠: セクション4「申請理由（備考）入力ガイドライン」

import { AttendanceService } from '../../services/AttendanceService';
import { AttendanceRecord } from '../../models/AttendanceTypes';

/**
 * テスト用の基本レコードを作成
 */
const createTestRecord = (
  applicationContent: string,
  remarks: string,
  overrides: Partial<AttendanceRecord> = {}
): AttendanceRecord => ({
  employeeId: 'REM001',
  employeeName: '備考テスト',
  department: '開発部',
  position: '一般',
  date: new Date('2025-12-01'),
  dayOfWeek: '月',
  calendarType: 'weekday',
  calendarRaw: '平日',
  applicationContent,
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
  actualWorkHours: '8:00',
  overtimeHours: '',
  lateMinutes: '',
  earlyLeaveMinutes: '',
  remarks,
  sheetName: 'テストシート',
  ...overrides,
});

describe('AttendanceService - 備考欄チェック機能', () => {
  /**
   * 1. 備考欄が必要な申請（空チェック）
   */
  describe('備考欄必須チェック（申請内容に対して）', () => {
    /**
     * 直行の場合: 訪問先・業務目的が必要
     */
    it('直行申請で備考欄が空の場合は違反', () => {
      const record = createTestRecord('直行', '');
      const result = AttendanceService.checkRemarksRequired(record);
      expect(result.isRequired).toBe(true);
      expect(result.isMissing).toBe(true);
      expect(result.requiredReason).toContain('直行');
    });

    it('直行申請で備考欄に訪問先がある場合はOK', () => {
      const record = createTestRecord('直行', 'K社ビル（水道橋）面談のため');
      const result = AttendanceService.checkRemarksRequired(record);
      expect(result.isRequired).toBe(true);
      expect(result.isMissing).toBe(false);
    });

    /**
     * 直帰の場合: 訪問先・業務目的が必要
     */
    it('直帰申請で備考欄が空の場合は違反', () => {
      const record = createTestRecord('直帰', '');
      const result = AttendanceService.checkRemarksRequired(record);
      expect(result.isRequired).toBe(true);
      expect(result.isMissing).toBe(true);
    });

    /**
     * 電車遅延の場合: 路線名・遅延時間が必要
     */
    it('電車遅延申請で備考欄が空の場合は違反', () => {
      const record = createTestRecord('電車遅延', '');
      const result = AttendanceService.checkRemarksRequired(record);
      expect(result.isRequired).toBe(true);
      expect(result.isMissing).toBe(true);
      expect(result.requiredReason).toContain('遅延');
    });

    it('電車遅延申請で備考欄に詳細がある場合はOK', () => {
      const record = createTestRecord('電車遅延', 'JR山手線遅延 20分');
      const result = AttendanceService.checkRemarksRequired(record);
      expect(result.isRequired).toBe(true);
      expect(result.isMissing).toBe(false);
    });

    /**
     * 打刻修正の場合: 理由が必要
     */
    it('打刻修正申請で備考欄が空の場合は違反', () => {
      const record = createTestRecord('打刻修正', '');
      const result = AttendanceService.checkRemarksRequired(record);
      expect(result.isRequired).toBe(true);
      expect(result.isMissing).toBe(true);
    });

    it('打刻修正申請で備考欄に理由がある場合はOK', () => {
      const record = createTestRecord('打刻修正', '入館証忘れのため');
      const result = AttendanceService.checkRemarksRequired(record);
      expect(result.isRequired).toBe(true);
      expect(result.isMissing).toBe(false);
    });

    /**
     * 残業申請（AltX含む）の場合: タスク内容が必要
     */
    it('AltX残業申請で備考欄が空の場合は違反', () => {
      const record = createTestRecord('', '', {
        altxOvertimeIn: new Date('2025-12-01T18:00:00'),
        altxOvertimeOut: new Date('2025-12-01T20:00:00'),
      });
      const result = AttendanceService.checkRemarksRequired(record);
      expect(result.isRequired).toBe(true);
      expect(result.isMissing).toBe(true);
    });

    it('AltX残業申請で備考欄にタスク内容がある場合はOK', () => {
      const record = createTestRecord('', '課会参加（録画確認対応）', {
        altxOvertimeIn: new Date('2025-12-01T18:00:00'),
        altxOvertimeOut: new Date('2025-12-01T20:00:00'),
      });
      const result = AttendanceService.checkRemarksRequired(record);
      expect(result.isRequired).toBe(true);
      expect(result.isMissing).toBe(false);
    });

    /**
     * 通常出勤（申請なし）の場合: 備考欄は不要
     */
    it('通常出勤で申請なしの場合は備考欄不要', () => {
      const record = createTestRecord('', '');
      const result = AttendanceService.checkRemarksRequired(record);
      expect(result.isRequired).toBe(false);
      expect(result.isMissing).toBe(false);
    });
  });

  /**
   * 2. 備考欄フォーマットチェック
   */
  describe('備考欄フォーマットチェック', () => {
    /**
     * 推奨フォーマット: 【事由】＋【詳細】
     * 最低限: 5文字以上で具体的な内容
     */
    it('備考欄が短すぎる場合は警告', () => {
      const result = AttendanceService.checkRemarksFormat('修正');
      expect(result.isValid).toBe(false);
      expect(result.warning).toContain('短');
    });

    it('備考欄が5文字以上で具体的なら有効', () => {
      const result = AttendanceService.checkRemarksFormat('入館証忘れのため');
      expect(result.isValid).toBe(true);
    });

    it('備考欄が空の場合はチェック対象外', () => {
      const result = AttendanceService.checkRemarksFormat('');
      expect(result.isValid).toBe(true); // 空はフォーマットチェック対象外
      expect(result.warning).toBeUndefined();
    });

    /**
     * 良い例のテスト（マニュアル準拠）
     */
    it('「JR山手線遅延 20分」は有効なフォーマット', () => {
      const result = AttendanceService.checkRemarksFormat('JR山手線遅延 20分');
      expect(result.isValid).toBe(true);
    });

    it('「K社ビル（水道橋）面談のため」は有効なフォーマット', () => {
      const result = AttendanceService.checkRemarksFormat('K社ビル（水道橋）面談のため');
      expect(result.isValid).toBe(true);
    });

    it('「11:00-14:00 私用（通院）」は有効なフォーマット', () => {
      const result = AttendanceService.checkRemarksFormat('11:00-14:00 私用（通院）');
      expect(result.isValid).toBe(true);
    });

    it('「弔事 祖母 12/8逝去 3日間」は有効なフォーマット', () => {
      const result = AttendanceService.checkRemarksFormat('弔事 祖母 12/8逝去 3日間');
      expect(result.isValid).toBe(true);
    });
  });

  /**
   * 3. 統合テスト：備考欄チェックは楽楽勤怠側で管理されるため無効化（2026-01-30）
   *    analyzeDailyRecordでは備考欄違反を検出しない
   */
  describe('analyzeDailyRecord統合テスト', () => {
    it('直行申請で備考欄が空の場合でも、備考欄チェック無効化により違反検出されない', () => {
      const record = createTestRecord('直行', '');
      const analysis = AttendanceService.analyzeDailyRecord(record);
      expect(analysis.violations).not.toContain('remarks_missing');
    });

    it('備考欄が短すぎる場合でも、備考欄チェック無効化により違反検出されない', () => {
      const record = createTestRecord('直行', '外出');
      const analysis = AttendanceService.analyzeDailyRecord(record);
      expect(analysis.violations).not.toContain('remarks_format_warning');
    });

    it('正しい備考欄がある場合、備考欄関連の違反は検出されない', () => {
      const record = createTestRecord('直行', 'K社ビル（水道橋）面談のため');
      const analysis = AttendanceService.analyzeDailyRecord(record);
      expect(analysis.violations).not.toContain('remarks_missing');
      expect(analysis.violations).not.toContain('remarks_format_warning');
    });
  });
});
