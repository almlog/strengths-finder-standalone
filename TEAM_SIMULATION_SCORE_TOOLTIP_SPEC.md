# チームシミュレーション - スコア計算式ツールチップ機能仕様書

**バージョン**: v1.0
**作成日**: 2025-11-04
**対象機能**: チームシミュレーション - グループ分析

---

## 📋 概要

### 目的
チームシミュレーションのグループ分析で表示される各スコア（相性スコア、チーム適合度、リーダーシップ）の計算式・基準・改善方法をマウスオーバーで表示し、ユーザーが戦略的にメンバー配置を最適化できるようにする。

### ユースケース
```
現状: リーダーシップ 60
目標: リーダーシップ 80以上

ユーザーが知りたいこと:
1. なぜ現在60なのか？（計算式と内訳）
2. 80以上にするには何が必要？（改善策）
3. どのメンバーを追加/削除すればいいか？（具体的なアクション）
```

---

## 🎯 機能要件

### 1. ツールチップ表示対象

**チームシミュレーション > グループ分析 > 各グループカード**

| スコア名 | 現在の表示形式 | ツールチップ追加箇所 |
|---------|--------------|-------------------|
| 平均相性スコア | `相性スコア: 75` | 数値「75」にマウスオーバー |
| 平均チーム適合度 | `チーム適合度: 68` | 数値「68」にマウスオーバー |
| 平均リーダーシップ | `リーダーシップ: 60` | 数値「60」にマウスオーバー |

### 2. ツールチップ内容

#### 2.1 相性スコア（Synergy Score）

```
📊 相性スコア: 75

【計算式】
TOP5資質 × MBTI相性 × 重み付け
重み: [0.5, 0.3, 0.15, 0.03, 0.02]

【内訳】
チームメンバーの平均:
- 高相性 (95点): 3名
- 中相性 (65点): 1名
- 低相性 (35点): 1名

【評価基準】
85以上: 統合型（高い相乗効果）
  → 類似の資質・性格で統一された効率的なチーム
55-85: バランス型
  → 相性と多様性のバランスが取れたチーム
55未満: 多面型（多様性重視）
  ✨ ユニーク: 異なる視点が交差するイノベーティブなチーム
  → 新しいアイデアが生まれやすい
  → 多角的な問題解決が可能

【このスコアの活かし方】
高スコア(85+): ルーティンタスクの高速処理、明確な目標達成
低スコア(55未満): 創造的な問題解決、新規プロジェクト
```

#### 2.2 チーム適合度（Team Fit Score）

```
📊 チーム適合度: 68

【計算式】
BASE 50点
+ Belbinロールスコア (8-18点)
+ F型ボーナス (10点)
+ チーム志向資質 (最大10点)

【内訳】
- ベーススコア: 50点
- Belbinロール平均: 14点
- F型メンバー: 2名 (+20点)
- チーム志向資質保有者: 3名 (+18点)
→ 合計: 68点 (上限100)

【評価基準】
70以上: チーム協調型（高い協働力）
  → 密な連携と協力が必要なプロジェクト向き
50-70: バランス型
  → 協働と個人作業の柔軟な切り替えが可能
50未満: 個人作業型
  ✨ ユニーク: 独立性の高い専門家集団
  → 深い専門性を活かした高度なタスクに集中
  → 個人の裁量と自律性を重視

【このスコアの活かし方】
高スコア(70+): 頻繁なコミュニケーションが必要なプロジェクト
低スコア(50未満): 研究開発、専門タスク、リモートワーク
```

#### 2.3 リーダーシップ潜在力（Leadership Potential）

```
📊 リーダーシップ: 60

【計算式】
BASE 40点
+ E型 (外向): +15点
+ T型 (思考): +12点
+ J型 (判断): +18点
+ リーダーシップ資質 (最大12点)

【内訳】
- ベーススコア: 40点
- E型メンバー: 3名 (+45点)
- T型メンバー: 2名 (+24点)
- J型メンバー: 4名 (+72点)
- リーダーシップ資質保有者: 2名 (+20点)
→ 平均: 60点 (上限100)

【評価基準】
70以上: リーダー型（高い統率力）
  → 明確な指示系統と迅速な意思決定
50-70: バランス型
  → リーダーシップの分散と柔軟な役割分担
50未満: 専門家型
  ✨ ユニーク: フラットで民主的なチーム
  → 全員が専門家としての意見を持つ
  → ボトムアップの意思決定
  → 創造的な議論と合意形成

【このスコアの活かし方】
高スコア(70+): 明確な指示系統が必要なプロジェクト、危機管理
低スコア(50未満): 研究チーム、クリエイティブワーク、探索的プロジェクト
```

---

## 🎨 UI/UX仕様

### 3.1 ツールチップデザイン

```tsx
// Tailwindスタイル
<div className="
  bg-gray-800 dark:bg-gray-900
  text-white
  rounded-lg
  shadow-xl
  p-4
  max-w-md
  text-sm
  border border-gray-700
">
  {/* ツールチップ内容 */}
</div>
```

### 3.2 表示トリガー

- **マウスオーバー**: 300ms遅延後に表示
- **マウスアウト**: 即座に非表示
- **タッチデバイス**: タップで表示、外側タップで非表示

### 3.3 配置

- **優先方向**: 上 → 下 → 左 → 右
- **自動調整**: 画面端に達する場合は自動的に位置を調整
- **ポインター**: スコア数値を指す矢印を表示

