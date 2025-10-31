# マネージャー機能 - 設計・実装計画書 v2.0

## 📌 改訂履歴

| バージョン | 日付 | 変更内容 | 理由 |
|-----------|------|---------|------|
| v1.0 | 2025-10-29 | 初版作成（3層管理） | - |
| v2.0 | 2025-10-29 | **2層シンプル実装に変更** | Githubセキュリティ・時給対応・UX改善 |

### 🔄 v2.0での主な変更点

```diff
【データ管理方式】
- ❌ 3層管理: ポジションテンプレート + デフォルト単価 + 個別単価
+ ✅ 2層管理: ポジションテンプレート + 個別単価のみ

【単価入力フロー】
- ❌ 事前にデフォルト単価を設定 → メンバー追加時は自動適用
+ ✅ メンバー追加時に毎回入力（マネージャーモードのみ）

【時給対応】
- ❌ 考慮なし
+ ✅ 派遣社員向けに時給×稼働時間の計算機能を追加

【Githubコミット】
+ ✅ ポジションテンプレート（色・アイコン）のみ → 単価情報は含まない
```

---

## 📋 プロジェクト概要

### 目的
組織編成と予算管理の意思決定を支援するため、既存のStrengthsFinder分析ツールに**個別単価管理機能**を追加する。

### ビジネス価値
- 来季のチーム編成において、人件費（顧客請求額）を可視化
- 資質（強み）と金額の両軸でチームを最適化
- シミュレーションによる予算影響の事前評価
- **派遣社員の時給換算に対応**

### 制約条件
- ✅ 既存の一般ユーザー機能は完全に保持（後方互換性）
- ✅ ブラウザベース・ゼロコスト運用の継続
- ✅ LocalStorageベースのデータ管理（外部送信なし）
- ✅ ポジション情報なしのJSONも動作可能
- ✅ **単価情報をGithubリポジトリに含めない**（セキュリティ）

---

## 🔐 セキュリティ設計の考慮事項

### 課題の整理

#### 1. Githubでの単価管理リスク
- ❌ パブリックリポジトリで単価露呈
- ❌ コミット履歴に単価変更が永久保存
- ❌ フォーク先に機密情報が流出

#### 2. 時給ベース派遣社員への対応
- 派遣社員は時給 × 稼働時間で月額換算
- 個人ごとに稼働時間が異なる（120h〜180h等）

#### 3. データ管理のユーザビリティ
- ❌ 別JSONファイル管理 → ファイル分散で煩雑
- ❌ 毎回手動入力 → 運用負荷
- ✅ **メンバーデータに統合 + マネージャーモードでのみ入力可能**

### 採用した解決策: 2層シンプル管理

```
┌──────────────────────────────────────────────┐
│ Github管理（公開OK）                         │
├──────────────────────────────────────────────┤
│ ✅ ポジションテンプレート                   │
│   - ID, 名前, カラー, アイコン               │
│   - rateType (monthly/hourly)                │
│   - defaultHours（時給用デフォルト稼働時間） │
│                                              │
│ ❌ 具体的な単価金額                          │
└──────────────────────────────────────────────┘

┌──────────────────────────────────────────────┐
│ ユーザーデータ（LocalStorageのみ）          │
├──────────────────────────────────────────────┤
│ 💾 各メンバーに個別単価を保存               │
│   - memberRate.rateType                      │
│   - memberRate.rate（月額 or 時給）          │
│   - memberRate.hours（時給の場合の稼働時間） │
│                                              │
│ 🔒 マネージャーモード以外では非表示         │
└──────────────────────────────────────────────┘
```

**メリット:**
- ✅ データが1ヶ所に集約（メンバー情報 + 単価）
- ✅ Githubに単価情報を含めない
- ✅ JSONエクスポート時に単価含有/除外を選択可能
- ✅ 時給・月額の両方に対応

**デメリット（許容範囲）:**
- ⚠️ メンバー追加時に毎回単価入力が必要
  → **マネージャーモードでのみ入力なので影響は限定的**

---

## 👥 ユーザーストーリー（改訂版）

### Epic: マネージャー向け個別単価管理機能

#### Story 1: ポジションテンプレートの定義
**As a** 開発者  
**I want to** ポジション別の表示情報（名前・色・タイプ）をコードで管理する  
**So that** デザインの一貫性を保ちつつGithubで安全に管理できる

