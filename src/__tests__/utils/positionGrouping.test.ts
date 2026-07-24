// メンバー交代（前半A・後半B）を「1ポジション」としてカウントするためのテスト
// 例: Aさんが月14日まで、Bさんが15日から在籍した場合、
// 工数としては1人月分しか使っていないのに、人数カウントでは2名になってしまい、
// 平均残業などの1人あたり指標が実態より低く出てしまう問題を解消する。

import { countDistinctPositions } from '../../utils/positionGrouping';

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
