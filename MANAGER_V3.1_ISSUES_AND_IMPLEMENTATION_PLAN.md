# マネージャー機能 v3.1 - 現状課題と実装計画書

**作成日**: 2025-10-30  
**バージョン**: 1.0  
**ステータス**: 🔴 課題分析・実装計画策定完了

---

## 📊 エグゼクティブサマリー

### 現状認識

マネージャー機能v3.1の**基本ロジックは実装済み**ですが、設計書で提案されている「**改訂版（REVISED）**」の重要な変更が未適用です。特に**セキュリティとデータ構造の分離**が不完全な状態にあります。

### 主要課題

| カテゴリ | 課題 | 影響度 | 優先度 |
|---------|------|--------|--------|
| セキュリティ | 単価情報がMemberStrengthsに混在 | 🔴 高 | 🔥 最高 |
| データ構造 | MemberRateRecord未実装 | 🔴 高 | 🔥 最高 |
| UI設計 | 責務が分離されていない | 🟡 中 | ⬆️ 高 |
| テスト | v3.1テストの大部分がコメントアウト | 🟡 中 | ⬆️ 高 |
| 教育期間 | UI未実装 | 🟢 低 | ⬇️ 中 |

### 推奨アクション

**オプションA（推奨）**: 改訂版（REVISED）への完全移行
- 工数: 3-4日
- セキュリティの構造的保証を実現
- 長期的な保守性向上

**オプションB**: 現状v3.1の完成
- 工数: 1-2日
- 最低限の機能完成
- セキュリティリスクは残存

---

## 🔍 詳細課題分析

### 1. セキュリティリスク【🔴 最重要】

#### 1.1 問題の概要

**現状のMemberStrengths型定義**:
```typescript
export interface MemberStrengths {
  id: string;
  name: string;
  department: string;
  position?: Position | string;
  stageId?: string;
  
  // ❌ 問題: 機密情報が含まれている
  // （型定義上は存在しないが、実装で追加されている可能性）
  memberRate?: MemberRate;        // 売上単価（機密）
  contractRate?: ContractRate;     // 契約単価（機密）
  
  strengths: RankedStrength[];
  personalityId?: number;
  personalityVariant?: 'A' | 'T';
}
```

#### 1.2 具体的なリスク

**JSONエクスポート時の情報漏洩**:
```typescript
// 現状: 誤って単価情報を含むJSONをエクスポート可能
function exportMembers(members: MemberStrengths[]) {
  // memberRateが含まれたままエクスポートされる危険性
  return JSON.stringify(members);
}

// エクスポートされたJSON
{
  "members": [
    {
      "id": "001",
      "name": "山田太郎",
      "memberRate": {
        "rateType": "monthly",
        "rate": 800000  // ← 機密情報が露出
      }
    }
  ]
}
```

#### 1.3 影響範囲

- ✅ 一般ユーザーがJSONダウンロード可能
- ✅ ファイル共有時に単価情報が見える
- ✅ 組織外への漏洩リスク
- ❌ データ分離の設計思想と矛盾

#### 1.4 設計書の推奨対策

**改訂版（REVISED）の提案**:
```typescript
// ✅ 正しい設計: MemberStrengthsには機密情報を含めない
export interface MemberStrengths {
  id: string;
  name: string;
  department: string;
  stageId?: string;  // 原価テンプレート参照のみ
  strengths: RankedStrength[];
  // memberRate, contractRateは完全に削除
}

// ✅ 単価情報は別管理
export interface MemberRateRecord {
  memberId: string;              // MemberStrengths.idへの参照
  memberRate: MemberRate;        // 売上単価
  contractRate?: ContractRate;   // 契約単価
  updatedAt?: string;
}
```

**セキュリティ境界の明確化**:
```
┌─────────────────────────────────────────┐
│ 第1層: MemberStrengths                  │
│ （JSONエクスポート可、全員閲覧可）       │
├─────────────────────────────────────────┤
│ ✅ 名前、部署、強み                      │
│ ✅ stageId（原価テンプレート参照）       │
│ ❌ 金額情報は一切含まない                │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│ 第2層: MemberRateRecord                 │
│ （LocalStorageのみ、マネージャー専用）  │
├─────────────────────────────────────────┤
│ 🔒 memberRate（売上単価）               │
│ 🔒 contractRate（契約単価）             │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│ 第3層: StageMaster                      │
│ （LocalStorageのみ、マネージャー専用）  │
├─────────────────────────────────────────┤
│ 🔒 averageSalary（平均給与）            │
│ 🔒 fixedExpense（固定経費）             │
└─────────────────────────────────────────┘
```

