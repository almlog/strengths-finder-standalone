# マネージャー機能 - 設計・実装計画書 v3.0

## 📌 改訂履歴

| バージョン | 日付 | 変更内容 | 理由 |
|-----------|------|---------|------|
| v1.0 | 2025-10-29 | 初版作成（3層管理） | - |
| v2.0 | 2025-10-29 | 2層シンプル実装に変更 | Githubセキュリティ・時給対応・UX改善 |
| v3.0 | 2025-10-29 | **利益率計算機能を追加** | 経営判断のための利益可視化 |

### 🔄 v3.0での主な変更点

```diff
【新機能】
+ ✅ ステージ別平均給与管理（S1〜S4 + BP）
+ ✅ 経費率の設定
+ ✅ メンバー別利益・利益率の計算
+ ✅ チーム全体の利益率表示
+ ✅ ビジネスパートナー（BP）の原価計算

【データ管理】
+ ✅ ステージマスタ（LocalStorage管理、Github除外）
+ ✅ メンバーにステージID追加（JSONに含む）
+ ✅ 経費率の設定UI追加

【セキュリティ】
+ ✅ 給与・経費情報はLocalStorageのみ
+ ✅ ステージIDは可視（組織内管理前提）
+ ✅ マネージャー権限者のみ詳細表示
```

---

## 📋 プロジェクト概要

### 目的
組織編成と**利益管理**の意思決定を支援するため、既存のStrengthsFinder分析ツールに**個別単価管理 + 利益率計算機能**を追加する。

### ビジネス価値
- 来季のチーム編成において、人件費（顧客請求額）と利益率を可視化
- 資質（強み）× 金額 × **利益率**の3軸でチームを最適化
- アメーバ経営の時間的採算を補完する実利益ベースの管理
- ステージ別の生産性分析

### 制約条件
- ✅ 既存の一般ユーザー機能は完全に保持（後方互換性）
- ✅ ブラウザベース・ゼロコスト運用の継続
- ✅ LocalStorageベースのデータ管理（外部送信なし）
- ✅ ポジション情報なしのJSONも動作可能
- ✅ **単価・給与・経費情報をGithubリポジトリに含めない**（セキュリティ）
- ✅ ステージIDはJSONに含む（組織内管理前提）

---

## 🔐 セキュリティ設計の考慮事項

### 機密情報の分類と管理方針

| 情報種別 | 機密度 | Github | LocalStorage | JSON | 表示 |
|---------|-------|--------|--------------|------|------|
| ポジション名・色 | 低 | ✅ 可 | - | ✅ 可 | 全員 |
| ステージID | 中 | ❌ 不可 | - | ✅ 可 | マネージャー |
| 売上単価 | 高 | ❌ 不可 | ✅ 保存 | ⚠️ 選択式 | マネージャー |
| 平均給与 | 高 | ❌ 不可 | ✅ 保存 | ❌ 不可 | マネージャー |
| 経費率 | 高 | ❌ 不可 | ✅ 保存 | ❌ 不可 | マネージャー |
| 利益・利益率 | 高 | ❌ 不可 | - | ❌ 不可 | マネージャー |

### データ管理の実装方針

```
┌──────────────────────────────────────────────┐
│ Github管理（公開OK）                         │
├──────────────────────────────────────────────┤
│ ✅ ポジションテンプレート                   │
│   - ID, 名前, カラー, アイコン               │
│   - rateType (monthly/hourly)                │
│                                              │
│ ❌ 一切の金額情報                            │
└──────────────────────────────────────────────┘

┌──────────────────────────────────────────────┐
│ LocalStorage（ブラウザローカル）            │
├──────────────────────────────────────────────┤
│ 🔒 ステージマスタ                           │
│   - ステージID (S1〜S4, BP)                 │
│   - 平均給与（月額）                        │
│   - 経費率                                  │
│                                              │
│ 🔒 個別原価情報（オプション）               │
│   - メンバーごとのカスタム給与・経費        │
└──────────────────────────────────────────────┘

┌──────────────────────────────────────────────┐
│ JSONデータ（インポート/エクスポート）       │
├──────────────────────────────────────────────┤
│ ✅ メンバー基本情報                         │
│ ✅ ポジションID                             │
│ ✅ ステージID（組織内管理前提）             │
│ ⚠️ 売上単価（選択式エクスポート）           │
│ ❌ 給与・経費の具体額                       │
└──────────────────────────────────────────────┘
```

---

## 💰 利益率計算の仕様

