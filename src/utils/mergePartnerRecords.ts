// src/utils/mergePartnerRecords.ts
// パートナー（e-staffing）CSV再取込み時のレコードマージ
//
// 数値項目（勤務日数・残業分など）はCSVパース時点で「未パース」も「本当の0」も
// 同じ0になるため、incoming側の値を条件付きで採用すると正当な0が古い値に
// 上書きされてしまう。数値項目はincomingを常に正として採用し、文字列項目
// （契約期間など）のみ空欄ならexistingを維持する。

import { EStaffingRecord } from './eStaffingCsv';

export function mergePartnerRecords(
  existing: EStaffingRecord[],
  incoming: EStaffingRecord[],
  mode: 'overwrite' | 'merge' | 'replace'
): EStaffingRecord[] {
  if (mode === 'replace') return incoming;

  const getKey = (r: EStaffingRecord) => r.staffCode || r.name;
  const incomingKeys = new Set(incoming.map(getKey));

  if (mode === 'overwrite') {
    const existingFiltered = existing.filter(r => !incomingKeys.has(getKey(r)));
    return [...existingFiltered, ...incoming];
  }

  // merge: 数値項目はincomingを常に採用、文字列項目はincomingが空欄ならexistingを維持
  const existingMap = new Map(existing.map(r => [getKey(r), r]));
  incoming.forEach(inc => {
    const key = getKey(inc);
    const ex = existingMap.get(key);
    if (!ex) {
      existingMap.set(key, inc);
    } else {
      existingMap.set(key, {
        name: inc.name || ex.name,
        staffCode: inc.staffCode || ex.staffCode,
        department: inc.department || ex.department,
        contractStart: inc.contractStart || ex.contractStart,
        contractEnd: inc.contractEnd || ex.contractEnd,
        workDays: inc.workDays,
        absentDays: inc.absentDays,
        leaveDays: inc.leaveDays,
        totalMinutes: inc.totalMinutes,
        baseMinutes: inc.baseMinutes,
        overtimeMinutes: inc.overtimeMinutes,
        targetMonth: inc.targetMonth || ex.targetMonth,
        note: inc.note || ex.note,
      });
    }
  });
  // existing にいて incoming にいない人も保持
  existing.forEach(ex => {
    const key = getKey(ex);
    if (!incomingKeys.has(key)) {
      existingMap.set(key, ex);
    }
  });
  return Array.from(existingMap.values());
}