---

### 2. データ構造の課題【🔴 重要】

#### 2.1 MemberRateRecordサービスの未実装

**必要だが未実装のファイル・機能**:

```typescript
// ❌ 未実装: src/services/MemberRateService.ts
export class MemberRateService {
  static getMemberRates(): MemberRateRecord[];
  static saveMemberRates(rates: MemberRateRecord[]): void;
  static getMemberRate(memberId: string): MemberRate | undefined;
  static setMemberRate(memberId: string, memberRate: MemberRate): void;
  static deleteMemberRate(memberId: string): void;
  static exportToJson(): string;
  static importFromJson(json: string): void;
}
```

**影響**:
- 単価情報の一元管理ができない
- LocalStorageのキーが統一されていない可能性
- データの整合性チェックが不十分

#### 2.2 データ移行スクリプトの未実装

**必要だが未実装のファイル**:

```typescript
// ❌ 未実装: src/utils/dataMigration.ts
export function migrateToV3_1(): MigrationResult;
export function needsMigration(): boolean;
```

**影響**:
- 既存ユーザーのデータが移行されない
- v3.0からv3.1へのアップグレードパスがない
- 手動でのデータ修正が必要になる

#### 2.3 LocalStorageキーの定義不足

**必要だが未実装のファイル**:

```typescript
// ❌ 未実装: src/constants/storage.ts
export const STORAGE_KEYS = {
  MEMBERS: 'strengths-members',
  MEMBER_RATES: 'strengths-member-rates',
  STAGE_MASTERS: 'strengths-stage-masters',
  DATA_VERSION: 'strengths-data-version',
} as const;
```

**影響**:
- LocalStorageキーがハードコードされている
- キーの命名規則が不統一
- 将来的な変更が困難

---

### 3. UI設計の課題【🟡 中程度】

#### 3.1 責務の混在

**現状の問題**:
- `MemberForm`で基本情報と単価情報を同時に管理
- ステージID設定と単価入力が同一画面
- 一般ユーザーとマネージャーの境界が曖昧

**設計書の推奨UI構成**:

```
【一般ユーザー向け】
- MemberForm: 名前、部署、ステージID、強みのみ

【マネージャー専用】
- MemberRateManagement: 単価情報管理専用画面
  - メンバー選択
  - 売上単価入力
  - 契約単価入力（条件分岐）
  - 利益予測プレビュー
```

#### 3.2 未実装のコンポーネント

**必要だが未実装のファイル**:

```bash
❌ src/components/profitability/MemberRateManagement.tsx
❌ src/components/profitability/TrainingMemberBadge.tsx
```

**影響**:
- 単価情報の集中管理ができない
- 教育期間メンバーの識別ができない
- UX一貫性が損なわれる

---

### 4. テストカバレッジの課題【🟡 中程度】

#### 4.1 v3.1テストの状況

**確認されたテストファイル**:
```bash
✅ src/services/__tests__/FinancialService.test.ts (実装済み)
⚠️ src/services/__tests__/ProfitabilityService.v3.1.test.ts (大部分コメントアウト)
```

**コメントアウトされているテストケース例**:
```typescript
// ❌ コメントアウト: 契約社員の利益計算
test('CONTRACT社員：売上80万、契約単価60万、固定経費5万', () => {
  // Act (v3.1実装後に有効化)
  // const result = ProfitabilityService.calculateMemberProfitability(...);
  
  // Assert (v3.1実装後)
  // expect(result.revenue).toBe(800000);
  // expect(result.cost).toBe(650000);
});
```

**影響**:
- v3.1の動作保証ができない
- リグレッション検知が不可能
- リファクタリングリスクが高い

#### 4.2 未実装のテスト

**必要だが未実装のテスト**:
- MemberRateServiceの単体テスト
- データ移行スクリプトのテスト
- MemberRateManagementの統合テスト
- JSONエクスポート・インポートのE2Eテスト

---

### 5. 教育期間機能の課題【🟢 優先度低】

#### 5.1 ロジックの実装状況

**実装済み**:
```typescript
✅ ProfitabilityService.isTrainingMember()
✅ 教育期間の原価計算
✅ チーム利益率の二重表示（実質 vs 稼働）
```