**受入基準:**
- [ ] 7つのポジションテンプレートを定義（MG/SM/PO/SL/SST/ST/DISPATCH）
- [ ] 各テンプレートに名称・カラー・アイコン・rateTypeを設定
- [ ] 時給タイプには`defaultHours`を設定
- [ ] 単価情報は一切含まない

**ポジションテンプレート一覧:**

| ID | ポジション名 | タイプ | カラー | アイコン | デフォルト時間 |
|---|---|---|---|---|---|
| MG | マネージャー | monthly | `#8B5CF6` | 👑 | - |
| SM | スクラムマスター | monthly | `#EC4899` | 🎯 | - |
| PO | プロダクトオーナー | monthly | `#F59E0B` | 📋 | - |
| SL | シニアリード | monthly | `#10B981` | ⭐ | - |
| SST | シニアスタッフ | monthly | `#3B82F6` | 💼 | - |
| ST | スタッフ | monthly | `#6B7280` | 👤 | - |
| DISPATCH | 派遣社員 | hourly | `#06B6D4` | 🕐 | 160h |

---

#### Story 2: マネージャーモードでのメンバー登録
**As a** 管理責任者  
**I want to** メンバー追加時にポジションと単価を同時に入力できる  
**So that** 金額情報を含む完全なメンバーデータを登録できる

**受入基準:**
- [ ] マネージャーモード（`?mode=manager`）でアクセス時のみ単価入力欄を表示
- [ ] 月額単価タイプ: 金額1つのみ入力
- [ ] 時給タイプ: 時給 + 稼働時間を入力 → 月額換算をリアルタイム表示
- [ ] 通常モードでは単価入力欄を非表示
- [ ] 単価未入力でも保存可能（後から追加可能）

**UI仕様:**
```
【通常モード】
┌─────────────────────────┐
│ メンバー追加            │
├─────────────────────────┤
│ 社員番号: [______]      │
│ 氏名: [__________]      │
│ 部署: [______]          │
│ ポジション: [▼選択]    │
│ 強み5つ: [選択UI]       │
└─────────────────────────┘

【マネージャーモード】
┌─────────────────────────┐
│ メンバー追加            │
├─────────────────────────┤
│ 社員番号: [______]      │
│ 氏名: [__________]      │
│ 部署: [______]          │
│ ポジション: [▼選択]    │
│ ┌─────────────────────┐ │
│ │💰 単価設定(責任者)  │ │
│ ├─────────────────────┤ │
│ │ 月額: [900000]円    │ │
│ │ または              │ │
│ │ 時給: [3000]円      │ │
│ │ ×稼働: [160]時間    │ │
│ │ = ¥480,000/月      │ │
│ └─────────────────────┘ │
│ 強み5つ: [選択UI]       │
└─────────────────────────┘
```

---

#### Story 3: マネージャーモードへの切り替え
**As a** 管理責任者  
**I want to** URLパラメータで金額表示モードに切り替えられる  
**So that** 一般ユーザーには見せず、必要時のみ金額を確認できる

**受入基準:**
- [ ] `?mode=manager` パラメータで金額表示が有効化
- [ ] パラメータなしでは金額情報を一切表示しない
- [ ] メンバーに単価情報がない場合も金額非表示
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
- [ ] 月間売上合計を表示（時給は自動換算）
- [ ] 年間売上予測（月額×12）を表示
- [ ] メンバー平均単価を表示
- [ ] ポジション別内訳（人数・金額）を表示
- [ ] メンバー選択/解除でリアルタイム更新

**表示メトリクス:**
```
┌─────────────────────────────────────┐
│ 💰 売上予測                        │
├─────────────────────────────────────┤
│ 📊 月間売上: ¥3,450,000            │
│ 📈 年間予測: ¥41,400,000           │
│ 👤 平均単価: ¥690,000              │
│                                     │
│ ポジション別内訳:                   │
│ 🟣 マネージャー × 2名  ¥1,800,000  │
│ 🟠 PO × 1名          ¥800,000      │
│ 🔵 派遣社員 × 2名    ¥960,000      │
│    (時給3000円×160h)               │
└─────────────────────────────────────┘
```

---

#### Story 5: JSONエクスポート時の単価制御
**As a** 管理責任者  
**I want to** エクスポート時に単価情報の含有/除外を選択できる  
**So that** Githubコミット用と社内保管用を使い分けられる

