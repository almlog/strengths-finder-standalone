# チームシミュレーション - グループ資質分析機能仕様書

**バージョン**: 1.0
**作成日**: 2025-10-31
**完了日**: 2025-11-01
**ステータス**: ✅ Completed（v3.2.1で実装完了）

---

## 1. 概要

### 1.1 目的

チームシミュレーション機能において、動的に編成されたグループの資質分析をリアルタイムで提供し、組織変更やチーム編成の意思決定を支援する。

### 1.2 背景

現在のチームシミュレーション機能は以下を提供：
- メンバー数のカウント
- 強みグループ分布（4カテゴリ）の集計
- 利益率情報（マネージャーモード時）

**不足している機能**：
- グループ全体の相性スコア
- チーム適合度の分析
- リーダーシップバランスの可視化
- メンバー間の相性評価

これらの高度な分析機能を追加することで、単なる人数配置ではなく、**データに基づいた最適なチーム編成**が可能になる。

### 1.3 スコープ

**対象範囲**：
- グループごとの平均相性スコア計算
- グループごとの平均チーム適合度計算
- グループごとの平均リーダーシップ潜在力計算
- チーム特性の自動判定（バランス型、強化カテゴリ、弱点カテゴリ）
- リアルタイム分析結果のUI表示

**対象外**：
- メンバー間の1対1相性マトリクス（将来拡張で検討）
- グループ間の比較分析（将来拡張で検討）
- 推奨配置のAI提案（将来拡張で検討）

---

## 2. 要件定義

### 2.1 機能要件

#### FR-1: グループ分析計算
- **要件**: グループに所属するメンバーの個人分析を集計し、グループ全体の分析結果を算出する
- **入力**:
  - メンバー配列（MemberStrengths[]）
  - PersonalityAnalysisEngineインスタンス
- **出力**: GroupAnalysis型オブジェクト
- **制約**:
  - メンバー0人の場合はnullを返す
  - MBTIデータがないメンバーは資質のみで簡易分析
  - 分析失敗したメンバーは集計から除外

#### FR-2: リアルタイム更新
- **要件**: メンバーの移動時に分析結果を自動再計算
- **トリガー**: SimulationContextのstate変更
- **更新タイミング**: React.useMemoによる最適化（依存配列: state, memberMap）

#### FR-3: UI表示
- **要件**: GroupCardコンポーネントに分析結果を表示
- **表示項目**:
  - 平均相性スコア（0-100、小数第1位）
  - 平均チーム適合度（0-100、小数第1位）
  - 平均リーダーシップ（0-100、小数第1位）
  - チーム特性バッジ（バランス型、強化カテゴリ）
- **色分け**:
  - 高スコア（70以上）: 緑
  - 中スコア（40-69）: 青
  - 低スコア（40未満）: 黄

### 2.2 非機能要件

#### NFR-1: パフォーマンス
- **要件**: グループあたりの分析計算は50ms以内
- **計測方法**: console.timeで計測
- **想定負荷**: 最大10グループ × 10メンバー = 100件の個人分析

#### NFR-2: 拡張性
- **要件**: 将来的な分析指標追加に対応できる設計
- **設計原則**: GroupAnalysis型にフィールド追加可能な構造

#### NFR-3: 保守性
- **要件**: TDD原則に従い、テストカバレッジ90%以上
- **ドキュメント**: JSDocコメント必須

---

## 3. データモデル

### 3.1 GroupAnalysis型

```typescript
/**
 * グループ分析結果
 *
 * @description
 * PersonalityAnalysisEngineによる個人分析を集計した
 * グループ全体の分析データ
 */
export interface GroupAnalysis {
  /** メンバー数（分析対象） */
  memberCount: number;

  /** 平均相性スコア（0-100） */
  avgSynergyScore: number | null;

  /** 平均チーム適合度（0-100） */
  avgTeamFit: number | null;

  /** 平均リーダーシップ潜在力（0-100） */
  avgLeadership: number | null;

  /** チーム特性 */
  teamCharacteristics: {
    /** バランスの取れたチーム（4カテゴリがすべて閾値以上） */
    isBalanced: boolean;

    /** 強化されているカテゴリ（平均以上） */
    strongCategories: StrengthGroup[];

    /** 弱いカテゴリ（平均未満） */
    weakCategories: StrengthGroup[];

    /** リーダーシップ分布 */
    leadershipDistribution: {
      /** 高リーダーシップ（70以上）の人数 */
      high: number;
      /** 中リーダーシップ（40-69）の人数 */
      medium: number;
      /** 低リーダーシップ（40未満）の人数 */
      low: number;
    };
  };

  /** 個人分析結果の配列（詳細表示用、オプション） */
  memberAnalyses?: AnalysisResult[];
}
```

