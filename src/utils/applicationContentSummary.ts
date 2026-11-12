// src/utils/applicationContentSummary.ts
// 申請内容（applicationContent）の集計: 完全一致でグルーピングし、
// 件数の多い順に並べる。マウスオーバーで対象者・日付を確認する用途。

import { AttendanceRecord } from '../models/AttendanceTypes';

export interface ApplicationContentOccurrence {
  employeeName: string;
  department: string;
  date: Date;
}

export interface ApplicationContentSummary {
  content: string;
  count: number;
  occurrences: ApplicationContentOccurrence[];
}

/**
 * 申請内容を完全一致でグルーピングし、件数の多い順（同数は申請内容の文字コード順）に集計する。
 * 空文字・空白のみの申請内容は除外する。
 */
export function summarizeApplicationContents(records: AttendanceRecord[]): ApplicationContentSummary[] {
  const map = new Map<string, ApplicationContentOccurrence[]>();

  records.forEach(record => {
    const content = (record.applicationContent || '').trim();
    if (!content) return;

    const occurrences = map.get(content) ?? [];
    occurrences.push({
      employeeName: record.employeeName,
      department: record.department,
      date: record.date,
    });
    map.set(content, occurrences);
  });

  return Array.from(map.entries())
    .map(([content, occurrences]) => ({
      content,
      count: occurrences.length,
      occurrences: occurrences.slice().sort((a, b) => a.date.getTime() - b.date.getTime()),
    }))
    .sort((a, b) => b.count - a.count || a.content.localeCompare(b.content));
}

/**
 * マウスオーバー用のツールチップテキストを生成する（"氏名 M/D" を1行ずつ）。
 */
export function formatOccurrencesTooltip(occurrences: ApplicationContentOccurrence[]): string {
  return occurrences
    .map(o => `${o.employeeName} ${o.date.getMonth() + 1}/${o.date.getDate()}`)
    .join('\n');
}