**受入基準:**
- [ ] エクスポートダイアログにチェックボックスを追加
- [ ] 「単価情報を含める」チェックON → 全データ出力
- [ ] チェックOFF → memberRateフィールドを除外
- [ ] ファイル名で区別（例: `members.json` vs `members-with-rates.json`）
- [ ] .gitignoreで`*-with-rates.json`を除外

**UI仕様:**
```
┌─────────────────────────────┐
│ データエクスポート          │
├─────────────────────────────┤
│ □ 単価情報を含める          │
│   ⚠️ 機密情報です          │
│                             │
│ ファイル名:                 │
│ members.json               │
│                             │
│ [エクスポート] [キャンセル] │
└─────────────────────────────┘
```

---

## 🎨 UI/UX設計

### デザイン方針
既存のStrengthsFinder画面のデザイン言語を踏襲しつつ、金額情報を**視覚的に明確に区別**する。

### カラーパレット（マネージャー機能専用）

**メインカラー（金額表示エリア）:**
```css
/* 売上予測パネル */
background: linear-gradient(to bottom right, #f0fdf4, #d1fae5);
border: 2px solid #86efac;
text-primary: #14532d;
text-accent: #15803d;
```

**ポジション別アクセントカラー:**
| ポジション | カラー | 用途 |
|-----------|--------|------|
| マネージャー | `#8B5CF6` | リーダーシップ・意思決定 |
| スクラムマスター | `#EC4899` | ファシリテーション・調整 |
| プロダクトオーナー | `#F59E0B` | 戦略・ビジョン |
| シニアリード | `#10B981` | 実行力・指導 |
| シニアスタッフ | `#3B82F6` | 専門性・深掘り |
| スタッフ | `#6B7280` | 成長段階・柔軟性 |
| 派遣社員 | `#06B6D4` | 柔軟な稼働・専門スキル |

### アイコン選定

**金額関連:**
- `💰` - 売上予測セクションヘッダー
- `📊` - 月間売上
- `📈` - 年間予測
- `👤` - 平均単価
- `⚠️` - 予算超過警告
- `🕐` - 時給・稼働時間

**ポジション:**
- `👑` - マネージャー
- `🎯` - スクラムマスター
- `📋` - プロダクトオーナー
- `⭐` - シニアリード
- `💼` - シニアスタッフ
- `👤` - スタッフ
- `🕐` - 派遣社員（時給）

### レイアウト構成

#### マネージャー画面の構成

```
┌─────────────────────────────────────────────────┐
│ 📊 ストレングスファインダー分析                │
│ URL: ?mode=manager                              │
├─────────────────────────────────────────────────┤
│ [メンバー一覧] [個人分析] [部署分析] ...       │
│                                                 │
│ ┌─────────────────────────────────────────────┐ │
│ │ 💰 売上予測                  [マネージャー] │ │ ← 新規
│ ├─────────────────────────────────────────────┤ │
│ │ 📊 月間売上: ¥3,450,000                    │ │
│ │ 📈 年間予測: ¥41,400,000                   │ │
│ │ 👤 平均単価: ¥690,000                      │ │
│ │                                             │ │
│ │ ポジション別内訳:                           │ │
│ │ 🟣 マネージャー × 2名      ¥1,800,000     │ │
│ │ 🔵 派遣社員 × 2名          ¥960,000       │ │
│ │    (時給¥3,000 × 160h)                    │ │
│ └─────────────────────────────────────────────┘ │
│                                                 │
│ ┌─────────────────────────────────────────────┐ │
│ │ 選択メンバー一覧                            │ │
│ │ ┌─────────────────────────────────────────┐ │ │
│ │ │ 👤 山田太郎              [マネージャー] │ │ │
│ │ │    13D12345             [¥900,000/月]  │ │ │ ← 拡張
│ │ └─────────────────────────────────────────┘ │ │
│ │ ┌─────────────────────────────────────────┐ │ │
│ │ │ 👤 佐藤花子              [派遣社員]     │ │ │
│ │ │    13D12346  [¥3,000/h × 160h = ¥480k] │ │ │ ← 時給表示
│ │ └─────────────────────────────────────────┘ │ │
│ └─────────────────────────────────────────────┘ │
│                                                 │
│ [既存の資質分析グラフ]                         │
└─────────────────────────────────────────────────┘
```

---

## 🏗️ 技術設計（改訂版）

### データモデル

#### 1. PositionTemplate型（Github管理）

