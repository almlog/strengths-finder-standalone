# マネージャー機能 - 設計・実装計画書

## 📋 プロジェクト概要

### 目的
組織編成と予算管理の意思決定を支援するため、既存のStrengthsFinder分析ツールに**金額管理機能**を追加する。

### ビジネス価値
- 来季のチーム編成において、人件費（売上）を可視化
- 資質（強み）と金額の両軸でチームを最適化
- シミュレーションによる予算影響の事前評価

### 制約条件
- ✅ 既存の一般ユーザー機能は完全に保持（後方互換性）
- ✅ ブラウザベース・ゼロコスト運用の継続
- ✅ LocalStorageベースのデータ管理（外部送信なし）
- ✅ ポジション情報なしのJSONも動作可能

---

## 👥 ユーザーストーリー

### Epic: マネージャー向け金額管理機能

#### Story 1: ポジション体系の設定
**As a** 管理責任者  
**I want to** ポジション別の月額請求単価を設定できる  
**So that** メンバーのコストを正確に把握できる

**受入基準:**
- [ ] 6つの標準ポジション（MG/SM/PO/SL/SST/ST）が初期登録済み
- [ ] 各ポジションに名称・月額単価・カラーコードが設定可能
- [ ] 設定はLocalStorageに永続化される
- [ ] 将来的にポジション追加可能な拡張性を持つ

**ポジション一覧:**
| ID | ポジション名 | 月額請求単価 | カラー（仮） |
|---|---|---|---|
| MG | マネージャー | ¥900,000 | `#8B5CF6` (紫) |
| SM | スクラムマスター | ¥800,000 | `#EC4899` (ピンク) |
| PO | プロダクトオーナー | ¥800,000 | `#F59E0B` (オレンジ) |
| SL | シニアリード | ¥750,000 | `#10B981` (緑) |
| SST | シニアスタッフ | ¥650,000 | `#3B82F6` (青) |
| ST | スタッフ | ¥550,000 | `#6B7280` (グレー) |

---

#### Story 2: メンバーへのポジション割り当て
**As a** 管理責任者  
**I want to** 各メンバーにポジションを割り当てられる  
**So that** 個別の単価を金額計算に反映できる

**受入基準:**
- [ ] 既存のEmployee型に`positionId?: string`フィールドを追加
- [ ] JSONインポート時にpositionIdを読み込める
- [ ] positionIdなしのメンバーも正常に動作する（後方互換性）
- [ ] メンバーフォームでポジション選択可能

---

#### Story 3: マネージャーモードへの切り替え
**As a** 管理責任者  
**I want to** URLパラメータで金額表示モードに切り替えられる  
**So that** 一般ユーザーには見せず、必要時のみ金額を確認できる

**受入基準:**
- [ ] `?mode=manager` パラメータで金額表示が有効化
- [ ] パラメータなし or 通常ユーザーは金額非表示
- [ ] ポジション情報がない場合も金額非表示
- [ ] モード切替時にUI要素が適切に表示/非表示される

**URL例:**
```
通常: https://yourapp.github.io/
責任者: https://yourapp.github.io/?mode=manager
```

---

#### Story 4: チーム売上予測の表示
**As a** 管理責任者  
**I want to** 選択したメンバーの合計売上を見られる  
**So that** チーム編成の予算インパクトを把握できる

**受入基準:**
- [ ] 月間売上合計を表示
- [ ] 年間売上予測（月額×12）を表示
- [ ] メンバー平均単価を表示
- [ ] ポジション別内訳（人数・金額）を表示
- [ ] メンバー選択/解除でリアルタイム更新

**表示メトリクス:**
```
📊 月間売上: ¥3,450,000
📈 年間予測: ¥41,400,000
👤 平均単価: ¥690,000
```

---

#### Story 5: ポジション別内訳の可視化
**As a** 管理責任者  
**I want to** ポジション別の人数と金額を確認できる  
**So that** 組織構成のバランスを評価できる

**受入基準:**
- [ ] ポジション名・色・人数・合計金額を一覧表示
- [ ] 高額順にソート
- [ ] 各ポジションの色分けで視覚的に識別可能