### 3.2 GroupStats型の拡張

```typescript
export interface GroupStats {
  memberCount: number;
  groupDistribution: Record<StrengthGroup, number>;
  profitability?: {
    totalRevenue: number;
    totalCost: number;
    totalProfit: number;
    profitMargin: number;
  };

  // 🆕 追加フィールド
  analysis?: GroupAnalysis | null;
}
```

---

## 4. 計算ロジック詳細

### 4.1 平均スコア計算

#### 4.1.1 平均相性スコア（avgSynergyScore）

```typescript
/**
 * 計算式:
 * avgSynergyScore = Σ(個人の相性スコア) / 分析成功人数
 *
 * 条件:
 * - MBTIデータがあるメンバーのみ対象
 * - 資質のみのメンバーは除外（相性スコアはMBTI×資質の統合指標）
 * - 分析失敗（null）は集計から除外
 */
function calculateAvgSynergyScore(analyses: AnalysisResult[]): number | null {
  const validAnalyses = analyses.filter(a => a.synergyScore !== null);
  if (validAnalyses.length === 0) return null;

  const sum = validAnalyses.reduce((acc, a) => acc + a.synergyScore!, 0);
  return sum / validAnalyses.length;
}
```

#### 4.1.2 平均チーム適合度（avgTeamFit）

```typescript
/**
 * 計算式:
 * avgTeamFit = Σ(個人のチーム適合度) / 分析成功人数
 *
 * 条件:
 * - すべてのメンバーが対象（資質のみでも計算可能）
 * - Belbin理論ベースのスコア
 */
function calculateAvgTeamFit(analyses: AnalysisResult[]): number | null {
  const validAnalyses = analyses.filter(a => a.teamFit !== null);
  if (validAnalyses.length === 0) return null;

  const sum = validAnalyses.reduce((acc, a) => acc + a.teamFit!, 0);
  return sum / validAnalyses.length;
}
```

#### 4.1.3 平均リーダーシップ（avgLeadership）

```typescript
/**
 * 計算式:
 * avgLeadership = Σ(個人のリーダーシップ) / 分析成功人数
 *
 * 条件:
 * - すべてのメンバーが対象（資質のみでも計算可能）
 */
function calculateAvgLeadership(analyses: AnalysisResult[]): number | null {
  const validAnalyses = analyses.filter(a => a.leadership !== null);
  if (validAnalyses.length === 0) return null;

  const sum = validAnalyses.reduce((acc, a) => acc + a.leadership!, 0);
  return sum / validAnalyses.length;
}
```

### 4.2 チーム特性判定

#### 4.2.1 バランス判定（isBalanced）

```typescript
/**
 * 判定基準:
 * 4つの強みグループ（実行力・影響力・人間関係構築力・戦略的思考力）が
 * すべて閾値以上の資質数を持つ場合、バランス型と判定
 *
 * 閾値 = メンバー数 * 5資質 / 4カテゴリ = メンバー数 * 1.25
 */
function isBalancedTeam(
  groupDistribution: Record<StrengthGroup, number>,
  memberCount: number
): boolean {
  const threshold = memberCount * 1.25;

  return Object.values(groupDistribution).every(count => count >= threshold);
}
```

#### 4.2.2 強化カテゴリ判定（strongCategories）

```typescript
/**
 * 判定基準:
 * 平均資質数を上回るカテゴリを強化カテゴリと判定
 *
 * 平均 = 総資質数 / 4カテゴリ
 */
function findStrongCategories(
  groupDistribution: Record<StrengthGroup, number>
): StrengthGroup[] {
  const total = Object.values(groupDistribution).reduce((a, b) => a + b, 0);
  const average = total / 4;

  return Object.entries(groupDistribution)
    .filter(([_, count]) => count > average)
    .map(([group, _]) => group as StrengthGroup);
}
```

#### 4.2.3 弱点カテゴリ判定（weakCategories）