#### 5.2 未実装のUI

**必要だが未実装**:
- 🎓アイコン表示
- 教育投資コスト表示
- TrainingMemberBadgeコンポーネント

**影響**:
- 教育期間メンバーが視覚的に識別できない
- 教育投資の可視化ができない
- ビジネス要件の一部が未達

---

## 🎯 実装計画

### プラン選択の判断基準

| 基準 | オプションA（推奨） | オプションB |
|------|-------------------|------------|
| **セキュリティ** | ✅ 構造的に保証 | ⚠️ 運用でカバー |
| **保守性** | ✅ 高い | ⚠️ 中程度 |
| **工数** | 3-4日 | 1-2日 |
| **技術的負債** | ✅ ゼロ | ⚠️ 一部残存 |
| **将来拡張性** | ✅ 高い | ⚠️ 制限あり |

---

## 📋 オプションA: 改訂版（REVISED）への完全移行【推奨】

### 概要

設計書「MANAGER_FEATURE_SPEC_V3.1_UNIFIED_REVISED.md」に基づき、データ構造を完全に分離して実装。

### メリット

✅ **セキュリティの構造的保証**
- MemberStrengthsに金額情報が存在しない設計
- JSONエクスポート時の設定ミスを防止
- 新機能追加時も金額漏洩リスクなし

✅ **コードの単純化**
- フィルタリングロジック不要
- 責務が明確で保守しやすい
- レビュー時の確認が容易

✅ **長期的な価値**
- 技術的負債ゼロ
- 将来の機能拡張が容易
- チーム引き継ぎがスムーズ

### デメリット

⚠️ **初期工数**
- データ移行スクリプトの実装
- 既存コードの修正範囲が広い
- テストケースの再構築

---

### Phase 1: データモデル改訂 + 移行【0.5日】

#### 目標
MemberStrengthsから機密情報を完全に分離

#### タスク詳細

**1-1. 型定義の修正**
```bash
# 対象ファイル
- src/models/StrengthsTypes.ts
- src/types/financial.ts
- src/types/profitability.ts
```

**作業内容**:
- [ ] `MemberStrengths`から`memberRate`, `contractRate`を削除
- [ ] `MemberRateRecord`型を追加
- [ ] `ContractRate`型を追加（未定義の場合）
- [ ] TypeScriptコンパイルエラーを全て解消

**1-2. LocalStorageキー定義**
```bash
# 新規作成
- src/constants/storage.ts
```

**作業内容**:
- [ ] STORAGE_KEYSオブジェクトを定義
- [ ] 既存コード内のハードコードされたキーを置換

**1-3. MemberRateService実装**
```bash
# 新規作成
- src/services/MemberRateService.ts
```

**作業内容**:
- [ ] getMemberRates()
- [ ] saveMemberRates()
- [ ] getMemberRate(memberId)
- [ ] setMemberRate(memberId, memberRate)
- [ ] deleteMemberRate(memberId)
- [ ] exportToJson()
- [ ] importFromJson()

**1-4. データ移行スクリプト**
```bash
# 新規作成
- src/utils/dataMigration.ts
```

**作業内容**:
- [ ] migrateToV3_1()実装
  - LocalStorageから既存データ読み込み
  - memberRate/contractRateを抽出
  - MemberRateRecordとして保存
  - MemberStrengthsから削除
  - バージョン記録
- [ ] needsMigration()実装
- [ ] エラーハンドリング
- [ ] ロールバック機能

**1-5. App.tsxへの統合**
```bash
# 修正
- src/App.tsx
```

**作業内容**:
- [ ] useEffect内で移行チェック
- [ ] 初回起動時の自動移行実行
- [ ] 移行結果のコンソール出力
- [ ] エラー時のアラート表示

**完了条件**:
- [ ] TypeScriptコンパイルエラーゼロ
- [ ] 移行スクリプトの動作確認
- [ ] 既存データが正しく移行される
- [ ] ロールバック機能の動作確認

---

### Phase 2: 計算ロジック改訂【1.0日】

#### 目標
MemberRateRecordを使用した利益率計算への切り替え

#### タスク詳細

**2-1. FinancialServiceの改訂**
```bash
# 修正
- src/services/FinancialService.ts
```

**作業内容**:
- [ ] `calculateMonthlyRate()`のシグネチャ変更
  ```typescript
  // Before
  static calculateMonthlyRate(member: MemberStrengths): number
  
  // After
  static calculateMonthlyRate(memberRate: MemberRate): number
  ```