### ステージ体系

#### 社員ステージ（S1〜S4）
| ステージID | 名称 | 説明 | 平均給与例 | 経費率例 |
|-----------|------|------|-----------|---------|
| S1 | ステージ1 | 新入社員〜3年目 | ¥350,000 | 30% |
| S2 | ステージ2 | 中堅社員 | ¥450,000 | 30% |
| S3 | ステージ3 | ベテラン社員 | ¥550,000 | 30% |
| S4 | ステージ4 | マネージャー層 | ¥700,000 | 30% |

※平均給与 = 年収（基本給 + 賞与）÷ 12ヶ月

#### ビジネスパートナー（BP）
| ステージID | 名称 | 説明 | 原価計算方法 |
|-----------|------|------|------------|
| BP | ビジネスパートナー | 業務委託・外部協力者 | 売上 × 85% = 原価 |

**特徴:**
- 自社社員ではないため給与概念なし
- 売上に対して固定比率で原価を算出
- 経費率が社員より高い（例: 85%）

### 計算式

#### パターンA: 社員（S1〜S4）

```typescript
// 売上
売上 = memberRate（月額換算）

// 原価
平均給与 = ステージマスタ[stageId].averageSalary
経費 = 平均給与 × ステージマスタ[stageId].expenseRate
原価 = 平均給与 + 経費

// 利益
利益 = 売上 - 原価
利益率 = (利益 ÷ 売上) × 100

// 例: S2のメンバー（売上80万、給与45万、経費率30%）
売上 = ¥800,000
原価 = ¥450,000 + (¥450,000 × 0.30) = ¥585,000
利益 = ¥800,000 - ¥585,000 = ¥215,000
利益率 = (¥215,000 ÷ ¥800,000) × 100 = 26.9%
```

#### パターンB: ビジネスパートナー（BP）

```typescript
// 売上
売上 = memberRate（月額換算）

// 原価（簡易計算）
原価 = 売上 × BP経費率（例: 0.85）

// 利益
利益 = 売上 - 原価
利益率 = (利益 ÷ 売上) × 100

// 例: BPのメンバー（売上80万、経費率85%）
売上 = ¥800,000
原価 = ¥800,000 × 0.85 = ¥680,000
利益 = ¥800,000 - ¥680,000 = ¥120,000
利益率 = (¥120,000 ÷ ¥800,000) × 100 = 15.0%
```

#### チーム全体の集計

```typescript
チーム売上 = Σ(各メンバーの売上)
チーム原価 = Σ(各メンバーの原価)
チーム利益 = チーム売上 - チーム原価
チーム利益率 = (チーム利益 ÷ チーム売上) × 100
```

---

## 👥 ユーザーストーリー（v3.0追加）

### Epic: 利益率管理機能

#### Story 6: ステージマスタの設定
**As a** 管理責任者  
**I want to** ステージ別の平均給与と経費率を設定できる  
**So that** 正確な利益計算ができる

**受入基準:**
- [ ] S1〜S4、BPの5種類のステージを管理
- [ ] 各ステージに平均給与（月額）を設定可能
- [ ] 各ステージに経費率（%）を設定可能
- [ ] LocalStorageに保存（Githubには含めない）
- [ ] 設定画面でリアルタイムプレビュー

**UI仕様:**
```
┌─────────────────────────────────────────────┐
│ 💼 ステージマスタ設定                      │
│ ⚠️ この情報はブラウザにのみ保存されます   │
├─────────────────────────────────────────────┤
│ S1 ステージ1                               │
│   平均給与: [350000]円/月                  │
│   経費率:   [30]%                          │
│   原価合計: ¥455,000                       │
├─────────────────────────────────────────────┤
│ S2 ステージ2                               │
│   平均給与: [450000]円/月                  │
│   経費率:   [30]%                          │
│   原価合計: ¥585,000                       │
├─────────────────────────────────────────────┤
│ ...                                        │
├─────────────────────────────────────────────┤
│ BP ビジネスパートナー                      │
│   経費率:   [85]%                          │
│   （売上に対する比率）                     │
├─────────────────────────────────────────────┤
│              [保存]  [キャンセル]          │
└─────────────────────────────────────────────┘
```

---

#### Story 7: メンバーへのステージ割当
**As a** 管理責任者  
**I want to** 各メンバーにステージを割り当てられる  
**So that** 自動的に利益計算ができる