```typescript
/**
 * 判定基準:
 * 平均資質数を下回るカテゴリを弱点カテゴリと判定
 */
function findWeakCategories(
  groupDistribution: Record<StrengthGroup, number>
): StrengthGroup[] {
  const total = Object.values(groupDistribution).reduce((a, b) => a + b, 0);
  const average = total / 4;

  return Object.entries(groupDistribution)
    .filter(([_, count]) => count < average)
    .map(([group, _]) => group as StrengthGroup);
}
```

#### 4.2.4 リーダーシップ分布（leadershipDistribution）

```typescript
/**
 * 判定基準:
 * - 高: leadership >= 70
 * - 中: 40 <= leadership < 70
 * - 低: leadership < 40
 */
function analyzeLeadershipDistribution(
  analyses: AnalysisResult[]
): { high: number; medium: number; low: number } {
  const distribution = { high: 0, medium: 0, low: 0 };

  analyses.forEach(a => {
    if (a.leadership === null) return;

    if (a.leadership >= 70) distribution.high++;
    else if (a.leadership >= 40) distribution.medium++;
    else distribution.low++;
  });

  return distribution;
}
```

---

## 5. UI仕様

### 5.1 GroupCard表示仕様

#### 5.1.1 配置

```
┌─────────────────────────────────────┐
│ グループ名 (3人)          [編集] [×]│
├─────────────────────────────────────┤
│ [メンバーカード1]                    │
│ [メンバーカード2]                    │
│ [メンバーカード3]                    │
├─────────────────────────────────────┤
│ 強み分布                             │
│ [円グラフ]                           │
├─────────────────────────────────────┤
│ 🆕 チーム分析                        │
│ 平均相性スコア:     85.3            │
│ チーム適合度:       72.1            │
│ リーダーシップ:     58.4            │
│                                     │
│ [バランス型] [戦略強化] [人間関係強化]│
├─────────────────────────────────────┤
│ 利益率: 42.5% (マネージャーモード時) │
└─────────────────────────────────────┘
```

#### 5.1.2 スコア表示

```tsx
<div className="flex justify-between items-center">
  <span className="text-gray-600 dark:text-gray-400">平均相性スコア:</span>
  <span className={`font-medium ${getScoreColor(avgSynergyScore)}`}>
    {avgSynergyScore?.toFixed(1) ?? 'N/A'}
  </span>
</div>
```

**色分け関数**:
```typescript
function getScoreColor(score: number | null): string {
  if (score === null) return 'text-gray-400';
  if (score >= 70) return 'text-green-600 dark:text-green-400';
  if (score >= 40) return 'text-blue-600 dark:text-blue-400';
  return 'text-yellow-600 dark:text-yellow-400';
}
```

#### 5.1.3 バッジ表示

```tsx
<div className="flex flex-wrap gap-1 mt-2">
  {teamCharacteristics.isBalanced && (
    <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 rounded text-xs">
      バランス型
    </span>
  )}
  {teamCharacteristics.strongCategories.map(cat => (
    <span key={cat} className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded text-xs">
      {GROUP_LABELS[cat]}強化
    </span>
  ))}
  {teamCharacteristics.weakCategories.length > 0 && (
    <span className="px-2 py-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 rounded text-xs">
      弱点: {teamCharacteristics.weakCategories.map(c => GROUP_LABELS[c].substring(0,2)).join('・')}
    </span>
  )}
</div>
```

---

## 6. データフロー

### 6.1 計算フロー

```
[メンバー移動]
      ↓
[SimulationContext.moveMember]
      ↓
[state更新]
      ↓
[TeamSimulation.tsx: useMemo再実行]
      ↓
[SimulationService.calculateGroupStats]
      ↓
[SimulationService.calculateGroupAnalysis] ← 🆕 新規追加
      ↓
[PersonalityAnalysisEngine.analyze × N人]
      ↓
[集計・判定ロジック実行]
      ↓
[GroupStats + GroupAnalysis返却]
      ↓
[GroupCard表示更新]
```

### 6.2 依存関係

```
TeamSimulation.tsx
  ↓ uses
SimulationService.calculateGroupStats()
  ↓ calls
SimulationService.calculateGroupAnalysis() 🆕
  ↓ calls
PersonalityAnalysisEngine.analyze()
```

---

## 7. テスト要件（TDD原則）

### 7.1 TDDサイクル

**RED → GREEN → REFACTOR**を厳守

