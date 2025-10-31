# Changelog

このファイルは、メンバープロファイル分析の主要な変更を記録します。

**分析ロジックの理論的根拠**: [ANALYSIS_METHODOLOGY.md](./ANALYSIS_METHODOLOGY.md) を参照してください。

## [Unreleased]

### v3.1.1: マネージャー機能 - UI/UX改善 (2025-10-31)

#### 🎯 主要な改善

**数値入力の誤操作防止**
- 問題: 単価入力時にスピナーボタンを誤クリックし、699,999円のような一桁ズレた値が登録される
- 修正: 全ての`<input type="number">`要素のスピナーボタンをCSSで無効化
- 影響範囲: `src/index.css` - グローバルスタイルとして適用

**メンバー選択の視覚的フィードバック強化**
- 個人分析で選択中のメンバーカードに青いリング（`ring-2 ring-blue-400`）と強い影（`shadow-lg`）を追加
- 選択状態が一目で分かるように改善
- 影響範囲: `src/components/strengths/MembersList.tsx`

**部署フィルターのUX改善**
- 部署コード選択を番号順で自動ソート（自然順序）
- メンバー一覧と部署分析画面の部署選択を連動
  - `StrengthsContext`で`selectedDepartment`状態を共有
  - タブ切り替え時に部署選択が維持される
- 影響範囲: `src/components/strengths/MembersList.tsx`, `src/components/strengths/DepartmentAnalysis.tsx`

**ステージ別内訳の表示順序固定**
- 利益率分析のステージ別内訳を「S1, S2, S3, S4, CONTRACT, BP」の固定順序で表示
- `STAGE_ORDER`定数を定義し、予測可能な表示順序を実現
- 影響範囲: `src/components/strengths/ProfitabilityDashboard.tsx`

**ダッシュボードの統合と簡素化**
- 💰売上予測と📊利益率分析で月間売上が重複していた問題を解消
- `FinancialDashboard`コンポーネントを削除し、`ProfitabilityDashboard`に統合
- レイアウトを3カラムから4カラム（`md:grid-cols-2 lg:grid-cols-4`）に拡張
- 新規追加: 📅年間予測カラム（月額利益 × 12ヶ月）
- 影響範囲: `src/components/strengths/DepartmentAnalysis.tsx`, `src/components/strengths/ProfitabilityDashboard.tsx`

#### 🔧 技術的な変更

**src/index.css**
```css
/* 数値入力フィールドのスピナーボタンを非表示（誤操作防止） */
input[type='number']::-webkit-inner-spin-button,
input[type='number']::-webkit-outer-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

input[type='number'] {
  -moz-appearance: textfield;
  appearance: textfield;
}
```

**src/components/strengths/MembersList.tsx**
- 部署ソート: `[...new Set(members.map(member => member.department))].sort()`
- カード強調: `ring-2 ring-blue-400 dark:ring-blue-500 shadow-lg`
- Context連携: `selectedDepartment`と`setSelectedDepartment`を`useStrengths()`から取得

**src/components/strengths/DepartmentAnalysis.tsx**
- 部署ソート: `['all', ...[...new Set(members.map(m => m.department))].sort()]`
- `FinancialDashboard`の削除、`ProfitabilityDashboard`のみを表示

**src/components/strengths/ProfitabilityDashboard.tsx**
- `STAGE_ORDER = ['S1', 'S2', 'S3', 'S4', 'CONTRACT', 'BP']` 定数追加
- 4カラムレイアウトに変更
- 年間予測カラム追加: `{FinancialService.formatCurrency(teamProfitability.totalProfit * 12)}`

#### 📊 表示改善の効果

- **誤操作防止**: スピナーボタン無効化により入力ミスが大幅減少
- **視認性向上**: 選択中のメンバーが明確に識別可能
- **操作性向上**: 部署フィルターの並び順が予測可能に
- **一貫性向上**: 画面間での部署選択が連動し、UXが統一
- **情報集約**: 重複表示を排除し、必要な情報（年間予測）を追加

---

### v1.2: SF-onlyモード分析改善 (2025-01-23)

#### 🎯 主要な改善

**SF-onlyユーザーへの分析品質向上**
- 問題: SF-onlyユーザー（MBTIデータなし）に対して固定文字列を返していた
  - 例: `strengths: ['資質を活かした強み']`（データに基づかない無意味な文字列）
  - 例: `workStyle: '資質を活かした働き方'`（根拠のない固定文）
