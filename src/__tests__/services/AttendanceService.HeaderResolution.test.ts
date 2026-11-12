/**
 * AttendanceService.parseSheet - ヘッダー名ベースの列解決テスト
 *
 * 背景（2026-11のヘッダー変更で発覚した問題）:
 * 楽楽勤怠の出勤簿エクスポートは、月によって列の並び替え・削除が発生する
 * （列名自体は変わらない）。従来の固定インデックス方式では、列構成が変わった
 * 瞬間に全く別の列を誤読する重大なサイレント破損が起きていた。
 *
 * このテストでは、ヘッダー行から列名で位置を解決する新方式
 * （AttendanceService.parseSheet）を検証する。
 * - 旧ヘッダー（計算開始/計算終了あり）・新ヘッダー（出社/退社に統一）の両方
 * - 列順が入れ替わっても名前で正しく解決できること
 * - 必須列が見つからない場合は明確なエラーを出すこと（安全策）
 * - 任意列が見つからない場合は空値で処理を継続できること
 */

import { AttendanceService } from '../../services/AttendanceService';

// 旧ヘッダー（2026-10以前、61列）
const OLD_HEADER = [
  '社員番号', '氏名', '部門', '役職', '日付', '曜日', 'カレンダー', '申請内容',
  '出社', '早出フラグ', '退社', '計算開始', '計算終了',
  '早出中抜け開始時刻', '早出中抜け終了時刻', '早出中抜け時間',
  'AltX残業出', 'AltX残業退', '残業出計算開始', '残業退計算終了', 'AltX残業労働時間',
  '早出開始', '残業終了', '出社2', '退社2', '計算開始2', '計算終了2', '労働時間2',
  '私用外出', '私用戻り', '出社3', '退社3', '計算開始3', '計算終了3', '労働時間3', '外出時間',
  '休憩時間', '休憩修正', '深夜休憩修正', '実働時間', '勤務時間', '有休時間',
  '所定内労働', '法定内残業', '残業時間', '深夜労働', '所定内深夜',
  '法定外休出', '法定内休出', '遅刻', '早退',
  '代休付与基準日数', '振休付与基準日数', '法定内休出日数', '法定外休出日数',
  '在宅フラグ', '子の看護時間', '介護時間',
  '平日法定外残業(36協定用)', '残業時間(週40超過)', '備考',
];

// 新ヘッダー（2026-11以降、36列。計算開始/計算終了・勤務時間・深夜休憩修正等が削除され並び替え）
const NEW_HEADER = [
  '社員番号', '氏名', '部門', '役職', '日付', '曜日', 'カレンダー', '申請内容',
  '早出フラグ', '出社', '退社', 'AltX残業出', 'AltX残業退',
  '出社2', '退社2', '出社3', '退社3',
  '早出中抜け開始時刻', '早出中抜け終了時刻', '私用外出', '私用戻り', '在宅フラグ',
  '休憩時間', '有休時間', '実働時間', '所定内労働', '残業時間',
  '法定外休出', '法定内休出', '深夜労働', '所定内深夜', '遅刻', '早退',
  '子の看護時間', '介護時間', '備考',
];

function buildRow(header: string[], values: Record<string, string>): string[] {
  return header.map(col => values[col] ?? '');
}

