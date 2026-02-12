/**
 * AttendanceService - 早出フラグ判定テスト
 *
 * TDD: 申請内容（applicationContent）の始業時刻を考慮した早出判定
 * - 申請内容に始業時刻（830-1700形式）がある場合、その時刻通りなら早出フラグ不要
 */

import AttendanceService from '../../services/AttendanceService';
import { AttendanceRecord } from '../../models/AttendanceTypes';

// テスト用のベースレコード
const createBaseRecord = (overrides: Partial<AttendanceRecord> = {}): AttendanceRecord => ({
  employeeId: 'E001',
  employeeName: 'テスト太郎',
  department: 'テスト部',
  date: new Date('2026-01-15'),
  dayOfWeek: '水',
  calendarType: 'weekday',
  calendarRaw: '平日',
  clockIn: null,
  clockOut: null,
  breakTimeMinutes: 60,
  actualWorkHours: '8:00',
  lateMinutes: null,
  earlyLeaveMinutes: null,
  overtime36: '0:00',
  applicationContent: '',
  remarks: '',
  earlyStartFlag: false,
  privateOutTime: null,
  privateReturnTime: null,
  nightBreakModification: '',
  ...overrides,
});

describe('AttendanceService.parseScheduledStartTime - 申請内容から始業時刻抽出', () => {
  it('830-1700形式から8:30を抽出', () => {
    const result = AttendanceService.parseScheduledStartTime('830-1700/1200-1300/7.75/5');
    expect(result).toEqual({ hour: 8, minute: 30 });
  });

  it('930-1800形式から9:30を抽出', () => {
    const result = AttendanceService.parseScheduledStartTime('930-1800/1200-1300/7.75/5');
    expect(result).toEqual({ hour: 9, minute: 30 });
  });

  it('900-1730形式から9:00を抽出', () => {
    const result = AttendanceService.parseScheduledStartTime('900-1730/1200-1300/7.75/5');
    expect(result).toEqual({ hour: 9, minute: 0 });
  });

  it('1000-1900形式から10:00を抽出', () => {
    const result = AttendanceService.parseScheduledStartTime('1000-1900/1200-1300/7.75/5');
    expect(result).toEqual({ hour: 10, minute: 0 });
  });

  it('空文字列の場合はnullを返す', () => {
    const result = AttendanceService.parseScheduledStartTime('');
    expect(result).toBeNull();
  });

  it('不正な形式の場合はnullを返す', () => {
    const result = AttendanceService.parseScheduledStartTime('invalid');
    expect(result).toBeNull();
  });

  it('申請内容にスケジュール情報がない場合はnullを返す', () => {
    const result = AttendanceService.parseScheduledStartTime('リモート勤務');
    expect(result).toBeNull();
  });

  // カンマ区切り形式のテスト（申請タイプ,スケジュール）
  it('残業終了,900-1730形式から9:00を抽出', () => {
    const result = AttendanceService.parseScheduledStartTime('残業終了,900-1730/1200-1300/7.75/5');
    expect(result).toEqual({ hour: 9, minute: 0 });
  });

  it('午後有休,900-1730形式から9:00を抽出', () => {
    const result = AttendanceService.parseScheduledStartTime('午後有休,900-1730/1200-1300/7.75/5');
    expect(result).toEqual({ hour: 9, minute: 0 });
  });

  it('早出,830-1700形式から8:30を抽出', () => {
    const result = AttendanceService.parseScheduledStartTime('早出,830-1700/1200-1300/7.75/5');
    expect(result).toEqual({ hour: 8, minute: 30 });
  });
});