**受入基準:**
- [ ] メンバーフォームでステージ選択可能
- [ ] ステージ選択時に平均給与・経費をプレビュー表示
- [ ] BPの場合は経費率のみ表示
- [ ] ステージIDはJSONエクスポートに含まれる

**UI仕様（MemberForm拡張）:**
```
┌─────────────────────────────────────────────┐
│ メンバー追加/編集                           │
├─────────────────────────────────────────────┤
│ ... 既存フィールド ...                      │
│                                             │
│ 💰 単価設定（マネージャー専用）             │
│   ポジション: [▼マネージャー]              │
│   月額単価:   [900000]円                    │
│                                             │
│ 💼 ステージ設定（マネージャー専用）         │
│   ステージ: [▼S4 - ステージ4]              │
│   ┌───────────────────────────────────────┐ │
│   │ 📊 原価プレビュー                    │ │
│   │ 平均給与: ¥700,000                   │ │
│   │ 経費(30%): ¥210,000                  │ │
│   │ 原価合計: ¥910,000                   │ │
│   │                                      │ │
│   │ 利益予測: -¥10,000 ⚠️                │ │
│   │ 利益率: -1.1% （赤字）               │ │
│   └───────────────────────────────────────┘ │
└─────────────────────────────────────────────┘
```

---

#### Story 8: 利益率の可視化
**As a** 管理責任者  
**I want to** チーム全体と個人別の利益率を確認できる  
**So that** 採算性の高いチーム編成ができる

**受入基準:**
- [ ] チーム全体の売上・原価・利益・利益率を表示
- [ ] メンバー一覧に利益率カラムを追加（マネージャーモードのみ）
- [ ] 利益率に応じた色分け表示（赤字=赤、低利益=黄、健全=緑）
- [ ] ステージ別の平均利益率を表示
- [ ] ポジション別の利益率分布を表示

**表示イメージ:**
```
┌─────────────────────────────────────────────┐
│ 💰 売上・利益分析                           │
├─────────────────────────────────────────────┤
│ 📊 月間売上:   ¥5,200,000                  │
│ 💸 月間原価:   ¥3,900,000                  │
│ 💵 月間利益:   ¥1,300,000                  │
│ 📈 利益率:     25.0% ✅                     │
│                                             │
│ ステージ別内訳:                             │
│ S4 × 2名  利益率: 22.5%                    │
│ S3 × 3名  利益率: 26.8%                    │
│ BP × 1名  利益率: 15.0%                    │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│ メンバー一覧                                │
├─────────────────────────────────────────────┤
│ 山田太郎 [MG/S4]  ¥900k  利益率: -1.1% 🔴  │
│ 佐藤花子 [SL/S3]  ¥750k  利益率: 26.0% 🟢  │
│ 鈴木一郎 [ST/S2]  ¥600k  利益率: 27.5% 🟢  │
│ 田中美咲 [BP]     ¥800k  利益率: 15.0% 🟡  │
└─────────────────────────────────────────────┘
```

---

#### Story 9: 利益シミュレーション
**As a** 管理責任者  
**I want to** メンバー追加前に利益インパクトをシミュレーションできる  
**So that** 赤字メンバーを事前に回避できる

**受入基準:**
- [ ] メンバー選択前の候補リストに利益率を表示
- [ ] 追加時のチーム全体の利益率変化を表示
- [ ] 目標利益率（例: 20%以上）を設定可能
- [ ] 目標未達の場合に警告表示

**Future Enhancement（Phase 4）:**
- [ ] 最適化アルゴリズム（目標利益率達成のための組合せ提案）
- [ ] ステージ昇格シミュレーション（S2→S3になったら利益率は？）

---

## 🏗️ 技術設計（v3.0追加）

### データモデル拡張

#### 1. StageMaster型（新規）

```typescript
// types/profitability.ts
export interface StageMaster {
  id: string;              // 'S1', 'S2', 'S3', 'S4', 'BP'
  name: string;            // 'ステージ1', 'ビジネスパートナー'
  type: 'employee' | 'bp'; // 社員 or BP
  averageSalary?: number;  // 平均給与（月額、BP以外）
  expenseRate: number;     // 経費率（0.30 = 30%）
  description?: string;    // 説明文
}

// デフォルト値
export const DEFAULT_STAGE_MASTERS: StageMaster[] = [
  {
    id: 'S1',
    name: 'ステージ1',
    type: 'employee',
    averageSalary: 350000,
    expenseRate: 0.30,
    description: '新入社員〜3年目',
  },
  {
    id: 'S2',
    name: 'ステージ2',
    type: 'employee',
    averageSalary: 450000,
    expenseRate: 0.30,
    description: '中堅社員',
  },
  {
    id: 'S3',
    name: 'ステージ3',
    type: 'employee',
    averageSalary: 550000,
    expenseRate: 0.30,
    description: 'ベテラン社員',
  },
  {
    id: 'S4',
    name: 'ステージ4',
    type: 'employee',
    averageSalary: 700000,
    expenseRate: 0.30,
    description: 'マネージャー層',
  },
  {
    id: 'BP',
    name: 'ビジネスパートナー',
    type: 'bp',
    expenseRate: 0.85,
    description: '業務委託・外部協力者',
  },
];
```