```typescript
// constants/positionTemplates.ts
export interface PositionTemplate {
  id: string;              // 'MG', 'SM', 'DISPATCH', ...
  name: string;            // 'マネージャー', '派遣社員', ...
  color: string;           // HEXカラーコード
  icon: string;            // 絵文字アイコン
  rateType: 'monthly' | 'hourly'; // 単価タイプ
  defaultHours?: number;   // 時給用のデフォルト稼働時間
}

export const POSITION_TEMPLATES: PositionTemplate[] = [
  {
    id: 'MG',
    name: 'マネージャー',
    color: '#8B5CF6',
    icon: '👑',
    rateType: 'monthly',
  },
  {
    id: 'SM',
    name: 'スクラムマスター',
    color: '#EC4899',
    icon: '🎯',
    rateType: 'monthly',
  },
  {
    id: 'PO',
    name: 'プロダクトオーナー',
    color: '#F59E0B',
    icon: '📋',
    rateType: 'monthly',
  },
  {
    id: 'SL',
    name: 'シニアリード',
    color: '#10B981',
    icon: '⭐',
    rateType: 'monthly',
  },
  {
    id: 'SST',
    name: 'シニアスタッフ',
    color: '#3B82F6',
    icon: '💼',
    rateType: 'monthly',
  },
  {
    id: 'ST',
    name: 'スタッフ',
    color: '#6B7280',
    icon: '👤',
    rateType: 'monthly',
  },
  {
    id: 'DISPATCH',
    name: '派遣社員',
    color: '#06B6D4',
    icon: '🕐',
    rateType: 'hourly',
    defaultHours: 160, // デフォルト160時間/月
  },
];
```

#### 2. MemberRate型（新規作成）

```typescript
// types/financial.ts
export interface MemberRate {
  rateType: 'monthly' | 'hourly';
  rate: number;        // 月額単価 or 時給
  hours?: number;      // 時給の場合の月間稼働時間
}
```

#### 3. MemberStrengths型の拡張

```typescript
// models/StrengthsTypes.ts
export interface MemberStrengths {
  id: string;
  name: string;
  department: string;
  position?: Position | string;
  positionId?: string;           // ポジションテンプレートへの参照
  memberRate?: MemberRate;       // ← NEW: 個別単価情報
  strengths: { id: number; score: number }[];
}
```

#### 4. TeamFinancials型（新規作成）

```typescript
// types/financial.ts
export interface TeamFinancials {
  monthlyRevenue: number;       // 月間売上合計
  annualRevenue: number;        // 年間売上予測
  averageRatePerMember: number; // メンバー平均単価
  revenueByPosition: Record<string, {
    count: number;              // 人数
    totalRevenue: number;       // 合計金額
  }>;
}
```

### サービス層

#### FinancialService（簡素化版）

```typescript
// services/financialService.ts
export class FinancialService {
  /**
   * メンバーの月額換算単価を計算
   * 時給の場合は自動的に月額換算
   */
  static calculateMonthlyRate(member: MemberStrengths): number {
    if (!member.memberRate) return 0;
    
    if (member.memberRate.rateType === 'hourly') {
      // 時給 × 稼働時間
      const hours = member.memberRate.hours || 160;
      return member.memberRate.rate * hours;
    }
    
    // 月額単価
    return member.memberRate.rate;
  }
  
  /**
   * チーム全体の財務情報を集計
   */
  static calculateTeamFinancials(members: MemberStrengths[]): TeamFinancials {
    let monthlyRevenue = 0;
    const revenueByPosition: Record<string, { count: number; totalRevenue: number }> = {};
    
    members.forEach(member => {
      const monthlyRate = this.calculateMonthlyRate(member);
      
      if (monthlyRate > 0 && member.positionId) {
        monthlyRevenue += monthlyRate;
        
        if (!revenueByPosition[member.positionId]) {
          revenueByPosition[member.positionId] = { count: 0, totalRevenue: 0 };
        }
        revenueByPosition[member.positionId].count++;
        revenueByPosition[member.positionId].totalRevenue += monthlyRate;
      }
    });
    
    const memberCount = members.filter(m => this.calculateMonthlyRate(m) > 0).length;
    
    return {
      monthlyRevenue,
      annualRevenue: monthlyRevenue * 12,
      averageRatePerMember: memberCount > 0 ? monthlyRevenue / memberCount : 0,
      revenueByPosition,
    };
  }
  
  /**
   * 通貨フォーマット（日本円）
   */
  static formatCurrency(amount: number): string {
    return new Intl.NumberFormat('ja-JP', {
      style: 'currency',
      currency: 'JPY',
      minimumFractionDigits: 0,
    }).format(amount);
  }
  
  /**
   * 時給表示用フォーマット
   */
  static formatHourlyRate(member: MemberStrengths): string | null {
    if (!member.memberRate || member.memberRate.rateType !== 'hourly') {
      return null;
    }
    
    const { rate, hours } = member.memberRate;
    const monthly = rate * (hours || 160);
    
    return `¥${rate.toLocaleString()}/h × ${hours}h = ${this.formatCurrency(monthly)}`;
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
import { FinancialService } from '../services/financialService';
import { useManagerMode } from './useManagerMode';

export function useFinancialData(members: MemberStrengths[]) {
  const { isManagerMode } = useManagerMode();
  
  // 単価情報を持つメンバーが1人以上いるか
  const hasRateData = members.some(m => m.memberRate);
  
  // 金額表示が可能か判定
  const canShowFinancials = isManagerMode && hasRateData;
  
  const financials = useMemo(() => {
    if (!canShowFinancials) return null;
    
    return FinancialService.calculateTeamFinancials(members);
  }, [members, canShowFinancials]);
  
  return { canShowFinancials, financials };
}
```