**表示イメージ:**
```
🟣 マネージャー × 2名     ¥1,800,000
🟠 プロダクトオーナー × 1名  ¥800,000
🟢 シニアリード × 2名      ¥1,500,000
```

---

#### Story 6: 金額ベースのチームシミュレーション
**As a** 管理責任者  
**I want to** 予算制約下でチームを編成できる  
**So that** コスト効率の高い組織を作れる

**受入基準:**
- [ ] 候補メンバーからドラッグ&ドロップで追加
- [ ] 追加時に残予算をリアルタイム表示
- [ ] 予算超過時に警告表示
- [ ] 資質カバー率と金額の両方を同時確認可能

**Future Enhancement（Phase 2）:**
- [ ] 予算上限設定機能
- [ ] 最適化アルゴリズム提案
- [ ] 複数パターンの比較

---

## 🎨 UI/UX設計

### デザイン方針
既存のStrengthsFinder画面のデザイン言語を踏襲しつつ、金額情報を**視覚的に明確に区別**する。

### カラーパレット（マネージャー機能専用）

**メインカラー:**
- 売上予測エリア: `bg-gradient-to-br from-green-50 to-emerald-50`
- 境界線: `border-green-200`
- 強調テキスト: `text-green-900`
- 金額数値: `text-green-700`

**アクセントカラー（ポジション）:**
- マネージャー: `#8B5CF6` (紫・リーダーシップ)
- スクラムマスター: `#EC4899` (ピンク・ファシリテーション)
- プロダクトオーナー: `#F59E0B` (オレンジ・戦略)
- シニアリード: `#10B981` (緑・実行力)
- シニアスタッフ: `#3B82F6` (青・専門性)
- スタッフ: `#6B7280` (グレー・成長段階)

### アイコン選定

**金額関連:**
- `💰` - 売上予測セクション
- `📊` - 月間売上
- `📈` - 年間予測
- `👤` - 平均単価
- `⚠️` - 予算超過警告

**ポジション表示:**
- 各ポジションは色付きバッジ + 金額で表示
- ツールチップで詳細情報（年収換算等）

### レイアウト構成

#### マネージャー画面の追加コンポーネント

```
┌─────────────────────────────────────────────────┐
│ 📊 ストレングスファインダー分析                │ ← 既存ヘッダー
├─────────────────────────────────────────────────┤
│ [メンバー一覧] [個人分析] [部署分析] ... 　　　│ ← 既存タブ
│                                                 │
│ ┌─────────────────────────────────────────────┐ │
│ │ 💰 売上予測 (?mode=manager時のみ表示)      │ │ ← 新規追加
│ ├─────────────────────────────────────────────┤ │
│ │ 📊 月間売上: ¥3,450,000                    │ │
│ │ 📈 年間予測: ¥41,400,000                   │ │
│ │ 👤 平均単価: ¥690,000                      │ │
│ │                                             │ │
│ │ ポジション別内訳:                           │ │
│ │ 🟣 マネージャー × 2名      ¥1,800,000     │ │
│ │ 🟠 プロダクトオーナー × 1名  ¥800,000     │ │
│ │ 🟢 シニアリード × 2名       ¥1,500,000    │ │
│ └─────────────────────────────────────────────┘ │
│                                                 │
│ [既存の資質分析グラフ]                         │
└─────────────────────────────────────────────────┘
```

---

## 🏗️ 技術設計

### データモデル拡張

#### 1. PositionRate型（新規）
```typescript
// types/financial.ts
export interface PositionRate {
  id: string;           // 'MG', 'SM', 'PO', ...
  name: string;         // 'マネージャー', 'スクラムマスター', ...
  monthlyRate: number;  // 月額請求単価
  color: string;        // HEXカラーコード
}
```

#### 2. Employee型の拡張
```typescript
// models/StrengthsTypes.ts
export interface MemberStrengths {
  id: string;
  name: string;
  department: string;
  position?: Position | string;
  positionId?: string;  // ← 新規追加（金額マスタへの参照）
  strengths: { id: number; score: number }[];
}
```

