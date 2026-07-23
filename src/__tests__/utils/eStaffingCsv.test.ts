// e-staffing CSVパーサーのテスト
// バグ: 列を固定インデックスで読んでいたため、「契約開始/契約終了」列を含まない
// CSV（実際に出力されるフォーマットの一つ）を読み込むと、以降の数値列が
// 2列分ズレて全て誤った値になっていた（出勤日数が0、欠勤日数に総就業時間の値が
// 入る等）。ヘッダー行の列名からインデックスを解決する方式に修正する。

import { parseEStaffingCsv } from '../../utils/eStaffingCsv';

describe('parseEStaffingCsv', () => {
  it('契約開始/契約終了列を含む13列フォーマットを正しくパースする', () => {
    const csv = [
      '氏名,スタッフコード,部署,契約開始,契約終了,出勤日数,欠勤日数,年休日数,総就業時間_分,基準内時間_分,基準外時間_分,対象年月,備考',
      '笠岡 愛未,akasaoka,東SI1-1-3,2026/06/08,2026/09/30,17,0,0,7650,7650,0,2026/06,6/8参画',
    ].join('\n');

    const [r] = parseEStaffingCsv(csv);

    expect(r.name).toBe('笠岡 愛未');
    expect(r.staffCode).toBe('akasaoka');
    expect(r.contractStart).toBe('2026/06/08');
    expect(r.contractEnd).toBe('2026/09/30');
    expect(r.workDays).toBe(17);
    expect(r.absentDays).toBe(0);
    expect(r.leaveDays).toBe(0);
    expect(r.totalMinutes).toBe(7650);
    expect(r.baseMinutes).toBe(7650);
    expect(r.overtimeMinutes).toBe(0);
    expect(r.targetMonth).toBe('2026/06');
    expect(r.note).toBe('6/8参画');
  });

  it('契約開始/契約終了列を含まない11列フォーマットでも列ズレせずパースする（実障害の再現）', () => {
    const csv = [
      '氏名,スタッフコード,部署,出勤日数,欠勤日数,年休日数,総就業時間_分,基準内時間_分,基準外時間_分,対象年月,備考',
      '"鈴木 芽衣","msuzuki","東SI1-1-1","19","0","0","11630","9120","2510","2026/01",""',
    ].join('\n');

    const [r] = parseEStaffingCsv(csv);

    expect(r.name).toBe('鈴木 芽衣');
    expect(r.staffCode).toBe('msuzuki');
    expect(r.contractStart).toBe(''); // 存在しない列
    expect(r.contractEnd).toBe('');
    expect(r.workDays).toBe(19); // 修正前バグ: 0 になっていた
    expect(r.absentDays).toBe(0); // 修正前バグ: 11630 になっていた
    expect(r.leaveDays).toBe(0);
    expect(r.totalMinutes).toBe(11630); // 修正前バグ: 2510 になっていた
    expect(r.baseMinutes).toBe(9120);
    expect(r.overtimeMinutes).toBe(2510); // 修正前バグ: 0 になっていた
    expect(r.targetMonth).toBe('2026/01');
    expect(r.note).toBe('');
  });

  it('東SI{A}-{B}-{C}形式の部署コードをXLSX側の形式に変換する', () => {
    const csv = [
      '氏名,スタッフコード,部署,出勤日数,欠勤日数,年休日数,総就業時間_分,基準内時間_分,基準外時間_分,対象年月,備考',
      'テスト太郎,T001,東SI1-1-1,19,0,0,11630,9120,2510,2026/01,',
    ].join('\n');

    const [r] = parseEStaffingCsv(csv);
    expect(r.department).toBe('13D51110');
  });
});
