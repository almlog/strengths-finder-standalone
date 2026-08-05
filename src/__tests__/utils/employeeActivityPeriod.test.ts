// 正社員の個別活動期間（入社日・退社日）による経過営業日数の補正テスト
// パートナーはCSVのworkDays等から自動算出できるが、正社員のXLSXフォーマットは
// 変更しない方針のため、ユーザーが手動で活動期間を設定した場合のみ
// 経過営業日数を補正する。

import {
  countWeekdaysInRange,
  resolveEmployeePassedWeekdays,
  resolvePartnerElapsedDays,
  resolveTargetMonthRange,
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

  it('国民の祝日は平日でも除外する（2026/07/20 海の日）', () => {
    // 2026年7月は土日を除くと23日あるが、7/20(月)が海の日のため
    // 正しい営業日数は22日
    const count = countWeekdaysInRange(new Date('2026-07-01'), new Date('2026-07-31'));
    expect(count).toBe(22);
  });

  it('祝日単体を指定した場合は0を返す', () => {
    // 2026/07/20は海の日（月曜日）
    expect(countWeekdaysInRange(new Date('2026-07-20'), new Date('2026-07-20'))).toBe(0);
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

describe('resolvePartnerElapsedDays', () => {
  // パートナーの経過営業日数は、実績(workDays+absentDays+leaveDays)ではなく
  // 契約開始日があればカレンダー計算を優先する。実績合計は、時間休など
  // workDays/absentDays/leaveDaysのどれにも当てはまらない区分があると
  // 本来のカレンダー営業日数より少なく出てしまうことがあるため。
  const analysisStart = new Date('2026-07-01');
  const elapsedEnd = new Date('2026-07-23'); // 経過時点

  it('契約開始日が無ければ、従来通りworkDays+absentDays+leaveDaysを使う', () => {
    const result = resolvePartnerElapsedDays(
      { workDays: 15, absentDays: 1, leaveDays: 2, contractStart: '', contractEnd: '' },
      undefined,
      analysisStart,
      elapsedEnd
    );
    expect(result).toBe(18); // 15+1+2
  });

  it('契約開始日が分析期間より前（フル在籍）なら、実績合計が少なくてもカレンダーの経過営業日数を使う', () => {
    // 実績合計(workDays+absentDays+leaveDays)=15で、
    // 本来のカレンダー経過営業日数(07/01-07/23)より少ない状況を想定
    const calendarMax = countWeekdaysInRange(analysisStart, elapsedEnd);
    const result = resolvePartnerElapsedDays(
      { workDays: 10, absentDays: 2, leaveDays: 3, contractStart: '2026/06/01', contractEnd: '' },
      undefined,
      analysisStart,
      elapsedEnd
    );
    expect(result).toBe(calendarMax); // 15(実績合計)ではなく、カレンダー基準の値
    expect(result).toBeGreaterThan(10 + 2 + 3);
  });

  it('契約開始日が月途中なら、開始日から経過時点までのカレンダー営業日数になる', () => {
    const result = resolvePartnerElapsedDays(
      { workDays: 5, absentDays: 0, leaveDays: 0, contractStart: '2026/07/15', contractEnd: '' },
      undefined,
      analysisStart,
      elapsedEnd
    );
    const expected = countWeekdaysInRange(new Date('2026-07-15'), elapsedEnd);
    expect(result).toBe(expected);
  });

  it('契約終了日があれば、分析期間開始から契約終了日までのカレンダー営業日数になる', () => {
    const result = resolvePartnerElapsedDays(
      { workDays: 5, absentDays: 0, leaveDays: 0, contractStart: '2026/06/01', contractEnd: '2026/07/10' },
      undefined,
      analysisStart,
      elapsedEnd
    );
    const expected = countWeekdaysInRange(analysisStart, new Date('2026-07-10'));
    expect(result).toBe(expected);
  });

  it('手動で活動期間が設定されていれば、CSVの契約開始日より手動設定が優先される', () => {
    const result = resolvePartnerElapsedDays(
      { workDays: 5, absentDays: 0, leaveDays: 0, contractStart: '2026/06/01', contractEnd: '' },
      { startDate: '2026-07-20' },
      analysisStart,
      elapsedEnd
    );
    const expected = countWeekdaysInRange(new Date('2026-07-20'), elapsedEnd);
    expect(result).toBe(expected);
  });

  it('契約開始日が不正な文字列なら、実績合計にフォールバックする', () => {
    const result = resolvePartnerElapsedDays(
      { workDays: 15, absentDays: 1, leaveDays: 2, contractStart: '不明', contractEnd: '' },
      undefined,
      analysisStart,
      elapsedEnd
    );
    expect(result).toBe(18);
  });

  // パートナーは正社員XLSXが無くても単独で分析される可能性があるため、
  // CSV自身が持つ「対象年月」列から期間を決定できるようにする。
  // 正社員XLSX由来のanalysisStart/elapsedEndには依存しない。
  describe('targetMonthが設定されている場合、CSV自身の対象年月を優先する', () => {
    it('対象月が完全に経過済みなら、正社員側のanalysisStart/elapsedEndが的外れでも対象月ベースの営業日数（祝日除外）になる', () => {
      // analysisStart/elapsedEndは意図的に無関係な値を渡し、無視されることを確認する
      const irrelevantStart = new Date('2020-01-01');
      const irrelevantEnd = new Date('2020-01-01');
      const now = new Date('2026-08-05'); // 対象月(7月)が完全に経過した後

      const result = resolvePartnerElapsedDays(
        {
          workDays: 10, absentDays: 0, leaveDays: 0,
          contractStart: '2026/06/01', contractEnd: '',
          targetMonth: '2026/07',
        },
        undefined,
        irrelevantStart,
        irrelevantEnd,
        now
      );

      // 2026年7月の祝日除外後の営業日数は22日
      expect(result).toBe(22);
    });

    it('対象月がまだ進行中なら、今日時点までの営業日数にクリップされる', () => {
      const now = new Date('2026-07-15'); // 7月15日時点（月の途中）

      const result = resolvePartnerElapsedDays(
        {
          workDays: 5, absentDays: 0, leaveDays: 0,
          contractStart: '2026/06/01', contractEnd: '',
          targetMonth: '2026/07',
        },
        undefined,
        new Date('2020-01-01'),
        new Date('2020-01-01'),
        now
      );

      const expected = countWeekdaysInRange(new Date('2026-07-01'), new Date('2026-07-15'));
      expect(result).toBe(expected);
      expect(result).toBeLessThan(22);
    });

    it('targetMonthが未設定なら、従来通り引数のanalysisStart/elapsedEndを使う（後方互換）', () => {
      const result = resolvePartnerElapsedDays(
        { workDays: 10, absentDays: 0, leaveDays: 0, contractStart: '2026/06/01', contractEnd: '' },
        undefined,
        analysisStart,
        elapsedEnd
      );
      const expected = countWeekdaysInRange(analysisStart, elapsedEnd);
      expect(result).toBe(expected);
    });
  });
});

describe('resolveTargetMonthRange', () => {
  it('"YYYY/MM"形式から月初〜月末のDateレンジを返す', () => {
    const range = resolveTargetMonthRange('2026/07');
    expect(range).toBeDefined();
    expect(range!.start.getFullYear()).toBe(2026);
    expect(range!.start.getMonth()).toBe(6); // 0-indexed: 7月
    expect(range!.start.getDate()).toBe(1);
    expect(range!.end.getMonth()).toBe(6);
    expect(range!.end.getDate()).toBe(31);
  });

  it('1桁月("2026/2")でも正しく2月末（28日）を返す', () => {
    const range = resolveTargetMonthRange('2026/2');
    expect(range!.end.getDate()).toBe(28);
  });

  it('不正な形式ならundefinedを返す', () => {
    expect(resolveTargetMonthRange('')).toBeUndefined();
    expect(resolveTargetMonthRange('不明')).toBeUndefined();
    expect(resolveTargetMonthRange('2026-07')).toBeUndefined();
  });
});