- 修正内容:
  - 固定文字列を完全に廃止し、**スコアベースの動的メッセージ生成**に変更
  - `buildStrengthsOnlyProfileSummary()`メソッドを新規実装
    - `teamFitScore`に基づくチームスタイル判定（70+: チームワーク重視 / 50-69: 柔軟 / -49: 独立型）
    - `leadershipPotential`に基づく役割期待（70+: リーダー型 / 50-69: バランス型 / -69: 専門家型）
    - TOP3資質を活用した自然な説明文を生成
  - UI表示も簡素化（プロファイルサマリーのみ、詳細情報の折りたたみなし）
  - 16Personalities追加を促すメッセージを表示

#### 🔧 技術的な変更

**PersonalityAnalysisEngine.ts**
- `analyzeStrengthsOnly()`メソッドから固定文字列を削除
- `buildStrengthsOnlyProfileSummary(topStrengths, teamFitScore, leadershipPotential)`メソッドを実装
  - 3文構成のプロファイルサマリー生成
  - 第1文: TOP3資質の紹介
  - 第2文: チームスタイル（teamFitScoreベース）
  - 第3文: 役割期待（leadershipPotentialベース）
- 未使用の`inferWorkStyleFromStrengths()`メソッドを削除

**PersonalityAnalysis.ts（型定義）**
- `AnalysisResult`インターフェースのプロパティを適切にオプショナル化
  - `strengths?`, `workStyle?`, `communicationStyle?`, `idealEnvironment?`
  - `motivators?`, `stressors?`
  - SF-onlyモード時は`undefined`で返すことを型定義で明示

**ProfileAnalysisCard.tsx**
- SF-onlyモード時は簡潔な表示に変更
  - プロファイルサマリーのみ表示
  - 詳細情報の折りたたみボタンを非表示
  - 「💡 16Personalities診断結果を追加すると、より詳細な性格分析が表示されます」メッセージを追加

#### 🎉 改善効果

- **データに基づいた根拠のある分析結果**をSF-onlyユーザーにも提供
- 固定文字列による誤解を防止
- 型安全性の向上
- ユーザー体験の大幅な改善

---

### v1.1: Belbin理論適用 + インポートバグ修正 (2025-01-23)

#### 🎯 主要な改善

**チーム適合度の理論的根拠を強化**
- Belbin 9ロール理論（1981）を適用し、外向型優遇バイアスを廃止
- 全16 MBTIタイプにBelbinロールを割り当て（内向型・外向型を等しく評価）
  - 内向型が得意なロール例: Plant（創造者）、Monitor Evaluator（監視評価者）、Specialist（専門家）
  - 各ロールに8-18点の適性スコアを設定
- ドキュメント（ANALYSIS_METHODOLOGY.md）を実装と完全一致させる

**インポート機能の深刻なバグ修正**
- 問題1: マージ後にメンバー削除すると、マージ前の古いデータに戻る
- 問題2: マージ後にエクスポートすると、マージされたメンバーが含まれない
- 根本原因: StrengthsServiceがLocalStorageから毎回読み込み直し、Context stateを無視していた
- 修正内容:
  - `addOrUpdateMember`, `deleteMember`, `exportData` をContext内のstateから直接操作するように変更
  - useEffectでmembers/customPositionsの変更を監視し、LocalStorageに自動保存
  - これにより、マージ→削除→エクスポートの全フローが正しく動作

**役割説明機能の追加**
- 統合分析結果（例：「ビジョン構築者」）の詳細説明を表示
- MBTIグループ × 資質カテゴリの組み合わせに基づく説明文
- 例: 「MBTI(NF型)×分析資質の組み合わせ。理想と洞察力で未来像を描き、人々に方向性を示します。」

#### 🔧 技術的な変更

**PersonalityAnalysisEngine.ts**
- `BELBIN_ROLES` 定数を追加（全16タイプの定義）
- `getBelbinRoleScore()` メソッドを追加
- `calculateTeamFit()` を Belbin スコアベースに書き換え
- `getRoleDescription()` staticメソッドを追加（16種の役割説明）
- クラス自体もexportして、staticメソッドを外部から呼び出し可能に

