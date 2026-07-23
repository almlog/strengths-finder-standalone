// 工数稼働率の算出テスト
// 旧実装は「有休調整後の差異」= 実稼働工数 - (基準工数 - 有休時間) を主指標にしていたが、
// これは代数的に 生差異(実稼働-基準工数) + 有休時間 と完全に同値であり、
// 「有休を取得した分がそのまま超過扱いに加算される」という誤解を招く表現だった。
// 有休調整を廃止し、生の差異・稼働率のみを算出する。

import { calculateCapacityUtilization } from '../../utils/capacityUtilization';

describe('calculateCapacityUtilization', () => {
  it('基準工数と実稼働工数から、有休調整なしの生の差異・稼働率を算出する', () => {
    // 21日×7.5h×4名 = 630:00(37800分), 実稼働 665:21(39921分)
    const result = calculateCapacityUtilization({
      expectedMinutesPassed: 37800,
      actualMinutes: 39921,
    });

    expect(result.delta).toBe(2121); // 35:21 相当
    expect(result.rate).toBeCloseTo(105.61, 1);
  });

  it('有休時間を引数に取らない（有休調整を行わないことの構造的な保証）', () => {
    const result = calculateCapacityUtilization({
      expectedMinutesPassed: 37800,
      actualMinutes: 39921,
    });
    // leaveMinutes等のキーを受け付ける余地がないことを型として保証する
    expect(Object.keys(result).sort()).toEqual(['delta', 'rate']);
  });

  it('実稼働工数が基準工数を下回る場合はマイナスの差異になる', () => {
    const result = calculateCapacityUtilization({
      expectedMinutesPassed: 37800,
      actualMinutes: 30000,
    });
    expect(result.delta).toBe(-7800);
    expect(result.rate).toBeCloseTo(79.37, 1);
  });

  it('基準工数が0でもゼロ除算にならない', () => {
    const result = calculateCapacityUtilization({
      expectedMinutesPassed: 0,
      actualMinutes: 100,
    });
    expect(Number.isFinite(result.rate)).toBe(true);
  });
});
