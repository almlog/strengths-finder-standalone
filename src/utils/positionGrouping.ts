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