#### 3. TeamFinancials型（新規）
```typescript
// types/financial.ts
export interface TeamFinancials {
  monthlyRevenue: number;      // 月間売上
  annualRevenue: number;       // 年間売上予測
  averageRatePerMember: number; // メンバー平均単価
  revenueByPosition: Record<string, {
    count: number;
    totalRevenue: number;
  }>;
}
```

### サービス層

#### PositionService（新規作成）
```typescript
// services/positionService.ts
export class PositionService {
  private static readonly STORAGE_KEY = 'position_rates';
  private static readonly DEFAULT_RATES = [
    { id: 'MG', name: 'マネージャー', monthlyRate: 900000, color: '#8B5CF6' },
    { id: 'SM', name: 'スクラムマスター', monthlyRate: 800000, color: '#EC4899' },
    { id: 'PO', name: 'プロダクトオーナー', monthlyRate: 800000, color: '#F59E0B' },
    { id: 'SL', name: 'シニアリード', monthlyRate: 750000, color: '#10B981' },
    { id: 'SST', name: 'シニアスタッフ', monthlyRate: 650000, color: '#3B82F6' },
    { id: 'ST', name: 'スタッフ', monthlyRate: 550000, color: '#6B7280' },
  ];
  
  static getPositionRates(): PositionRate[] {
    const custom = localStorage.getItem(this.STORAGE_KEY);
    return custom ? JSON.parse(custom) : this.DEFAULT_RATES;
  }
  
  static savePositionRates(rates: PositionRate[]): void {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(rates));
  }
  
  static getPositionById(id: string): PositionRate | undefined {
    return this.getPositionRates().find(p => p.id === id);
  }
}
```

#### FinancialService（新規作成）
```typescript
// services/financialService.ts
export class FinancialService {
  static calculateTeamFinancials(
    members: MemberStrengths[],
    positionRates: PositionRate[]
  ): TeamFinancials {
    const rateMap = new Map(
      positionRates.map(p => [p.id, p.monthlyRate])
    );
    
    let monthlyRevenue = 0;
    const revenueByPosition: Record<string, { count: number; totalRevenue: number }> = {};
    
    members.forEach(member => {
      if (!member.positionId) return;
      
      const rate = rateMap.get(member.positionId) || 0;
      monthlyRevenue += rate;
      
      if (!revenueByPosition[member.positionId]) {
        revenueByPosition[member.positionId] = { count: 0, totalRevenue: 0 };
      }
      revenueByPosition[member.positionId].count++;
      revenueByPosition[member.positionId].totalRevenue += rate;
    });
    
    return {
      monthlyRevenue,
      annualRevenue: monthlyRevenue * 12,
      averageRatePerMember: members.length > 0 
        ? monthlyRevenue / members.length 
        : 0,
      revenueByPosition,
    };
  }
  
  static formatCurrency(amount: number): string {
    return new Intl.NumberFormat('ja-JP', {
      style: 'currency',
      currency: 'JPY',
      minimumFractionDigits: 0,
    }).format(amount);
  }
}
```

### カスタムフック

#### useManagerMode
```typescript
// hooks/useManagerMode.ts
import { useSearchParams } from 'react-router-dom';

export function useManagerMode() {
  const [searchParams] = useSearchParams();
  const isManagerMode = searchParams.get('mode') === 'manager';
  
  return { isManagerMode };
}
```

#### useFinancialData
```typescript
// hooks/useFinancialData.ts
import { useMemo } from 'react';
import { MemberStrengths } from '../models/StrengthsTypes';
import { PositionService } from '../services/positionService';
import { FinancialService } from '../services/financialService';
import { useManagerMode } from './useManagerMode';

export function useFinancialData(members: MemberStrengths[]) {
  const { isManagerMode } = useManagerMode();
  
  // ポジション情報を持つメンバーが1人以上いるか
  const hasPositionData = members.some(m => m.positionId);
  
  // 金額表示が可能か判定
  const canShowFinancials = isManagerMode && hasPositionData;
  
  const financials = useMemo(() => {
    if (!canShowFinancials) return null;
    
    const rates = PositionService.getPositionRates();
    return FinancialService.calculateTeamFinancials(members, rates);
  }, [members, canShowFinancials]);
  
  return { canShowFinancials, financials };
}
```