#### Phase 2-RED: 失敗するテストを作成
```typescript
describe('SimulationService.calculateGroupAnalysis', () => {
  it('should calculate average synergy score', () => {
    const members = [createMockMember(), createMockMember()];
    const result = SimulationService.calculateGroupAnalysis(members);
    expect(result.avgSynergyScore).toBeGreaterThan(0);
  });

  // ↑ このテストは最初失敗する（calculateGroupAnalysisが未実装）
});
```

#### Phase 2-GREEN: 最小限の実装
```typescript
static calculateGroupAnalysis(members: MemberStrengths[]): GroupAnalysis {
  // テストをパスさせる最小限の実装
  return {
    memberCount: members.length,
    avgSynergyScore: 50, // ハードコード
    // ...
  };
}
```

#### Phase 2-REFACTOR: リファクタリング
```typescript
static calculateGroupAnalysis(members: MemberStrengths[]): GroupAnalysis {
  const analyses = this.analyzeMembers(members); // ヘルパー関数に抽出
  return this.aggregateAnalyses(analyses);       // 集計ロジックを分離
}
```

### 7.2 テストケース一覧

#### 正常系テスト

| テストID | テストケース | 入力 | 期待結果 |
|----------|------------|------|---------|
| T-001 | 平均相性スコア計算 | MBTI付き2人 | avgSynergyScore > 0 |
| T-002 | 平均チーム適合度計算 | 資質のみ2人 | avgTeamFit > 0 |
| T-003 | 平均リーダーシップ計算 | 混合3人 | avgLeadership > 0 |
| T-004 | バランス判定（バランス型） | 均等分布4人 | isBalanced = true |
| T-005 | バランス判定（偏り型） | 実行力偏重4人 | isBalanced = false |
| T-006 | 強化カテゴリ判定 | 戦略的思考多め | strongCategories = [STRATEGIC_THINKING] |
| T-007 | リーダーシップ分布 | 高中低混合 | distribution = {high:1, medium:1, low:1} |

#### 異常系テスト

| テストID | テストケース | 入力 | 期待結果 |
|----------|------------|------|---------|
| T-101 | メンバー0人 | [] | null |
| T-102 | 全員MBTI欠損 | 資質のみ5人 | avgSynergyScore = null |
| T-103 | 一部分析失敗 | 不正データ混入 | 有効なデータのみ集計 |

#### エッジケーステスト

| テストID | テストケース | 入力 | 期待結果 |
|----------|------------|------|---------|
| T-201 | メンバー1人 | 1人 | 正常に計算 |
| T-202 | 全員同じ資質 | 達成欲×5 | strongCategories = [EXECUTING] |
| T-203 | 極端な偏り | 実行力100%, 他0% | weakCategories = 3つ |

### 7.3 テストカバレッジ目標

- **行カバレッジ**: 90%以上
- **分岐カバレッジ**: 85%以上
- **関数カバレッジ**: 100%

---

## 8. 実装計画

### 8.1 実装順序

1. ✅ **Phase 0**: 本仕様書作成
2. ✅ **Phase 1**: 型定義追加（`TeamCharacteristicNarrative`, `GroupStats`拡張）
3. ✅ **Phase 2-RED**: テスト作成（失敗するテスト）
4. ✅ **Phase 2-GREEN**: 最小実装（テストパス）
5. ✅ **Phase 2-REFACTOR**: リファクタリング（ヘルパー関数抽出）
6. ✅ **Phase 3**: `calculateTeamNarrative`実装
7. ✅ **Phase 4**: UI実装（DepartmentAnalysis 3カラム、GroupCard）
8. ✅ **Phase 5**: 動作確認（開発サーバー）
9. ✅ **Phase 6**: エッジケーステスト追加
10. ✅ **Phase 7**: 最終リファクタリング（コメント、定数化）
11. ✅ **Phase 8-10**: ドキュメント更新、コミット、本番デプロイ

### 8.2 スケジュール見積もり

| Phase | 作業時間 | 累計 |
|-------|---------|------|
| Phase 0 | 1h | 1h |
| Phase 1 | 0.5h | 1.5h |
| Phase 2 | 2.5h | 4h |
| Phase 3 | 0.5h | 4.5h |
| Phase 4 | 1.5h | 6h |
| Phase 5 | 0.5h | 6.5h |
| Phase 6 | 1h | 7.5h |
| Phase 7 | 1h | 8.5h |
| Phase 8-10 | 1h | 9.5h |
| **合計** | **9.5h** | - |

---

## 9. 参照ドキュメント