---

## 📦 コンポーネント設計

### 新規コンポーネント一覧

#### 1. FinancialSummaryPanel
**責務:** チーム全体の売上予測を表示

**ファイル:** `src/components/financial/FinancialSummaryPanel.tsx`

**Props:**
```typescript
interface FinancialSummaryPanelProps {
  financials: TeamFinancials;
}
```

**配置:** メンバー一覧の上部

#### 2. MetricCard
**責務:** 個別メトリクス（月間売上、年間予測等）の表示

**ファイル:** `src/components/financial/MetricCard.tsx`

**Props:**
```typescript
interface MetricCardProps {
  label: string;
  value: string;
  icon: string;
  trend?: string;
  status?: 'good' | 'warning' | 'danger';
}
```

#### 3. PositionBreakdown
**責務:** ポジション別内訳の表示

**ファイル:** `src/components/financial/PositionBreakdown.tsx`

**Props:**
```typescript
interface PositionBreakdownProps {
  revenueByPosition: Record<string, { count: number; totalRevenue: number }>;
}
```

#### 4. PositionBadge
**責務:** ポジション表示バッジ（色・アイコン・名前）

**ファイル:** `src/components/financial/PositionBadge.tsx`

**Props:**
```typescript
interface PositionBadgeProps {
  positionId: string;
  showRate?: boolean;      // 金額表示ON/OFF
  memberRate?: MemberRate; // 金額情報
}
```

### 既存コンポーネントの修正

#### MemberForm（大幅拡張）
**変更内容:**
- マネージャーモード検知
- ポジション選択時のrateType判定
- 月額/時給の条件分岐入力UI
- 時給の場合の月額換算表示

**修正ファイル:** `src/components/strengths/MemberForm.tsx`

#### MembersList
**変更内容:**
- ポジションバッジ表示
- マネージャーモード時に金額表示
- 時給メンバーの詳細表示

**修正ファイル:** `src/components/strengths/MembersList.tsx`

#### StrengthsContext
**変更内容:**
- `memberRate`フィールドの保存・読み込み
- JSONエクスポート時の単価含有制御

**修正ファイル:** `src/contexts/StrengthsContext.tsx`

---

## 🚀 実装ステップ（改訂版）

### Phase 1: 基盤構築 ✅ **完了**

#### ステップ1.1: 型定義の追加 ✅
```bash
touch src/types/financial.ts
touch src/constants/positionTemplates.ts
```

**成果物:**
- [x] `PositionTemplate`型定義
- [x] `MemberRate`型定義
- [x] `TeamFinancials`型定義
- [x] `MemberStrengths`型への`memberRate`追加
- [x] `POSITION_TEMPLATES`定数配列

#### ステップ1.2: サービス層の実装 ✅
```bash
touch src/services/financialService.ts
```

**成果物:**
- [x] `FinancialService.calculateMonthlyRate()`
- [x] `FinancialService.calculateTeamFinancials()`
- [x] `FinancialService.formatCurrency()`
- [x] `FinancialService.formatHourlyRate()`

#### ステップ1.3: カスタムフックの実装 ✅
```bash
touch src/hooks/useManagerMode.ts
touch src/hooks/useFinancialData.ts
```