- [ ] `calculateTeamFinancials()`のシグネチャ変更
  ```typescript
  // Before
  static calculateTeamFinancials(members: MemberStrengths[]): TeamFinancials
  
  // After
  static calculateTeamFinancials(
    members: MemberStrengths[],
    memberRates: MemberRateRecord[]
  ): TeamFinancials
  ```
- [ ] MemberRateRecordからの単価情報取得ロジック追加

**2-2. ProfitabilityServiceの改訂**
```bash
# 修正
- src/services/ProfitabilityService.ts
```

**作業内容**:
- [ ] `calculateMemberProfitability()`のシグネチャ変更
  ```typescript
  // Before
  static calculateMemberProfitability(
    member: MemberStrengths,
    stageMasters: StageMaster[]
  ): MemberProfitability | null
  
  // After
  static calculateMemberProfitability(
    member: MemberStrengths,
    rateRecord: MemberRateRecord | undefined,
    stageMasters: StageMaster[]
  ): MemberProfitability | null
  ```
- [ ] `calculateTeamProfitability()`のシグネチャ変更
- [ ] `isTrainingMember()`の引数変更
  ```typescript
  // Before
  static isTrainingMember(member: MemberStrengths): boolean
  
  // After
  static isTrainingMember(rateRecord: MemberRateRecord | undefined): boolean
  ```

**2-3. カスタムフックの改訂**
```bash
# 修正（存在する場合）
- src/hooks/useProfitability.ts
- src/hooks/useFinancialData.ts
```

**作業内容**:
- [ ] MemberRateRecordの取得処理追加
- [ ] 計算関数呼び出し時にMemberRateRecordを渡すよう修正
- [ ] 依存配列の更新

**2-4. 単体テストの有効化と修正**
```bash
# 修正
- src/services/__tests__/ProfitabilityService.v3.1.test.ts
```

**作業内容**:
- [ ] コメントアウトされたテストを有効化
- [ ] MemberRateRecordを使用するよう修正
- [ ] テストデータの準備
- [ ] 全テストケースの実行と修正

**完了条件**:
- [ ] 正社員の利益率計算が正しい
- [ ] 契約社員の利益率計算が正しい
- [ ] BPの利益率計算が正しい
- [ ] 教育期間の判定・計算が正しい
- [ ] 単体テストが全てパス（カバレッジ80%以上）

---

### Phase 3: UI実装【1.5日】

#### 目標
責務分離されたUI実装

#### ステップ3-1: MemberFormの簡略化【0.5日】

```bash
# 修正
- src/components/strengths/MemberForm.tsx
```

**作業内容**:
- [ ] memberRate入力欄を削除
- [ ] contractRate入力欄を削除
- [ ] ステージID選択のみに機能を限定
- [ ] ステージ情報のプレビュー表示追加
  - 雇用形態
  - 原価構造（平均給与 or 固定経費）
- [ ] 単価情報管理画面への誘導メッセージ追加
  ```tsx
  {isManagerMode && (
    <div className="bg-blue-50 p-3 rounded">
      <p className="text-sm text-blue-700">
        💡 単価情報は「マネージャー設定 &gt; 単価情報管理」で設定してください
      </p>
    </div>
  )}
  ```

**完了条件**:
- [ ] 一般ユーザーは名前・部署・強みのみ編集可能
- [ ] マネージャーはステージIDも設定可能
- [ ] 単価情報の入力欄は存在しない
- [ ] UIテストがパス

#### ステップ3-2: MemberRateManagement新規作成【1.0日】

```bash
# 新規作成
- src/components/profitability/MemberRateManagement.tsx
```

**機能要件**:

**基本レイアウト**:
```
┌─────────────────────────────────────────┐
│ 単価情報管理                             │
├─────────────────────────────────────────┤
│ メンバー選択: [▼ 山田太郎]              │
├─────────────────────────────────────────┤
│ ステージ情報（参照のみ）                 │
│ - ステージ: S2（中堅社員）               │
│ - 雇用形態: 正社員                       │
│ - 平均給与: ¥450,000/月                  │
│ - 経費率: 30%                            │
│ - 月間原価: ¥585,000                     │
├─────────────────────────────────────────┤
│ 売上単価設定                             │
│ ○ 月額単価: [600000] 円/月              │
│ ○ 時給: [    ] 円/時 × [  ] 時間/月    │
├─────────────────────────────────────────┤
│ 契約単価設定（契約社員・BPのみ表示）     │
│ （表示条件分岐）                         │
├─────────────────────────────────────────┤
│ 利益予測プレビュー                       │
│ 📊 月間売上: ¥600,000                    │
│ 💰 月間原価: ¥585,000                    │
│ 💵 月間利益: ¥15,000                     │
│ 📈 利益率: 2.5% 🟡                       │
├─────────────────────────────────────────┤
│ [保存] [削除] [キャンセル]               │
└─────────────────────────────────────────┘
```