#### 2. MemberStrengths型の拡張

```typescript
// models/StrengthsTypes.ts
export interface MemberStrengths {
  id: string;
  name: string;
  department: string;
  position?: Position | string;
  positionId?: string;
  memberRate?: MemberRate;      // 売上情報
  stageId?: string;             // ステージID（NEW）
  strengths: { id: number; score: number }[];
}
```

#### 3. MemberProfitability型（新規）

```typescript
// types/profitability.ts
export interface MemberProfitability {
  memberId: string;
  revenue: number;       // 月間売上
  cost: number;          // 月間原価（給与 + 経費 or 売上×経費率）
  profit: number;        // 月間利益
  profitMargin: number;  // 利益率（%）
  
  // 詳細（デバッグ・表示用）
  details: {
    salary?: number;     // 平均給与（社員のみ）
    expense: number;     // 経費
    stageId?: string;    // ステージID
  };
}

export interface TeamProfitability {
  totalRevenue: number;       // チーム売上合計
  totalCost: number;          // チーム原価合計
  totalProfit: number;        // チーム利益合計
  profitMargin: number;       // チーム利益率
  
  memberCount: number;        // メンバー数
  averageRevenue: number;     // 平均売上
  averageProfit: number;      // 平均利益
  
  profitByStage: Record<string, {
    count: number;
    totalProfit: number;
    averageProfitMargin: number;
  }>;
}
```

### サービス層の拡張

#### ProfitabilityService（新規作成）

```typescript
// services/profitabilityService.ts
export class ProfitabilityService {
  private static readonly STORAGE_KEY = 'stage_masters';
  
  /**
   * ステージマスタの取得
   */
  static getStageMasters(): StageMaster[] {
    const custom = localStorage.getItem(this.STORAGE_KEY);
    return custom ? JSON.parse(custom) : DEFAULT_STAGE_MASTERS;
  }
  
  /**
   * ステージマスタの保存
   */
  static saveStageMasters(masters: StageMaster[]): void {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(masters));
  }
  
  /**
   * メンバー個人の利益計算
   */
  static calculateMemberProfitability(
    member: MemberStrengths,
    stageMasters: StageMaster[]
  ): MemberProfitability | null {
    // 売上の取得
    const revenue = FinancialService.calculateMonthlyRate(member);
    if (revenue === 0) return null;
    
    // ステージ情報の取得
    if (!member.stageId) return null;
    const stage = stageMasters.find(s => s.id === member.stageId);
    if (!stage) return null;
    
    // 原価の計算
    let cost: number;
    let salary: number | undefined;
    let expense: number;
    
    if (stage.type === 'employee') {
      // 社員: 給与 + 経費
      salary = stage.averageSalary || 0;
      expense = salary * stage.expenseRate;
      cost = salary + expense;
    } else {
      // BP: 売上 × 経費率
      expense = revenue * stage.expenseRate;
      cost = expense;
    }
    
    // 利益・利益率
    const profit = revenue - cost;
    const profitMargin = (profit / revenue) * 100;
    
    return {
      memberId: member.id,
      revenue,
      cost,
      profit,
      profitMargin,
      details: {
        salary,
        expense,
        stageId: member.stageId,
      },
    };
  }
  
  /**
   * チーム全体の利益計算
   */
  static calculateTeamProfitability(
    members: MemberStrengths[],
    stageMasters: StageMaster[]
  ): TeamProfitability {
    let totalRevenue = 0;
    let totalCost = 0;
    let totalProfit = 0;
    const profitByStage: Record<string, {
      count: number;
      totalProfit: number;
      totalProfitMargin: number;
    }> = {};
    
    let validMemberCount = 0;
    
    members.forEach(member => {
      const profitability = this.calculateMemberProfitability(member, stageMasters);
      if (!profitability) return;
      
      totalRevenue += profitability.revenue;
      totalCost += profitability.cost;
      totalProfit += profitability.profit;
      validMemberCount++;
      
      // ステージ別集計
      const stageId = member.stageId!;
      if (!profitByStage[stageId]) {
        profitByStage[stageId] = {
          count: 0,
          totalProfit: 0,
          totalProfitMargin: 0,
        };
      }
      profitByStage[stageId].count++;
      profitByStage[stageId].totalProfit += profitability.profit;
      profitByStage[stageId].totalProfitMargin += profitability.profitMargin;
    });
    
    // ステージ別平均利益率の計算
    Object.keys(profitByStage).forEach(stageId => {
      const data = profitByStage[stageId];
      data.totalProfitMargin = data.totalProfitMargin / data.count;
    });
    
    return {
      totalRevenue,
      totalCost,
      totalProfit,
      profitMargin: totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0,
      memberCount: validMemberCount,
      averageRevenue: validMemberCount > 0 ? totalRevenue / validMemberCount : 0,
      averageProfit: validMemberCount > 0 ? totalProfit / validMemberCount : 0,
      profitByStage,
    };
  }
  
  /**
   * 利益率のステータス判定
   */
  static getProfitMarginStatus(profitMargin: number): 'danger' | 'warning' | 'good' {
    if (profitMargin < 0) return 'danger';     // 赤字
    if (profitMargin < 15) return 'warning';   // 低利益
    return 'good';                              // 健全
  }
  
  /**
   * 利益率のステータス色
   */
  static getProfitMarginColor(profitMargin: number): string {
    const status = this.getProfitMarginStatus(profitMargin);
    return {
      danger: '#EF4444',   // 赤
      warning: '#F59E0B',  // 黄
      good: '#10B981',     // 緑
    }[status];
  }
}
```