describe('AttendanceService.parseScheduledStartTimeFromSheetName - シート名から始業時刻抽出', () => {
  it('KDDI_日勤_800-1630～930-1800形式から8:00を抽出', () => {
    const result = AttendanceService.parseScheduledStartTimeFromSheetName(
      'KDDI_日勤_800-1630～930-1800_1200-1300_7.75_5'
    );
    expect(result).toEqual({ hour: 8, minute: 0 });
  });

  it('プロジェクト_830-1700形式から8:30を抽出', () => {
    const result = AttendanceService.parseScheduledStartTimeFromSheetName(
      'プロジェクトA_830-1700'
    );
    expect(result).toEqual({ hour: 8, minute: 30 });
  });

  it('_9:00-17:30形式（コロン区切り）から9:00を抽出', () => {
    const result = AttendanceService.parseScheduledStartTimeFromSheetName(
      'チーム名_9:00-17:30'
    );
    expect(result).toEqual({ hour: 9, minute: 0 });
  });

  it('900-1730形式から9:00を抽出', () => {
    const result = AttendanceService.parseScheduledStartTimeFromSheetName(
      'プロジェクト_900-1730_休憩1時間'
    );
    expect(result).toEqual({ hour: 9, minute: 0 });
  });

  it('1000-1900形式から10:00を抽出', () => {
    const result = AttendanceService.parseScheduledStartTimeFromSheetName(
      'チームB_1000-1900'
    );
    expect(result).toEqual({ hour: 10, minute: 0 });
  });

  it('時間パターンがないシート名はnullを返す', () => {
    const result = AttendanceService.parseScheduledStartTimeFromSheetName('一般勤務');
    expect(result).toBeNull();
  });

  it('空文字列はnullを返す', () => {
    const result = AttendanceService.parseScheduledStartTimeFromSheetName('');
    expect(result).toBeNull();
  });

  it('nullはnullを返す', () => {
    const result = AttendanceService.parseScheduledStartTimeFromSheetName(null as unknown as string);
    expect(result).toBeNull();
  });

  it('ハイフン区切り形式 プロジェクト-830-1700 から8:30を抽出', () => {
    const result = AttendanceService.parseScheduledStartTimeFromSheetName(
      'プロジェクト-830-1700'
    );
    expect(result).toEqual({ hour: 8, minute: 30 });
  });
});

