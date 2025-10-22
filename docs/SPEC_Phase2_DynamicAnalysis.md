# SPEC - Phase2: 動的分析強化

## 概要

Phase1で実装したプロファイル分析機能を強化し、**MBTI×資質の組み合わせによる動的な分析結果生成**を実現する。

現状の問題点：
- 統合分析結果（primaryRole）がMBTIタイプで固定され、資質の影響を受けない
- プロファイルサマリーが資質名を列挙するだけで、組み合わせの意味を説明していない
- 計算されたスコア（synergyScore, teamFitScore, leadershipPotential）が分析文に反映されていない

## 目標

同じMBTIタイプでも、資質の組み合わせによって**明確に異なる分析結果**が表示されること。

**成功基準:**
- INTJ + 戦略性/最上志向 と INTJ + 共感性/調和性 で異なる役割・説明が表示される
- 資質を入れ替えると、プロファイルサマリーの内容が変わる
- スコアに基づいた具体的な分析コメントが生成される

---

## SPEC-001: 統合分析結果（primaryRole）の動的生成

### 要件

**完全モード（MBTI + 資質）時:**
- MBTIタイプの特性 × 資質TOP5の傾向を組み合わせて役割を生成
- 資質の4グループ（戦略的思考/実行力/影響力/人間関係構築）の分布を考慮
- MBTIと資質の相乗効果パターンを反映

**現状の問題:**
```typescript
// 現在のコード (PersonalityAnalysisEngine.ts:163)
primaryRole: profile.teamDynamics.naturalRole  // MBTI固定
```

### 入出力仕様

#### 入力
```typescript
{
  mbtiType: 'INTJ',
  strengths: [
    { id: 34, score: 1 },  // 戦略性
    { id: 32, score: 2 },  // 最上志向
    { id: 29, score: 3 },  // 学習欲
    { id: 27, score: 4 },  // 収集心
    { id: 9, score: 5 },   // 達成欲
  ]
}
```

#### 期待される出力パターン

##### パターン1: INTJ + 戦略的思考が強い
```
入力: INTJ + [戦略性, 最上志向, 学習欲, 収集心, 内省]
出力: "戦略的思考のエキスパート"
```

##### パターン2: INTJ + 実行力が強い
```
入力: INTJ + [達成欲, 責任感, 規律性, 目標志向, 信念]
出力: "計画実行のスペシャリスト"
```

##### パターン3: INTJ + 影響力が強い
```
入力: INTJ + [指令性, 自己確信, コミュニケーション, 活発性, 社交性]
出力: "戦略的リーダー"
```

##### パターン4: INTJ + 人間関係構築が強い
```
入力: INTJ + [共感性, 調和性, 個別化, 包含, 適応性]
出力: "分析型ファシリテーター"
```

### 役割生成ルール

#### MBTIグループ分類

**分析家グループ (NT):**
- INTJ, INTP, ENTJ, ENTP
- 基本特性: 戦略的、論理的、システム思考

**外交官グループ (NF):**
- INFJ, INFP, ENFJ, ENFP
- 基本特性: 理想追求、人間理解、価値重視

**番人グループ (SJ):**
- ISTJ, ISFJ, ESTJ, ESFJ
- 基本特性: 責任感、伝統尊重、秩序維持

**探検家グループ (SP):**
- ISTP, ISFP, ESTP, ESFP
- 基本特性: 実践的、柔軟、即応力

#### 資質グループ分類

**戦略的思考力 (ANALYTICAL_STRENGTHS):**
- ID: 27-34
- 資質例: 戦略性、最上志向、学習欲、内省、未来志向

**実行力 (EXECUTION_STRENGTHS):**
- ID: 1-9
- 資質例: 達成欲、責任感、規律性、目標志向、信念

**影響力 (LEADERSHIP_STRENGTHS):**
- ID: 11-17
- 資質例: 指令性、自我、自己確信、コミュニケーション、活発性

**人間関係構築力 (TEAM_ORIENTED_STRENGTHS):**
- ID: 10, 15, 16, 19, 21, 22, 24, 26
- 資質例: 共感性、調和性、個別化、包含、ポジティブ