### カスタムフックの追加

#### useProfitability

```typescript
// hooks/useProfitability.ts
import { useMemo } from 'react';
import { MemberStrengths } from '../models/StrengthsTypes';
import { ProfitabilityService } from '../services/profitabilityService';
import { useManagerMode } from './useManagerMode';

export function useProfitability(members: MemberStrengths[]) {
  const { isManagerMode } = useManagerMode();
  
  // ステージマスタの取得
  const stageMasters = useMemo(() => {
    return ProfitabilityService.getStageMasters();
  }, []);
  
  // ステージ情報を持つメンバーが1人以上いるか
  const hasStageData = members.some(m => m.stageId);
  
  // 利益率表示が可能か判定
  const canShowProfitability = isManagerMode && hasStageData;
  
  // チーム全体の利益率計算
  const teamProfitability = useMemo(() => {
    if (!canShowProfitability) return null;
    
    return ProfitabilityService.calculateTeamProfitability(members, stageMasters);
  }, [members, stageMasters, canShowProfitability]);
  
  // メンバー個別の利益率計算
  const memberProfitabilities = useMemo(() => {
    if (!canShowProfitability) return new Map();
    
    const map = new Map<string, MemberProfitability>();
    members.forEach(member => {
      const profitability = ProfitabilityService.calculateMemberProfitability(
        member,
        stageMasters
      );
      if (profitability) {
        map.set(member.id, profitability);
      }
    });
    return map;
  }, [members, stageMasters, canShowProfitability]);
  
  return {
    canShowProfitability,
    teamProfitability,
    memberProfitabilities,
    stageMasters,
  };
}
```

---

## 📦 コンポーネント設計（v3.0追加）

### 新規コンポーネント

#### 1. StageMasterSettings
**責務:** ステージマスタの設定画面

**ファイル:** `src/components/profitability/StageMasterSettings.tsx`

**Props:**
```typescript
interface StageMasterSettingsProps {
  onClose: () => void;
}
```

#### 2. ProfitabilitySummaryPanel
**責務:** チーム全体の利益率サマリー表示

**ファイル:** `src/components/profitability/ProfitabilitySummaryPanel.tsx`

**Props:**
```typescript
interface ProfitabilitySummaryPanelProps {
  teamProfitability: TeamProfitability;
}
```

#### 3. ProfitabilityBadge
**責務:** メンバー個別の利益率バッジ

**ファイル:** `src/components/profitability/ProfitabilityBadge.tsx`

**Props:**
```typescript
interface ProfitabilityBadgeProps {
  profitability: MemberProfitability;
  compact?: boolean; // コンパクト表示
}
```

### 既存コンポーネントの修正

