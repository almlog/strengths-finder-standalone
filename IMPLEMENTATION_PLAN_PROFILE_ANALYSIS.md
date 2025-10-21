# プロファイル分析カード機能 実装計画書

**バージョン**: 1.0.0
**作成日**: 2025-10-20
**対象機能**: AI分析結果カード（ストレングスファインダー × 16Personalities統合分析）

---

## 📋 目次

1. [概要](#概要)
2. [成果物リスト](#成果物リスト)
3. [Phase分割と実装計画](#phase分割と実装計画)
4. [品質基準](#品質基準)
5. [テスト項目](#テスト項目)
6. [データ仕様](#データ仕様)

---

## 🎯 概要

### 機能名
**プロファイル分析カード（AI分析結果表示）**

### 目的
- ストレングスファインダー（SF）と16Personalities（16P）の結果を統合分析
- 個人分析画面に「AI分析結果カード」として表示
- 外部API不使用、ルールベースで静的データから動的生成
- 社員情報を外部に送信せず、プライバシーを保護

### 対応パターン
1. **完全データ（SF + 16P）**: 詳細な統合分析を表示
2. **SFのみ**: 資質ベースの分析を表示（16P登録を促す）
3. **16Pのみ**: MBTIベースの分析を表示（SF登録を促す）
4. **データなし**: カード非表示

### 配置場所
- **個人分析画面**（IndividualStrengths.tsx）
- ストレングスファインダーカードの下（強みのバランスセクションの下）

### 技術アプローチ
- **静的データ**: 16タイプのMBTIプロファイル（JSON）
- **動的計算**: ルールベースでスコア算出・メッセージ生成
- **データ容量**: 約20-30KB（JSONファイル1つ）

---

## 📁 成果物リスト

### 新規作成ファイル

#### 型定義
- [ ] `src/models/PersonalityAnalysis.ts`
  - MBTIType, AnalysisMode, MBTIProfile等の型定義
  - 34資質の名前マッピング（STRENGTH_NAMES）
  - 資質カテゴリ定数（TEAM_ORIENTED_STRENGTHS等）

#### サービス層
- [ ] `src/services/PersonalityAnalysisEngine.ts`
  - 分析エンジン本体
  - 3モード対応（full/mbti-only/strengths-only）
  - スコア計算ロジック
  - メッセージ生成ロジック

#### UIコンポーネント
- [ ] `src/components/analysis/ProfileAnalysisCard.tsx`
  - メインカードコンポーネント
  - モード別バッジ表示
  - スコア表示（プログレスバー）
  - 詳細情報の折りたたみ表示

#### データファイル
- [ ] `public/config/mbti-profiles.json`
  - 16タイプのMBTIプロファイル
  - 各タイプの特性・モチベーション・資質相性マッピング

### 修正ファイル

- [ ] `src/components/strengths/IndividualStrengths.tsx`
  - ProfileAnalysisCardの追加
  - レイアウト調整

- [ ] `src/models/StrengthsTypes.ts`
  - MemberStrengthsインターフェースへpersonalityId追加（既存）
  - personalityVariant追加（既存）

### テストファイル

#### Phase 1: 型定義とサービステスト
- [ ] `src/__tests__/models/PersonalityAnalysis.test.ts`
  - canAnalyze関数テスト
  - determineAnalysisMode関数テスト
  - 定数の妥当性テスト

- [ ] `src/__tests__/services/PersonalityAnalysisEngine.test.ts`
  - 完全モード分析テスト
  - MBTIのみモード分析テスト
  - 資質のみモード分析テスト
  - スコア計算ロジックテスト
  - エッジケーステスト

#### Phase 2: UIコンポーネントテスト
- [ ] `src/__tests__/components/ProfileAnalysisCard.test.tsx`
  - 完全データ時の表示テスト
  - MBTIのみ時の表示テスト
  - 資質のみ時の表示テスト
  - データなし時の非表示テスト
  - スコア表示テスト
  - 詳細情報の展開/折りたたみテスト
  - ダークモード対応テスト

#### Phase 4: 統合テスト
- [ ] `src/__tests__/integration/ProfileAnalysis.integration.test.tsx`
  - IndividualStrengths画面での統合テスト
  - サンプルデータ（sample-data.json）での動作確認
  - 3パターンすべての動作確認

---

## 🔄 Phase分割と実装計画

### Phase 1: 型定義とサービス基盤（TDD）

**目標**: ビジネスロジックの実装とテスト

#### 成果物
1. `src/models/PersonalityAnalysis.ts`
2. `src/services/PersonalityAnalysisEngine.ts`（初期実装）
3. テストファイル（models, services）

#### TDDサイクル
1. **RED**: テストケース作成
   - [ ] PersonalityAnalysis.test.ts作成
   - [ ] PersonalityAnalysisEngine.test.ts作成
   - [ ] テスト実行（失敗確認）

2. **GREEN**: 実装
   - [ ] PersonalityAnalysis.ts実装
   - [ ] PersonalityAnalysisEngine.ts実装
   - [ ] テスト実行（全パス確認）

3. **REFACTOR**: リファクタリング
   - [ ] コードの可読性向上
   - [ ] 重複コード削減
   - [ ] テスト再実行（グリーン確認）

#### 品質基準
- [ ] すべてのユニットテストがパス
- [ ] TypeScriptエラーなし
- [ ] 3モードすべてのスコア計算が正常動作
- [ ] ESLint警告なし

---

### Phase 2: UIコンポーネント（TDD）

**目標**: ProfileAnalysisCardコンポーネントの実装

#### 成果物
1. `src/components/analysis/ProfileAnalysisCard.tsx`
2. テストファイル（ProfileAnalysisCard.test.tsx）

#### TDDサイクル
1. **RED**: テストケース作成
   - [ ] ProfileAnalysisCard.test.tsx作成
   - [ ] 各表示パターンのテスト作成
   - [ ] テスト実行（失敗確認）

2. **GREEN**: 実装
   - [ ] メインコンポーネント実装
   - [ ] サブコンポーネント実装
   - [ ] テスト実行（全パス確認）

3. **REFACTOR**: リファクタリング
   - [ ] コンポーネント分割の最適化
   - [ ] Tailwindクラスの整理
   - [ ] テスト再実行（グリーン確認）

#### 品質基準
- [ ] すべてのコンポーネントテストがパス
- [ ] 3パターンすべて正しく表示
- [ ] ダークモード対応（dark:クラス適用）
- [ ] レスポンシブ対応（スマホ・タブレット）
- [ ] アクセシビリティ対応（role属性等）

---

### Phase 3: データ準備（16タイプMBTIプロファイル）

**目標**: 16タイプのMBTIプロファイルJSON作成

#### 成果物
1. `public/config/mbti-profiles.json`

#### 作業内容
- [ ] INTJ（建築家）プロファイル作成（参考実装済み）
- [ ] INTP（論理学者）プロファイル作成（参考実装済み）
- [ ] ENTJ（指揮官）プロファイル作成
- [ ] ENTP（討論者）プロファイル作成
- [ ] INFJ（提唱者）プロファイル作成
- [ ] INFP（仲介者）プロファイル作成
- [ ] ENFJ（主人公）プロファイル作成
- [ ] ENFP（広報運動家）プロファイル作成
- [ ] ISTJ（管理者）プロファイル作成
- [ ] ISFJ（擁護者）プロファイル作成
- [ ] ESTJ（幹部）プロファイル作成
- [ ] ESFJ（領事官）プロファイル作成
- [ ] ISTP（巨匠）プロファイル作成
- [ ] ISFP（冒険家）プロファイル作成
- [ ] ESTP（起業家）プロファイル作成
- [ ] ESFP（エンターテイナー）プロファイル作成

#### 各プロファイルの必須項目
```json
{
  "type": "INTJ",
  "name": "建築家",
  "description": "...",
  "characteristics": {
    "strengths": [...],
    "weaknesses": [...],
    "workStyle": "...",
    "communicationStyle": "...",
    "learningStyle": "...",
    "decisionMaking": "..."
  },
  "motivation": {
    "motivators": [...],
    "demotivators": [...],
    "stressors": [...],
    "stressRelief": [...]
  },
  "teamDynamics": {
    "naturalRole": "...",
    "bestEnvironment": "...",
    "idealTeamSize": "...",
    "conflictStyle": "..."
  },
  "strengthsSynergy": {
    "highSynergy": [4, 20, 29, 21, 34],
    "moderateSynergy": [1, 16, 31, 22, 13],
    "lowSynergy": [2, 9, 15, 19, 30]
  },
  "mbtiCompatibility": {
    "naturalPartners": ["ENTP", "ENFP"],
    "complementary": ["ENTJ", "INFJ", "INTP"],
    "challenging": ["ESFP", "ESFJ", "ISFP"]
  },
  "careerPaths": {
    "idealFields": [...],
    "roleExamples": [...],
    "developmentAreas": [...]
  }
}
```

#### 品質基準
- [ ] 16タイプすべて定義済み
- [ ] JSONフォーマットエラーなし
- [ ] 各タイプの資質相性が定義済み（highSynergy, moderateSynergy, lowSynergy）
- [ ] 日本語で記述

---

### Phase 4: 統合とリファクタリング

**目標**: IndividualStrengths画面への統合と最終調整

#### 成果物
1. 修正: `src/components/strengths/IndividualStrengths.tsx`
2. 統合テスト

#### TDDサイクル
1. **RED**: 統合テストケース作成
   - [ ] ProfileAnalysis.integration.test.tsx作成
   - [ ] IndividualStrengths画面での表示テスト
   - [ ] テスト実行（失敗確認）

2. **GREEN**: 統合実装
   - [ ] IndividualStrengths.tsxにProfileAnalysisCard追加
   - [ ] レイアウト調整
   - [ ] テスト実行（全パス確認）

3. **REFACTOR**: 最終リファクタリング
   - [ ] 全体のコード品質向上
   - [ ] 不要なコメント削除
   - [ ] インポート整理
   - [ ] テスト再実行（グリーン確認）

#### 品質基準
- [ ] すべてのテストがパス（既存テスト含む）
- [ ] TypeScriptエラーなし
- [ ] ESLint警告なし
- [ ] sample-data.jsonの全メンバーで正常動作
- [ ] ダークモード完全対応
- [ ] レスポンシブ完全対応
- [ ] CI/CDビルド成功

---

## ✅ 品質基準（全Phase共通）

### 機能要件
- [ ] 3パターンすべて正常動作（完全/SFのみ/16Pのみ）
- [ ] スコア計算が正確
- [ ] メッセージ生成が適切
- [ ] データがない場合はカード非表示

### 非機能要件
- [ ] TypeScriptエラーなし
- [ ] ESLint警告なし
- [ ] すべてのテストがパス（既存テスト含む）
- [ ] テストカバレッジ80%以上（新規コードのみ）
- [ ] ダークモード対応（全要素にdark:クラス）
- [ ] レスポンシブ対応（スマホ・タブレット・PC）
- [ ] アクセシビリティ対応（role, aria属性）
- [ ] パフォーマンス（レンダリング時間200ms以内）

### コード品質
- [ ] コメントが適切
- [ ] 変数名・関数名が明確
- [ ] 重複コードなし
- [ ] マジックナンバーなし（定数化）

### ユーザー体験
- [ ] ローディング表示あり
- [ ] エラーメッセージが分かりやすい
- [ ] スコアの意味が理解しやすい（免責表示含む）
- [ ] データ不足時の警告が適切

---

## 🧪 テスト項目

### 型定義テスト（PersonalityAnalysis.test.ts）

#### canAnalyze関数
- [ ] MBTIとSFの両方がある場合: true
- [ ] MBTIのみの場合: true
- [ ] SFのみの場合: true
- [ ] どちらもない場合: false

#### determineAnalysisMode関数
- [ ] MBTIとSFの両方がある場合: 'full'
- [ ] MBTIのみの場合: 'mbti-only'
- [ ] SFのみの場合: 'strengths-only'
- [ ] どちらもない場合: null

#### 定数の妥当性
- [ ] STRENGTH_NAMESが34個定義されている
- [ ] TEAM_ORIENTED_STRENGTHSが妥当
- [ ] LEADERSHIP_STRENGTHSが妥当
- [ ] ANALYTICAL_STRENGTHSが妥当
- [ ] EXECUTION_STRENGTHSが妥当

---

### サービステスト（PersonalityAnalysisEngine.test.ts）

#### 完全モード分析
- [ ] INTJタイプ + 相性良い資質 → 高いsynergyScore
- [ ] INTJタイプ + 相性悪い資質 → 低いsynergyScore
- [ ] スコア計算の重み付けが正しい（TOP1: 50%, TOP2: 30%...）
- [ ] プロファイルサマリーが正しく生成される
- [ ] TOP5資質名が正しく取得される

#### MBTIのみモード
- [ ] INTJタイプ → 戦略家・設計者
- [ ] synergyScore = 0
- [ ] teamFitScoreが推定値
- [ ] leadershipPotentialが推定値
- [ ] 警告メッセージが含まれる

#### 資質のみモード
- [ ] リーダーシップ資質多数 → 「リーダー・推進者」
- [ ] 分析資質多数 → 「アナリスト・思考家」
- [ ] 実行資質多数 → 「実行者・達成者」
- [ ] synergyScore = 0
- [ ] teamFitScoreが資質から計算
- [ ] leadershipPotentialが資質から計算

#### スコア計算ロジック
- [ ] calculateSynergyScore: 重み付け計算が正確
- [ ] calculateTeamFit: MBTI + 資質の加算が正確
- [ ] calculateLeadership: MBTI + 資質の加算が正確
- [ ] スコアが0-100の範囲内

#### エッジケース
- [ ] 資質が0個の場合
- [ ] 資質が3個の場合（5個未満）
- [ ] 不正なMBTIタイプ
- [ ] プロファイルJSONが読み込めない場合

---

### UIコンポーネントテスト（ProfileAnalysisCard.test.tsx）

#### 完全データ時の表示
- [ ] カードが表示される
- [ ] 緑バッジ「完全分析」が表示される
- [ ] 主要な役割が表示される
- [ ] 強み適合度スコアが表示される
- [ ] チーム適合度スコアが表示される
- [ ] リーダーシップスコアが表示される
- [ ] プロファイルサマリーが表示される
- [ ] 詳細情報が折りたたまれている

#### MBTIのみ時の表示
- [ ] カードが表示される
- [ ] 青バッジ「MBTI分析」が表示される
- [ ] 警告メッセージが表示される
- [ ] 強み適合度スコアが非表示
- [ ] チーム適合度スコアが表示（推定）
- [ ] リーダーシップスコアが表示（推定）
- [ ] TOP資質が非表示

#### 資質のみ時の表示
- [ ] カードが表示される
- [ ] 紫バッジ「資質分析」が表示される
- [ ] 警告メッセージが表示される
- [ ] 強み適合度スコアが非表示
- [ ] チーム適合度スコアが表示
- [ ] リーダーシップスコアが表示
- [ ] TOP資質が表示される

#### データなし時の表示
- [ ] カードが非表示（nullを返す）

#### インタラクション
- [ ] 詳細情報ボタンをクリックで展開
- [ ] 詳細情報ボタンを再クリックで折りたたみ
- [ ] 展開時にすべての詳細項目が表示される

#### ダークモード
- [ ] カード背景がdark:bg-gray-800
- [ ] テキストがdark:text-gray-100
- [ ] バッジがdark対応

#### レスポンシブ
- [ ] スマホ（375px）で正しく表示
- [ ] タブレット（768px）で正しく表示
- [ ] PC（1024px以上）で正しく表示

---

### 統合テスト（ProfileAnalysis.integration.test.tsx）

#### IndividualStrengths画面での統合
- [ ] ニコ・ロビン（完全データ）でカード表示
- [ ] うちはサスケ（完全データ）でカード表示
- [ ] MBTI未登録メンバーで資質のみモード
- [ ] 資質未登録メンバーでMBTIのみモード
- [ ] カードがストレングスファインダーカードの下に配置

#### サンプルデータでの動作確認
- [ ] sample-data.jsonの全メンバーで正常動作
- [ ] エラーが発生しない
- [ ] スコア計算が正常

#### 既存機能への影響
- [ ] 既存テストがすべてパス
- [ ] メンバー一覧表示に影響なし
- [ ] 部署分析に影響なし
- [ ] 選択メンバー分析に影響なし

---

## 📊 データ仕様

### MemberStrengthsインターフェース拡張

```typescript
export interface MemberStrengths {
  id: string;
  name: string;
  department: string;
  position?: Position | string;
  strengths: RankedStrength[];

  // 既存フィールド（確認）
  personalityId?: number;        // 1-16
  personalityVariant?: 'A' | 'T'; // A: 自己主張型, T: 慎重型
}
```

### MBTIプロファイルJSON仕様

**ファイルパス**: `public/config/mbti-profiles.json`

**構造**:
```json
{
  "version": "1.0.0",
  "lastUpdated": "2025-10-20",
  "profiles": [
    {
      "type": "INTJ",
      "name": "建築家",
      "description": "...",
      "characteristics": { ... },
      "motivation": { ... },
      "teamDynamics": { ... },
      "strengthsSynergy": {
        "highSynergy": [4, 20, 29, 21, 34],
        "moderateSynergy": [1, 16, 31, 22, 13],
        "lowSynergy": [2, 9, 15, 19, 30]
      },
      "mbtiCompatibility": { ... },
      "careerPaths": { ... }
    },
    // ... 残り15タイプ
  ]
}
```

### スコア計算式

#### 強み適合度（Synergy Score）
```
synergyScore = Σ(相性点 × 重み)

重み:
- TOP1: 0.5
- TOP2: 0.3
- TOP3: 0.15
- TOP4: 0.03
- TOP5: 0.02

相性点:
- highSynergy: 95点
- moderateSynergy: 65点
- lowSynergy: 35点
- 未定義: 50点
```

#### チーム適合度（Team Fit Score）
```
完全モード:
teamFitScore = 基礎50点
  + (E型: +12, I型: 0)
  + (F型: +10, T型: 0)
  + (J型: +8, P型: 0)
  + (チーム指向資質ごとに: TOP1=+10, TOP2=+8, ...)

MBTIのみ:
teamFitScore = 基礎50点 + MBTI加算のみ

資質のみ:
teamFitScore = 基礎50点 + 資質加算のみ
```

#### リーダーシップ潜在力（Leadership Potential）
```
完全モード:
leadershipScore = 基礎40点
  + (E型: +15, I型: 0)
  + (T型: +12, F型: 0)
  + (J型: +18, P型: 0)
  + (リーダーシップ資質ごとに: TOP1=+12, TOP2=+10, ...)

MBTIのみ:
leadershipScore = 基礎45点 + MBTI加算のみ

資質のみ:
leadershipScore = 基礎40点 + 資質加算のみ
```

---

## 🚨 開発時の注意事項

### Spec駆動開発の徹底
- [ ] タスク開始前にこのSpecを全文読む
- [ ] 実装中は成果物リストと照合
- [ ] 完了報告前に品質基準をすべて満たしているか確認

### TDDサイクルの徹底
- [ ] RED（テスト作成）→ GREEN（実装）→ REFACTOR（リファクタリング）
- [ ] リファクタリング後も必ずテスト再実行
- [ ] テストがグリーンであることを確認してから次のタスクへ

### タスク管理の徹底
- [ ] TodoWriteツールで進捗を常に可視化
- [ ] 各タスクの実行結果を確認してから次へ
- [ ] タスク完了時は必ず「completed」にマーク

### 品質基準の徹底
- [ ] テストが通るだけでなく、機能として完成しているか確認
- [ ] ダークモード対応を全要素で確認
- [ ] sample-data.jsonで実際の動作確認

---

## 📅 完了定義

このSpecのすべてのチェックボックスが✅になった時点で完了とする。

完了報告前に以下を確認：
- [ ] Specの品質基準をすべて満たしているか？
- [ ] Specの成果物がすべて作成されているか？
- [ ] ユーザーが実際に使って満足できる状態か？
- [ ] テストが通っているだけでなく、機能として完成しているか？

**1つでも「No」なら完了報告しない。**

---

**作成者**: Claude (AI開発アシスタント)
**承認者**: （ユーザーによる承認待ち）
