// src/__tests__/utils/applicationContentSummary.test.ts
// 申請内容の集計（件数カウント＋対象者/日付の一覧化）のテスト

import { AttendanceRecord } from '../../models/AttendanceTypes';
import { summarizeApplicationContents, formatOccurrencesTooltip } from '../../utils/applicationContentSummary';

const createRecord = (overrides: Partial<AttendanceRecord> = {}): AttendanceRecord => ({
  employeeId: 'E001',
  employeeName: 'テスト太郎',
  department: '開発部',
  position: '一般',
  date: new Date('2026-11-04'),
  dayOfWeek: '水',
  calendarType: 'weekday',
  calendarRaw: '平日',
  applicationContent: '',
  clockIn: new Date('2026-11-04T09:00:00'),
  clockOut: new Date('2026-11-04T17:30:00'),
  originalClockIn: new Date('2026-11-04T09:00:00'),
  originalClockOut: new Date('2026-11-04T17:30:00'),
  earlyStartFlag: false,
  altxOvertimeIn: null,
  altxOvertimeOut: null,
  privateOutTime: null,
  privateReturnTime: null,
  breakTimeMinutes: 60,
  nightBreakModification: '',
  nightWorkMinutes: '',
  actualWorkHours: '7:30',
  overtimeHours: '',
  lateMinutes: '',
  earlyLeaveMinutes: '',
  remarks: '',
  sheetName: 'テストシート',
  ...overrides,
});

describe('summarizeApplicationContents', () => {
  it('完全一致する申請内容をグルーピングし件数を数える', () => {
    const records = [
      createRecord({ applicationContent: '有休時間', employeeName: 'A', date: new Date('2026-11-04') }),
      createRecord({ applicationContent: '有休時間', employeeName: 'B', date: new Date('2026-11-06') }),
      createRecord({ applicationContent: '電車遅延', employeeName: 'A', date: new Date('2026-11-10') }),
    ];

    const result = summarizeApplicationContents(records);

    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({ content: '有休時間', count: 2 });
    expect(result[1]).toMatchObject({ content: '電車遅延', count: 1 });
  });

  it('件数の多い順にソートされる', () => {
    const records = [
      createRecord({ applicationContent: 'A申請' }),
      createRecord({ applicationContent: 'B申請' }),
      createRecord({ applicationContent: 'B申請' }),
      createRecord({ applicationContent: 'B申請' }),
    ];

    const result = summarizeApplicationContents(records);

    expect(result.map(r => r.content)).toEqual(['B申請', 'A申請']);
  });

  it('空文字・空白のみの申請内容は集計対象から除外する', () => {
    const records = [
      createRecord({ applicationContent: '' }),
      createRecord({ applicationContent: '   ' }),
      createRecord({ applicationContent: '有休' }),
    ];

    const result = summarizeApplicationContents(records);

    expect(result).toHaveLength(1);
    expect(result[0].content).toBe('有休');
  });

  it('各申請の対象者（氏名・部門・日付）を一覧として保持する', () => {
    const records = [
      createRecord({ applicationContent: '有休', employeeName: 'A', department: '開発部', date: new Date('2026-11-04') }),
      createRecord({ applicationContent: '有休', employeeName: 'B', department: '営業部', date: new Date('2026-11-02') }),
    ];

    const result = summarizeApplicationContents(records);

    expect(result[0].occurrences).toHaveLength(2);
    // 日付の昇順で保持される
    expect(result[0].occurrences[0]).toMatchObject({ employeeName: 'B', department: '営業部' });
    expect(result[0].occurrences[1]).toMatchObject({ employeeName: 'A', department: '開発部' });
  });

  it('申請内容の前後の空白はトリムして同一グループにまとめる', () => {
    const records = [
      createRecord({ applicationContent: '有休時間' }),
      createRecord({ applicationContent: ' 有休時間 ' }),
    ];

    const result = summarizeApplicationContents(records);

    expect(result).toHaveLength(1);
    expect(result[0].count).toBe(2);
  });

  it('レコードが空配列の場合は空配列を返す', () => {
    expect(summarizeApplicationContents([])).toEqual([]);
  });

  it('件数が同じ場合は申請内容の文字コード順で安定ソートされる', () => {
    const records = [
      createRecord({ applicationContent: 'B申請' }),
      createRecord({ applicationContent: 'A申請' }),
    ];

    const result = summarizeApplicationContents(records);

    expect(result.map(r => r.content)).toEqual(['A申請', 'B申請']);
  });
});

describe('formatOccurrencesTooltip', () => {
  it('氏名と日付（M/D形式）を1行ずつ並べる', () => {
    const text = formatOccurrencesTooltip([
      { employeeName: 'A', department: '開発部', date: new Date('2026-11-04') },
      { employeeName: 'B', department: '営業部', date: new Date('2026-01-06') },
    ]);

    expect(text).toBe('A 11/4\nB 1/6');
  });

  it('occurrencesが空の場合は空文字を返す', () => {
    expect(formatOccurrencesTooltip([])).toBe('');
  });
});