#### 役割生成マトリクス

| MBTIグループ | 戦略的思考強 | 実行力強 | 影響力強 | 人間関係強 |
|------------|------------|---------|---------|-----------|
| **分析家(NT)** | 戦略的思考のエキスパート | 計画実行のスペシャリスト | 戦略的リーダー | 分析型ファシリテーター |
| **外交官(NF)** | ビジョン構築者 | 理想実現の推進者 | 人を導くリーダー | 共感型サポーター |
| **番人(SJ)** | 組織設計者 | 確実な実行者 | 規律あるリーダー | チームの要 |
| **探検家(SP)** | 柔軟な戦略家 | 即応の実行者 | アクションリーダー | 現場調整役 |

### 実装方針

```typescript
private inferRoleFromMBTIAndStrengths(
  mbtiType: MBTIType,
  strengths: Member['strengths']
): string {
  // 1. MBTIグループを判定
  const mbtiGroup = this.classifyMBTIGroup(mbtiType);

  // 2. TOP5資質の傾向を分析
  const strengthProfile = this.analyzeStrengthProfile(strengths);

  // 3. マトリクスから役割を選択
  return this.selectRoleFromMatrix(mbtiGroup, strengthProfile);
}
```

---

## SPEC-002: プロファイルサマリーの深化

### 要件

**スコアベースの動的メッセージ生成:**
- synergyScore に基づいた相乗効果の説明
- teamFitScore に基づいた最適な働き方の提案
- leadershipPotential に基づいた役割期待の明示

**現状の問題:**
```typescript
// 現在のコード (PersonalityAnalysisEngine.ts:394-401)
private buildFullProfileSummary(profile: MBTIProfile, topStrengths: string[]): string[] {
  return [
    `${profile.name}（${profile.type}）タイプで、「${topStrengths[0]}」「${topStrengths[1]}」を持つプロフェッショナルです。`,
    `${profile.characteristics.workStyle}`,
    `特に${profile.teamDynamics.naturalRole}として、チームに貢献できます。`,
    `${profile.characteristics.communicationStyle}`,
  ];
}
// → 資質名を列挙するだけで、組み合わせの意味を説明していない
// → スコアを全く使っていない
```

### 入出力仕様

#### 入力
```typescript
{
  mbtiType: 'INTJ',
  mbtiProfile: MBTIProfile,
  topStrengths: ['戦略性', '最上志向', '学習欲', '収集心', '達成欲'],
  synergyScore: 92,           // 統合型 (85以上)
  teamFitScore: 45,           // 個人作業型 (50未満)
  leadershipPotential: 65,    // バランス型 (50-70)
}
```

#### 期待される出力

##### 現状（改善前）
```typescript
[
  "建築家（INTJ）タイプで、「戦略性」「最上志向」を持つプロフェッショナルです。",
  "体系的に情報を分析し、長期的な計画を立てることが得意です。",
  "特に戦略家・思考家として、チームに貢献できます。",
  "論理的で明確なコミュニケーションを好み、深い議論を楽しみます。"
]
```

##### 改善後
```typescript
[
  "建築家（INTJ）の分析力と「戦略性」「最上志向」が高い相乗効果を発揮します。完璧を追求する思考スタイルが一貫しています。",
  "独立して深く考え、最適な戦略を構築することに長けています。集中できる環境で最大の成果を発揮します。",
  "戦略的思考のエキスパートとして、複雑な問題の本質を見抜き、長期的な解決策を提示します。",
  "必要に応じてリーダーシップを発揮し、専門知識でチームを導くことができます。状況に応じて柔軟に役割を調整します。"
]
```

### メッセージ生成ルール

#### 第1文: 相乗効果の説明（synergyScore）

**統合型 (85以上):**
```
"{MBTIタイプ名}の{MBTI特性}と「{資質1}」「{資質2}」が高い相乗効果を発揮します。{一貫性の説明}"
```

例:
- INTJ + 戦略性/最上志向: "完璧を追求する思考スタイルが一貫しています。"
- ENFP + 活発性/コミュニケーション: "人を巻き込むエネルギーが自然に発揮されます。"