#### MemberForm（追加拡張）
**変更内容:**
- ステージ選択ドロップダウン追加
- 選択ステージの原価プレビュー表示
- 利益予測の自動計算・表示

#### MembersList
**変更内容:**
- 利益率カラム追加（マネージャーモードのみ）
- 利益率に応じた色分け表示
- ステージバッジ表示

#### StrengthsContext
**変更内容:**
- `stageId`フィールドの保存・読み込み
- JSONエクスポート時のステージID含有制御

---

## 🚀 実装ステップ（v3.0追加）

### Phase 3: 利益率計算機能 ✅ **完了**（既存Phase3の完了を継承）

### Phase 4: 利益率管理機能（新規）

#### ステップ4.1: データモデルと基盤実装
**期間:** 1日

```bash
mkdir -p src/types src/services src/components/profitability src/hooks
touch src/types/profitability.ts
touch src/services/profitabilityService.ts
touch src/hooks/useProfitability.ts
```

**タスク:**
- [ ] `StageMaster`型定義
- [ ] `MemberProfitability`型定義
- [ ] `TeamProfitability`型定義
- [ ] `ProfitabilityService`実装
  - [ ] `getStageMasters()` - LocalStorage読込
  - [ ] `saveStageMasters()` - LocalStorage保存
  - [ ] `calculateMemberProfitability()` - 個人利益計算
  - [ ] `calculateTeamProfitability()` - チーム利益計算
  - [ ] `getProfitMarginStatus()` - ステータス判定
- [ ] `useProfitability`フック実装

#### ステップ4.2: ステージマスタ設定画面
**期間:** 1日

```bash
touch src/components/profitability/StageMasterSettings.tsx
```

**タスク:**
- [ ] S1〜S4、BPの入力フォーム
- [ ] リアルタイム原価プレビュー
- [ ] LocalStorageへの保存
- [ ] バリデーション（必須チェック、数値範囲）
- [ ] メイン画面からのアクセス導線

#### ステップ4.3: MemberFormの拡張
**期間:** 半日

**タスク:**
- [ ] ステージ選択ドロップダウン追加
- [ ] 原価プレビューエリア実装
  - [ ] 平均給与表示
  - [ ] 経費表示
  - [ ] 原価合計表示
- [ ] 利益予測の自動計算
  - [ ] 売上 - 原価 = 利益
  - [ ] 利益率の色分け表示
- [ ] ステージ未設定時の警告

#### ステップ4.4: 利益率表示コンポーネント
**期間:** 1日

```bash
touch src/components/profitability/ProfitabilitySummaryPanel.tsx
touch src/components/profitability/ProfitabilityBadge.tsx
touch src/components/profitability/StageBreakdown.tsx
```

**タスク:**
- [ ] `ProfitabilitySummaryPanel`実装
  - [ ] 売上・原価・利益・利益率の表示
  - [ ] ステージ別内訳表示
  - [ ] グラフ表示（オプション）
- [ ] `ProfitabilityBadge`実装
  - [ ] 利益率の色分けバッジ
  - [ ] ツールチップで詳細表示
- [ ] `StageBreakdown`実装
  - [ ] ステージ別の人数・平均利益率

#### ステップ4.5: MembersListの拡張
**期間:** 半日

**タスク:**
- [ ] 利益率カラム追加
- [ ] `ProfitabilityBadge`の統合
- [ ] ステージバッジ表示
- [ ] ソート機能（利益率順）

#### ステップ4.6: メイン画面への統合
**期間:** 半日

**タスク:**
- [ ] `ProfitabilitySummaryPanel`の配置
- [ ] `FinancialSummaryPanel`との統合表示
- [ ] 条件分岐表示の実装
- [ ] レスポンシブデザイン調整

---

### Phase 5: 高度な利益分析（Future）

#### ステップ5.1: 利益シミュレーション
**期間:** 2-3日（将来）

**タスク:**
- [ ] メンバー追加前の利益インパクト表示
- [ ] 目標利益率の設定機能
- [ ] 目標未達時の警告・提案
- [ ] 複数パターンの比較

#### ステップ5.2: 最適化機能
**期間:** 3-4日（将来）

**タスク:**
- [ ] 目標利益率達成のための最適組合せ提案
- [ ] ステージ昇格シミュレーション
- [ ] コスト削減提案アルゴリズム

---

## ✅ テスト計画（v3.0追加）

### 単体テスト - ProfitabilityService

