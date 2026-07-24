// 正社員の個別活動期間（入社日・退社日）による経過営業日数の補正テスト
// パートナーはCSVのworkDays等から自動算出できるが、正社員のXLSXフォーマットは
// 変更しない方針のため、ユーザーが手動で活動期間を設定した場合のみ
// 経過営業日数を補正する。

import {
  countWeekdaysInRange,
  resolveEmployeePassedWeekdays,
} from '../../utils/employeeActivityPeriod';

describe('countWeekdaysInRange', () => {
  it('土日を除いた平日日数を数える', () => {
    // 2026/07/01(水)〜2026/07/07(火): 平日5日(1,2,3=木金? 実際に確認)
    // 2026/07/01は水曜日なので、07/01(水)-07/07(火)の7日間中、土日は07/04,05の2日
    const count = countWeekdaysInRange(new Date('2026-07-01'), new Date('2026-07-07'));
    expect(count).toBe(5);
  });

  it('開始日が終了日より後なら0を返す', () => {
    const count = countWeekdaysInRange(new Date('2026-07-10'), new Date('2026-07-01'));
    expect(count).toBe(0);
  });

  it('同じ日を指定した場合、平日なら1、休日なら0', () => {
    // 2026/07/01は水曜日
    expect(countWeekdaysInRange(new Date('2026-07-01'), new Date('2026-07-01'))).toBe(1);
    // 2026/07/04は土曜日
    expect(countWeekdaysInRange(new Date('2026-07-04'), new Date('2026-07-04'))).toBe(0);
  });
});

describe('resolveEmployeePassedWeekdays', () => {
  const analysisStart = new Date('2026-07-01');
  const elapsedEnd = new Date('2026-07-23'); // 「経過」時点（today相当）

  it('活動期間が未設定なら、デフォルトの経過営業日数をそのまま返す', () => {
    const result = resolveEmployeePassedWeekdays(21, undefined, analysisStart, elapsedEnd);
    expect(result).toBe(21);
  });

  it('開始日のみ設定: 月途中JOINなら、開始日から経過時点までの平日数になる', () => {
    // 2026/07/15(水)にJOIN
    const result = resolveEmployeePassedWeekdays(
      21, // 未補正なら21日（月初からの経過営業日数）
      { startDate: '2026-07-15' },
      analysisStart,
      elapsedEnd
    );
    // 07/15(水)〜07/23(木)の平日数を期待値として算出
    const expected = countWeekdaysInRange(new Date('2026-07-15'), elapsedEnd);
    expect(result).toBe(expected);
    expect(result).toBeLessThan(21);
  });

  it('終了日のみ設定: 月途中退場なら、月初から終了日までの平日数になる', () => {
    const result = resolveEmployeePassedWeekdays(
      21,
      { endDate: '2026-07-10' },
      analysisStart,
      elapsedEnd
    );
    const expected = countWeekdaysInRange(analysisStart, new Date('2026-07-10'));
    expect(result).toBe(expected);
    expect(result).toBeLessThan(21);
  });

  it('開始日・終了日の両方設定: その範囲内の平日数になる', () => {
    const result = resolveEmployeePassedWeekdays(
      21,
      { startDate: '2026-07-08', endDate: '2026-07-17' },
      analysisStart,
      elapsedEnd
    );
    const expected = countWeekdaysInRange(new Date('2026-07-08'), new Date('2026-07-17'));
    expect(result).toBe(expected);
  });

  it('分析期間より前の開始日を指定しても、分析期間の開始日でクリップされる', () => {
    const result = resolveEmployeePassedWeekdays(
      21,
      { startDate: '2026-06-01' }, // 分析期間開始(07/01)より前
      analysisStart,
      elapsedEnd
    );
    expect(result).toBe(21); // クリップされてデフォルトと同じになる
  });

  it('経過時点より後の終了日を指定しても、経過時点でクリップされる', () => {
    const result = resolveEmployeePassedWeekdays(
      21,
      { endDate: '2026-08-31' }, // 経過時点(07/23)より後
      analysisStart,
      elapsedEnd
    );
    expect(result).toBe(21);
  });
});