### 9.1 既存仕様書
- `ANALYSIS_METHODOLOGY.md`: 分析理論の詳細
- `TEAM_SIMULATION_SPEC.md`: チームシミュレーション基本仕様

### 9.2 既存実装
- `src/services/PersonalityAnalysisEngine.ts`: 個人分析エンジン
- `src/services/SimulationService.ts`: シミュレーションサービス
- `src/components/strengths/simulation/GroupCard.tsx`: グループカードUI

### 9.3 学術的根拠
- **Belbin, R. M. (1981)**: "Management Teams: Why They Succeed or Fail"
- **Bass, B. M. (1985)**: "Leadership and Performance Beyond Expectations"
- **MBTI理論**: Myers-Briggs Type Indicator

---

## 10. 変更履歴

| 日付 | バージョン | 変更内容 | 作成者 |
|------|-----------|---------|--------|
| 2025-10-31 | 1.0 | 初版作成 | Claude Code + strengths-analyzer skill |

---

## 11. チーム特性ナラティブ機能（TeamNarrative）

### 11.1 目的

**従来の問題点**：
```
❌ 「実行力多め」「戦略多め」
→ グループ分けは便宜的で、達成欲と規律性は全く違う才能
→ 数の集計に意味がない
```

**新しいアプローチ**：
```
✅ 34の資質それぞれを個別に扱う
✅ 頻出資質の組み合わせから「チームの可能性」を言語化
✅ 具体的な資質名と説明を明示
```

### 11.2 データモデル

```typescript
/**
 * チーム特性ナラティブ
 *
 * @description
 * 資質の頻度分布を分析し、チームの特性を文章で説明
 */
export interface TeamCharacteristicNarrative {
  /** タイトル（例：「実行力×戦略思考チーム」） */
  title: string;

  /** 要約文（2-3文、100-200文字） */
  summary: string;

  /** カテゴリ別の傾向分析 */
  categoryTendencies: Array<{
    category: StrengthGroup;
    percentage: number;          // 0-100
    topStrengths: Array<{
      strengthId: number;
      name: string;
      frequency: number;          // 何人が持っているか
      description: string;        // 資質の説明（短縮版）
    }>;
  }>;

  /** 頻出資質TOP10 */
  topStrengths: Array<{
    strengthId: number;
    name: string;
    frequency: number;
    percentage: number;           // チーム全体での保有率
  }>;

  /** チームの可能性（箇条書き、3-5項目） */
  possibilities: string[];
}
```

### 11.3 計算ロジック

#### STEP 1: 資質頻度を集計

```typescript
/**
 * 全メンバーのTOP5資質を集計し、34資質ごとの出現頻度を計算
 */
function calculateStrengthFrequency(members: MemberStrengths[]): Map<number, number> {
  const frequency = new Map<number, number>();

  members.forEach(member => {
    member.strengths.slice(0, 5).forEach(s => {
      frequency.set(s.id, (frequency.get(s.id) || 0) + 1);
    });
  });

  return frequency;
}

// 例: 10人チーム
// 達成欲(#1): 7人
// 戦略性(#32): 5人
// 共感性(#19): 4人
// 分析思考(#27): 4人
```

#### STEP 2: カテゴリ分布を分析

```typescript
/**
 * 4カテゴリごとの資質数とパーセンテージを計算
 */
function analyzeCategoryDistribution(
  frequency: Map<number, number>
): Record<StrengthGroup, { count: number; percentage: number }> {
  const totalStrengths = Array.from(frequency.values()).reduce((a, b) => a + b, 0);

  const distribution: Record<StrengthGroup, { count: number; percentage: number }> = {
    [StrengthGroup.EXECUTING]: { count: 0, percentage: 0 },
    [StrengthGroup.INFLUENCING]: { count: 0, percentage: 0 },
    [StrengthGroup.RELATIONSHIP_BUILDING]: { count: 0, percentage: 0 },
    [StrengthGroup.STRATEGIC_THINKING]: { count: 0, percentage: 0 }
  };

  frequency.forEach((count, strengthId) => {
    const strength = StrengthsService.getStrengthById(strengthId);
    if (strength) {
      distribution[strength.group].count += count;
    }
  });

  Object.keys(distribution).forEach(key => {
    const group = key as StrengthGroup;
    distribution[group].percentage = (distribution[group].count / totalStrengths) * 100;
  });

  return distribution;
}

// 例: 10人チーム（総資質数50）
// 実行力: 20個 (40%)
// 戦略的思考力: 15個 (30%)
// 人間関係構築力: 10個 (20%)
// 影響力: 5個 (10%)
```