**成果物:**
- [x] `useManagerMode`実装
- [x] `useFinancialData`実装

---

### Phase 2: UI統合（現在のフェーズ）

#### ステップ2.1: 基本コンポーネント作成
**期間:** 1-2日

```bash
mkdir -p src/components/financial
touch src/components/financial/FinancialSummaryPanel.tsx
touch src/components/financial/MetricCard.tsx
touch src/components/financial/PositionBreakdown.tsx
touch src/components/financial/PositionBadge.tsx
```

**タスク:**
- [ ] `FinancialSummaryPanel`実装
  - [ ] レイアウト構築
  - [ ] MetricCardの配置
  - [ ] PositionBreakdownの統合
- [ ] `MetricCard`実装
  - [ ] アイコン表示
  - [ ] 数値フォーマット
  - [ ] ステータス色分け
- [ ] `PositionBreakdown`実装
  - [ ] ポジション別集計表示
  - [ ] 色分けバー
  - [ ] 時給詳細表示
- [ ] `PositionBadge`実装
  - [ ] 色付きバッジ
  - [ ] 金額表示切替

#### ステップ2.2: MemberFormの拡張 🎯 **最優先**
**期間:** 1日

**タスク:**
- [ ] `useManagerMode`フックの統合
- [ ] ポジション選択UIの実装
- [ ] 単価入力エリアの条件分岐表示
  - [ ] 月額単価入力
  - [ ] 時給 + 稼働時間入力
  - [ ] 月額換算のリアルタイム表示
- [ ] バリデーション実装
- [ ] 保存処理の拡張

**実装のポイント:**
```typescript
// 時給選択時の自動計算
const monthlyEstimate = useMemo(() => {
  if (memberRate?.rateType === 'hourly') {
    return memberRate.rate * (memberRate.hours || 160);
  }
  return 0;
}, [memberRate]);
```

#### ステップ2.3: MembersListの拡張
**期間:** 半日

**タスク:**
- [ ] `PositionBadge`コンポーネントの統合
- [ ] マネージャーモード時の金額表示
- [ ] 時給メンバーの詳細表示ツールチップ

#### ステップ2.4: メイン画面への統合
**期間:** 半日

**タスク:**
- [ ] `StrengthsFinderPage`に`FinancialSummaryPanel`追加
- [ ] 条件分岐表示の実装
- [ ] レスポンシブデザイン調整

---

### Phase 3: データ連携

#### ステップ3.1: StrengthsContextの拡張
**期間:** 半日

**タスク:**
- [ ] `memberRate`フィールドの保存・読み込み
- [ ] LocalStorageへの永続化
- [ ] 既存データとの互換性確保

#### ステップ3.2: JSONインポート/エクスポート
**期間:** 1日

**タスク:**
- [ ] インポート時の`memberRate`読み込み
- [ ] 後方互換性テスト（memberRateなしデータ）
- [ ] エクスポートダイアログの実装
  - [ ] 「単価を含める」チェックボックス
  - [ ] ファイル名の自動切替
  - [ ] 単価除外ロジック

#### ステップ3.3: .gitignoreの設定
**期間:** 5分

```bash
# .gitignore に追加
# プライベートな金額情報を含むファイル
*-with-rates.json
financial-*.json
```

---

### Phase 4: 体験向上（Future）

#### ステップ4.1: インタラクティブ機能
**期間:** 2-3日（将来）

**タスク:**
- [ ] ドラッグ&ドロップでのチーム編成
- [ ] リアルタイム金額更新アニメーション
- [ ] 予算上限設定機能
- [ ] 予算超過時のビジュアル警告

#### ステップ4.2: 高度な分析機能
**期間:** 2-3日（将来）

**タスク:**
- [ ] ポジション別コストグラフ
- [ ] 資質 × 金額のヒートマップ
- [ ] 過去データとの比較
- [ ] 複数チームパターンの保存・比較

---

## ✅ テスト計画

### 単体テスト

#### FinancialService
- [ ] `calculateMonthlyRate()` - 月額単価の正確性
- [ ] `calculateMonthlyRate()` - 時給×稼働時間の計算
- [ ] `calculateMonthlyRate()` - memberRateなしの処理
- [ ] `calculateTeamFinancials()` - 合計・平均の正確性
- [ ] `calculateTeamFinancials()` - 空配列の処理
- [ ] `formatCurrency()` - 日本円フォーマット
- [ ] `formatHourlyRate()` - 時給表示フォーマット