**作業内容**:
- [ ] メンバー選択ドロップダウン実装
  - 全メンバーリスト取得
  - ステージID設定済みのメンバーのみ表示
  - 選択時のデータ読み込み
- [ ] ステージ情報表示エリア
  - stageIdからStageMasterを取得
  - 雇用形態別の情報表示
  - 原価計算の詳細表示
- [ ] 売上単価入力エリア
  - 月額/時給の切り替え
  - バリデーション（必須、数値、範囲）
  - 月額換算の自動計算
- [ ] 契約単価入力エリア（条件表示）
  - 雇用形態が'contract'または'bp'の時のみ表示
  - 時給/月額の切り替え（契約社員のみ時給可）
  - バリデーション
- [ ] 利益予測プレビュー
  - リアルタイム計算
  - 色分け表示（緑/黄/赤）
  - 教育期間の判定と表示
- [ ] 保存・削除機能
  - MemberRateServiceへの保存
  - 確認ダイアログ
  - 成功/エラーメッセージ

**完了条件**:
- [ ] 単価情報の追加ができる
- [ ] 単価情報の編集ができる
- [ ] 単価情報の削除ができる
- [ ] 利益率が正しく表示される
- [ ] 教育期間の判定が正しい
- [ ] バリデーションが機能する
- [ ] 統合テストがパス

---

### Phase 4: 教育期間UI対応【1.0日】（オプション）

#### 目標
教育投資コストの可視化

**注意**: Phase 3完了時点で基本機能は完成。この Phase は後回しでも可。

#### ステップ4-1: TrainingMemberBadge作成【0.5日】

```bash
# 新規作成
- src/components/profitability/TrainingMemberBadge.tsx
```

**機能要件**:
```tsx
// コンパクト表示
<div className="inline-flex items-center gap-1 px-2 py-1 bg-orange-100 rounded">
  <span className="text-lg">🎓</span>
  <span className="text-sm text-orange-700">教育期間</span>
</div>

// 詳細表示
<div className="p-3 bg-orange-50 border border-orange-200 rounded">
  <div className="flex items-center gap-2 mb-2">
    <span className="text-xl">🎓</span>
    <span className="font-bold text-orange-900">教育期間</span>
  </div>
  <div className="text-sm text-orange-700">
    教育投資: ¥585,000/月
  </div>
</div>
```

**作業内容**:
- [ ] コンポーネント実装
- [ ] compact propによる表示切替
- [ ] 教育投資額の表示
- [ ] ツールチップの実装

#### ステップ4-2: 既存コンポーネントへの統合【0.5日】

```bash
# 修正
- src/components/profitability/ProfitabilitySummaryPanel.tsx
- src/components/strengths/MembersList.tsx
- src/components/profitability/MemberRateManagement.tsx
```

**ProfitabilitySummaryPanel**:
- [ ] 教育投資コスト表示の追加
- [ ] 実質利益率 vs 稼働利益率の併記
- [ ] 教育メンバー数の表示

**MembersList**:
- [ ] ProfitabilityBadge vs TrainingMemberBadgeの出し分け
- [ ] 教育期間メンバーの特別表示

**MemberRateManagement**:
- [ ] 売上¥0入力時の教育期間プレビュー
- [ ] ヘルプテキストの追加

**完了条件**:
- [ ] 売上¥0で教育期間として扱われる
- [ ] 教育投資コストが表示される
- [ ] 実質利益率・稼働利益率が正しい
- [ ] 売上設定で自動解除される
- [ ] 統合テストがパス

---

## 📋 オプションB: 現状v3.1の完成【非推奨】

### 概要

改訂版への移行を見送り、現在のデータ構造のまま最低限の機能を完成させる。

### メリット

✅ **短期間で完成**
- 工数: 1-2日
- 型定義の大幅変更なし
- 既存コードの修正範囲が小さい