#### STEP 3: タイトル生成

```typescript
/**
 * カテゴリ分布から動的にタイトルを生成
 *
 * ルール:
 * - TOP2カテゴリを使用（30%以上のカテゴリのみ）
 * - 1カテゴリのみ30%以上: 「〇〇特化チーム」
 * - 2カテゴリが30%以上: 「〇〇×△△チーム」
 * - すべて25%前後: 「バランス型チーム」
 */
function generateTitle(
  distribution: Record<StrengthGroup, { count: number; percentage: number }>
): string {
  const sorted = Object.entries(distribution)
    .sort(([, a], [, b]) => b.percentage - a.percentage);

  const top1 = sorted[0];
  const top2 = sorted[1];

  // バランス判定（すべて20-30%の範囲）
  const isBalanced = sorted.every(([, { percentage }]) =>
    percentage >= 20 && percentage <= 30
  );

  if (isBalanced) {
    return 'バランス型チーム';
  }

  // 1カテゴリ特化（TOP1が40%以上）
  if (top1[1].percentage >= 40) {
    return `${GROUP_LABELS[top1[0] as StrengthGroup]}特化チーム`;
  }

  // 2カテゴリ複合（TOP2が両方30%以上）
  if (top1[1].percentage >= 30 && top2[1].percentage >= 30) {
    return `${GROUP_LABELS[top1[0] as StrengthGroup]}×${GROUP_LABELS[top2[0] as StrengthGroup]}チーム`;
  }

  // デフォルト
  return `${GROUP_LABELS[top1[0] as StrengthGroup]}中心チーム`;
}

// 例:
// 実行力40%, 戦略30% → 「実行力×戦略的思考力チーム」
// 実行力50%, 他15%以下 → 「実行力特化チーム」
// すべて25%前後 → 「バランス型チーム」
```

#### STEP 4: サマリー文生成

```typescript
/**
 * カテゴリ分布と頻出資質からサマリー文を生成
 *
 * テンプレート構造:
 * 「このチームは、[TOP1カテゴリ]([割合])と[TOP2カテゴリ]([割合])を主軸とし、
 *  [TOP3資質の具体名]による[能力の説明]を併せ持ちます。」
 */
function generateSummary(
  distribution: Record<StrengthGroup, { count: number; percentage: number }>,
  topStrengths: Array<{ name: string; frequency: number }>
): string {
  const sorted = Object.entries(distribution)
    .sort(([, a], [, b]) => b.percentage - a.percentage)
    .slice(0, 2);

  const top1 = sorted[0];
  const top2 = sorted[1];

  const top3Names = topStrengths.slice(0, 3).map(s => s.name).join('・');

  return `このチームは、${GROUP_LABELS[top1[0] as StrengthGroup]}(${top1[1].percentage.toFixed(0)}%)と` +
         `${GROUP_LABELS[top2[0] as StrengthGroup]}(${top2[1].percentage.toFixed(0)}%)を主軸とし、` +
         `${top3Names}を中心とした強みを併せ持ちます。`;
}

// 例:
// 「このチームは、実行力(40%)と戦略的思考力(30%)を主軸とし、
//  達成欲・戦略性・共感性を中心とした強みを併せ持ちます。」
```

#### STEP 5: 可能性リスト生成