describe('AttendanceService.hasEarlyStartViolation - 申請内容の始業時刻を考慮した早出判定', () => {
  describe('申請内容の始業時刻通りに出勤した場合', () => {
    it('830始業スケジュールで8:30出勤は早出フラグ不要', () => {
      const record = createBaseRecord({
        applicationContent: '830-1700/1200-1300/7.75/5',
        clockIn: new Date('2026-01-15 08:30'),
        earlyStartFlag: false,
      });
      const result = AttendanceService.hasEarlyStartViolation(record, 'none');
      expect(result).toBe(false);
    });

    it('830始業スケジュールで8:35出勤は早出フラグ不要', () => {
      const record = createBaseRecord({
        applicationContent: '830-1700/1200-1300/7.75/5',
        clockIn: new Date('2026-01-15 08:35'),
        earlyStartFlag: false,
      });
      const result = AttendanceService.hasEarlyStartViolation(record, 'none');
      expect(result).toBe(false);
    });

    it('930始業スケジュールで9:30出勤は早出フラグ不要', () => {
      const record = createBaseRecord({
        applicationContent: '930-1800/1200-1300/7.75/5',
        clockIn: new Date('2026-01-15 09:30'),
        earlyStartFlag: false,
      });
      const result = AttendanceService.hasEarlyStartViolation(record, 'none');
      expect(result).toBe(false);
    });
  });

  describe('申請内容の始業時刻より前に出勤した場合', () => {
    it('830始業スケジュールで8:00出勤は早出フラグが必要', () => {
      const record = createBaseRecord({
        applicationContent: '830-1700/1200-1300/7.75/5',
        clockIn: new Date('2026-01-15 08:00'),
        earlyStartFlag: false,
      });
      const result = AttendanceService.hasEarlyStartViolation(record, 'none');
      expect(result).toBe(true);
    });

    it('930始業スケジュールで9:00出勤は早出フラグが必要', () => {
      const record = createBaseRecord({
        applicationContent: '930-1800/1200-1300/7.75/5',
        clockIn: new Date('2026-01-15 09:00'),
        earlyStartFlag: false,
      });
      const result = AttendanceService.hasEarlyStartViolation(record, 'none');
      expect(result).toBe(true);
    });

    it('早出フラグがあれば違反にならない', () => {
      const record = createBaseRecord({
        applicationContent: '830-1700/1200-1300/7.75/5',
        clockIn: new Date('2026-01-15 08:00'),
        earlyStartFlag: true,
      });
      const result = AttendanceService.hasEarlyStartViolation(record, 'none');
      expect(result).toBe(false);
    });
  });

  describe('申請内容にスケジュールがない場合（既存動作: 9時基準）', () => {
    it('スケジュールなしで9時より前の出勤は早出フラグが必要', () => {
      const record = createBaseRecord({
        applicationContent: 'リモート勤務',
        clockIn: new Date('2026-01-15 08:30'),
        earlyStartFlag: false,
      });
      const result = AttendanceService.hasEarlyStartViolation(record, 'none');
      expect(result).toBe(true);
    });

    it('スケジュールなしで9時以降の出勤は早出フラグ不要', () => {
      const record = createBaseRecord({
        applicationContent: 'リモート勤務',
        clockIn: new Date('2026-01-15 09:00'),
        earlyStartFlag: false,
      });
      const result = AttendanceService.hasEarlyStartViolation(record, 'none');
      expect(result).toBe(false);
    });

    it('申請内容が空の場合、9時基準で判定', () => {
      const record = createBaseRecord({
        applicationContent: '',
        clockIn: new Date('2026-01-15 08:30'),
        earlyStartFlag: false,
      });
      const result = AttendanceService.hasEarlyStartViolation(record, 'none');
      expect(result).toBe(true);
    });
  });

  describe('シート名の始業時刻を考慮した早出判定', () => {
    it('シート名800スケジュールで8:00出社は早出フラグ不要', () => {
      const record = createBaseRecord({
        applicationContent: '',  // 申請内容は空
        sheetName: 'KDDI_日勤_800-1630～930-1800_1200-1300_7.75_5',
        clockIn: new Date('2026-01-15 08:00'),
        earlyStartFlag: false,
      });
      const result = AttendanceService.hasEarlyStartViolation(record, 'none');
      expect(result).toBe(false);
    });

    it('シート名800スケジュールで7:30出社は早出フラグが必要', () => {
      const record = createBaseRecord({
        applicationContent: '',
        sheetName: 'KDDI_日勤_800-1630～930-1800_1200-1300_7.75_5',
        clockIn: new Date('2026-01-15 07:30'),
        earlyStartFlag: false,
      });
      const result = AttendanceService.hasEarlyStartViolation(record, 'none');
      expect(result).toBe(true);
    });

    it('シート名800スケジュールで7:30出社でも早出フラグがあれば違反なし', () => {
      const record = createBaseRecord({
        applicationContent: '',
        sheetName: 'KDDI_日勤_800-1630～930-1800_1200-1300_7.75_5',
        clockIn: new Date('2026-01-15 07:30'),
        earlyStartFlag: true,
      });
      const result = AttendanceService.hasEarlyStartViolation(record, 'none');
      expect(result).toBe(false);
    });

    it('申請内容のスケジュールがシート名より優先される（申請930、シート800で9:00出社は違反）', () => {
      const record = createBaseRecord({
        applicationContent: '930-1800/1200-1300/7.75/5',  // 9:30始業
        sheetName: 'KDDI_日勤_800-1630～930-1800_1200-1300_7.75_5',  // 8:00始業
        clockIn: new Date('2026-01-15 09:00'),  // 9:00出社
        earlyStartFlag: false,
      });
      // 申請内容9:30より前なので早出違反
      const result = AttendanceService.hasEarlyStartViolation(record, 'none');
      expect(result).toBe(true);
    });

    it('申請内容のスケジュールがシート名より優先される（申請830、シート900で8:30出社は違反なし）', () => {
      const record = createBaseRecord({
        applicationContent: '830-1700/1200-1300/7.75/5',  // 8:30始業
        sheetName: 'プロジェクト_900-1730',  // 9:00始業
        clockIn: new Date('2026-01-15 08:30'),  // 8:30出社
        earlyStartFlag: false,
      });
      // 申請内容8:30通りなので違反なし
      const result = AttendanceService.hasEarlyStartViolation(record, 'none');
      expect(result).toBe(false);
    });

    it('シート名にスケジュールがない場合はデフォルト9時基準で判定', () => {
      const record = createBaseRecord({
        applicationContent: '',
        sheetName: '一般勤務',
        clockIn: new Date('2026-01-15 08:30'),
        earlyStartFlag: false,
      });
      // 9時より前なので早出違反
      const result = AttendanceService.hasEarlyStartViolation(record, 'none');
      expect(result).toBe(true);
    });

    it('シート名830スケジュールで8:30出社は早出フラグ不要', () => {
      const record = createBaseRecord({
        applicationContent: '',
        sheetName: 'プロジェクトA_830-1700',
        clockIn: new Date('2026-01-15 08:30'),
        earlyStartFlag: false,
      });
      const result = AttendanceService.hasEarlyStartViolation(record, 'none');
      expect(result).toBe(false);
    });
  });

  describe('分単位境界テスト', () => {
    it('始業8:30のケースで8:29出勤 → 違反（早出フラグなし）', () => {
      const record = createBaseRecord({
        applicationContent: '830-1700/1200-1300/7.75/5',
        clockIn: new Date('2026-01-15 08:29'),
        earlyStartFlag: false,
      });
      const result = AttendanceService.hasEarlyStartViolation(record, 'none');
      expect(result).toBe(true);
    });

    it('始業8:30のケースで8:30出勤 → 違反なし', () => {
      const record = createBaseRecord({
        applicationContent: '830-1700/1200-1300/7.75/5',
        clockIn: new Date('2026-01-15 08:30'),
        earlyStartFlag: false,
      });
      const result = AttendanceService.hasEarlyStartViolation(record, 'none');
      expect(result).toBe(false);
    });

    it('始業9:00のケースで8:59出勤 → 違反（早出フラグなし）', () => {
      const record = createBaseRecord({
        applicationContent: '900-1730/1200-1300/7.75/5',
        clockIn: new Date('2026-01-15 08:59'),
        earlyStartFlag: false,
      });
      const result = AttendanceService.hasEarlyStartViolation(record, 'none');
      expect(result).toBe(true);
    });

    it('始業9:00のケースで9:00出勤 → 違反なし', () => {
      const record = createBaseRecord({
        applicationContent: '900-1730/1200-1300/7.75/5',
        clockIn: new Date('2026-01-15 09:00'),
        earlyStartFlag: false,
      });
      const result = AttendanceService.hasEarlyStartViolation(record, 'none');
      expect(result).toBe(false);
    });
  });
});

