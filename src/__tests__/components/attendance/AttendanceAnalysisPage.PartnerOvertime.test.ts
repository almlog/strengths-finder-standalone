// パートナー（e-staffing）法定外残業: CSVのovertimeMinutesを正として使うことの検証
// 修正前バグ: 独自計算式 max(0, totalMinutes - workDays*465) がCSV値と乖離していた

import { getPartnerOvertimeMinutes, PartnerOvertimeSource } from '../../../utils/partnerOvertime';

const createPartnerRecord = (overrides: Partial<PartnerOvertimeSource> = {}): PartnerOvertimeSource => ({
  totalMinutes: 9600, // 160h
  workDays: 20,
  overtimeMinutes: 600, // CSV上の法定外残業（正）
  ...overrides,
});

describe('getPartnerOvertimeMinutes - CSVのovertimeMinutesを正として使用する', () => {
  it('CSVのovertimeMinutesをそのまま返す', () => {
    const record = createPartnerRecord({ overtimeMinutes: 600 });
    expect(getPartnerOvertimeMinutes(record)).toBe(600);
  });

  it('旧計算式(totalMinutes - workDays*465)とCSV値が乖離するケースでもCSV値を優先する', () => {
    // 旧式なら max(0, 9600 - 20*465) = max(0, 300) = 300 になってしまうが、
    // CSVの法定外残業が120分なら120を返すべき
    const record = createPartnerRecord({
      totalMinutes: 9600,
      workDays: 20,
      overtimeMinutes: 120,
    });
    expect(getPartnerOvertimeMinutes(record)).toBe(120);
  });

  it('overtimeMinutesが0なら0を返す', () => {
    const record = createPartnerRecord({ overtimeMinutes: 0 });
    expect(getPartnerOvertimeMinutes(record)).toBe(0);
  });
});