---

## 📐 技術仕様

### 4.1 使用ライブラリ

**推奨**: `@radix-ui/react-tooltip` または `@floating-ui/react`

理由:
- アクセシビリティ対応（ARIA属性自動付与）
- 自動位置調整
- タッチデバイス対応
- 軽量（~10KB gzipped）

### 4.2 実装コンポーネント

```
src/components/strengths/
├── ScoreTooltip.tsx              # 新規: 汎用ツールチップコンポーネント
├── ScoreBreakdown.tsx            # 新規: スコア内訳表示
└── TeamSimulation/
    └── GroupAnalysisCard.tsx     # 修正: ツールチップ統合
```

### 4.3 データ構造

```typescript
// src/types/scoreBreakdown.ts
export interface ScoreBreakdown {
  type: 'synergy' | 'teamFit' | 'leadership';
  totalScore: number;
  components: ScoreComponent[];
  threshold: ScoreThreshold;
  improvements: string[];
}

export interface ScoreComponent {
  label: string;
  value: number;
  description?: string;
}

export interface ScoreThreshold {
  high: { min: number; label: string; description: string };
  balanced: { min: number; label: string; description: string };
  low: { label: string; description: string };
}
```

### 4.4 計算ロジック参照元

**PersonalityAnalysisEngine.ts**:
- `calculateSynergyScore()`: Line 325-336
- `calculateTeamFit()`: Line 364-386
- `calculateLeadership()`: Line 391-409

定数:
- `STRENGTH_WEIGHTS`: Line 29
- `SYNERGY_SCORES`: Line 34-39
- `TEAM_FIT_SCORES`: Line 86-92
- `LEADERSHIP_SCORES`: Line 97-111
- `PROFILE_SUMMARY_THRESHOLDS`: Line 132-148

---

## 🧪 テスト仕様（TDD）

### 5.1 単体テスト

```typescript
// ScoreBreakdown.test.ts

describe('ScoreBreakdown', () => {
  test('TC-TOOLTIP-001: リーダーシップ60のブレークダウンを正しく計算', () => {
    const members = [/* ENTJ, ISFP, INTP */];
    const breakdown = calculateLeadershipBreakdown(members);

    expect(breakdown.totalScore).toBe(60);
    expect(breakdown.components).toContainEqual({
      label: 'ベーススコア',
      value: 40
    });
  });

  test('TC-TOOLTIP-002: チーム適合度の改善提案を生成', () => {
    const members = [/* 現在のメンバー */];
    const breakdown = calculateTeamFitBreakdown(members);

    expect(breakdown.improvements).toContain('F型メンバーを追加: +10点');
  });
});
```

### 5.2 統合テスト

```typescript
test('TC-TOOLTIP-101: ツールチップが正しく表示される', () => {
  render(<GroupAnalysisCard group={mockGroup} />);

  const leadershipScore = screen.getByText(/リーダーシップ:/);
  fireEvent.mouseEnter(leadershipScore);

  await waitFor(() => {
    expect(screen.getByText(/計算式/)).toBeInTheDocument();
    expect(screen.getByText(/改善方法/)).toBeInTheDocument();
  });
});
```

---

## 📊 実装優先順位

### Phase 1: 基本ツールチップ（必須）
- [x] ScoreTooltipコンポーネント作成
- [ ] リーダーシップのツールチップ実装
- [ ] チーム適合度のツールチップ実装
- [ ] 相性スコアのツールチップ実装

### Phase 2: 改善提案（推奨）
- [ ] スコア向上のための具体的な提案生成
- [ ] 「誰を追加すればいいか」のレコメンデーション

### Phase 3: インタラクティブ改善（オプション）
- [ ] ツールチップ内から「推奨メンバー」をハイライト
- [ ] 「このメンバーを追加」ボタンで即座にシミュレーション

---

## 🎯 成功基準

### KPI
1. **ユーザビリティ**: ツールチップ表示まで300ms以内
2. **理解度**: 計算式を見てスコアの理由が分かる
3. **改善実行**: 改善提案に従ってスコアが向上する

### 受け入れテスト
- [ ] 各スコアのツールチップが正しく表示される
- [ ] 計算式の内訳が正確である
- [ ] 改善提案が実行可能である
- [ ] モバイルでも見やすい（レスポンシブ）
- [ ] ダークモード対応

---

## 📝 実装時の注意事項

### DEVELOPMENT_QUALITY_PLEDGE.md遵守
1. ✅ **テストファースト（TDD）**: RED → GREEN → REFACTOR
2. ✅ **開発環境確認**: `npm start` でブラウザ確認
3. ✅ **Spec駆動開発**: 本SPECに従って実装
4. ✅ **commit前チェック**: 全5項目クリア

### 既存コードへの影響
- **影響範囲**: GroupAnalysisCardコンポーネントのみ
- **破壊的変更**: なし（表示スタイルの拡張のみ）
- **パフォーマンス**: ツールチップは遅延レンダリングで最適化

---

## 🔗 関連ドキュメント

- [TEAM_SIMULATION_GROUP_ANALYSIS_SPEC.md](docs/completed-specs/TEAM_SIMULATION_GROUP_ANALYSIS_SPEC.md)
- [PersonalityAnalysisEngine.ts](src/services/PersonalityAnalysisEngine.ts)
- [CLAUDE.md](CLAUDE.md) - TDD必須フロー