### デメリット

⚠️ **セキュリティリスク**
- MemberStrengthsに単価情報が残る
- JSONエクスポート時の設定ミスリスク
- 運用ルールでの対処が必要

⚠️ **技術的負債**
- 将来的なリファクタリングが必要
- データ構造が非直感的
- 保守性が低い

⚠️ **長期的なコスト**
- 将来の改訂版移行時に再度工数発生
- 二度手間になる可能性

---

### Phase 1: テストの有効化【0.5日】

```bash
# 修正
- src/services/__tests__/ProfitabilityService.v3.1.test.ts
```

**作業内容**:
- [ ] コメントアウトされたテストを有効化
- [ ] テストケースの実装
- [ ] 全テストの実行と修正

---

### Phase 2: 教育期間UI【0.5日】

```bash
# 新規作成
- src/components/profitability/TrainingMemberBadge.tsx
```

**作業内容**:
- [ ] TrainingMemberBadge作成
- [ ] 既存UIへの統合

---

### Phase 3: JSONエクスポート安全化【0.5日】

```bash
# 修正
- src/contexts/StrengthsContext.tsx
- src/services/FinancialService.ts
```

**作業内容**:
- [ ] エクスポート時の単価情報フィルタリング
- [ ] デフォルトで単価情報を除外
- [ ] マネージャーのみ含めるオプション追加
- [ ] 警告メッセージの表示

---

## 🔬 テスト戦略

### 単体テスト

**対象**:
- MemberRateService (新規)
- FinancialService (修正)
- ProfitabilityService (修正)
- dataMigration (新規)

**カバレッジ目標**: 80%以上

**重点テスト項目**:
- [ ] MemberRateRecordの CRUD 操作
- [ ] データ移行の正常系・異常系
- [ ] 利益率計算の全パターン
- [ ] 教育期間判定

### 統合テスト

**対象**:
- MemberFormからMemberRateManagementへのフロー
- JSONエクスポート・インポート
- データ移行の E2E

**重点テスト項目**:
- [ ] メンバー追加 → 単価設定 → 利益率表示
- [ ] データ移行実行 → 既存データの保持確認
- [ ] JSONエクスポート → 単価情報の除外確認

### E2Eテスト（手動）

**シナリオ1: 新規メンバー追加（正社員）**
1. MemberFormでメンバー基本情報を入力（ステージS2）
2. 保存
3. MemberRateManagementを開く
4. メンバーを選択
5. 売上単価¥600,000を入力
6. 利益予測で利益率2.5%を確認
7. 保存
8. MembersListで利益率バッジを確認

**シナリオ2: 契約社員の追加**
1. MemberFormでメンバー基本情報を入力（ステージCONTRACT）
2. 保存
3. MemberRateManagementを開く
4. メンバーを選択
5. 売上単価¥600,000を入力
6. 契約時給¥3,000 × 160時間を入力
7. 利益予測で利益率6.7%を確認
8. 保存

**シナリオ3: 教育期間メンバー**
1. MemberFormでメンバー基本情報を入力（ステージS2）
2. 保存
3. MemberRateManagementを開く
4. メンバーを選択
5. 売上単価を空欄または¥0のまま
6. 教育投資¥585,000を確認
7. 保存
8. MembersListで🎓アイコンを確認

**シナリオ4: データ移行**
1. v3.0形式のデータをLocalStorageに保存
2. アプリケーションをリロード
3. コンソールで移行メッセージを確認
4. MembersListで既存メンバーが表示されることを確認
5. MemberRateManagementで単価情報が表示されることを確認

---

## 📊 進捗管理

### マイルストーン

| マイルストーン | 完了条件 | 期日目安 |
|--------------|---------|---------|
| M1: データモデル改訂 | Phase 1完了、移行スクリプト動作確認 | Day 1 |
| M2: ロジック実装 | Phase 2完了、テスト80%以上パス | Day 2 |
| M3: 基本UI実装 | Phase 3完了、統合テストパス | Day 3 |
| M4: 完全版 | Phase 4完了、E2Eテスト完了 | Day 4 |

### チェックリスト

**Phase 1完了判定**:
- [ ] TypeScriptコンパイルエラーゼロ
- [ ] MemberRateService実装済み
- [ ] データ移行スクリプト動作確認
- [ ] 単体テスト作成済み・パス