describe('AttendanceService.parseScheduledStartTime - 無効時刻フォーマットテスト', () => {
  it('"1260-1730" (分が60以上) → null', () => {
    const result = AttendanceService.parseScheduledStartTime('1260-1730/1200-1300/7.75/5');
    expect(result).toBeNull();
  });

  it('"2500-1730" (時が24以上) → null', () => {
    const result = AttendanceService.parseScheduledStartTime('2500-1730/1200-1300/7.75/5');
    expect(result).toBeNull();
  });

  it('"abc-1730" (非数値) → null', () => {
    const result = AttendanceService.parseScheduledStartTime('abc-1730/1200-1300/7.75/5');
    expect(result).toBeNull();
  });
});

describe('AttendanceService.parseScheduledStartTimeFromSheetName - 無効時刻フォーマットテスト', () => {
  it('シート名 "_2500-1630" → null', () => {
    const result = AttendanceService.parseScheduledStartTimeFromSheetName('プロジェクト_2500-1630');
    expect(result).toBeNull();
  });

  it('シート名 "_800-" (不完全) → null', () => {
    const result = AttendanceService.parseScheduledStartTimeFromSheetName('プロジェクト_800-');
    expect(result).toBeNull();
  });
});

describe('AttendanceService - 複数スケジュール・早出キーワードテスト', () => {
  describe('複数スケジュールから最初の始業時刻を抽出', () => {
    it('"830-1700/930-1800/..." → 最初の830が抽出される', () => {
      const result = AttendanceService.parseScheduledStartTime('830-1700/930-1800/1200-1300/7.75/5');
      expect(result).toEqual({ hour: 8, minute: 30 });
    });
  });

  describe('EARLY_START_APPLICATION_KEYWORDS の各キーワードが正しく検出される', () => {
    it('"早出申請" を含む申請内容は早出違反にならない', () => {
      const record = createBaseRecord({
        applicationContent: '早出申請',
        clockIn: new Date('2026-01-15 08:00'),
        earlyStartFlag: false,
      });
      const result = AttendanceService.hasEarlyStartViolation(record, 'none');
      expect(result).toBe(false);
    });

    it('"早出勤務申請" を含む申請内容は早出違反にならない', () => {
      const record = createBaseRecord({
        applicationContent: '早出勤務申請',
        clockIn: new Date('2026-01-15 08:00'),
        earlyStartFlag: false,
      });
      const result = AttendanceService.hasEarlyStartViolation(record, 'none');
      expect(result).toBe(false);
    });

    it('"早出届" を含む申請内容は早出違反にならない', () => {
      const record = createBaseRecord({
        applicationContent: '早出届',
        clockIn: new Date('2026-01-15 08:00'),
        earlyStartFlag: false,
      });
      const result = AttendanceService.hasEarlyStartViolation(record, 'none');
      expect(result).toBe(false);
    });
  });

  describe('部分一致の誤検出防止', () => {
    it('"早出したいです" は早出申請として検出されない（違反になる）', () => {
      const record = createBaseRecord({
        applicationContent: '早出したいです',
        clockIn: new Date('2026-01-15 08:00'),
        earlyStartFlag: false,
      });
      const result = AttendanceService.hasEarlyStartViolation(record, 'none');
      expect(result).toBe(true);
    });
  });
});
