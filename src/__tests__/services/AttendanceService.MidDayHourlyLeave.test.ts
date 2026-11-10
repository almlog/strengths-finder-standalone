/**
 * AttendanceService - 中抜け時間休の打刻漏れ疑いを検出するテスト
 *
 * 背景:
 * 時間休は「就業開始時（遅れて出社）」「退勤時（早めに退社）」に取得するのが通常で、
 * この場合は出退勤時刻そのものが短縮されるため私用外出/私用戻りの打刻は不要。
 *
 * 判定式:
 *   時間休合計(分) = 勤務時間(workHours) - 実働時間(actualWorkHours)
 *   吸収分(通常勤務) = max(0, 出社-9:00) + max(0, 17:30-退社)
 *   吸収分(時差出勤) = max(0, 標準スパン(8.5h) - 実スパン(退社-出社))
 *   説明できない分 = 時間休合計 - 吸収分
 *   説明できない分 > 0 かつ 私用外出・戻りが揃っていない → 違反
 *
 * 始業・終業のズレだけで時間休の全量が説明できるなら（境界で取得した場合）違反とせず、
 * 説明できない残りがある場合だけ「中抜けで取得した疑いあり」として検出する。
 * 既存の hasTimeLeavePunchMissing（時間有休申請＋打刻不備で無条件に違反）とは別の
 * 違反タイプ mid_day_hourly_leave_suspected として追加する。
 */

import { AttendanceService } from '../../services/AttendanceService';
import { AttendanceRecord } from '../../models/AttendanceTypes';

const createTestRecord = (
  overrides: Partial<AttendanceRecord> = {}
): AttendanceRecord => ({
  employeeId: 'E001',
  employeeName: 'テスト太郎',
  department: 'テスト部門',
  position: '一般',
  date: new Date('2026-04-10'),
  dayOfWeek: '金',
  calendarType: 'weekday',
  calendarRaw: '平日',
  applicationContent: '',
  clockIn: new Date('2026-04-10T09:00:00'),
  clockOut: new Date('2026-04-10T17:30:00'),
  originalClockIn: new Date('2026-04-10T09:00:00'),
  originalClockOut: new Date('2026-04-10T17:30:00'),
  earlyStartFlag: false,
  altxOvertimeIn: null,
  altxOvertimeOut: null,
  privateOutTime: null,
  privateReturnTime: null,
  breakTimeMinutes: 60,
  nightBreakModification: '',
  nightWorkMinutes: '',
  actualWorkHours: '7:30',
  workHours: '7:30', // デフォルト: 時間休なし（勤務=実働）
  overtimeHours: '',
  lateMinutes: '',
  earlyLeaveMinutes: '',
  remarks: '',
  sheetName: 'テストシート',
  ...overrides,
});