**Phase 2完了判定**:
- [ ] ProfitabilityService改訂済み
- [ ] 全計算パターンのテストパス
- [ ] カバレッジ80%以上達成

**Phase 3完了判定**:
- [ ] MemberForm簡略化完了
- [ ] MemberRateManagement実装済み
- [ ] 統合テストパス

**Phase 4完了判定**:
- [ ] TrainingMemberBadge実装済み
- [ ] 教育期間フロー動作確認
- [ ] E2Eテスト完了

---

## ⚠️ リスク管理

### 既知のリスク

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|---------|------|
| データ移行失敗 | 🔴 高 | 🟡 中 | ロールバック機能、バックアップ |
| 既存データ破損 | 🔴 高 | 🟢 低 | LocalStorageのバックアップ |
| パフォーマンス劣化 | 🟡 中 | 🟢 低 | プロファイリング、最適化 |
| UI/UX後退 | 🟡 中 | 🟡 中 | ユーザーテスト、フィードバック |
| テスト不足 | 🟡 中 | 🟡 中 | カバレッジ目標設定、レビュー |

### 緊急時対応

**データ移行失敗時**:
1. エラーログの確認
2. ロールバック実行
3. 手動データ修正
4. 再移行試行

**機能不具合発見時**:
1. 該当機能の一時無効化
2. 緊急パッチの適用
3. 詳細調査と修正
4. テストケースの追加

---

## 💡 推奨事項

### 最優先で対応すべき項目

1. **セキュリティリスクの解消**【🔥 最重要】
   - MemberStrengthsからの機密情報分離
   - JSONエクスポート時の安全性確保

2. **データ移行スクリプトの実装**【🔥 最重要】
   - 既存ユーザーへの影響を最小化
   - ロールバック機能の実装

3. **テストカバレッジの向上**【⬆️ 高優先】
   - v3.1テストの有効化
   - 新規機能のテスト追加

### 段階的実施の推奨

**フェーズ1（Week 1）**:
- オプションA Phase 1-2の実装
- 基本ロジックの完成
- テストの充実

**フェーズ2（Week 2）**:
- オプションA Phase 3の実装
- UI の実装と統合
- E2Eテスト

**フェーズ3（Week 3）**:
- オプションA Phase 4の実装（オプション）
- 教育期間機能の完成
- ドキュメント整備

### 長期的な視点

**今後の拡張予定**:
- 月次稼働時間の履歴管理
- 利益シミュレーション機能
- レポート出力機能
- グラフ・チャート表示

**保守性向上**:
- コンポーネント設計の見直し
- パフォーマンス最適化
- アクセシビリティ対応

---

## 📚 参考資料

### 設計書

1. **MANAGER_FEATURE_SPEC_V3.1_UNIFIED.md**
   - v3.1の基本設計
   - 契約単価分離の概要

2. **MANAGER_FEATURE_SPEC_V3.1_UNIFIED_REVISED.md**
   - 改訂版の詳細設計
   - データ構造の3層分離

3. **MEMBER_RATE_SEPARATION_SPEC.md**
   - 単価情報分離の詳細仕様
   - セキュリティ設計の思想

### 実装済みファイル

**型定義**:
- `src/types/financial.ts`
- `src/models/StrengthsTypes.ts`

**サービス**:
- `src/services/FinancialService.ts`
- `src/services/ProfitabilityService.ts`

**UI**:
- `src/components/strengths/ProfitabilityDashboard.tsx`

**テスト**:
- `src/services/__tests__/FinancialService.test.ts`
- `src/services/__tests__/ProfitabilityService.v3.1.test.ts`

---

## 🎬 次のアクション

### 即座に実施すべきこと

1. **方針決定**
   - [ ] オプションA（推奨）またはオプションBの選択
   - [ ] 実装スケジュールの確定
   - [ ] リソース配分の決定

2. **環境準備**
   - [ ] ブランチ作成（feature/manager-v3.1-revised）
   - [ ] LocalStorageのバックアップ
   - [ ] テスト環境の準備

3. **実装開始**
   - [ ] Phase 1の着手
   - [ ] 進捗の記録開始

### 質問・確認事項

1. オプションA（推奨）で進めてよいか？
2. 実装開始のタイミングはいつか？
3. 他の機能開発との優先順位は？
4. レビュー体制はどうするか？

---

**文書ステータス**: ✅ レビュー待ち  
**次回更新予定**: 実装開始時  
**作成者**: AI Assistant (Claude)
