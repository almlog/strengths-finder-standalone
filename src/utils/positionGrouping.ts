// src/utils/positionGrouping.ts
// メンバー交代（前半A・後半B）を「1ポジション」として人数カウントする
//
// 工数（capacityStatsの分母）は個人ごとの経過営業日数を合算しているため
// 交代があっても自動的に正しい値になるが、人数カウント・1人あたり指標は
// 素朴に従業員数を数えると交代分だけ水増しされる。同じグループ名を持つ
// メンバーは1名として数える。

export function countDistinctPositions(
  employeeIds: string[],
  groupAssignments: Map<string, string> | undefined
): number {
  const seen = new Set<string>();
  for (const id of employeeIds) {
    const group = groupAssignments?.get(id)?.trim();
    seen.add(group ? `group:${group}` : `id:${id}`);
  }
  return seen.size;
}

export interface PositionGroupSummary {
  rawCount: number;         // グループ化前の素の人数（正社員+パートナーの記録件数）
  total: number;            // グループ化後の対象人数
  mergedGroupCount: number; // 2名以上が統合されたグループの件数
}

// 「正社員X名 + パートナーY名」の素の内訳と「対象人数Z名」が矛盾して見えないよう、
// 何件のグループ統合によって差が生まれているかを併せて返す。
export function summarizePositionGroups(
  ids: string[],
  groupAssignments: Map<string, string> | undefined
): PositionGroupSummary {
  const rawCount = ids.length;
  const total = countDistinctPositions(ids, groupAssignments);

  const groupSizes = new Map<string, number>();
  for (const id of ids) {
    const group = groupAssignments?.get(id)?.trim();
    if (group) groupSizes.set(group, (groupSizes.get(group) ?? 0) + 1);
  }
  const mergedGroupCount = Array.from(groupSizes.values()).filter(size => size >= 2).length;

  return { rawCount, total, mergedGroupCount };
}