- [ ] `calculateMemberProfitability()` - 社員の利益計算
- [ ] `calculateMemberProfitability()` - BPの利益計算
- [ ] `calculateMemberProfitability()` - ステージ未設定時の処理
- [ ] `calculateMemberProfitability()` - 売上ゼロ時の処理
- [ ] `calculateTeamProfitability()` - チーム全体の集計
- [ ] `calculateTeamProfitability()` - 空配列の処理
- [ ] `getProfitMarginStatus()` - ステータス判定ロジック

### 統合テスト

#### データフロー
- [ ] ステージマスタ設定 → LocalStorage保存 → リロード後復元
- [ ] メンバーにステージ割当 → 利益率自動計算
- [ ] JSONインポート（ステージIDあり） → 利益率表示
- [ ] JSONエクスポート → ステージID含有確認

#### 計算精度
- [ ] S2メンバー（給与45万、経費率30%、売上80万） → 利益率26.9%
- [ ] BPメンバー（経費率85%、売上80万） → 利益率15.0%
- [ ] チーム全体の利益率が正しく集計される

### E2Eシナリオ

#### シナリオ1: 初期設定から利益率表示まで
1. マネージャーモードでアクセス
2. ステージマスタ設定画面を開く
3. S1〜S4の給与・経費率を入力
4. メンバーを追加し、ステージS2を割当
5. 売上80万を入力
6. 原価プレビューで利益率26.9%を確認
7. 保存後、メンバー一覧で利益率表示を確認

#### シナリオ2: 赤字メンバーの検出
1. S4メンバー（給与70万、経費率30%）を作成
2. 売上90万を入力
3. 原価91万（給与70万 + 経費21万）
4. 利益-1万、利益率-1.1%の赤字表示
5. 赤色のバッジで警告表示を確認

#### シナリオ3: BPメンバーの利益計算
1. BPステージのメンバーを追加
2. 売上80万を入力
3. 原価68万（80万 × 85%）
4. 利益12万、利益率15.0%を確認
5. 社員より低利益率で黄色バッジ表示

---

## 🎨 UI/UX設計（v3.0追加）

### カラーパレット拡張

**利益率表示カラー:**
```css
/* 赤字（マイナス） */
.profit-danger {
  color: #EF4444;
  background: #FEE2E2;
  border: 1px solid #FECACA;
}

/* 低利益（0〜15%） */
.profit-warning {
  color: #F59E0B;
  background: #FEF3C7;
  border: 1px solid #FDE68A;
}

/* 健全（15%以上） */
.profit-good {
  color: #10B981;
  background: #D1FAE5;
  border: 1px solid #A7F3D0;
}
```

### アイコン選定（追加）

**利益率関連:**
- `💼` - ステージマスタ
- `📊` - 利益率サマリー
- `💵` - 利益
- `📉` - 赤字警告
- `✅` - 健全利益率
- `⚠️` - 低利益率

### レイアウト構成（マネージャー画面 v3.0）

```
┌─────────────────────────────────────────────────┐
│ 📊 ストレングスファインダー分析                │
│ URL: ?mode=manager                              │
│ [メンバー一覧] [個人分析] ... [⚙️設定]         │
├─────────────────────────────────────────────────┤
│                                                 │
│ ┌─────────────────────────────────────────────┐ │
│ │ 💰 売上予測                                 │ │
│ ├─────────────────────────────────────────────┤ │
│ │ 📊 月間売上: ¥5,200,000                    │ │
│ │ 📈 年間予測: ¥62,400,000                   │ │
│ │ 👤 平均単価: ¥866,667                      │ │
│ └─────────────────────────────────────────────┘ │
│                                                 │
│ ┌─────────────────────────────────────────────┐ │
│ │ 📊 利益・利益率分析           ← NEW        │ │
│ ├─────────────────────────────────────────────┤ │
│ │ 💸 月間原価: ¥3,900,000                    │ │
│ │ 💵 月間利益: ¥1,300,000                    │ │
│ │ 📈 利益率:   25.0% ✅                       │ │
│ │                                             │ │
│ │ ステージ別内訳:                             │ │
│ │ 💼 S4 × 2名  利益率: 22.5%                 │ │
│ │ 💼 S3 × 3名  利益率: 26.8%                 │ │
│ │ 💼 BP × 1名  利益率: 15.0% ⚠️              │ │
│ └─────────────────────────────────────────────┘ │
│                                                 │
│ ┌─────────────────────────────────────────────┐ │
│ │ メンバー一覧                                │ │
│ │ ┌───────────────────────────────────┐       │ │
│ │ │ 👤 山田太郎  [MG/S4]             │       │ │
│ │ │    売上: ¥900k  利益率: -1.1% 🔴 │       │ │
│ │ └───────────────────────────────────┘       │ │
│ │ ┌───────────────────────────────────┐       │ │
│ │ │ 👤 佐藤花子  [SL/S3]             │       │ │
│ │ │    売上: ¥750k  利益率: 26.0% 🟢 │       │ │
│ │ └───────────────────────────────────┘       │ │
│ └─────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────┘
```

