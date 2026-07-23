// パートナーCSV再取込み時のマージロジックのテスト
// バグ: mode='merge' で同一人物のレコードをマージする際、
// 「incoming の値が0なら existing の値を使う」という条件式(inc.X !== 0 ? inc.X : ex.X)により、
// incoming が正当に0を報告している場合でも古い値が残ってしまっていた。
// （baseMinutesが未パースで0になり暴走した過去のバグと同根の「0は欠損データか実データか区別できない」問題）

import { mergePartnerRecords } from '../../utils/mergePartnerRecords';
import { EStaffingRecord } from '../../utils/eStaffingCsv';

const createRecord = (overrides: Partial<EStaffingRecord> = {}): EStaffingRecord => ({
  name: 'テスト太郎',
  staffCode: 'T001',
  department: '13D51110',
  contractStart: '',
  contractEnd: '',
  workDays: 19,
  absentDays: 0,
  leaveDays: 0,
  totalMinutes: 11630,
  baseMinutes: 9120,
  overtimeMinutes: 2510,
  targetMonth: '2026/01',
  note: '',
  ...overrides,
});

describe('mergePartnerRecords', () => {
  it('mode=merge: incomingが正当な0を報告した場合、existingの古い値ではなく0を採用する', () => {
    const existing = [createRecord({ overtimeMinutes: 2510 })];
    const incoming = [createRecord({ overtimeMinutes: 0 })]; // 今回は残業0だった

    const [result] = mergePartnerRecords(existing, incoming, 'merge');

    expect(result.overtimeMinutes).toBe(0); // 旧実装では2510のまま残ってしまうバグがあった
  });

  it('mode=merge: incomingにない人物はexistingのまま保持される', () => {
    const existing = [createRecord({ staffCode: 'T001' }), createRecord({ staffCode: 'T002', name: '別太郎' })];
    const incoming = [createRecord({ staffCode: 'T001', overtimeMinutes: 100 })];

    const result = mergePartnerRecords(existing, incoming, 'merge');

    expect(result).toHaveLength(2);
    expect(result.find(r => r.staffCode === 'T002')).toBeDefined();
  });

  it('mode=merge: 契約開始/契約終了など文字列項目はincomingが空欄ならexistingを維持する', () => {
    const existing = [createRecord({ contractStart: '2026/01/01', contractEnd: '2026/03/31' })];
    const incoming = [createRecord({ contractStart: '', contractEnd: '' })];

    const [result] = mergePartnerRecords(existing, incoming, 'merge');

    expect(result.contractStart).toBe('2026/01/01');
    expect(result.contractEnd).toBe('2026/03/31');
  });

  it('mode=overwrite: incomingに含まれる人物は全項目incomingで置き換わる', () => {
    const existing = [createRecord({ overtimeMinutes: 2510 })];
    const incoming = [createRecord({ overtimeMinutes: 0 })];

    const [result] = mergePartnerRecords(existing, incoming, 'overwrite');

    expect(result.overtimeMinutes).toBe(0);
  });

  it('mode=replace: incomingで完全に置き換わる', () => {
    const existing = [createRecord({ staffCode: 'T999' })];
    const incoming = [createRecord({ staffCode: 'T001' })];

    const result = mergePartnerRecords(existing, incoming, 'replace');

    expect(result).toEqual(incoming);
  });
});