#### useFinancialData
- [ ] マネージャーモードON + 単価あり → 表示
- [ ] マネージャーモードOFF → 非表示
- [ ] 単価なし → 非表示
- [ ] メンバー変更時の再計算

### 統合テスト

#### データフロー
- [ ] メンバー追加 → LocalStorage保存 → リロード後復元
- [ ] JSONインポート（単価あり） → 金額表示
- [ ] JSONインポート（単価なし） → 通常動作
- [ ] JSONエクスポート（単価含む） → 正確な出力
- [ ] JSONエクスポート（単価除外） → memberRate削除確認

#### 表示制御
- [ ] `?mode=manager`あり → 単価入力欄・金額表示ON
- [ ] パラメータなし → 単価関連UI非表示
- [ ] 月額ポジション選択 → 月額入力欄のみ表示
- [ ] 時給ポジション選択 → 時給+稼働時間入力欄表示

### E2Eシナリオ

#### シナリオ1: 新規チーム編成（月額メンバー）
1. マネージャーモードでアクセス (`?mode=manager`)
2. メンバー追加フォームを開く
3. ポジション「マネージャー」を選択
4. 月額単価「900000」を入力
5. 保存してメンバー一覧に表示
6. 金額が正しく表示されることを確認

#### シナリオ2: 派遣社員の追加（時給）
1. マネージャーモードでアクセス
2. メンバー追加フォームを開く
3. ポジション「派遣社員」を選択
4. 時給「3000」、稼働時間「160」を入力
5. 月額換算「¥480,000」が自動表示されることを確認
6. 保存後、一覧で時給詳細が表示されることを確認

#### シナリオ3: JSONエクスポート（単価除外）
1. 複数メンバー（単価あり）が登録済み
2. エクスポートボタンをクリック
3. 「単価情報を含める」チェックをOFF
4. エクスポート実行
5. 出力JSONに`memberRate`フィールドがないことを確認
6. ファイル名が`members.json`であることを確認

#### シナリオ4: 既存データの移行
1. 単価情報なしの既存JSONをインポート
2. 通常モードで動作確認
3. マネージャーモードで金額非表示を確認
4. メンバー編集で単価を追加
5. 金額表示が有効化されることを確認

---

## 📊 成功指標

### 機能的指標
- [ ] 既存機能の100%維持（破壊的変更なし）
- [ ] マネージャーモードでの金額表示成功率100%
- [ ] 時給計算の精度100%
- [ ] JSONインポート/エクスポートの後方互換性100%

### パフォーマンス指標
- [ ] 金額計算の応答時間 < 50ms
- [ ] メンバー100名での動作確認
- [ ] LocalStorageサイズ増加 < 30KB

### セキュリティ指標
- [ ] Githubリポジトリに単価情報が含まれない
- [ ] .gitignoreによる誤コミット防止
- [ ] URLパラメータによる適切な権限制御

### ユーザビリティ指標
- [ ] 単価入力の直感性（ユーザーテスト）
- [ ] 時給入力時の月額換算の視認性
- [ ] エクスポート時の選択肢の明確性

---

## 🔒 セキュリティ考慮事項

### データ保護
- ✅ ブラウザLocalStorageのみ使用（外部送信なし）
- ✅ 単価情報をGithubに含めない設計
- ✅ .gitignoreによる誤コミット防止
- ⚠️ URLパラメータベースの権限制御（簡易）

### 推奨運用ルール
1. **金額付きJSONの取り扱い**
   - 社内サーバーまたはローカルPCのみで保管
   - メール添付時は暗号化ZIPを使用
   - 公開チャットツールへのアップロード禁止

2. **マネージャーモードURL**
   - 社内限定で共有
   - 定期的にURLを変更（例: `?mode=manager2025`）

3. **バックアップ**
   - 月次で金額付きJSONをエクスポート
   - セキュアな場所に保管

### 将来的な改善案（Phase 4以降）
- [ ] パスワード認証の追加
- [ ] セッションベースの権限管理
- [ ] 単価情報の暗号化保存
- [ ] アクセスログの記録

---

## 📚 関連ドキュメント

- [README.md](./README.md) - プロジェクト概要
- [DEVELOPMENT.md](./DEVELOPMENT.md) - 開発者ガイド
- [CLAUDE.md](./CLAUDE.md) - Claude開発ガイド
- [MANAGER_FEATURE_SPEC.md](./MANAGER_FEATURE_SPEC.md) - v1.0（3層管理版・参考用）