**バランス型 (55-84):**
```
"{MBTIタイプ名}の{MBTI特性}に「{資質1}」「{資質2}」が柔軟性を加えます。{補完の説明}"
```

例:
- INTJ + 共感性/調和性: "論理的思考に人間理解の視点が加わり、バランスの取れたアプローチが可能です。"
- ISTJ + 戦略性/未来志向: "堅実さに革新的思考が加わり、安定と変革を両立できます。"

**多面型 (54以下):**
```
"{MBTIタイプ名}の{MBTI特性}と「{資質1}」「{資質2}」の組み合わせが、独自の強みを生み出します。{多様性の説明}"
```

例:
- INTJ + 社交性/ポジティブ: "分析力と明るい対人スキルという意外な組み合わせが、独特の魅力を生み出します。"

#### 第2文: 最適な働き方（teamFitScore）

**チーム協調型 (70以上):**
```
"チームと協力し、コミュニケーションを通じて相乗効果を生み出すことが得意です。{協働の具体例}"
```

**バランス型 (50-69):**
```
"独立作業と協働の両方に対応でき、状況に応じて柔軟にスタイルを切り替えます。{適応の説明}"
```

**個人作業型 (49以下):**
```
"独立して深く考え、集中できる環境で最大の成果を発揮します。{個人作業の利点}"
```

#### 第3文: 役割とチーム貢献（primaryRole + 具体的貢献）

```
"{primaryRole}として、{具体的な貢献内容}。{チームへの価値提供}"
```

例:
- 戦略的思考のエキスパート: "複雑な問題の本質を見抜き、長期的な解決策を提示します。"
- 共感型サポーター: "メンバーの感情を理解し、チームの一体感を高めます。"

#### 第4文: リーダーシップと役割期待（leadershipPotential）

**リーダー型 (70以上):**
```
"チームを牽引し、方向性を示すリーダーシップを発揮します。{リーダーとしての強み}"
```

**バランス型 (50-69):**
```
"必要に応じてリーダーシップを発揮し、{専門性}でチームを導くことができます。状況に応じて柔軟に役割を調整します。"
```

**専門家型 (49以下):**
```
"専門性を深め、特定分野のエキスパートとして価値を提供します。{専門性の発揮方法}"
```

### 実装方針

```typescript
private buildEnhancedProfileSummary(
  profile: MBTIProfile,
  topStrengths: string[],
  synergyScore: number,
  teamFitScore: number,
  leadershipPotential: number,
  primaryRole: string
): string[] {
  return [
    this.buildSynergyMessage(profile, topStrengths, synergyScore),
    this.buildWorkStyleMessage(teamFitScore),
    this.buildRoleContributionMessage(primaryRole, topStrengths),
    this.buildLeadershipMessage(leadershipPotential, topStrengths),
  ];
}
```

---

## SPEC-003: スコアベース分析コメント生成

### サブメソッド仕様

#### buildSynergyMessage()

**入力:**
- profile: MBTIProfile
- topStrengths: string[]
- synergyScore: number

**出力パターン:**
- 統合型 (85+): "高い相乗効果を発揮します。{一貫性}"
- バランス型 (55-84): "{補完}を加えます。{バランス}"
- 多面型 (-54): "独自の強みを生み出します。{多様性}"

#### buildWorkStyleMessage()

**入力:**
- teamFitScore: number

**出力パターン:**
- チーム協調型 (70+): "コミュニケーションを通じて相乗効果を生み出す"
- バランス型 (50-69): "柔軟にスタイルを切り替え"
- 個人作業型 (-49): "独立して深く考え、集中できる環境で"

#### buildRoleContributionMessage()

**入力:**
- primaryRole: string
- topStrengths: string[]

**出力:**
役割に応じた具体的な貢献内容を生成

#### buildLeadershipMessage()

**入力:**
- leadershipPotential: number
- topStrengths: string[]

**出力パターン:**
- リーダー型 (70+): "チームを牽引し、方向性を示す"
- バランス型 (50-69): "必要に応じてリーダーシップを発揮"
- 専門家型 (-49): "専門性を深め、エキスパートとして"

