// src/utils/eStaffingCsv.ts
// e-staffing パートナー社員勤怠CSVのパース
//
// 実際のe-staffingエクスポートには「契約開始/契約終了」列を含む形式と
// 含まない形式の両方が存在する。列を固定インデックスで読むと、契約列を
// 含まないCSVでは以降の数値列が2列分ズレて全て誤った値になる。
// そのためヘッダー行の列名からインデックスを解決する。

export interface EStaffingRecord {
  name: string;
  staffCode: string;
  department: string;
  contractStart: string;
  contractEnd: string;
  workDays: number;
  absentDays: number;
  leaveDays: number;
  totalMinutes: number;
  baseMinutes: number;
  overtimeMinutes: number;
  targetMonth: string;
  note: string;
}

export function parseCsvFields(line: string): string[] {
  const fields: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
      else inQuotes = !inQuotes;
    } else if (ch === ',' && !inQuotes) {
      fields.push(current); current = '';
    } else {
      current += ch;
    }
  }
  fields.push(current);
  return fields;
}

// 東SI{A}-{B}-{C} → 13D5{A}{B}{C}0 (XLSX側部署コードに統一)
export function normalizeEStaffingDept(dept: string): string {
  const m = dept.trim().match(/^東SI(\d+)-(\d+)-(\d+)$/);
  if (m) return `13D5${m[1]}${m[2]}${m[3]}0`;
  return dept.trim();
}

const COLUMN_NAMES: Record<keyof EStaffingRecord, string> = {
  name: '氏名',
  staffCode: 'スタッフコード',
  department: '部署',
  contractStart: '契約開始',
  contractEnd: '契約終了',
  workDays: '出勤日数',
  absentDays: '欠勤日数',
  leaveDays: '年休日数',
  totalMinutes: '総就業時間_分',
  baseMinutes: '基準内時間_分',
  overtimeMinutes: '基準外時間_分',
  targetMonth: '対象年月',
  note: '備考',
};

const NUMERIC_COLUMNS: (keyof EStaffingRecord)[] = [
  'workDays', 'absentDays', 'leaveDays', 'totalMinutes', 'baseMinutes', 'overtimeMinutes',
];

export function parseEStaffingCsv(text: string): EStaffingRecord[] {
  const lines = text.replace(/^﻿/, '').split('\n').map(l => l.trim()).filter(l => l.length > 0);
  if (lines.length < 2) return [];

  const header = parseCsvFields(lines[0]).map(h => h.trim());
  const columnIndex = Object.fromEntries(
    (Object.keys(COLUMN_NAMES) as (keyof EStaffingRecord)[]).map(key => [key, header.indexOf(COLUMN_NAMES[key])])
  ) as Record<keyof EStaffingRecord, number>;

  return lines.slice(1).map(line => {
    const f = parseCsvFields(line);
    const at = (key: keyof EStaffingRecord): string => {
      const idx = columnIndex[key];
      return idx >= 0 ? (f[idx] ?? '') : '';
    };

    const record = {} as EStaffingRecord;
    for (const key of Object.keys(COLUMN_NAMES) as (keyof EStaffingRecord)[]) {
      const raw = at(key);
      if ((NUMERIC_COLUMNS as string[]).includes(key)) {
        (record as any)[key] = parseInt(raw) || 0;
      } else if (key === 'department') {
        record.department = normalizeEStaffingDept(raw);
      } else {
        (record as any)[key] = raw;
      }
    }
    return record;
  });
}