---

## 📝 変更管理

### v1.0 → v2.0 の移行手順

#### 既存のPhase1実装の確認
```bash
# 作成済みファイルの確認
ls -la src/types/financial.ts
ls -la src/constants/positionTemplates.ts
ls -la src/services/financialService.ts
ls -la src/hooks/useManagerMode.ts
ls -la src/hooks/useFinancialData.ts
```

#### 必要な修正
1. **PositionService削除**（不要になった）
   ```bash
   # v1.0で作成していた場合は削除
   rm src/services/positionService.ts
   ```

2. **型定義の簡素化**
   - `PositionRate`型を削除
   - `MemberRate`型を追加
   - `MemberStrengths`型に`memberRate`フィールド追加

3. **FinancialServiceの簡素化**
   - デフォルト単価管理ロジックを削除
   - メンバーの`memberRate`から直接計算

---

## 🎯 Phase2の開始タスク

### 最初に着手すべきタスク（優先度順）

#### 1. MemberFormの拡張 🔥 **最優先**
**理由:** データ入力の入り口なので、ここができないと後続が進まない

**作業内容:**
```bash
# ファイルを開いて編集
code src/components/strengths/MemberForm.tsx
```

**実装するポイント:**
- [ ] `useManagerMode`の統合
- [ ] ポジション選択時の`POSITION_TEMPLATES`参照
- [ ] 単価入力エリアの条件分岐UI
- [ ] 時給の月額換算表示

#### 2. FinancialSummaryPanelの作成
**理由:** 金額表示の核となるコンポーネント

```bash
mkdir -p src/components/financial
touch src/components/financial/FinancialSummaryPanel.tsx
touch src/components/financial/MetricCard.tsx
touch src/components/financial/PositionBreakdown.tsx
```

#### 3. PositionBadgeの作成
**理由:** MembersListで使用するシンプルなコンポーネント

```bash
touch src/components/financial/PositionBadge.tsx
```

#### 4. MembersListの拡張
**理由:** PositionBadgeができたらすぐ統合可能

```bash
code src/components/strengths/MembersList.tsx
```

---

## 🚦 実装ステータス

### 完了済み ✅
- [x] Phase 1: 基盤構築
  - [x] 型定義
  - [x] サービス層
  - [x] カスタムフック

### 作業中 🚧
- [ ] Phase 2: UI統合
  - [ ] MemberForm拡張（次のタスク）

### 未着手 ⏳
- [ ] Phase 2: 基本コンポーネント作成
- [ ] Phase 3: データ連携
- [ ] Phase 4: 体験向上

---

## 💬 想定Q&A

### Q1: 派遣社員の稼働時間は毎月変動するが、その都度編集が必要？
**A:** はい、現状の設計では編集が必要です。将来的には以下の改善を検討：
- Phase 4で「月次稼働時間の履歴管理」機能を追加
- インポート時に稼働時間列を含むCSVに対応

### Q2: 既存メンバーに後から単価を追加できる？
**A:** はい。マネージャーモードでメンバー編集画面を開き、単価を入力すれば即座に反映されます。

### Q3: 一般ユーザーが誤ってマネージャーモードにアクセスしたら？
**A:** 金額情報が見えてしまいます。Phase 4でパスワード認証を追加する予定ですが、現状は「URLを知っている人のみ」が前提です。

### Q4: Githubに誤って単価付きJSONをコミットしたら？
**A:** 以下の手順でコミット履歴から削除：
```bash
# コミット履歴から完全削除
git filter-branch --force --index-filter \
  "git rm --cached --ignore-unmatch members-with-rates.json" \
  --prune-empty --tag-name-filter cat -- --all

# 強制プッシュ（注意！）
git push origin --force --all
```

### Q5: 単価情報のバックアップ方法は？
**A:** 定期的に「単価を含める」でエクスポートし、社内のセキュアな場所（OneDrive、社内サーバー等）に保管してください。

---

**このドキュメントはPhase2の進捗に応じて更新します。**

---

## 📅 次回レビュー予定

- **日付:** Phase2完了時
- **レビュー項目:**
  - MemberFormの実装品質
  - FinancialSummaryPanelのデザイン
  - 時給計算の精度
  - レスポンシブ対応

---

**担当者:** SUZUKI Shunpei  
**最終更新:** 2025-10-29  
**バージョン:** 2.0