---

## テストケース

### TC-001: INTJ + 戦略的思考

```typescript
{
  mbtiType: 'INTJ',
  strengths: [
    { id: 34, score: 1 },  // 戦略性
    { id: 32, score: 2 },  // 最上志向
    { id: 29, score: 3 },  // 学習欲
    { id: 27, score: 4 },  // 収集心
    { id: 30, score: 5 },  // 内省
  ]
}
```

**期待される結果:**
- primaryRole: "戦略的思考のエキスパート"
- synergyScore: 85以上（統合型）
- profileSummary[0]: "建築家（INTJ）の分析力と「戦略性」「最上志向」が高い相乗効果を発揮します。"

### TC-002: INTJ + 実行力

```typescript
{
  mbtiType: 'INTJ',
  strengths: [
    { id: 9, score: 1 },   // 達成欲
    { id: 5, score: 2 },   // 責任感
    { id: 4, score: 3 },   // 規律性
    { id: 7, score: 4 },   // 目標志向
    { id: 2, score: 5 },   // 信念
  ]
}
```

**期待される結果:**
- primaryRole: "計画実行のスペシャリスト"
- synergyScore: 55-84（バランス型）
- profileSummary[0]: "建築家（INTJ）の分析力に実行力が加わり..."

### TC-003: ENFP + 影響力

```typescript
{
  mbtiType: 'ENFP',
  strengths: [
    { id: 13, score: 1 },  // コミュニケーション
    { id: 17, score: 2 },  // 活発性
    { id: 15, score: 3 },  // 社交性
    { id: 11, score: 4 },  // 指令性
    { id: 14, score: 5 },  // ポジティブ
  ]
}
```

**期待される結果:**
- primaryRole: "人を導くリーダー"
- teamFitScore: 70以上（チーム協調型）
- profileSummary[1]: "チームと協力し、コミュニケーションを通じて..."

### TC-004: ISTJ + 人間関係

```typescript
{
  mbtiType: 'ISTJ',
  strengths: [
    { id: 19, score: 1 },  // 共感性
    { id: 22, score: 2 },  // 調和性
    { id: 21, score: 3 },  // 個別化
    { id: 24, score: 4 },  // 包含
    { id: 26, score: 5 },  // 適応性
  ]
}
```

**期待される結果:**
- primaryRole: "チームの要"
- synergyScore: 54以下（多面型）
- profileSummary[0]: "管理者（ISTJ）の堅実さと「共感性」「調和性」の組み合わせが、独自の強みを生み出します。"

---

## 実装優先順位

### Phase 2.1: 役割生成（最優先）
1. MBTIグループ分類メソッド実装
2. 資質プロファイル分析メソッド実装
3. 役割マトリクス実装
4. inferRoleFromMBTIAndStrengths() 実装
5. analyzeFullMode() を修正してprimaryRoleに反映

### Phase 2.2: サマリー強化
1. buildSynergyMessage() 実装
2. buildWorkStyleMessage() 実装
3. buildRoleContributionMessage() 実装
4. buildLeadershipMessage() 実装
5. buildEnhancedProfileSummary() 実装
6. analyzeFullMode() を修正してprofileSummaryに反映

### Phase 2.3: テスト・検証
1. 単体テスト作成・実行
2. 統合テスト作成・実行
3. ブラウザでの動作確認

---

## 成功基準（再掲）

✅ **同じMBTIでも資質で役割が変わる**
- INTJ + 戦略性 → "戦略的思考のエキスパート"
- INTJ + 達成欲 → "計画実行のスペシャリスト"

✅ **プロファイルサマリーが動的に変わる**
- 資質を入れ替えると内容が明確に変化
- スコアに基づいた具体的な説明が含まれる

✅ **ユーザーが違いを体感できる**
- ブラウザで資質を変更すると、分析結果が目に見えて変わる

---

## 備考

- 既存のスコア計算ロジック（calculateSynergyScore, calculateTeamFit, calculateLeadership）は維持
- MBTIプロファイルデータ（1600行超）は変更不要
- 既存のテストを壊さないように注意
- Phase1の折りたたみUI機能は維持