**StrengthsContext.tsx**
- `isInitialized` フラグを追加（無限ループ防止）
- useEffectで `members` の変更をLocalStorageに自動保存
- useEffectで `customPositions` の変更をLocalStorageに自動保存
- `addOrUpdateMember()`: StrengthsServiceではなく、Context内のstateを直接更新
- `deleteMember()`: StrengthsServiceではなく、Context内のstateを直接フィルタ
- `exportData()`: StrengthsServiceではなく、Context内のstateを直接エクスポート
- デバッグログ追加（マージ処理、LocalStorage保存のタイミング）

**ProfileAnalysisCard.tsx**
- `PersonalityAnalysisEngineClass` をimportして、`getRoleDescription()` を呼び出し
- 統合分析結果の下に役割説明を表示

**ANALYSIS_METHODOLOGY.md**
- Section 2.1: 相性スコア計算式を実装ベース（重み付き加算）に更新
- Section 3: チーム適合度を Belbin 9ロール理論ベースに全面書き換え
- Section 4.1: リーダーシップMBTIスコアを実装値に修正（E+15, T+12, J+18）
- バージョン履歴を追加（v1.1）

#### 🐛 バグ修正

**マージインポート後の動作不良を完全修正**
- 修正前: マージ → 削除 → エクスポート でマージ分が消える
- 修正後: マージ → 削除 → エクスポート で正しくマージされたデータが残る

---

### Phase2: 動的分析強化 + インポート競合解決機能 (2025-01-23)

#### 🎯 追加機能

**プロファイル分析の深化**
- 動的な役割推論システム（16パターン）
  - MBTIタイプ（E/I, S/N, T/F, J/P）と資質カテゴリの組み合わせから自動推論
  - 例：「戦略的思考のエキスパート」「チームを繋ぐコーディネーター」など
- スコアベースの4文構成プロファイルサマリー
  - 統合型（synergyScore 85+）：「高い相乗効果」メッセージ
  - バランス型（synergyScore 55-84）：「柔軟性・補完」メッセージ
  - 多面型（synergyScore -54）：「独自性・多様性」メッセージ
- 働き方スタイルの動的判定
  - チーム協調型（teamFitScore 70+）：「チーム・協力・コミュニケーション」重視
  - 個人作業型（teamFitScore -59）：「独立・集中・深く考える」重視
- 役割期待メッセージの動的生成
  - リーダー型（leadershipPotential 70+）：「リーダーシップ・牽引・方向性」
  - 専門家型（leadershipPotential -69）：「専門性・エキスパート・知識の深化」

**インポート競合解決機能**
- 他部署データのインポート時に重複を検出
- 3つのインポート戦略から選択可能：
  - **Replace（全置換）**：既存データを完全削除し、インポートデータで置き換え
  - **Add（新規のみ追加）**：重複しないメンバーのみを追加（既存データは保持）
  - **Merge（マージ&更新）**：重複メンバーは更新、新規メンバーは追加
- 視覚的なダイアログで重複情報を表示（既存件数、インポート件数、重複社員番号）
- カスタム役職も戦略に応じて適切に処理

#### 🐛 バグ修正

**メンバー編集時の資質スコア割り当てバグ修正**
- 問題：メンバーの資質を編集画面で付け替える操作を繰り返すと、すべての資質のスコアが5になってしまう
- 修正：1-5の範囲で未使用の最小スコアを探すアルゴリムに変更
- 影響範囲：`src/components/strengths/MemberForm.tsx` の `toggleStrength` メソッド

#### 🔧 リファクタリング

**PersonalityAnalysisEngine.ts**
- スコア閾値を定数化（`SYNERGY_THRESHOLDS`, `TEAM_FIT_THRESHOLDS`, `LEADERSHIP_THRESHOLDS`）
- `buildEnhancedProfileSummary` メソッドを新規実装（4文構成サマリー生成）
- `inferRoleFromMBTIAndStrengths` メソッドを新規実装（16パターン役割推論）

**StrengthsContext.tsx**
- `importData` メソッドをasync化
- `ImportConflictData` インターフェース追加
- オプショナルな `onConflict` コールバックで戦略を取得

**StrengthsFinderPage.tsx**
- `ImportConflictDialog` コンポーネントを統合
- インポート時の衝突検出と解決フローを実装

#### ✅ テスト

