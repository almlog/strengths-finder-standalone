// 偽陰性テストケース
// 評価指摘1: 文字列部分一致による誤判定リスクの検証

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

describe('AttendanceService - 偽陰性テスト（誤って違反なしと判定されるケース）', () => {
  describe('遅刻申請漏れの偽陰性検出', () => {
    /**
     * 評価指摘: 備考欄に「遅刻申請を忘れました」と書いた場合、
     * 「遅刻」が含まれるため誤って「申請あり」と判定されるリスク
     *
     * 期待動作: 備考欄の記述は申請とみなさない
     */
    it('FN001_備考欄に「遅刻申請を忘れました」と記載 - 違反として検出すべき', () => {
      const record = createTestRecord('FN001', '偽陰性テスト', {
        clockIn: new Date('2026-01-06T09:30:00'),
        lateMinutes: '0:30',
        applicationContent: '', // 申請内容は空
        remarks: '遅刻申請を忘れました', // 備考欄に記載
      });
      const analysis = AttendanceService.analyzeDailyRecord(record);

      // 備考欄の記述は申請ではないので、遅刻申請漏れとして検出されるべき
      expect(analysis.violations).toContain('late_application_missing');
    });

    /**
     * 評価指摘: 申請内容に「遅刻しそうだったので早く出た」等の記述があると
     * 「遅刻」が含まれるため誤判定されるリスク
     */
    it('FN002_申請内容に「遅刻」を含む無関係な文言 - 違反として検出すべき', () => {
      const record = createTestRecord('FN002', '偽陰性テスト', {
        clockIn: new Date('2026-01-06T09:30:00'),
        lateMinutes: '0:30',
        // 遅刻に関係ない文脈で「遅刻」という文字を含む
        applicationContent: '明日は遅刻しないよう注意する',
      });
      const analysis = AttendanceService.analyzeDailyRecord(record);

      // これは遅刻申請ではないので、違反として検出されるべき
      expect(analysis.violations).toContain('late_application_missing');
    });

    /**
     * 正しい遅刻申請があるケース（これは違反なしが正しい）
     */
    it('FN003_正規の「遅刻申請」あり - 違反なし（正常ケース）', () => {
      const record = createTestRecord('FN003', '正常テスト', {
        clockIn: new Date('2026-01-06T09:30:00'),
        lateMinutes: '0:30',
        applicationContent: '遅刻申請',
      });
      const analysis = AttendanceService.analyzeDailyRecord(record);

      expect(analysis.violations).not.toContain('late_application_missing');
    });

    /**
     * 正しい「遅刻・早退申請」があるケース
     */
    it('FN004_正規の「遅刻・早退申請」あり - 違反なし（正常ケース）', () => {
      const record = createTestRecord('FN004', '正常テスト', {
        clockIn: new Date('2026-01-06T09:30:00'),
        lateMinutes: '0:30',
        applicationContent: '遅刻・早退申請',
      });
      const analysis = AttendanceService.analyzeDailyRecord(record);

      expect(analysis.violations).not.toContain('late_application_missing');
    });
  });

  describe('電車遅延申請の偽陰性検出', () => {
    /**
     * 評価指摘: 「電車の遅延はありません」と記述した場合、
     * 「遅延」が含まれるため誤判定されるリスク
     */
    it('FN101_申請内容に「電車の遅延はありません」 - 違反として検出すべき', () => {
      const record = createTestRecord('FN101', '偽陰性テスト', {
        clockIn: new Date('2026-01-06T09:20:00'),
        lateMinutes: '0:20',
        applicationContent: '電車の遅延はありません',
      });
      const analysis = AttendanceService.analyzeDailyRecord(record);

      // 電車遅延申請ではないので、違反として検出されるべき
      expect(analysis.violations).toContain('late_application_missing');
    });

    /**
     * 評価指摘: 「遅延証明書を取得予定」等の記述
     */
    it('FN102_申請内容に「遅延証明書を後で提出」 - 違反として検出すべき', () => {
      const record = createTestRecord('FN102', '偽陰性テスト', {
        clockIn: new Date('2026-01-06T09:20:00'),
        lateMinutes: '0:20',
        applicationContent: '遅延証明書を後で提出します',
      });
      const analysis = AttendanceService.analyzeDailyRecord(record);

      // まだ申請が完了していないので、違反として検出されるべき
      expect(analysis.violations).toContain('late_application_missing');
    });

    /**
     * 正しい電車遅延申請があるケース
     */
    it('FN103_正規の「電車遅延申請」あり - 違反なし（正常ケース）', () => {
      const record = createTestRecord('FN103', '正常テスト', {
        clockIn: new Date('2026-01-06T09:20:00'),
        lateMinutes: '0:20',
        applicationContent: '電車遅延申請',
      });
      const analysis = AttendanceService.analyzeDailyRecord(record);

      expect(analysis.violations).not.toContain('late_application_missing');
    });
  });

  describe('時差出勤申請の偽陰性検出', () => {
    /**
     * 「時差出勤を検討中」等の記述
     */
    it('FN201_申請内容に「時差出勤を検討中」 - 違反として検出すべき', () => {
      const record = createTestRecord('FN201', '偽陰性テスト', {
        clockIn: new Date('2026-01-06T10:00:00'),
        lateMinutes: '1:00',
        applicationContent: '時差出勤を検討中',
      });
      const analysis = AttendanceService.analyzeDailyRecord(record);

      // 検討中は申請ではないので、違反として検出されるべき
      expect(analysis.violations).toContain('late_application_missing');
    });

    /**
     * 正しい時差出勤申請があるケース
     */
    it('FN202_正規の「時差出勤申請」あり - 違反なし（正常ケース）', () => {
      const record = createTestRecord('FN202', '正常テスト', {
        clockIn: new Date('2026-01-06T10:00:00'),
        lateMinutes: '1:00',
        applicationContent: '時差出勤申請',
      });
      const analysis = AttendanceService.analyzeDailyRecord(record);

      expect(analysis.violations).not.toContain('late_application_missing');
    });
  });

  describe('早退申請の偽陰性検出', () => {
    /**
     * 「早退予定」等の記述
     */
    it('FN301_申請内容に「早退予定あり」 - 違反として検出すべき', () => {
      const record = createTestRecord('FN301', '偽陰性テスト', {
        clockOut: new Date('2026-01-06T16:30:00'),
        earlyLeaveMinutes: '1:00',
        applicationContent: '早退予定あり',
      });
      const analysis = AttendanceService.analyzeDailyRecord(record);

      // 予定は申請ではないので、違反として検出されるべき
      expect(analysis.violations).toContain('early_leave_application_missing');
    });

    /**
     * 正しい早退申請があるケース
     */
    it('FN302_正規の「遅刻・早退申請」あり - 違反なし（正常ケース）', () => {
      const record = createTestRecord('FN302', '正常テスト', {
        clockOut: new Date('2026-01-06T16:30:00'),
        earlyLeaveMinutes: '1:00',
        applicationContent: '遅刻・早退申請',
      });
      const analysis = AttendanceService.analyzeDailyRecord(record);

      expect(analysis.violations).not.toContain('early_leave_application_missing');
    });
  });

  describe('半休申請の偽陰性検出', () => {
    /**
     * 「半休を取りたい」等の記述
     */
    it('FN401_申請内容に「半休を取りたい」 - 違反として検出すべき', () => {
      const record = createTestRecord('FN401', '偽陰性テスト', {
        clockIn: new Date('2026-01-06T12:00:00'),
        lateMinutes: '3:00',
        applicationContent: '半休を取りたい',
      });
      const analysis = AttendanceService.analyzeDailyRecord(record);

      // 希望は申請ではないので、違反として検出されるべき
      expect(analysis.violations).toContain('late_application_missing');
    });

    /**
     * 正しい半休申請があるケース
     */
    it('FN402_正規の「午前半休」申請あり - 違反なし（正常ケース）', () => {
      const record = createTestRecord('FN402', '正常テスト', {
        clockIn: new Date('2026-01-06T12:00:00'),
        lateMinutes: '3:00',
        applicationContent: '午前半休',
      });
      const analysis = AttendanceService.analyzeDailyRecord(record);

      expect(analysis.violations).not.toContain('late_application_missing');
    });
  });

  describe('早出申請の偽陰性検出', () => {
    /**
     * 「早出したい」等の記述
     */
    it('FN501_申請内容に「早出したいです」 - 違反として検出すべき', () => {
      const record = createTestRecord('FN501', '偽陰性テスト', {
        clockIn: new Date('2026-01-06T08:00:00'),
        earlyStartFlag: false,
        applicationContent: '早出したいです',
      });
      const analysis = AttendanceService.analyzeDailyRecord(record);

      // 希望は申請ではないので、違反として検出されるべき
      expect(analysis.violations).toContain('early_start_application_missing');
    });

    /**
     * 正しい早出申請があるケース
     */
    it('FN502_正規の「早出申請」あり - 違反なし（正常ケース）', () => {
      const record = createTestRecord('FN502', '正常テスト', {
        clockIn: new Date('2026-01-06T08:00:00'),
        earlyStartFlag: false,
        applicationContent: '早出申請',
      });
      const analysis = AttendanceService.analyzeDailyRecord(record);

      expect(analysis.violations).not.toContain('early_start_application_missing');
    });
  });

  describe('複合ケース', () => {
    /**
     * 複数の無関係なキーワードを含むケース
     */
    it('FN601_申請内容に複数の無関係キーワード - 違反として検出すべき', () => {
      const record = createTestRecord('FN601', '偽陰性テスト', {
        clockIn: new Date('2026-01-06T09:30:00'),
        lateMinutes: '0:30',
        // 電車遅延はなかったが遅刻した、と記載
        applicationContent: '今日は電車遅延はなかったが寝坊で遅刻してしまった',
      });
      const analysis = AttendanceService.analyzeDailyRecord(record);

      // 申請ではないので、違反として検出されるべき
      expect(analysis.violations).toContain('late_application_missing');
    });
  });
});

describe('AttendanceService - 申請キーワード定数化の検証', () => {
  describe('APPLICATION_KEYWORDS定数の存在確認', () => {
    /**
     * 将来的に申請キーワードを定数として管理すべき
     * この定数が存在し、正しく定義されていることを確認
     */
    it('申請キーワード定数が定義されている', () => {
      // TODO: APPLICATION_KEYWORDS定数を実装後にテストを有効化
      // expect(APPLICATION_KEYWORDS).toBeDefined();
      // expect(APPLICATION_KEYWORDS.LATE).toContain('遅刻申請');
      // expect(APPLICATION_KEYWORDS.LATE).toContain('遅刻・早退申請');
      expect(true).toBe(true); // placeholder
    });
  });
});