```typescript
/**
 * カテゴリ組み合わせと頻出資質から可能性を推論
 *
 * テンプレートマトリクス（16パターン）
 */
const POSSIBILITIES_TEMPLATES: Record<string, (topStrengths: string[]) => string[]> = {
  // 実行力特化（40%以上）
  'EXECUTING_DOMINANT': (topStrengths) => [
    `${topStrengths[0]}による確実な目標達成力`,
    '計画的な実行と着実な成果創出',
    '責任感のある安定したチーム運営'
  ],

  // 実行力×戦略（両方30%以上）
  'EXECUTING_STRATEGIC': (topStrengths) => [
    `${topStrengths[0]}と${topStrengths[1]}による戦略的実行力`,
    '論理的な計画立案と確実な実行',
    '長期プロジェクトの成功'
  ],

  // 実行力×人間関係
  'EXECUTING_RELATIONSHIP': (topStrengths) => [
    `${topStrengths[0]}による目標達成とチーム調和の両立`,
    'メンバーの納得感を重視した実行',
    '協力しながら成果を出すチーム'
  ],

  // 戦略×人間関係
  'STRATEGIC_RELATIONSHIP': (topStrengths) => [
    `${topStrengths[0]}と${topStrengths[1]}による革新的なアイデア創出`,
    'チームの調和を保ちながら新しい挑戦',
    '創造的で協力的なプロジェクト推進'
  ],

  // バランス型
  'BALANCED': (topStrengths) => [
    `${topStrengths[0]}・${topStrengths[1]}・${topStrengths[2]}の多様な強み`,
    'あらゆる状況に柔軟に対応できる汎用性',
    'メンバーの多様性を活かした問題解決'
  ],

  // ... 他11パターン
};

function generatePossibilities(
  distribution: Record<StrengthGroup, { count: number; percentage: number }>,
  topStrengths: Array<{ name: string }>
): string[] {
  const pattern = identifyPattern(distribution);
  const template = POSSIBILITIES_TEMPLATES[pattern];

  return template(topStrengths.map(s => s.name));
}
```

### 11.4 UI表示仕様

#### 11.4.1 GroupCard内の配置

```
┌─────────────────────────────────────┐
│ グループ名 (10人)         [編集] [×]│
├─────────────────────────────────────┤
│ [メンバーカード...]                  │
├─────────────────────────────────────┤
│ 🆕 チーム特性                        │
│ ┌─────────────────────────────────┐ │
│ │ 実行力×戦略的思考力チーム         │ │
│ │                                  │ │
│ │ このチームは、実行力(40%)と      │ │
│ │ 戦略的思考力(30%)を主軸とし、    │ │
│ │ 達成欲・戦略性・共感性を中心と  │ │
│ │ した強みを併せ持ちます。         │ │
│ │                                  │ │
│ │ 【頻出資質TOP5】                 │ │
│ │ • 達成欲 (7人, 70%)              │ │
│ │   目標達成に向けた強い推進力     │ │
│ │ • 戦略性 (5人, 50%)              │ │
│ │   最善の道筋を見つける力         │ │
│ │ • 共感性 (4人, 40%)              │ │
│ │   メンバーの感情を理解する力     │ │
│ │ ...                              │ │
│ │                                  │ │
│ │ 【このチームの可能性】           │ │
│ │ ✓ 達成欲と戦略性による戦略的実行力│ │
│ │ ✓ 論理的な計画立案と確実な実行   │ │
│ │ ✓ 長期プロジェクトの成功         │ │
│ └─────────────────────────────────┘ │
├─────────────────────────────────────┤
│ チーム分析（スコア）                 │
│ ...                                 │
└─────────────────────────────────────┘
```

#### 11.4.2 コンポーネント実装

```tsx
{stats.narrative && (
  <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 mb-3">
    <h4 className="text-sm font-semibold mb-2 text-blue-900 dark:text-blue-200">
      {stats.narrative.title}
    </h4>

    <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">
      {stats.narrative.summary}
    </p>

    {/* 頻出資質TOP5 */}
    <div className="mb-3">
      <h5 className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
        頻出資質TOP5
      </h5>
      <div className="space-y-1">
        {stats.narrative.topStrengths.slice(0, 5).map(s => (
          <div key={s.strengthId} className="text-xs">
            <span className="font-medium text-gray-800 dark:text-gray-200">
              • {s.name}
            </span>
            <span className="text-gray-500 dark:text-gray-400">
              {' '}({s.frequency}人, {s.percentage.toFixed(0)}%)
            </span>
            <div className="text-gray-600 dark:text-gray-400 ml-3">
              {/* 短縮版の説明 */}
            </div>
          </div>
        ))}
      </div>
    </div>

    {/* 可能性 */}
    <div>
      <h5 className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
        このチームの可能性
      </h5>
      <ul className="space-y-1">
        {stats.narrative.possibilities.map((p, i) => (
          <li key={i} className="text-xs text-gray-700 dark:text-gray-300">
            ✓ {p}
          </li>
        ))}
      </ul>
    </div>
  </div>
)}
```

### 11.5 実装優先度

#### 優先度HIGH（MVP: Minimum Viable Product）
- ✅ 資質頻度集計
- ✅ カテゴリ分布分析
- ✅ タイトル生成（3パターン：特化/複合/バランス）
- ✅ 頻出資質TOP10表示
- ✅ 簡易可能性リスト（固定3項目）