describe('AttendanceService.parseSheet - ヘッダー名ベースの列解決', () => {
  it('旧ヘッダー: 計算開始/計算終了からclockIn/clockOutを取得する', () => {
    const row = buildRow(OLD_HEADER, {
      社員番号: '1001', 氏名: 'テスト太郎', 部門: '13D5110', 役職: '一般',
      日付: '2026-10-05', 曜日: '月', カレンダー: '平日',
      出社: '2026-10-05 09:00', 退社: '2026-10-05 18:00',
      計算開始: '2026-10-05 09:00', 計算終了: '2026-10-05 18:00',
      休憩時間: '1:00', 実働時間: '8:00', 勤務時間: '8:00',
    });
    const [record] = AttendanceService.parseSheet([OLD_HEADER, row], 'テストシート');

    expect(record.employeeId).toBe('1001');
    expect(record.clockIn).toEqual(new Date(2026, 9, 5, 9, 0));
    expect(record.clockOut).toEqual(new Date(2026, 9, 5, 18, 0));
    expect(record.breakTimeMinutes).toBe(60);
    expect(record.actualWorkHours).toBe('8:00');
  });

  it('新ヘッダー: 計算開始/計算終了が無いため出社/退社からclockIn/clockOutを取得する', () => {
    const row = buildRow(NEW_HEADER, {
      社員番号: '1001', 氏名: 'テスト太郎', 部門: '13D5110', 役職: '一般',
      日付: '2026-11-05', 曜日: '木', カレンダー: '平日',
      出社: '2026-11-05 09:00', 退社: '2026-11-05 18:00',
      休憩時間: '1:00', 実働時間: '8:00',
    });
    const [record] = AttendanceService.parseSheet([NEW_HEADER, row], 'テストシート');

    expect(record.clockIn).toEqual(new Date(2026, 10, 5, 9, 0));
    expect(record.clockOut).toEqual(new Date(2026, 10, 5, 18, 0));
    expect(record.originalClockIn).toEqual(new Date(2026, 10, 5, 9, 0));
    expect(record.breakTimeMinutes).toBe(60);
  });

  it('新ヘッダー: 有休時間列を直接hourlyLeaveHoursに取り込む（実データ相当）', () => {
    const row = buildRow(NEW_HEADER, {
      社員番号: '2204013', 氏名: 'SHRESTHA RAJESH', 部門: '13D5131', 役職: '一般',
      日付: '2026-11-06', 曜日: '金', カレンダー: '平日', 申請内容: '有休時間',
      出社: '2026-11-06 11:00', 退社: '2026-11-06 17:30',
      休憩時間: '1:00', 有休時間: '2:00', 実働時間: '5:30',
    });
    const [record] = AttendanceService.parseSheet([NEW_HEADER, row], 'テストシート');

    expect(record.hourlyLeaveHours).toBe('2:00');
    expect(record.workHours).toBe(''); // 新ヘッダーには勤務時間列が無い
  });

  it('列の並びをシャッフルしても名前で正しく解決できる', () => {
    const shuffled = [...NEW_HEADER].reverse();
    const row = buildRow(shuffled, {
      社員番号: '1001', 氏名: 'テスト太郎', 日付: '2026-11-10', カレンダー: '平日',
      出社: '2026-11-10 09:30', 退社: '2026-11-10 17:00',
      休憩時間: '1:00', 実働時間: '6:30',
    });
    const [record] = AttendanceService.parseSheet([shuffled, row], 'テストシート');

    expect(record.employeeId).toBe('1001');
    expect(record.clockIn).toEqual(new Date(2026, 10, 10, 9, 30));
    expect(record.clockOut).toEqual(new Date(2026, 10, 10, 17, 0));
    expect(record.breakTimeMinutes).toBe(60);
  });

  it('任意列（深夜休憩修正・勤務時間）が無くてもエラーにならず空値で処理される', () => {
    const row = buildRow(NEW_HEADER, {
      社員番号: '1001', 氏名: 'テスト太郎', 日付: '2026-11-10', カレンダー: '平日',
      出社: '2026-11-10 09:00', 退社: '2026-11-10 18:00',
      休憩時間: '1:00', 実働時間: '8:00',
    });
    const [record] = AttendanceService.parseSheet([NEW_HEADER, row], 'テストシート');

    expect(record.nightBreakModification).toBe('');
    expect(record.workHours).toBe('');
  });

  it('必須列（実働時間）が存在しないヘッダーはエラーを投げる（想定外のヘッダー検知）', () => {
    const brokenHeader = NEW_HEADER.filter(col => col !== '実働時間');
    const row = buildRow(brokenHeader, {
      社員番号: '1001', 日付: '2026-11-10', カレンダー: '平日',
    });

    expect(() => AttendanceService.parseSheet([brokenHeader, row], 'テストシート'))
      .toThrow(/想定外のヘッダー情報です/);
  });

  it('必須列が無い場合のエラーメッセージに対象シート名と列名が含まれる', () => {
    const brokenHeader = NEW_HEADER.filter(col => col !== '休憩時間');
    const row = buildRow(brokenHeader, { 社員番号: '1001', 日付: '2026-11-10', カレンダー: '平日' });

    try {
      AttendanceService.parseSheet([brokenHeader, row], '営業部シート');
      fail('エラーが投げられるべき');
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      expect(message).toContain('営業部シート');
      expect(message).toContain('休憩時間');
    }
  });

  it('データ行がない（ヘッダーのみ）場合は空配列を返す', () => {
    const records = AttendanceService.parseSheet([NEW_HEADER], 'テストシート');
    expect(records).toEqual([]);
  });

  it('シートが完全に空の場合は空配列を返す', () => {
    const records = AttendanceService.parseSheet([], 'テストシート');
    expect(records).toEqual([]);
  });

  it('社員番号が空の行（空行）はスキップする', () => {
    const row = buildRow(NEW_HEADER, { 日付: '2026-11-10' });
    const records = AttendanceService.parseSheet([NEW_HEADER, row], 'テストシート');
    expect(records).toEqual([]);
  });
});