describe('AttendanceService.hasMidDayHourlyLeaveSuspected - 中抜け時間休の打刻漏れ疑い', () => {
  it('9:00出社・18:00退勤・時間休1h・私用外出/戻りなし → 吸収分0で丸ごと説明不可、違反を検出する', () => {
    const record = createTestRecord({
      applicationContent: '時間休',
      clockIn: new Date('2026-04-10T09:00:00'),
      clockOut: new Date('2026-04-10T18:00:00'),
      workHours: '9:00',
      actualWorkHours: '8:00', // 時間休合計 = 60分
    });

    expect(AttendanceService.hasMidDayHourlyLeaveSuspected(record)).toBe(true);
  });

  it('就業開始時に時間休1h（10:00出社・17:30退勤）→ 始業側で全量吸収、違反としない', () => {
    const record = createTestRecord({
      applicationContent: '時間休',
      clockIn: new Date('2026-04-10T10:00:00'),
      clockOut: new Date('2026-04-10T17:30:00'),
      workHours: '7:30',
      actualWorkHours: '6:30', // 時間休合計 = 60分 = 始業側吸収分(60分)と一致
    });

    expect(AttendanceService.hasMidDayHourlyLeaveSuspected(record)).toBe(false);
  });

  it('退勤時に時間休1h（9:00出社・16:30退勤）→ 終業側で全量吸収、違反としない', () => {
    const record = createTestRecord({
      applicationContent: '時間休',
      clockIn: new Date('2026-04-10T09:00:00'),
      clockOut: new Date('2026-04-10T16:30:00'),
      workHours: '7:30',
      actualWorkHours: '6:30', // 時間休合計 = 60分 = 終業側吸収分(60分)と一致
    });

    expect(AttendanceService.hasMidDayHourlyLeaveSuspected(record)).toBe(false);
  });

  it('始業1h+終業1hの組み合わせ（10:00出社・16:30退勤、時間休合計2h）→ 両側で全量吸収、違反としない', () => {
    const record = createTestRecord({
      applicationContent: '時間休',
      clockIn: new Date('2026-04-10T10:00:00'),
      clockOut: new Date('2026-04-10T16:30:00'),
      workHours: '9:30',
      actualWorkHours: '7:30', // 時間休合計 = 120分 = 始業60分+終業60分と一致
    });

    expect(AttendanceService.hasMidDayHourlyLeaveSuspected(record)).toBe(false);
  });

  it('9:00出社・中抜け1h(14-15)・16:00退勤（終業1.5h前倒し、時間休合計2.5h）→ 中抜け1h分が説明不可で違反を検出する', () => {
    const record = createTestRecord({
      applicationContent: '時間休',
      clockIn: new Date('2026-04-10T09:00:00'),
      clockOut: new Date('2026-04-10T16:00:00'),
      workHours: '8:30',
      actualWorkHours: '6:00', // 時間休合計 = 150分、終業側吸収は90分 → 残り60分が説明不可
    });

    expect(AttendanceService.hasMidDayHourlyLeaveSuspected(record)).toBe(true);
  });

  it('私用外出・私用戻りが両方打刻済み → 違反としない', () => {
    const record = createTestRecord({
      applicationContent: '時間休',
      clockIn: new Date('2026-04-10T09:00:00'),
      clockOut: new Date('2026-04-10T18:00:00'),
      workHours: '9:00',
      actualWorkHours: '8:00',
      privateOutTime: new Date('2026-04-10T14:00:00'),
      privateReturnTime: new Date('2026-04-10T15:00:00'),
    });

    expect(AttendanceService.hasMidDayHourlyLeaveSuspected(record)).toBe(false);
  });

  it('時間休の申請がない → 違反としない（通常の長時間勤務を誤検知しない）', () => {
    const record = createTestRecord({
      applicationContent: '',
      clockIn: new Date('2026-04-10T09:00:00'),
      clockOut: new Date('2026-04-10T19:00:00'),
    });

    expect(AttendanceService.hasMidDayHourlyLeaveSuspected(record)).toBe(false);
  });

  it('勤務時間(workHours)が未設定で時間休合計を算出できない → 判定不可のため違反としない', () => {
    const record = createTestRecord({
      applicationContent: '時間休',
      clockIn: new Date('2026-04-10T09:00:00'),
      clockOut: new Date('2026-04-10T18:00:00'),
      workHours: undefined,
      actualWorkHours: '8:00',
    });

    expect(AttendanceService.hasMidDayHourlyLeaveSuspected(record)).toBe(false);
  });

  it('「有休時間」キーワードでも検知される', () => {
    const record = createTestRecord({
      applicationContent: '有休時間',
      clockIn: new Date('2026-04-10T09:00:00'),
      clockOut: new Date('2026-04-10T18:00:00'),
      workHours: '9:00',
      actualWorkHours: '8:00',
    });

    expect(AttendanceService.hasMidDayHourlyLeaveSuspected(record)).toBe(true);
  });

  it('「時間有休」キーワードでも検知される', () => {
    const record = createTestRecord({
      applicationContent: '時間有休',
      clockIn: new Date('2026-04-10T09:00:00'),
      clockOut: new Date('2026-04-10T18:00:00'),
      workHours: '9:00',
      actualWorkHours: '8:00',
    });

    expect(AttendanceService.hasMidDayHourlyLeaveSuspected(record)).toBe(true);
  });

  it('休日は対象外', () => {
    const record = createTestRecord({
      applicationContent: '時間休',
      calendarType: 'statutory_holiday',
      calendarRaw: '法定休',
      clockIn: new Date('2026-04-12T09:00:00'),
      clockOut: new Date('2026-04-12T18:00:00'),
      workHours: '9:00',
      actualWorkHours: '8:00',
    });

    expect(AttendanceService.hasMidDayHourlyLeaveSuspected(record)).toBe(false);
  });

  it('出社または退勤時刻が欠落している場合は判定しない', () => {
    const record = createTestRecord({
      applicationContent: '時間休',
      clockIn: null,
      clockOut: new Date('2026-04-10T18:00:00'),
      workHours: '9:00',
      actualWorkHours: '8:00',
    });

    expect(AttendanceService.hasMidDayHourlyLeaveSuspected(record)).toBe(false);
  });

  describe('時差出勤メンバー（標準スパン8.5hと実スパンの差を吸収分とみなす）', () => {
    it('時間休1hなのに実スパンが標準スパン(8.5h)のまま短縮されていない → 違反を検出する', () => {
      const record = createTestRecord({
        applicationContent: '時差出勤,時間休',
        clockIn: new Date('2026-04-10T08:30:00'),
        clockOut: new Date('2026-04-10T17:00:00'), // span = 8.5h（標準のまま）
        workHours: '7:45',
        actualWorkHours: '6:45', // 時間休合計 = 60分
      });

      expect(AttendanceService.hasMidDayHourlyLeaveSuspected(record)).toBe(true);
    });

    it('時間休1h分、実スパンが標準スパンより1h短い → 全量吸収で違反としない', () => {
      const record = createTestRecord({
        applicationContent: '時差出勤,時間休',
        clockIn: new Date('2026-04-10T08:30:00'),
        clockOut: new Date('2026-04-10T16:00:00'), // span = 7.5h（標準8.5hより1h短い）
        workHours: '7:45',
        actualWorkHours: '6:45', // 時間休合計 = 60分 = 吸収分(60分)と一致
      });

      expect(AttendanceService.hasMidDayHourlyLeaveSuspected(record)).toBe(false);
    });

    it('時間休合計2.5hだが実スパンは標準より1.5hしか短くない → 中抜け1h分が説明不可で違反を検出する', () => {
      const record = createTestRecord({
        applicationContent: '時差出勤,時間休',
        clockIn: new Date('2026-04-10T08:30:00'),
        clockOut: new Date('2026-04-10T15:30:00'), // span = 7h（標準8.5hより1.5h短い）
        workHours: '8:30',
        actualWorkHours: '6:00', // 時間休合計 = 150分、吸収分は90分 → 残り60分が説明不可
      });

      expect(AttendanceService.hasMidDayHourlyLeaveSuspected(record)).toBe(true);
    });

    it('時差出勤+時間休でも私用外出・戻りが両方打刻済み → 違反としない', () => {
      const record = createTestRecord({
        applicationContent: '時差出勤,時間休',
        clockIn: new Date('2026-04-10T08:30:00'),
        clockOut: new Date('2026-04-10T17:00:00'),
        workHours: '7:45',
        actualWorkHours: '6:45',
        privateOutTime: new Date('2026-04-10T14:00:00'),
        privateReturnTime: new Date('2026-04-10T15:00:00'),
      });

      expect(AttendanceService.hasMidDayHourlyLeaveSuspected(record)).toBe(false);
    });
  });
});