#### 優先度MEDIUM（v1.1）
- ⬜ 可能性テンプレートマトリクス拡張（16パターン）
- ⬜ 資質説明の短縮版生成
- ⬜ カテゴリ別TOP3資質の詳細表示

#### 優先度LOW（将来拡張）
- ⬜ MBTI分布との統合分析
- ⬜ グループ間の比較分析
- ⬜ 自然言語生成AIによる動的文章生成

### 11.6 テストケース

#### T-301: 資質頻度集計
```typescript
it('should calculate strength frequency correctly', () => {
  const members = [
    createMember([1, 2, 3, 4, 5]),  // 達成欲, 公平性, 回復志向, アレンジ, 慎重さ
    createMember([1, 6, 7, 8, 9]),  // 達成欲, 責任感, 信念, 規律性, 目標志向
  ];

  const frequency = SimulationService.calculateStrengthFrequency(members);

  expect(frequency.get(1)).toBe(2);  // 達成欲: 2人
  expect(frequency.get(2)).toBe(1);  // 公平性: 1人
});
```

#### T-302: カテゴリ分布分析
```typescript
it('should analyze category distribution', () => {
  const frequency = new Map([[1, 7], [32, 5], [19, 4]]);  // 達成欲×7, 戦略性×5, 共感性×4

  const distribution = SimulationService.analyzeCategoryDistribution(frequency);

  expect(distribution[StrengthGroup.EXECUTING].percentage).toBeCloseTo(43.75);  // 7/16
  expect(distribution[StrengthGroup.STRATEGIC_THINKING].percentage).toBeCloseTo(31.25);  // 5/16
});
```

#### T-303: タイトル生成
```typescript
it('should generate title for balanced team', () => {
  const distribution = {
    EXECUTING: { count: 5, percentage: 25 },
    INFLUENCING: { count: 5, percentage: 25 },
    RELATIONSHIP_BUILDING: { count: 5, percentage: 25 },
    STRATEGIC_THINKING: { count: 5, percentage: 25 }
  };

  const title = SimulationService.generateTeamTitle(distribution);

  expect(title).toBe('バランス型チーム');
});

it('should generate title for dual dominant team', () => {
  const distribution = {
    EXECUTING: { count: 20, percentage: 40 },
    STRATEGIC_THINKING: { count: 15, percentage: 30 },
    RELATIONSHIP_BUILDING: { count: 10, percentage: 20 },
    INFLUENCING: { count: 5, percentage: 10 }
  };

  const title = SimulationService.generateTeamTitle(distribution);

  expect(title).toBe('実行力×戦略的思考力チーム');
});
```

### 11.7 MBTI統合時の拡張計画

```typescript
// 将来的な拡張（MBTI情報が多数集まった場合）
interface TeamCharacteristicNarrative {
  // ... 既存フィールド

  mbtiAnalysis?: {
    mbtiDistribution: Record<string, number>;  // NT: 3人, NF: 2人, ...
    dominantGroup: string;                     // 'NT' (Analyst)
    synergyWithStrengths: string;              // 相乗効果の説明
  };
}

// 例:
// 「NT型が多く(3人)、戦略的思考力が強いため、革新的なアイデアを論理的に実現できる」
```

---

## 実装完了サマリー

### 実装されたファイル
- `src/services/SimulationService.ts` - calculateTeamNarrative()メソッド
- `src/services/SimulationService.test.ts` - テストカバレッジ90%以上
- `src/components/strengths/DepartmentAnalysis.tsx` - 3カラムUI（円グラフ・棒グラフ・ナラティブ）
- `src/components/strengths/simulation/GroupCard.tsx` - チームナラティブ表示
- `src/types/simulation.ts` - TeamCharacteristicNarrative型定義

### 実装されたMVP機能（優先度HIGH）
- ✅ 資質頻度集計
- ✅ カテゴリ分布分析（4カテゴリ）
- ✅ タイトル生成（バランス型/特化型/複合型/中心型）
- ✅ 頻出資質TOP10表示
- ✅ 簡易可能性リスト（3-5項目）

### デプロイ状況
- ✅ v3.2.1としてGitHub Pagesに本番デプロイ完了
- ✅ 商用環境で動作確認済み

**承認**: ✅ 完了
**次のアクション**: なし（将来拡張はv1.1で検討）