---

## 🔒 セキュリティ考慮事項（v3.0補足）

### ステージ情報の取り扱い

#### 表示可否の判断基準
```
一般ユーザー: ステージID・給与・経費・利益率 → すべて非表示
マネージャー: ステージID・給与・経費・利益率 → すべて表示
```

#### JSONエクスポート時の制御
```typescript
// エクスポートオプション
interface ExportOptions {
  includeRate: boolean;      // 売上単価を含む
  includeStage: boolean;     // ステージIDを含む
  // 給与・経費の具体額は常に除外
}

// 推奨設定
{
  includeRate: false,   // Githubコミット用
  includeStage: true,   // 組織内管理用
}
```

### .gitignoreの更新

```bash
# .gitignore に追加
# プライベートな金額情報を含むファイル
*-with-rates.json
*-with-financials.json
financial-*.json
profitability-*.json

# ステージマスタのバックアップ
stage-masters-*.json
```

---

## 📚 関連ドキュメント

- [README.md](./README.md) - プロジェクト概要
- [DEVELOPMENT.md](./DEVELOPMENT.md) - 開発者ガイド
- [CLAUDE.md](./CLAUDE.md) - Claude開発ガイド
- [MANAGER_FEATURE_SPEC.md](./MANAGER_FEATURE_SPEC.md) - v1.0（参考用）
- [MANAGER_FEATURE_SPEC_V2.md](./MANAGER_FEATURE_SPEC_V2.md) - v2.0（参考用）

---

## 💬 想定Q&A（v3.0追加）

### Q10: ステージの平均給与は誰が見られる？
**A:** マネージャーモード（`?mode=manager`）でアクセスしている人のみが見られます。一般ユーザーには一切表示されません。

### Q11: ステージIDはJSONに含まれるが、他部署に見られても良い？
**A:** はい。ステージIDは組織内管理情報として扱い、JSONに含めます。各所属長の判断で他部署への開示を決定します。

### Q12: 赤字メンバーが出たらどうする？
**A:** 以下の対応を検討：
1. 単価の見直し（値上げ交渉）
2. ステージの再評価（実力に応じた調整）
3. 稼働時間の最適化（時給社員の場合）
4. 高利益率メンバーとのバランス調整

### Q13: ステージ昇格時の利益インパクトは？
**A:** Phase 5で「ステージ昇格シミュレーション」機能を実装予定。S2→S3になった場合の利益率変化を事前確認できます。

### Q14: BPの経費率85%は変更可能？
**A:** はい。ステージマスタ設定画面で自由に変更できます。契約形態に応じて調整してください。

### Q15: 時給社員とBPの違いは？
**A:**
- **時給社員**: 自社雇用、ステージS1〜S4を持つ、給与+経費で計算
- **BP**: 業務委託、ステージBP、売上×経費率で計算

---

## 🎯 Phase4の最優先タスク

### 1️⃣ データモデルと基盤実装（最優先🔥）

**理由:** 利益率計算の基礎となるため

**作業内容:**
```bash
touch src/types/profitability.ts
touch src/services/profitabilityService.ts
touch src/hooks/useProfitability.ts
```

**実装のポイント:**
- `DEFAULT_STAGE_MASTERS`の定義
- 社員とBPの計算ロジック分岐
- LocalStorageへの永続化

### 2️⃣ ステージマスタ設定画面

**理由:** データ入力の起点

```bash
touch src/components/profitability/StageMasterSettings.tsx
```

### 3️⃣ MemberFormの拡張

**理由:** ステージ割当の実装

---

## 📅 次回レビュー予定

- **日付:** Phase4完了時
- **レビュー項目:**
  - 利益率計算の精度
  - ステージマスタ設定のUI/UX
  - セキュリティ実装の妥当性
  - パフォーマンス（大量メンバー時）

---

**担当者:** SUZUKI Shunpei  
**最終更新:** 2025-10-29  
**バージョン:** 3.0