---

## 📦 コンポーネント設計

### 新規コンポーネント一覧

#### 1. FinancialSummaryPanel
**責務:** チーム全体の売上予測を表示

**Props:**
```typescript
interface FinancialSummaryPanelProps {
  financials: TeamFinancials;
}
```

**配置:** 既存の資質分析パネルの上部に追加

#### 2. MetricCard
**責務:** 個別メトリクス（月間売上、年間予測等）の表示

**Props:**
```typescript
interface MetricCardProps {
  label: string;
  value: string;
  icon: string;
  trend?: string; // 例: "+5% vs 前四半期"
  status?: 'good' | 'warning' | 'danger';
}
```

#### 3. PositionBreakdown
**責務:** ポジション別内訳の表示

**Props:**
```typescript
interface PositionBreakdownProps {
  revenueByPosition: Record<string, { count: number; totalRevenue: number }>;
  positionRates: PositionRate[];
}
```

### 既存コンポーネントの修正

#### MemberCard
**変更内容:**
- マネージャーモード時にポジションバッジと金額を表示
- 色分けされたポジション情報を追加

```typescript
// Before
<div className="member-card">
  <h3>{member.name}</h3>
  <StrengthsBadges />
</div>

// After
<div className="member-card">
  <h3>{member.name}</h3>
  {isManagerMode && member.positionId && (
    <PositionBadge positionId={member.positionId} />
  )}
  <StrengthsBadges />
</div>
```

#### MembersList
**変更内容:**
- リスト表示時にポジション列を追加（マネージャーモードのみ）

---

## 🚀 実装ステップ

### Phase 1: 基盤構築（最優先・1-2日）

#### ステップ1.1: 型定義の追加
```bash
touch src/types/financial.ts
touch src/hooks/useManagerMode.ts
touch src/hooks/useFinancialData.ts
```

**成果物:**
- [ ] `PositionRate`型定義
- [ ] `TeamFinancials`型定義
- [ ] `MemberStrengths`型への`positionId`追加

#### ステップ1.2: サービス層の実装
```bash
touch src/services/positionService.ts
touch src/services/financialService.ts
```

**成果物:**
- [ ] `PositionService`実装（CRUD操作）
- [ ] `FinancialService`実装（集計ロジック）
- [ ] LocalStorageへの永続化

#### ステップ1.3: カスタムフックの実装
**成果物:**
- [ ] `useManagerMode`実装
- [ ] `useFinancialData`実装

### Phase 2: UI統合（2-3日）

#### ステップ2.1: 基本コンポーネント作成
```bash
mkdir src/components/financial
touch src/components/financial/FinancialSummaryPanel.tsx
touch src/components/financial/MetricCard.tsx
touch src/components/financial/PositionBreakdown.tsx
touch src/components/financial/PositionBadge.tsx
```

**成果物:**
- [ ] `FinancialSummaryPanel`実装
- [ ] `MetricCard`実装
- [ ] `PositionBreakdown`実装
- [ ] `PositionBadge`実装

#### ステップ2.2: 既存コンポーネントの拡張
**成果物:**
- [ ] `MemberCard`にポジション表示追加
- [ ] `MembersList`にポジション列追加
- [ ] `MemberForm`にポジション選択追加

#### ステップ2.3: メイン画面への統合
**成果物:**
- [ ] `StrengthsFinderPage`に`FinancialSummaryPanel`追加
- [ ] URLパラメータによる表示制御
- [ ] レスポンシブデザイン対応

### Phase 3: データ連携（1日）

#### ステップ3.1: JSONインポート/エクスポート対応
**成果物:**
- [ ] `positionId`フィールドの読み込み
- [ ] 後方互換性テスト（positionIdなしデータ）
- [ ] エクスポート時のpositionId含有