**追加テストケース（全86件パス）**
- TC-010: 統合型（synergyScore 85+）のサマリー検証
- TC-011: バランス型（synergyScore 55-84）のサマリー検証
- TC-012: 多面型（synergyScore -54）のサマリー検証
- TC-013: チーム協調型（teamFitScore 70+）の働き方メッセージ検証
- TC-014: 個人作業型（teamFitScore -59）の働き方メッセージ検証
- TC-015: リーダー型（leadershipPotential 70+）の役割期待メッセージ検証
- TC-016: 専門家型（leadershipPotential -69）の役割期待メッセージ検証
- TC-017: primaryRoleに基づいた貢献メッセージ検証
- TC-018: profileSummaryの4文構成検証

---

### Phase1: プロファイル分析機能 (2025-01-22)

#### 🎯 追加機能

**MBTI×資質の統合分析**
- 相性スコア（Synergy Score）：MBTIと資質の相性を0-100で数値化
- チーム適合度（Team Fit Score）：チームワークへの適合度を0-100で評価
- リーダーシップ潜在力（Leadership Potential）：リーダーシップ資質を0-100で評価
- 主要役割（Primary Role）：「戦略的思考家」「チームの調整役」などを自動判定
- 4文構成プロファイルサマリー：性格と資質の統合的な説明文

**UI/UX改善**
- プロファイル分析カードの折りたたみ機能（デフォルト展開）
- MBTIタイプバッジにツールチップ（タイプの説明）
- スコアバーの色分け表示（高・中・低）
- レスポンシブデザインの改善

**スマホ対応＆スクロールUX改善**
- モバイル表示の最適化（メンバーリスト・分析エリアの縦配置）
- メンバー選択時の自動スクロール機能
- タブ切り替え時のスムーズな遷移

#### 🔧 リファクタリング

**PersonalityAnalysisEngine.ts 新規作成**
- MBTI-資質間の相性マトリクス定義
- スコア計算ロジックの実装
- 役割判定アルゴリズムの実装

**ProfileAnalysisCard.tsx 新規作成**
- プロファイル分析専用のUIコンポーネント
- MBTIInfoと統合表示

#### ✅ テスト

**追加テストケース（全テストパス）**
- TC-001: INTJ + Analytical資質の高相性スコア検証
- TC-002: ESFP + Analytical資質の低相性スコア検証
- TC-003: 資質なしメンバーのnull返却検証
- TC-004: MBTIなしメンバーのnull返却検証
- TC-005: Team Fit Scoreの計算ロジック検証
- TC-006: Leadership Potentialの計算ロジック検証
- TC-007: Primary Roleの判定ロジック検証
- TC-008: Profile Summaryの4文構成検証
- TC-009: 統合テスト（複数パターンの分析結果検証）

---

### 初期リリース (2024-12-XX)

#### 🎯 追加機能

**メンバー管理**
- メンバーの追加・編集・削除
- 社員番号、氏名、部署コード、役職の管理
- ストレングスファインダー（34資質から5つ選択）
- 16Personalities（16タイプ + アイデンティティ）

**分析機能**
- 個人分析：選択したメンバーの強みと性格を視覚的に分析
- 部署分析：部署コードごとの強みの傾向を分析
- 選択メンバー分析：複数メンバーを選択して集計分析
- 所有者分析：特定の資質や性格タイプを持つメンバーの逆引き検索

**データ管理**
- JSONファイルでのエクスポート/インポート
- ローカルストレージでの自動保存
- カスタム役職の追加機能

**UI/UX**
- ダークモード対応（Light/Darkテーマ切り替え）
- レスポンシブデザイン（デスクトップ・タブレット・モバイル対応）
- GitHub Pagesでの自動デプロイ

#### 🔧 技術スタック

- React 19 + TypeScript
- Tailwind CSS 3.4.1
- Recharts（グラフ表示）
- LocalStorage API
- GitHub Actions（CI/CD）

---

## リリース規則

### バージョニング
このプロジェクトは[Semantic Versioning](https://semver.org/)に準拠します：
- MAJOR: 破壊的な変更
- MINOR: 後方互換性のある新機能追加
- PATCH: 後方互換性のあるバグ修正

### 変更タイプ
- `追加機能`：新機能の追加
- `変更`：既存機能の変更
- `非推奨`：近い将来削除される機能
- `削除`：削除された機能
- `バグ修正`：バグの修正
- `セキュリティ`：セキュリティに関する変更
