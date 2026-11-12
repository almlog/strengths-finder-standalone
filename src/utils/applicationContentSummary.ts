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

// スケジュール記法（例: "900-1730/1200-1300/7.75" "830-1700/1200-1300/7.75/5"）
// 楽楽勤怠が始業・終業・休憩・所定時間を内部的に申請内容欄に埋め込む形式で、
// 利用者が入力した申請ではないため一覧に出さない。
const SCHEDULE_NOTATION_PATTERN = /^\d{3,4}-\d{3,4}(?:\/\d{3,4}-\d{3,4})*(?:\/[\d.]+)*$/;

// 「残業終了」もAltX残業の技術的マーカーであり申請ではないため除外する。
const NON_APPLICATION_MARKERS = new Set(['残業終了']);

/**
 * 申請内容のセグメント（カンマ区切りの1要素）が、申請とは無関係な
 * スケジュール記法・システムマーカーかどうかを判定する。
 */
function isNonApplicationSegment(segment: string): boolean {
  return NON_APPLICATION_MARKERS.has(segment) || SCHEDULE_NOTATION_PATTERN.test(segment);
}

/**
 * 申請内容を完全一致でグルーピングし、件数の多い順（同数は申請内容の文字コード順）に集計する。
 * 空文字・空白のみの申請内容、およびスケジュール記法/システムマーカーのみの
 * 申請内容（例: "残業終了,900-1730/1200-1300/7.75"）は除外する。
 */
export function summarizeApplicationContents(records: AttendanceRecord[]): ApplicationContentSummary[] {
  const map = new Map<string, ApplicationContentOccurrence[]>();

  records.forEach(record => {
    const content = (record.applicationContent || '').trim();
    if (!content) return;

    const segments = content.split(',').map(s => s.trim()).filter(s => s.length > 0);
    if (segments.length === 0 || segments.every(isNonApplicationSegment)) return;

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