#### ステップ3.2: LocalStorage統合
**成果物:**
- [ ] ポジションマスタの永続化
- [ ] 既存データマイグレーション（必要に応じて）

### Phase 4: 体験向上（2-3日・Future）

#### ステップ4.1: インタラクティブ機能
**成果物:**
- [ ] ドラッグ&ドロップでのチーム編成
- [ ] リアルタイム金額更新
- [ ] 予算上限設定機能

#### ステップ4.2: 視覚化強化
**成果物:**
- [ ] ポジション別の色分けグラフ
- [ ] 売上推移トレンド（複数パターン比較）
- [ ] CSV/JSONエクスポート拡張

---

## ✅ テスト計画

### 単体テスト

#### PositionService
- [ ] デフォルト料金体系の取得
- [ ] カスタム料金体系の保存・読み込み
- [ ] 存在しないポジションIDの処理

#### FinancialService
- [ ] 金額計算の正確性（合計、平均）
- [ ] ポジションなしメンバーの除外
- [ ] 空配列の処理

### 統合テスト

#### データフロー
- [ ] JSONインポート → 金額表示
- [ ] メンバー追加 → リアルタイム更新
- [ ] LocalStorage永続化 → リロード後復元

#### 表示制御
- [ ] `?mode=manager`あり → 金額表示
- [ ] パラメータなし → 金額非表示
- [ ] positionIdなし → 金額非表示

### E2Eシナリオ

#### シナリオ1: 新規チーム編成
1. マネージャーモードでアクセス
2. メンバーを5名選択
3. 合計金額が正しく表示される
4. ポジション別内訳が表示される

#### シナリオ2: 既存データの移行
1. positionIdなしJSONをインポート
2. 通常モードで動作確認
3. マネージャーモードで金額非表示を確認

---

## 📊 成功指標

### 機能的指標
- [ ] 既存機能の100%維持（破壊的変更なし）
- [ ] マネージャーモードでの金額表示成功率100%
- [ ] JSONインポート/エクスポートの後方互換性100%

### パフォーマンス指標
- [ ] 金額計算の応答時間 < 100ms
- [ ] メンバー100名での動作確認
- [ ] LocalStorageサイズ増加 < 50KB

### ユーザビリティ指標
- [ ] URL共有でのモード切替成功率100%
- [ ] 初回利用時の理解容易性（ドキュメントなしで操作可能）

---

## 🔒 セキュリティ考慮事項

### データ保護
- ✅ ブラウザLocalStorageのみ使用（外部送信なし）
- ✅ URLパラメータに機密情報なし
- ⚠️ 将来的にパスワード保護を検討（Phase 2以降）

### アクセス制御
- ⚠️ 現状は「URLを知っている人」がアクセス可能
- 🔮 将来的な改善案：
  - 初回パスワード認証
  - セッションベースの権限管理

---

## 📚 関連ドキュメント

- [README.md](./README.md) - プロジェクト概要
- [DEVELOPMENT.md](./DEVELOPMENT.md) - 開発者ガイド
- [CLAUDE.md](./CLAUDE.md) - Claude開発ガイド

---

## 📝 変更履歴

| 日付 | バージョン | 変更内容 | 担当者 |
|------|-----------|---------|--------|
| 2025-10-29 | 1.0.0 | 初版作成 | SUZUKI Shunpei |

---

## 🎯 次のアクション

### 即座に開始可能なタスク

1. **型定義の作成**
   ```bash
   touch src/types/financial.ts
   ```

2. **サービス層の実装**
   ```bash
   touch src/services/positionService.ts
   touch src/services/financialService.ts
   ```

3. **カスタムフックの実装**
   ```bash
   touch src/hooks/useManagerMode.ts
   touch src/hooks/useFinancialData.ts
   ```

### 確認事項
- [ ] ポジション体系の最終確認（6種類で確定？）
- [ ] カラーコードの調整要否
- [ ] Phase 1の実装期限設定

---

**このドキュメントは実装の進捗に応じて更新します。**
