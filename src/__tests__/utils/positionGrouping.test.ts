// メンバー交代（前半A・後半B）を「1ポジション」としてカウントするためのテスト
// 例: Aさんが月14日まで、Bさんが15日から在籍した場合、
// 工数としては1人月分しか使っていないのに、人数カウントでは2名になってしまい、
// 平均残業などの1人あたり指標が実態より低く出てしまう問題を解消する。

import { countDistinctPositions, summarizePositionGroups } from '../../utils/positionGrouping';

describe('countDistinctPositions', () => {
  it('グループ未設定なら、そのままの人数を返す', () => {
    const count = countDistinctPositions(['emp1', 'emp2', 'emp3'], undefined);
    expect(count).toBe(3);
  });

  it('グループ設定が空でも、そのままの人数を返す', () => {
    const count = countDistinctPositions(['emp1', 'emp2'], new Map());
    expect(count).toBe(2);
  });

  it('同じグループ名を持つ2名は1名としてカウントされる', () => {
    const groups = new Map([
      ['empA', 'ポジション1'],
      ['empB', 'ポジション1'],
    ]);
    const count = countDistinctPositions(['empA', 'empB', 'empC'], groups);
    expect(count).toBe(2); // (empA+empB)=1 + empC=1
  });

  it('空文字のグループ名は「グループなし」として扱われ、本人単独でカウントされる', () => {
    const groups = new Map([
      ['empA', ''],
      ['empB', '   '],
    ]);
    const count = countDistinctPositions(['empA', 'empB'], groups);
    expect(count).toBe(2);
  });

  it('3名以上が同じグループでも1名としてカウントされる', () => {
    const groups = new Map([
      ['empA', 'ポジション1'],
      ['empB', 'ポジション1'],
      ['empC', 'ポジション1'],
    ]);
    const count = countDistinctPositions(['empA', 'empB', 'empC'], groups);
    expect(count).toBe(1);
  });

  it('グループマップに存在しないIDはそのまま単独カウントされる', () => {
    const groups = new Map([['empA', 'ポジション1']]);
    const count = countDistinctPositions(['empA', 'empX'], groups);
    expect(count).toBe(2);
  });
});

describe('summarizePositionGroups', () => {
  // 正社員4名(raw)+パートナー2名(raw)=6件のうち、正社員1名とパートナー1名が
  // 同じグループに統合されている場合、対象人数は5名になる。
  // 「4名+2名」という素の内訳と「5名」という統合後人数が矛盾して見えないよう、
  // 「何件をグループ化したか」を明示できる情報を返す。
  it('グループ化が無ければ、rawCount=total、mergedGroupCount=0になる', () => {
    const summary = summarizePositionGroups(['e1', 'e2', 'p1'], undefined);
    expect(summary).toEqual({ rawCount: 3, total: 3, mergedGroupCount: 0 });
  });

  it('正社員⇔パートナーをまたぐグループが1件あれば、mergedGroupCount=1でtotalが1減る', () => {
    const groups = new Map([
      ['e1', 'ポジションX'], // 正社員
      ['p1', 'ポジションX'], // パートナー
    ]);
    const summary = summarizePositionGroups(['e1', 'e2', 'e3', 'e4', 'p1', 'p2'], groups);
    expect(summary).toEqual({ rawCount: 6, total: 5, mergedGroupCount: 1 });
  });

  it('3名グループが1件あれば、mergedGroupCount=1でtotalが2減る', () => {
    const groups = new Map([
      ['e1', 'G1'],
      ['e2', 'G1'],
      ['e3', 'G1'],
    ]);
    const summary = summarizePositionGroups(['e1', 'e2', 'e3', 'e4'], groups);
    expect(summary).toEqual({ rawCount: 4, total: 2, mergedGroupCount: 1 });
  });

  it('グループが2件あれば、mergedGroupCount=2になる', () => {
    const groups = new Map([
      ['e1', 'G1'], ['e2', 'G1'],
      ['p1', 'G2'], ['p2', 'G2'],
    ]);
    const summary = summarizePositionGroups(['e1', 'e2', 'p1', 'p2', 'e3'], groups);
    expect(summary).toEqual({ rawCount: 5, total: 3, mergedGroupCount: 2 });
  });
});
